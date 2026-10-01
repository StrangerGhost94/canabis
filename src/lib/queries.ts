import "server-only";
import { and, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/db";
import { allowedCategories, type Policy } from "./compliance";
import { CATEGORIES, profile as ratioProfile } from "./format";
import { km, openState } from "./geo";
import { trustFor } from "./verification/trust";

const today = () => new Date().toISOString().slice(0, 10);

/** Retailers a customer in this jurisdiction may see: verified, licence verified and current. */
export const listedRetailers = cache(async (region: string) => {
  const rows = await db.query.retailers.findMany({
    where: and(
      eq(schema.retailers.jurisdictionCode, region),
      eq(schema.retailers.status, "VERIFIED"),
      sql`exists (select 1 from licences l where l.retailer_id = ${schema.retailers.id}
                  and l.status = 'VERIFIED' and l.method is distinct from 'DEMO_SIMULATED' and l.expires_at >= ${today()})`,
    ),
    with: {
      locations: { where: eq(schema.locations.active, true) },
      licences: true,
    },
  });
  const updated = await lastInventoryUpdates(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, trust: trustFor(r, r.licences, updated.get(r.id)) }));
});

export async function lastInventoryUpdates(retailerIds: string[]) {
  if (!retailerIds.length) return new Map<string, Date>();
  const rows = await db
    .select({ retailerId: schema.locations.retailerId, at: sql<Date>`max(${schema.inventory.updatedAt})` })
    .from(schema.inventory)
    .innerJoin(schema.locations, eq(schema.inventory.locationId, schema.locations.id))
    .where(inArray(schema.locations.retailerId, retailerIds))
    .groupBy(schema.locations.retailerId);
  return new Map(rows.map((r) => [r.retailerId, new Date(r.at)]));
}

export type DiscoverParams = {
  q?: string;
  category?: string;
  ratio?: "thc" | "cbd" | "balanced";
  max?: number; // dollars
  open?: boolean;
  stock?: boolean;
  sort?: "near" | "price" | "potency" | "name" | "new";
  view?: "products" | "stores";
  brand?: string; // brand slug
  collection?: "new" | "balanced" | "under30" | "cbd";
};

export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-");

export const COLLECTIONS = {
  new: { title: "New arrivals", blurb: "Added by stores in the last 30 days." },
  balanced: { title: "Balanced THC and CBD", blurb: "Labels with comparable THC and CBD." },
  cbd: { title: "Mostly CBD", blurb: "Labels where CBD leads." },
  under30: { title: "Under $30", blurb: "Listings priced under $30 at the store." },
} as const;

export function parseDiscover(sp: Record<string, string | string[] | undefined>): DiscoverParams {
  const s = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;
  const max = Number(s("max"));
  return {
    q: s("q")?.slice(0, 80).trim() || undefined,
    category: CATEGORIES.includes(s("category") ?? "") ? s("category") : undefined,
    ratio: (["thc", "cbd", "balanced"] as const).find((x) => x === s("ratio")),
    max: Number.isFinite(max) && max > 0 ? max : undefined,
    open: s("open") === "1",
    stock: s("stock") === "1",
    sort: (["near", "price", "potency", "name", "new"] as const).find((x) => x === s("sort")),
    view: s("view") === "stores" ? "stores" : "products",
    brand: s("brand")?.slice(0, 60) || undefined,
    collection: (["new", "balanced", "under30", "cbd"] as const).find((x) => x === s("collection")),
  };
}

type Near = { lat: number; lng: number } | null;

export async function discover(policy: Policy, near: Near, input: DiscoverParams) {
  // Collections are saved filters.
  const p: DiscoverParams = { ...input };
  if (p.collection === "balanced") p.ratio = "balanced";
  if (p.collection === "cbd") p.ratio = "cbd";
  if (p.collection === "under30" && policy.allows("retail.prices")) p.max = Math.min(p.max ?? 30, 30);
  if (p.collection === "new") p.sort = p.sort ?? "new";
  if (!policy.allows("retail.directory")) return { products: [], stores: [], blocked: "retail.directory" as const };
  const retailers = await listedRetailers(policy.code);
  const byId = new Map(retailers.map((r) => [r.id, r]));
  const showProducts = policy.allows("retail.products");
  const cats = allowedCategories(policy, CATEGORIES);

  const nearest = (r: (typeof retailers)[number]) => {
    const locs = r.locations.map((l) => ({ ...l, distance: near && !l.geoApproximate ? km(near, l) : null, hoursState: openState(l.hours, l.jurisdictionCode) }));
    locs.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    return locs;
  };

  // Stores matching the text query by name.
  const q = p.q?.toLowerCase();

  let productRows: Awaited<ReturnType<typeof queryProducts>> = [];
  if (showProducts && retailers.length) productRows = await queryProducts(retailers.map((r) => r.id), cats, p);

  const products = productRows
    .map((prod) => {
      const r = byId.get(prod.retailerId)!;
      const locs = nearest(r);
      const stockByLoc = new Map(prod.inventory.map((i) => [i.locationId, i.status]));
      const atLocs = locs.map((l) => ({ ...l, stock: stockByLoc.get(l.id) ?? "OUT" }));
      const best = atLocs.find((l) => l.stock !== "OUT") ?? atLocs[0];
      return { ...prod, retailer: r, best, locations: atLocs };
    })
    .filter((x) => (!p.ratio || ratioProfile(x) === p.ratio))
    .filter((x) => (!p.stock || x.best?.stock !== "OUT"))
    .filter((x) => (!p.open || x.best?.hoursState.open))
    .filter((x) => (!p.brand || slugify(x.brand) === p.brand))
    .filter((x) => (p.collection !== "new" || Date.now() - new Date(x.createdAt).getTime() < 30 * 86400e3));

  const sort = p.sort ?? (near ? "near" : "name");
  products.sort((a, b) => {
    if (sort === "price") return a.priceCents - b.priceCents;
    if (sort === "potency") return (b.thcMax ?? 0) - (a.thcMax ?? 0);
    if (sort === "near") return (a.best?.distance ?? Infinity) - (b.best?.distance ?? Infinity);
    if (sort === "new") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return a.name.localeCompare(b.name);
  });

  const productCountByRetailer = new Map<string, number>();
  for (const x of products) productCountByRetailer.set(x.retailerId, (productCountByRetailer.get(x.retailerId) ?? 0) + 1);

  const anyProductFilter = !!(p.category || p.ratio || p.max || p.stock);
  const stores = retailers
    .map((r) => ({ ...r, locs: nearest(r), matches: productCountByRetailer.get(r.id) ?? 0 }))
    .filter((r) => !q || r.tradeName.toLowerCase().includes(q) || r.locs.some((l) => l.city.toLowerCase().includes(q) || l.name.toLowerCase().includes(q)) || r.matches > 0)
    .filter((r) => !anyProductFilter || r.matches > 0)
    .filter((r) => !p.open || r.locs.some((l) => l.hoursState.open))
    .sort((a, b) => (near ? (a.locs[0]?.distance ?? Infinity) - (b.locs[0]?.distance ?? Infinity) : a.tradeName.localeCompare(b.tradeName)));

  return { products, stores, blocked: null };
}

async function queryProducts(retailerIds: string[], categories: string[], p: DiscoverParams) {
  const where = [
    inArray(schema.products.retailerId, retailerIds),
    eq(schema.products.status, "ACTIVE"),
    inArray(schema.products.category, categories as (typeof schema.categoryEnum.enumValues)[number][]),
  ];
  if (p.category) where.push(eq(schema.products.category, p.category as (typeof schema.categoryEnum.enumValues)[number]));
  if (p.max) where.push(lte(schema.products.priceCents, Math.round(p.max * 100)));
  if (p.q) {
    const like = `%${p.q.replace(/[%_\\]/g, (c) => "\\" + c)}%`;
    where.push(or(
      ilike(schema.products.name, like), ilike(schema.products.brand, like), ilike(schema.products.size, like),
      sql`exists (select 1 from retailers r where r.id = ${schema.products.retailerId} and r.trade_name ilike ${like})`,
    )!);
  }
  return db.query.products.findMany({
    where: and(...where),
    with: { inventory: true },
    limit: 300,
  });
}

/** Single store page data, including non-listed states so direct links explain themselves. */
export async function storeBySlug(slug: string) {
  const r = await db.query.retailers.findFirst({
    where: eq(schema.retailers.slug, slug),
    with: { locations: { where: eq(schema.locations.active, true) }, licences: true, jurisdiction: true },
  });
  if (!r) return null;
  const updated = await lastInventoryUpdates([r.id]);
  return { ...r, trust: trustFor(r, r.licences, updated.get(r.id)) };
}

export async function productsForStore(retailerId: string, categories: string[]) {
  return db.query.products.findMany({
    where: and(
      eq(schema.products.retailerId, retailerId),
      eq(schema.products.status, "ACTIVE"),
      inArray(schema.products.category, categories as (typeof schema.categoryEnum.enumValues)[number][]),
    ),
    with: { inventory: true },
    orderBy: (pr, { asc }) => [asc(pr.category), asc(pr.name)],
  });
}


/** Why this store's products can't go in a cart here, or null if they can. */
export function orderBlock(policy: { allows: (k: "orders.online") => boolean; name: string }, r: { acceptsOrders: boolean; tradeName: string }) {
  if (!policy.allows("orders.online")) return `Ordering through Cairn isn't available in ${policy.name} yet.`;
  if (!r.acceptsOrders) return `${r.tradeName} sells in store only.`;
  return null;
}


/**
 * The marketplace view: the same product (brand + name + size) sold by several
 * stores becomes one listing. The lead offer is the first in the caller's sort
 * that is in stock; the rest are competing offers.
 */
export function toListings<T extends { id: string; brand: string; name: string; size: string; priceCents: number; retailerId: string; best?: { stock: string } | undefined }>(products: T[]) {
  const groups = new Map<string, T[]>();
  for (const p of products) {
    const key = `${p.brand}|${p.name}|${p.size}`.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups.values()].map((offers) => {
    const lead = offers.find((o) => o.best?.stock !== "OUT") ?? offers[0];
    const stores = new Set(offers.map((o) => o.retailerId)).size;
    return { ...lead, offerCount: stores, minPriceCents: Math.min(...offers.map((o) => o.priceCents)) };
  });
}

/** Brands with listed products in this jurisdiction. */
export async function brandsFor(policy: Policy) {
  if (!policy.allows("retail.directory") || !policy.allows("retail.products")) return [];
  const retailers = await listedRetailers(policy.code);
  if (!retailers.length) return [];
  const cats = allowedCategories(policy, CATEGORIES) as (typeof schema.categoryEnum.enumValues)[number][];
  const rows = await db
    .select({ brand: schema.products.brand, category: schema.products.category, retailerId: schema.products.retailerId, name: schema.products.name, imageKey: schema.products.imageKey })
    .from(schema.products)
    .where(and(inArray(schema.products.retailerId, retailers.map((r) => r.id)), eq(schema.products.status, "ACTIVE"), inArray(schema.products.category, cats)));
  const m = new Map<string, { name: string; slug: string; products: Set<string>; stores: Set<string>; categories: Set<string>; sample: { category: string; brand: string; name: string; imageKey: string | null } }>();
  for (const r of rows) {
    const slug = slugify(r.brand);
    const b = m.get(slug) ?? { name: r.brand, slug, products: new Set(), stores: new Set(), categories: new Set(), sample: r };
    b.products.add(r.name); b.stores.add(r.retailerId); b.categories.add(r.category);
    m.set(slug, b);
  }
  return [...m.values()].map((b) => ({ name: b.name, slug: b.slug, productCount: b.products.size, storeCount: b.stores.size, categories: [...b.categories], sample: b.sample }))
    .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name));
}
