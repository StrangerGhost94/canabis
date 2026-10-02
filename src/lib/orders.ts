import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { UserFacingError } from "./actions/result";
import { readAttribution, visitorHash } from "./attribution";
import { audit } from "./audit";
import { getPolicy } from "./compliance";
import { shortCode } from "./crypto";
import { money } from "./format";
import { geocode, resolvePlace, TIMEZONES } from "./geo";
import { notify } from "./notify";
import { clientIpHash } from "./request";
import { clearCart, getCart, POSSESSION_LIMIT_G, round } from "./cart";
import { listingKey, planRoute } from "./routing";
import type { SessionUser } from "./auth/session";

export type OrderStatus = (typeof schema.orderStatus.enumValues)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: "Waiting for the store",
  ACCEPTED: "Being prepared",
  READY: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "No store could fill it",
};
export const STATUS_TONE: Record<OrderStatus, string> = {
  PLACED: "warn", ACCEPTED: "signal", READY: "ok", OUT_FOR_DELIVERY: "ok", COMPLETED: "idle", CANCELLED: "idle", REJECTED: "bad",
};
export const OPEN_STATUSES: OrderStatus[] = ["PLACED", "ACCEPTED", "READY", "OUT_FOR_DELIVERY"];

/** First letter of a Canadian postal code identifies its province or territory. */
const POSTAL_PREFIX: Record<string, string> = {
  NL: "A", NS: "B", PE: "C", NB: "E", QC: "GHJ", ON: "KLMNP", MB: "R", SK: "S", AB: "T", BC: "V", NT: "X", NU: "X", YT: "Y",
};
export const postalInProvince = (postal: string, jur: string) => (POSTAL_PREFIX[jur] ?? "").includes(postal.trim().toUpperCase()[0] ?? "?");

export async function placeOrder(user: SessionUser, input: {
  fulfilment: "PICKUP" | "DELIVERY";
  contactName: string;
  contactPhone: string;
  notes?: string;
  address?: { street: string; unit?: string; city: string; postalCode: string };
}) {
  if (user.idStatus !== "VERIFIED") throw new UserFacingError("Verify your ID before placing an order. It takes a couple of minutes and you only do it once.");
  const cart = await getCart();
  if (!cart || cart.lines.length === 0) throw new UserFacingError("Your cart is empty.");
  const jur = user.jurisdictionCode;
  const policy = await getPolicy(jur);
  if (!policy.allows("orders.online")) throw new UserFacingError(policy.offMessage("orders.online"));

  // Where it's going decides which store fills it.
  let point: { lat: number; lng: number } | null = null;
  let address: (typeof schema.orders.$inferInsert)["deliveryAddress"] = null;
  if (input.fulfilment === "DELIVERY") {
    if (!input.address) throw new UserFacingError("Enter a delivery address.");
    if (!postalInProvince(input.address.postalCode, jur)) throw new UserFacingError(`Stores can only deliver within ${policy.name}. Change your province in settings if you've moved.`);
    const g = await geocode(`${input.address.street}, ${input.address.city} ${input.address.postalCode}`) ?? await geocode(input.address.postalCode) ?? resolvePlace(input.address.city);
    if (!g) throw new UserFacingError("We couldn't find that address. Check the street and postal code.");
    point = { lat: g.lat, lng: g.lng };
    address = { ...input.address, lat: g.lat, lng: g.lng };
    await db.update(schema.users).set({ address: { ...input.address, lat: g.lat, lng: g.lng, label: `${input.address.street}, ${input.address.city}` } }).where(eq(schema.users.id, user.id));
  } else {
    point = cart.point ? { lat: cart.point.lat, lng: cart.point.lng } : null;
  }

  const plan = await planRoute({ jurisdictionCode: jur, point, fulfilment: input.fulfilment, lines: cart.lines.map((l) => ({ key: l.key, quantity: l.quantity })) });
  if (plan.blocked) throw new UserFacingError(plan.blocked);
  if (!plan.shipments.length) throw new UserFacingError("None of these items can be delivered to you right now.");
  const stuck = plan.shipments.find((x) => x.problem);
  if (stuck) throw new UserFacingError(stuck.problem!);
  const grams = plan.shipments.reduce((a, x) => a + x.grams, 0);
  if (grams > POSSESSION_LIMIT_G) throw new UserFacingError(`This order is ${round(grams)} g of dried-cannabis equivalent, over the ${POSSESSION_LIMIT_G} g limit.`);

  const a = await readAttribution();
  const placed: (typeof schema.orders.$inferSelect)[] = [];
  for (const sh of plan.shipments) {
    const r = sh.retailer;
    const attributed = a && a.retailerId === r.id ? a : null;
    const number = `C-${shortCode(6).toUpperCase()}`;
    const order = await db.transaction(async (tx) => {
      const [o] = await tx.insert(schema.orders).values({
        number, userId: user.id, retailerId: r.id, locationId: sh.location.id, fulfilment: input.fulfilment,
        subtotalCents: sh.subtotalCents, deliveryFeeCents: sh.feeCents, totalCents: sh.totalCents, equivalentGrams: sh.grams,
        contactName: input.contactName, contactPhone: input.contactPhone, notes: input.notes || null,
        deliveryAddress: address, jurisdictionCode: jur,
        partnerId: attributed?.partnerId ?? null, campaignId: attributed?.campaignId ?? null,
      }).returning();
      await tx.insert(schema.orderItems).values(sh.items.map((l) => ({
        orderId: o.id, productId: l.product.id, name: l.product.name, brand: l.product.brand, category: l.product.category,
        size: l.product.size, unitPriceCents: l.product.priceCents, quantity: l.quantity, equivalentGrams: l.product.equivalentGrams,
      })));
      await tx.insert(schema.orderEvents).values({ orderId: o.id, status: "PLACED", actorId: user.id, note: `Routed automatically to the nearest licensed store${sh.distanceKm != null ? ` (${sh.distanceKm.toFixed(1)} km)` : ""}.` });
      return o;
    });
    placed.push(order);
    await db.insert(schema.referralEvents).values({
      type: "HANDOFF", retailerId: r.id, visitorHash: await visitorHash(), ipHash: await clientIpHash(), jurisdictionCode: jur,
      partnerId: attributed?.partnerId ?? null, campaignId: attributed?.campaignId ?? null,
    });
    await audit({ actorId: user.id, action: "order.place", targetType: "order", targetId: order.id, metadata: { number, retailerId: r.id, totalCents: order.totalCents, routed: true } });
    await notify(await staffOf(r.id), {
      title: `New ${input.fulfilment === "PICKUP" ? "pickup" : "delivery"} order ${number}`,
      body: `${sh.items.reduce((x, l) => x + l.quantity, 0)} items, ${money(order.totalCents)}. Accept it to let the customer know.`,
      href: `/retailer/orders/${order.id}`,
    });
  }
  const routedKeys = new Set(plan.shipments.flatMap((x) => x.items.map((i) => i.key)));
  await clearCart(cart.id, cart.lines.filter((l) => routedKeys.has(l.key)).map((l) => l.productId));
  return placed;
}

/**
 * A store declined: send the whole order to the next-nearest licensed store
 * that can fill all of it, so the buyer doesn't have to start again. Returns
 * true when the order found a new store.
 */
async function reroute(o: typeof schema.orders.$inferSelect & { retailer: typeof schema.retailers.$inferSelect }, actorId: string, reason: string) {
  const items = await db.query.orderItems.findMany({ where: eq(schema.orderItems.orderId, o.id) });
  const loc = await db.query.locations.findFirst({ where: eq(schema.locations.id, o.locationId) });
  const point = o.deliveryAddress?.lat != null ? { lat: o.deliveryAddress.lat, lng: o.deliveryAddress.lng! } : loc ? { lat: loc.lat, lng: loc.lng } : null;
  const exclude = [...o.routingExcluded, o.retailerId];
  const plan = await planRoute({ jurisdictionCode: o.jurisdictionCode, point, fulfilment: o.fulfilment, exclude, lines: items.map((i) => ({ key: listingKey(i), quantity: i.quantity })) });
  if (plan.shipments.length !== 1 || plan.unavailable.length || plan.shipments[0].problem) return false;
  const sh = plan.shipments[0];
  const changed = sh.totalCents !== o.totalCents;
  await db.transaction(async (tx) => {
    await tx.update(schema.orders).set({
      retailerId: sh.retailer.id, locationId: sh.location.id, subtotalCents: sh.subtotalCents, deliveryFeeCents: sh.feeCents,
      totalCents: sh.totalCents, equivalentGrams: sh.grams, routingExcluded: exclude, partnerId: null, campaignId: null,
    }).where(and(eq(schema.orders.id, o.id), eq(schema.orders.status, "PLACED")));
    await tx.delete(schema.orderItems).where(eq(schema.orderItems.orderId, o.id));
    await tx.insert(schema.orderItems).values(sh.items.map((l) => ({
      orderId: o.id, productId: l.product.id, name: l.product.name, brand: l.product.brand, category: l.product.category,
      size: l.product.size, unitPriceCents: l.product.priceCents, quantity: l.quantity, equivalentGrams: l.product.equivalentGrams,
    })));
    await tx.insert(schema.orderEvents).values({ orderId: o.id, status: "PLACED", actorId, note: `${o.retailer.tradeName} couldn't fill it (${reason}). Sent to another licensed store nearby.` });
  });
  await audit({ actorId, action: "order.reroute", targetType: "order", targetId: o.id, metadata: { from: o.retailerId, to: sh.retailer.id, reason } });
  await notify([o.userId], {
    title: `Order ${o.number} moved to another licensed store`,
    body: changed ? `The first store couldn't fill it, so ${sh.retailer.tradeName} will. New total: ${money(sh.totalCents)}. You can cancel any time before it's accepted.` : `The first store couldn't fill it, so ${sh.retailer.tradeName} will. Nothing else changes.`,
    href: `/orders/${o.id}`,
  });
  await notify(await staffOf(sh.retailer.id), {
    title: `New ${o.fulfilment === "PICKUP" ? "pickup" : "delivery"} order ${o.number}`,
    body: `${sh.items.reduce((x, l) => x + l.quantity, 0)} items, ${money(sh.totalCents)}. Accept it to let the customer know.`,
    href: `/retailer/orders/${o.id}`,
  });
  return true;
}

async function staffOf(retailerId: string) {
  return (await db.select({ u: schema.retailerMembers.userId }).from(schema.retailerMembers).where(eq(schema.retailerMembers.retailerId, retailerId))).map((x) => x.u);
}

/** Allowed transitions, and who may make them. */
const FLOW: Record<OrderStatus, Partial<Record<OrderStatus, "store" | "customer">>> = {
  PLACED: { ACCEPTED: "store", REJECTED: "store", CANCELLED: "customer" },
  ACCEPTED: { READY: "store", OUT_FOR_DELIVERY: "store", CANCELLED: "store" },
  READY: { COMPLETED: "store", CANCELLED: "store" },
  OUT_FOR_DELIVERY: { COMPLETED: "store", CANCELLED: "store" },
  COMPLETED: {}, CANCELLED: {}, REJECTED: {},
};

export async function transitionOrder(orderId: string, to: OrderStatus, actor: { id: string; as: "store" | "customer"; retailerId?: string }, opts: { note?: string; readyMinutes?: number; idChecked?: boolean } = {}) {
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), with: { retailer: true } });
  if (!o) throw new UserFacingError("Order not found.");
  if (actor.as === "store" && o.retailerId !== actor.retailerId) throw new UserFacingError("Order not found.");
  if (actor.as === "customer" && o.userId !== actor.id) throw new UserFacingError("Order not found.");
  if (FLOW[o.status][to] !== actor.as) throw new UserFacingError(`This order is ${STATUS_LABEL[o.status].toLowerCase()} and can't be changed that way.`);
  if (to === "READY" && o.fulfilment !== "PICKUP") throw new UserFacingError("Delivery orders go out for delivery instead.");
  if (to === "OUT_FOR_DELIVERY" && o.fulfilment !== "DELIVERY") throw new UserFacingError("Pickup orders are marked ready instead.");
  if (to === "COMPLETED" && !opts.idChecked) throw new UserFacingError("Confirm you checked government ID showing the customer is of legal age.");
  if ((to === "REJECTED" || (to === "CANCELLED" && actor.as === "store")) && !opts.note) throw new UserFacingError("Give the customer a reason.");
  if (to === "REJECTED" && actor.as === "store" && await reroute(o, actor.id, opts.note!)) return;

  const patch: Partial<typeof schema.orders.$inferInsert> = { status: to };
  if (to === "ACCEPTED") patch.readyBy = new Date(Date.now() + (opts.readyMinutes ?? o.retailer.pickupLeadMinutes) * 60e3);
  if (to === "COMPLETED") patch.idChecked = true;
  if (to === "REJECTED" || to === "CANCELLED") patch.cancelReason = opts.note ?? "Cancelled by the customer";
  await db.update(schema.orders).set(patch).where(and(eq(schema.orders.id, o.id), eq(schema.orders.status, o.status)));
  await db.insert(schema.orderEvents).values({ orderId: o.id, status: to, actorId: actor.id, note: opts.note ?? null });
  await audit({ actorId: actor.id, action: `order.${to.toLowerCase()}`, targetType: "order", targetId: o.id, metadata: { from: o.status, note: opts.note } });

  if (to === "COMPLETED" && o.partnerId) await recordOrderConversion(o);

  const store = o.retailer.tradeName;
  const message: Partial<Record<OrderStatus, () => { title: string; body: string } | undefined>> = {
    ACCEPTED: () => ({ title: `${store} accepted order ${o.number}`, body: o.fulfilment === "PICKUP" ? `It should be ready around ${fmtTime(patch.readyBy!, o.jurisdictionCode)}. Bring government ID.` : `It's being prepared. Have government ID ready at the door.` }),
    REJECTED: () => ({ title: `${store} couldn't take order ${o.number}`, body: opts.note ?? "" }),
    READY: () => ({ title: `Order ${o.number} is ready for pickup`, body: `Bring government ID. You'll pay ${store} at the counter.` }),
    OUT_FOR_DELIVERY: () => ({ title: `Order ${o.number} is on its way`, body: "The driver will check government ID before handing it over." }),
    COMPLETED: () => ({ title: `Order ${o.number} complete`, body: `Thanks for ordering from ${store}.` }),
    CANCELLED: () => actor.as === "store" ? { title: `${store} cancelled order ${o.number}`, body: opts.note ?? "" } : undefined,
  };
  const m = message[to]?.();
  if (m && actor.as === "store") await notify([o.userId], { ...m, href: `/orders/${o.id}` });
  if (actor.as === "customer") await notify(await staffOf(o.retailerId), { title: `Order ${o.number} was cancelled by the customer`, body: "No action needed.", href: `/retailer/orders/${o.id}` });
}

async function recordOrderConversion(o: typeof schema.orders.$inferSelect) {
  const policy = await getPolicy(o.jurisdictionCode);
  const tie = await db.query.partnerRetailers.findFirst({ where: and(eq(schema.partnerRetailers.partnerId, o.partnerId!), eq(schema.partnerRetailers.retailerId, o.retailerId)) });
  const paid = policy.allows("partner.compensation") && tie?.status === "ACTIVE" && !!tie.commissionBps;
  await db.insert(schema.conversions).values({
    retailerId: o.retailerId, campaignId: o.campaignId, partnerId: o.partnerId, externalRef: o.number, orderCents: o.subtotalCents,
    reportedVia: "order", status: "CONFIRMED",
    commissionCents: paid ? Math.round((o.subtotalCents * tie!.commissionBps!) / 10000) : null,
    commissionStatus: paid ? "PENDING" : "NOT_APPLICABLE",
  }).onConflictDoNothing();
}

export const fmtTime = (d: Date, jur = "ON") => d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", timeZone: TIMEZONES[jur] ?? "America/Toronto" });
