import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { allowedCategories, getPolicy, RESTRICTED_CATEGORY_RULE } from "./compliance";
import { CATEGORIES } from "./format";
import { km, openState } from "./geo";
import { listedRetailers } from "./queries";

/**
 * Automatic order routing.
 *
 * Buyers shop products, not stores. When they check out, each item is sent to
 * the nearest licensed store that (a) has it in stock at a location, (b) can
 * deliver to the buyer's address from that location (or offers pickup), and
 * (c) is taking orders on Cairn. If no single store has everything, the cart
 * is split into as few shipments as possible, nearest first. The store is
 * always the seller; it is named at checkout and on the order.
 */

export type Fulfilment = "DELIVERY" | "PICKUP";
export type Point = { lat: number; lng: number };

/** Products are the same listing across stores when brand, name and size match. */
export const listingKey = (p: { brand: string; name: string; size: string }) => `${p.brand}|${p.name}|${p.size}`.trim().toLowerCase();

export type RouteLine = { key: string; quantity: number };

type Product = typeof schema.products.$inferSelect & { inventory: (typeof schema.inventory.$inferSelect)[] };
type Listed = Awaited<ReturnType<typeof listedRetailers>>[number];
type Loc = Listed["locations"][number];

export type Shipment = {
  retailer: Listed;
  location: Loc;
  distanceKm: number | null;
  items: { key: string; quantity: number; product: Product; lineCents: number; grams: number }[];
  subtotalCents: number;
  feeCents: number;
  totalCents: number;
  grams: number;
  /** Set when this shipment can't be placed as it stands (e.g. below the store's delivery minimum). */
  problem: string | null;
};

export type RoutePlan = {
  fulfilment: Fulfilment;
  shipments: Shipment[];
  /** Listing keys nobody can fulfil for this buyer right now. */
  unavailable: string[];
  /** Why nothing could be routed at all, if so. */
  blocked: string | null;
};

/** Every store-specific product for these listings, across stores taking orders in the province. */
async function candidates(jur: string, keys: string[], exclude: string[]) {
  const policy = await getPolicy(jur);
  const retailers = (await listedRetailers(jur)).filter((r) => r.acceptsOrders && !exclude.includes(r.id));
  if (!retailers.length || !keys.length) return { policy, retailers, products: [] as Product[] };
  const cats = allowedCategories(policy, CATEGORIES);
  const rows = await db.query.products.findMany({
    where: and(inArray(schema.products.retailerId, retailers.map((r) => r.id)), eq(schema.products.status, "ACTIVE")),
    with: { inventory: true },
  });
  const wanted = new Set(keys);
  const products = rows.filter((p) => wanted.has(listingKey(p)) && cats.includes(p.category)
    && (!RESTRICTED_CATEGORY_RULE[p.category] || policy.allows(RESTRICTED_CATEGORY_RULE[p.category]!)));
  return { policy, retailers, products };
}

export async function planRoute(input: {
  jurisdictionCode: string;
  point: Point | null;
  fulfilment: Fulfilment;
  lines: RouteLine[];
  exclude?: string[];
}): Promise<RoutePlan> {
  const { jurisdictionCode, point, fulfilment, lines } = input;
  const keys = [...new Set(lines.map((l) => l.key))];
  const qty = new Map(lines.map((l) => [l.key, l.quantity]));
  const empty = (blocked: string | null): RoutePlan => ({ fulfilment, shipments: [], unavailable: keys, blocked });

  const { policy, retailers, products } = await candidates(jurisdictionCode, keys, input.exclude ?? []);
  if (!policy.allows("orders.online")) return empty(policy.offMessage("orders.online"));
  if (fulfilment === "DELIVERY" && !policy.allows("retail.delivery")) return empty(`Delivery isn't available in ${policy.name} yet. Choose pickup instead.`);
  if (fulfilment === "PICKUP" && !policy.allows("retail.pickup")) return empty(`Pickup isn't available in ${policy.name} yet.`);
  if (fulfilment === "DELIVERY" && !point) return empty("Add your delivery address so we can find the nearest store that delivers to you.");

  // Every location that could serve this buyer, with what it stocks.
  type Cand = { retailer: Listed; location: Loc; distance: number | null; stock: Map<string, Product> };
  const cands: Cand[] = [];
  for (const r of retailers) {
    for (const l of r.locations) {
      if (fulfilment === "DELIVERY") {
        if (!l.offersDelivery || l.geoApproximate) continue;
        const d = km(point!, l);
        if (d > r.deliveryRadiusKm) continue;
        cands.push({ retailer: r, location: l, distance: d, stock: new Map() });
      } else {
        if (!l.offersPickup) continue;
        cands.push({ retailer: r, location: l, distance: point && !l.geoApproximate ? km(point, l) : null, stock: new Map() });
      }
    }
  }
  for (const p of products) {
    for (const c of cands) {
      if (c.retailer.id !== p.retailerId) continue;
      const st = p.inventory.find((i) => i.locationId === c.location.id)?.status ?? "OUT";
      if (st === "OUT") continue;
      const k = listingKey(p);
      const prev = c.stock.get(k);
      if (!prev || p.priceCents < prev.priceCents) c.stock.set(k, p);
    }
  }
  if (!cands.length) {
    return empty(fulfilment === "DELIVERY"
      ? "No licensed store delivers to your address yet. Try pickup, or check back soon — new stores are joining."
      : "No licensed store offers pickup near you yet.");
  }

  // Greedy set cover: the store that covers the most remaining items wins; ties go to the nearest, then cheapest.
  const remaining = new Set(keys);
  const chosen: { c: Cand; keys: string[] }[] = [];
  while (remaining.size) {
    let best: { c: Cand; keys: string[]; cost: number } | null = null;
    for (const c of cands) {
      if (chosen.some((x) => x.c === c)) continue;
      const covers = [...remaining].filter((k) => c.stock.has(k));
      if (!covers.length) continue;
      const cost = covers.reduce((a, k) => a + c.stock.get(k)!.priceCents * (qty.get(k) ?? 1), 0);
      const better = !best
        || covers.length > best.keys.length
        || (covers.length === best.keys.length && (c.distance ?? 9e9) < (best.c.distance ?? 9e9) - 0.05)
        || (covers.length === best.keys.length && Math.abs((c.distance ?? 9e9) - (best.c.distance ?? 9e9)) <= 0.05 && cost < best.cost);
      if (better) best = { c, keys: covers, cost };
    }
    if (!best) break;
    chosen.push({ c: best.c, keys: best.keys });
    best.keys.forEach((k) => remaining.delete(k));
  }

  const shipments: Shipment[] = chosen.map(({ c, keys: ks }) => {
    const items = ks.map((k) => {
      const product = c.stock.get(k)!;
      const quantity = qty.get(k) ?? 1;
      return { key: k, quantity, product, lineCents: product.priceCents * quantity, grams: product.equivalentGrams * quantity };
    });
    const subtotal = items.reduce((a, i) => a + i.lineCents, 0);
    const fee = fulfilment === "DELIVERY" ? c.retailer.deliveryFeeCents : 0;
    const min = c.retailer.deliveryMinimumCents;
    const problem = fulfilment === "DELIVERY" && subtotal < min
      ? `This delivery is under the store's ${fmt(min)} minimum. Add ${fmt(min - subtotal)} more of these items, or choose pickup.`
      : null;
    return {
      retailer: c.retailer, location: c.location, distanceKm: c.distance, items,
      subtotalCents: subtotal, feeCents: fee, totalCents: subtotal + fee, grams: items.reduce((a, i) => a + i.grams, 0), problem,
    };
  });
  return { fulfilment, shipments, unavailable: [...remaining], blocked: null };
}

const fmt = (c: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(c / 100);

/** A rough arrival window for display: store prep time plus travel. */
export function etaLabel(s: Shipment, fulfilment: Fulfilment) {
  const prep = s.retailer.pickupLeadMinutes;
  const open = openState(s.location.hours, s.location.jurisdictionCode);
  if (!open.open) return `${fulfilment === "PICKUP" ? "Ready" : "Delivered"} after the store opens (${open.label.replace(/^Opens\s*/, "").toLowerCase()})`;
  if (fulfilment === "PICKUP") return `Ready in about ${prep} min`;
  const travel = Math.round(((s.distanceKm ?? 5) / 25) * 60) + 10;
  const lo = prep + travel, hi = lo + 30;
  return `Arrives in about ${lo}–${hi} min`;
}

/**
 * Price a single listing for this buyer: the store that would deliver it to them.
 * Used on product cards and pages so the price shown is the price they'll pay.
 */
export function routedOffer<T extends { retailerId: string; priceCents: number; inventory: { locationId: string; status: string }[] }>(
  offers: T[],
  retailers: Map<string, Listed>,
  point: Point | null,
): { offer: T; distance: number | null; deliverable: boolean } | null {
  let best: { offer: T; distance: number | null; deliverable: boolean } | null = null;
  for (const o of offers) {
    const r = retailers.get(o.retailerId);
    if (!r || !r.acceptsOrders) continue;
    for (const l of r.locations) {
      const st = o.inventory.find((i) => i.locationId === l.id)?.status ?? "OUT";
      if (st === "OUT") continue;
      const d = point && !l.geoApproximate ? km(point, l) : null;
      const deliverable = !!point && l.offersDelivery && d != null && d <= r.deliveryRadiusKm;
      const better = !best
        || (deliverable && !best.deliverable)
        || (deliverable === best.deliverable && (d ?? 9e9) < (best.distance ?? 9e9) - 0.05)
        || (deliverable === best.deliverable && Math.abs((d ?? 9e9) - (best.distance ?? 9e9)) <= 0.05 && o.priceCents < best.offer.priceCents);
      if (better) best = { offer: o, distance: d, deliverable };
    }
  }
  return best;
}
