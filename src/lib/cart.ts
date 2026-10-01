import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db, schema } from "@/db";
import { UserFacingError } from "./actions/result";
import { allowedCategories, getPolicy, RESTRICTED_CATEGORY_RULE } from "./compliance";
import { isProd } from "./env";
import { CATEGORIES } from "./format";
import { getSession } from "./auth/session";
import { listedRetailers } from "./queries";

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

/** The cart with live product, stock and store data, and a list of anything that blocks checkout. */
export const getCart = cache(async () => {
  const id = await getCartId();
  if (!id) return null;
  const cart = await db.query.carts.findFirst({
    where: eq(schema.carts.id, id),
    with: { items: { with: { product: { with: { inventory: true } } }, orderBy: (i, { asc }) => asc(i.addedAt) }, retailer: { with: { locations: true } } },
  });
  if (!cart || !cart.retailer || cart.items.length === 0) return cart ? { ...cart, lines: [], subtotalCents: 0, grams: 0, count: 0, problems: [] as string[], listed: null, location: null } : null;

  const listed = (await listedRetailers(cart.retailer.jurisdictionCode)).find((r) => r.id === cart.retailerId) ?? null;
  const location = cart.retailer.locations.find((l) => l.id === cart.locationId && l.active) ?? cart.retailer.locations.find((l) => l.active) ?? null;
  const lines = cart.items.map((i) => {
    const stock = i.product.inventory.find((x) => x.locationId === location?.id)?.status ?? "OUT";
    const available = i.product.status === "ACTIVE" && stock !== "OUT";
    return { ...i, stock, available, lineCents: i.product.priceCents * i.quantity, grams: i.product.equivalentGrams * i.quantity };
  });
  const subtotalCents = lines.filter((l) => l.available).reduce((a, l) => a + l.lineCents, 0);
  const grams = lines.filter((l) => l.available).reduce((a, l) => a + l.grams, 0);
  const problems: string[] = [];
  if (!listed) problems.push(`${cart.retailer.tradeName} isn't taking orders on Cairn right now.`);
  if (lines.some((l) => !l.available)) problems.push(`Some items aren't available at ${location?.name ?? "this location"}. They won't be included.`);
  if (grams > POSSESSION_LIMIT_G) problems.push(`This order is ${round(grams)} g of dried-cannabis equivalent. The legal limit you can carry in public is ${POSSESSION_LIMIT_G} g.`);
  return { ...cart, lines, subtotalCents, grams, count: lines.reduce((a, l) => a + l.quantity, 0), problems, listed, location };
});

export const round = (g: number) => (Math.round(g * 10) / 10).toString();

/** Checks a product can be ordered by this shopper at all. */
async function orderableProduct(productId: string) {
  const p = await db.query.products.findFirst({ where: and(eq(schema.products.id, productId), eq(schema.products.status, "ACTIVE")), with: { retailer: true } });
  if (!p) throw new UserFacingError("That product isn't available any more.");
  const policy = await getPolicy(p.retailer.jurisdictionCode);
  if (!policy.allows("orders.online")) throw new UserFacingError(policy.offMessage("orders.online"));
  const rule = RESTRICTED_CATEGORY_RULE[p.category];
  if ((rule && !policy.allows(rule)) || !allowedCategories(policy, CATEGORIES).includes(p.category)) throw new UserFacingError("That product can't be ordered here.");
  const listed = (await listedRetailers(p.retailer.jurisdictionCode)).find((r) => r.id === p.retailerId);
  if (!listed || !p.retailer.acceptsOrders) throw new UserFacingError(`${p.retailer.tradeName} isn't taking orders on Cairn right now.`);
  return { p, listed };
}

export type AddResult = { ok: true; count: number } | { ok: false; conflict: { current: string; next: string } } | { ok: false; error: string };

export async function addToCart(productId: string, quantity: number, opts: { replace?: boolean; locationId?: string } = {}): Promise<AddResult> {
  const { p, listed } = await orderableProduct(productId);
  const s = await getSession();
  if (s && s.user.jurisdictionCode !== p.retailer.jurisdictionCode) {
    return { ok: false, error: `This store is outside ${s.user.jurisdictionCode}. You can only order from stores in your own province or territory.` };
  }
  const cartId = await ensureCart();
  const cart = await db.query.carts.findFirst({ where: eq(schema.carts.id, cartId), with: { items: { with: { product: true } }, retailer: true } });
  if (cart!.items.length && cart!.retailerId && cart!.retailerId !== p.retailerId) {
    if (!opts.replace) return { ok: false, conflict: { current: cart!.retailer!.tradeName, next: p.retailer.tradeName } };
    await db.delete(schema.cartItems).where(eq(schema.cartItems.cartId, cartId));
    cart!.items = [];
  }
  const existing = cart!.items.find((i) => i.productId === productId);
  const qty = Math.min(MAX_PER_ITEM, (existing?.quantity ?? 0) + quantity);
  const others = cart!.items.filter((i) => i.productId !== productId).reduce((a, i) => a + i.product.equivalentGrams * i.quantity, 0);
  if (others + p.equivalentGrams * qty > POSSESSION_LIMIT_G) {
    return { ok: false, error: `Adding this would take your order over the ${POSSESSION_LIMIT_G} g public-possession limit.` };
  }
  const locationId = opts.locationId && listed.locations.some((l) => l.id === opts.locationId) ? opts.locationId : cart!.retailerId === p.retailerId ? cart!.locationId : listed.locations[0]?.id;
  await db.update(schema.carts).set({ retailerId: p.retailerId, locationId: locationId ?? null, updatedAt: new Date() }).where(eq(schema.carts.id, cartId));
  await db.insert(schema.cartItems).values({ cartId, productId, quantity: qty })
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

export async function setCartLocation(locationId: string) {
  const cartId = await getCartId();
  if (!cartId) return;
  const cart = await db.query.carts.findFirst({ where: eq(schema.carts.id, cartId) });
  const loc = await db.query.locations.findFirst({ where: and(eq(schema.locations.id, locationId), eq(schema.locations.active, true)) });
  if (!loc || loc.retailerId !== cart?.retailerId) throw new UserFacingError("Choose one of this store's locations.");
  await db.update(schema.carts).set({ locationId }).where(eq(schema.carts.id, cartId));
}

export async function clearCart(cartId: string) {
  await db.delete(schema.cartItems).where(eq(schema.cartItems.cartId, cartId));
  await db.update(schema.carts).set({ retailerId: null, locationId: null }).where(eq(schema.carts.id, cartId));
}

export async function cartCount() {
  const id = await getCartId();
  if (!id) return 0;
  const items = await db.query.cartItems.findMany({ where: eq(schema.cartItems.cartId, id), columns: { quantity: true } });
  return items.reduce((a, i) => a + i.quantity, 0);
}
