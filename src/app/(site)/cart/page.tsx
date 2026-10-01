import Link from "next/link";
import { chooseCartLocation } from "@/app/actions/cart";
import { PackArt } from "@/components/pack-art";
import { LimitMeter } from "@/components/shop/limit-meter";
import { QtyStepper } from "@/components/shop/qty-form";
import { getCart, POSSESSION_LIMIT_G } from "@/lib/cart";
import { getPolicy } from "@/lib/compliance";
import { money } from "@/lib/format";

export const metadata = { title: "Cart" };
const STOCK = { IN_STOCK: "", LOW: "Low stock", OUT: "Not available at this location" } as const;

export default async function Cart() {
  const cart = await getCart();
  if (!cart || !cart.retailer || cart.lines.length === 0) {
    return (
      <div className="wrap section" style={{ maxWidth: 640 }}>
        <div className="empty panel">
          <span className="cairn" aria-hidden><i /><i /><i /></span>
          <h1 className="h3">Your cart is empty</h1>
          <p className="small muted">Add products from any licensed store. Each order comes from one store.</p>
          <Link href="/shop" className="btn primary sm">Start shopping</Link>
        </div>
      </div>
    );
  }
  const policy = await getPolicy(cart.retailer.jurisdictionCode);
  const showPrices = policy.allows("retail.prices");
  const blocked = cart.problems.some((p) => p.includes("isn't taking orders") || p.includes("limit"));
  return (
    <div className="wrap cartpage">
      <h1 className="h1 mb-1">Your cart</h1>
      <p className="muted mb-3">From <Link href={`/stores/${cart.retailer.slug}`} className="strong">{cart.retailer.tradeName}</Link>{cart.location ? `, ${cart.location.name}` : ""}</p>
      <div className="cart-layout">
        <div className="stack" style={{ ["--gap" as string]: "16px" }}>
          {cart.retailer.locations.filter((l) => l.active).length > 1 && (
            <form action={chooseCartLocation} className="panel panel-pad row" style={{ ["--gap" as string]: "10px" }}>
              <label htmlFor="locationId" className="small strong">Order from</label>
              <select id="locationId" name="locationId" defaultValue={cart.location?.id} className="select" style={{ maxWidth: 320, minHeight: 40 }}>
                {cart.retailer.locations.filter((l) => l.active).map((l) => <option key={l.id} value={l.id}>{l.name}, {l.street}</option>)}
              </select>
              <button className="btn sm">Update</button>
            </form>
          )}
          {cart.problems.map((p) => <p key={p} className="callout warn small">{p}</p>)}
          <ul className="list panel" style={{ padding: "4px 16px" }}>
            {cart.lines.map((l) => (
              <li key={l.productId} className="cart-line">
                <Link href={`/products/${l.productId}`} className="thumb" style={{ background: `var(--t-${l.product.category})` }} aria-hidden tabIndex={-1}><PackArt p={l.product} /></Link>
                <div className="grow stack" style={{ ["--gap" as string]: "6px", minWidth: 0 }}>
                  <div>
                    <Link href={`/products/${l.productId}`} className="strong" style={{ color: "var(--ink)" }}>{l.product.name}</Link>
                    <p className="small muted">{l.product.brand}, {l.product.size}</p>
                    {STOCK[l.stock] && <p className={`status ${l.available ? "warn" : "bad"} xs`}>{STOCK[l.stock]}</p>}
                  </div>
                  <QtyStepper productId={l.productId} quantity={l.quantity} name={l.product.name} />
                </div>
                <span className="strong num" style={{ textDecoration: l.available ? undefined : "line-through" }}>{showPrices ? money(l.lineCents) : ""}</span>
              </li>
            ))}
          </ul>
          <Link href={`/stores/${cart.retailer.slug}`} className="small">Add more from {cart.retailer.tradeName}</Link>
        </div>
        <aside className="summary" aria-label="Order summary">
          <dl>
            <dt>Items</dt><dd>{cart.count}</dd>
            <dt>Subtotal</dt><dd>{showPrices ? money(cart.subtotalCents) : "Priced at store"}</dd>
            <dt className="muted">Delivery fee</dt><dd className="muted">Chosen at checkout</dd>
          </dl>
          <LimitMeter grams={cart.grams} limit={POSSESSION_LIMIT_G} />
          {blocked ? <button className="btn primary block" disabled>Checkout</button> : <Link href="/checkout" className="btn primary block">Checkout</Link>}
          <p className="xs muted">You'll pay {cart.retailer.tradeName} when your order is handed over, after it checks your government ID.</p>
        </aside>
      </div>
      <style>{`
        .cartpage { padding-block: var(--s5) var(--s8); }
        .cart-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: var(--s6); align-items: start; }
        .cart-line { display: flex; gap: 16px; align-items: flex-start; padding: 16px 0; }
        @media (max-width: 860px) { .cart-layout { grid-template-columns: 1fr; } .summary { position: static; } }
      `}</style>
    </div>
  );
}
