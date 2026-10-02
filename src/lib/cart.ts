import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db, schema } from "@/db";
import { UserFacingError } from "./actions/result";
import { allowedCategories, getPolicy, RESTRICTED_CATEGORY_RULE } from "./compliance";
import { isProd } from "./env";
import { CATEGORIES } from "./format";
import { getSession } from "./auth/session";
import { listedRetailers } from "./queries";
import { listingKey, planRoute } from "./routing";
import { getVisitor } from "./visitor";

export const CART_COOKIE = "cairn_cart";
/** Federal public-possession limit, in grams of dried cannabis or equivalent. */
export const POSSESSION_LIMIT_G = 30;
export const MAX_PER_ITEM = 10;

/** Resolve the current cart: the signed-in user's, else this browser's. Never creates one. */
export const getCartId = cache(async (): Promise<string | null> => {
  const s = await getSession();
  const jar = await cookies();
  const cookieId = jar.get(CART_COOKIE)?.value ?? null;
  if (s) {
    const mine = await db.query.carts.findFirst({ where: eq(schema.carts.userId, s.user.id), orderBy: (c, { desc }) => desc(c.updatedAt), with: { items: { columns: { productId: true } } } });
    const anonCart = cookieId ? await db.query.carts.findFirst({ where: and(eq(schema.carts.id, cookieId), isNull(schema.carts.userId)), with: { items: { columns: { productId: true } } } }) : null;
    // A cart built before signing in wins over an empty one left on the account.
    if (mine && anonCart && anonCart.items.length > 0 && mine.items.length === 0) {
      await db.delete(schema.carts).where(eq(schema.carts.id, mine.id));
      await db.update(schema.carts).set({ userId: s.user.id }).where(eq(schema.carts.id, anonCart.id));
      return anonCart.id;
    }
    if (mine) return mine.id;
    if (cookieId) {
      // Adopt the anonymous cart this browser built before signing in.
      const anon = await db.query.carts.findFirst({ where: and(eq(schema.carts.id, cookieId), isNull(schema.carts.userId)) });
      if (anon) {
        await db.update(schema.carts).set({ userId: s.user.id }).where(eq(schema.carts.id, anon.id));
        return anon.id;
      }
    }
    return null;
  }
  if (!cookieId) return null;
  const anon = await db.query.carts.findFirst({ where: and(eq(schema.carts.id, cookieId), isNull(schema.carts.userId)), columns: { id: true } });
  return anon?.id ?? null;
});

async function ensureCart() {
  const existing = await getCartId();
  if (existing) return existing;
  const s = await getSession();
  const [c] = await db.insert(schema.carts).values({ userId: s?.user.id ?? null }).returning();
  if (!s) {
    (await cookies()).set(CART_COOKIE, c.id, { httpOnly: true, sameSite: "lax", secure: isProd, path: "/", maxAge: 60 * 60 * 24 * 14 });
  }
  return c.id;
}

export type CartView = NonNullable<Awaited<ReturnType<typeof getCart>>>;

/** Where this buyer receives orders: their saved address, else the area they set while browsing. */
export async function buyerPoint() {
  const s = await getSession();
  if (s?.user.address) return { lat: s.user.address.lat, lng: s.user.address.lng, label: s.user.address.label, saved: true };
  const v = await getVisitor();
  return v.near ? { lat: v.near.lat, lng: v.near.lng, label: v.near.label, saved: false } : null;
}

/**
 * The cart, routed. Items are listings (brand + name + size), not tied to a
 * store; the plan says which licensed store will fill each one for this buyer.
 */
export const getCart = cache(async () => {
  const id = await getCartId();
  if (!id) return null;
  const cart = await db.query.carts.findFirst({
    where: eq(schema.carts.id, id),
    with: { items: { with: { product: { with: { retailer: { columns: { jurisdictionCode: true } } } } }, orderBy: (i, { asc }) => asc(i.addedAt) } },
  });
  if (!cart) return null;
  const v = await getVisitor();
  const jur = v.region ?? cart.items[0]?.product.retailer.jurisdictionCode ?? null;
  const point = await buyerPoint();
  const lines = cart.items.map((i) => ({ ...i, key: listingKey(i.product) }));
  const base = { ...cart, lines, count: lines.reduce((a, l) => a + l.quantity, 0), point, jurisdictionCode: jur };
  if (!lines.length || !jur) {
    return { ...base, plan: null, subtotalCents: 0, feeCents: 0, totalCents: 0, grams: 0, problems: [] as string[], canCheckout: false };
  }
  const plan = await planRoute({ jurisdictionCode: jur, point, fulfilment: cart.fulfilment, lines: lines.map((l) => ({ key: l.key, quantity: l.quantity })) });
  const subtotalCents = plan.shipments.reduce((a, x) => a + x.subtotalCents, 0);
  const feeCents = plan.shipments.reduce((a, x) => a + x.feeCents, 0);
  const grams = plan.shipments.reduce((a, x) => a + x.grams, 0);
  const problems: string[] = [];
  if (plan.blocked) problems.push(plan.blocked);
  if (plan.unavailable.length && !plan.blocked) problems.push(`${plan.unavailable.length === 1 ? "One item isn't" : `${plan.unavailable.length} items aren't`} available ${cart.fulfilment === "DELIVERY" ? "for delivery to you" : "for pickup near you"} right now. ${plan.unavailable.length === 1 ? "It" : "They"} won't be included.`);
  for (const sh of plan.shipments) if (sh.problem) problems.push(sh.problem);
  if (grams > POSSESSION_LIMIT_G) problems.push(`This order is ${round(grams)} g of dried-cannabis equivalent. The legal limit you can carry in public is ${POSSESSION_LIMIT_G} g.`);
  const canCheckout = plan.shipments.length > 0 && !plan.shipments.some((x) => x.problem) && grams <= POSSESSION_LIMIT_G;
  return { ...base, plan, subtotalCents, feeCents, totalCents: subtotalCents + feeCents, grams, problems, canCheckout };
});

export const round = (g: number) => (Math.round(g * 10) / 10).toString();

/** Checks a listing can be ordered by this shopper at all. */
async function orderableProduct(productId: string) {
  const p = await db.query.products.findFirst({ where: and(eq(schema.products.id, productId), eq(schema.products.status, "ACTIVE")), with: { retailer: true } });
  if (!p) throw new UserFacingError("That product isn't available any more.");
  const policy = await getPolicy(p.retailer.jurisdictionCode);
  if (!policy.allows("orders.online")) throw new UserFacingError(policy.offMessage("orders.online"));
  const rule = RESTRICTED_CATEGORY_RULE[p.category];
  if ((rule && !policy.allows(rule)) || !allowedCategories(policy, CATEGORIES).includes(p.category)) throw new UserFacingError("That product can't be ordered here.");
  const listed = await listedRetailers(p.retailer.jurisdictionCode);
  if (!listed.some((r) => r.acceptsOrders)) throw new UserFacingError(`Ordering isn't open in ${policy.name} yet.`);
  return { p };
}

export type AddResult = { ok: true; count: number } | { ok: false; error: string };

export async function addToCart(productId: string, quantity: number): Promise<AddResult> {
  const { p } = await orderableProduct(productId);
  const v = await getVisitor();
  const region = v.user?.jurisdictionCode ?? v.region;
  if (region && region !== p.retailer.jurisdictionCode) {
    return { ok: false, error: "That product is sold in another province. You can only order where you live." };
  }
  const cartId = await ensureCart();
  const cart = await db.query.carts.findFirst({ where: eq(schema.carts.id, cartId), with: { items: { with: { product: true } } } });
  const key = listingKey(p);
  // The same listing from another store is the same line.
  const existing = cart!.items.find((i) => listingKey(i.product) === key);
  const lineProductId = existing?.productId ?? productId;
  const qty = Math.min(MAX_PER_ITEM, (existing?.quantity ?? 0) + quantity);
  const others = cart!.items.filter((i) => i.productId !== lineProductId).reduce((a, i) => a + i.product.equivalentGrams * i.quantity, 0);
  if (others + p.equivalentGrams * qty > POSSESSION_LIMIT_G) {
    return { ok: false, error: `Adding this would take your order over the ${POSSESSION_LIMIT_G} g public-possession limit.` };
  }
  await db.update(schema.carts).set({ updatedAt: new Date() }).where(eq(schema.carts.id, cartId));
  await db.insert(schema.cartItems).values({ cartId, productId: lineProductId, quantity: qty })
    .onConflictDoUpdate({ target: [schema.cartItems.cartId, schema.cartItems.productId], set: { quantity: qty } });
  const all = await db.query.cartItems.findMany({ where: eq(schema.cartItems.cartId, cartId) });
  return { ok: true, count: all.reduce((a, i) => a + i.quantity, 0) };
}

export async function setQuantity(productId: string, quantity: number) {
  const cartId = await getCartId();
  if (!cartId) return;
  if (quantity <= 0) {
    await db.delete(schema.cartItems).where(and(eq(schema.cartItems.cartId, cartId), eq(schema.cartItems.productId, productId)));
  } else {
    const cart = await db.query.carts.findFirst({ where: eq(schema.carts.id, cartId), with: { items: { with: { product: true } } } });
    const target = cart?.items.find((i) => i.productId === productId);
    if (!target) return;
    const q = Math.min(MAX_PER_ITEM, quantity);
    const others = cart!.items.filter((i) => i.productId !== productId).reduce((a, i) => a + i.product.equivalentGrams * i.quantity, 0);
    if (others + target.product.equivalentGrams * q > POSSESSION_LIMIT_G) throw new UserFacingError(`That would take your order over the ${POSSESSION_LIMIT_G} g public-possession limit.`);
    await db.update(schema.cartItems).set({ quantity: q }).where(and(eq(schema.cartItems.cartId, cartId), eq(schema.cartItems.productId, productId)));
  }
  await db.update(schema.carts).set({ updatedAt: new Date() }).where(eq(schema.carts.id, cartId));
}

export async function setFulfilment(f: "DELIVERY" | "PICKUP") {
  const cartId = await ensureCart();
  await db.update(schema.carts).set({ fulfilment: f, updatedAt: new Date() }).where(eq(schema.carts.id, cartId));
}

export async function clearCart(cartId: string, productIds?: string[]) {
  if (productIds) await db.delete(schema.cartItems).where(and(eq(schema.cartItems.cartId, cartId), inArray(schema.cartItems.productId, productIds)));
  else await db.delete(schema.cartItems).where(eq(schema.cartItems.cartId, cartId));
  await db.update(schema.carts).set({ retailerId: null, locationId: null }).where(eq(schema.carts.id, cartId));
}

export async function cartCount() {
  const id = await getCartId();
  if (!id) return 0;
  const items = await db.query.cartItems.findMany({ where: eq(schema.cartItems.cartId, id), columns: { quantity: true } });
  return items.reduce((a, i) => a + i.quantity, 0);
}
