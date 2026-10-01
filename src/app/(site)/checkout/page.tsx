import Link from "next/link";
import { redirect } from "next/navigation";
import { PackArt } from "@/components/pack-art";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { LimitMeter } from "@/components/shop/limit-meter";
import { requireUser } from "@/lib/auth/session";
import { getCart } from "@/lib/cart";
import { getPolicy } from "@/lib/compliance";
import { money } from "@/lib/format";

export const metadata = { title: "Checkout" };

export default async function Checkout() {
  const user = await requireUser("/checkout");
  const cart = await getCart();
  if (!cart || !cart.retailer || cart.lines.length === 0 || !cart.location) redirect("/cart");
  const r = cart.retailer;
  const loc = cart.location;
  const policy = await getPolicy(r.jurisdictionCode);
  const lines = cart.lines.filter((l) => l.available);
  const options = [
    policy.allows("retail.pickup") && loc.offersPickup && { value: "PICKUP" as const, title: `Pick up at ${loc.name}`, detail: `${loc.street}. Usually ready in about ${r.pickupLeadMinutes} min.` },
    policy.allows("retail.delivery") && loc.offersDelivery && { value: "DELIVERY" as const, title: "Delivery by the store", detail: `${money(r.deliveryFeeCents)} fee, ${money(r.deliveryMinimumCents)} minimum, within ${policy.name}.` },
  ].filter(Boolean) as { value: "PICKUP" | "DELIVERY"; title: string; detail: string }[];

  const wrongProvince = user.jurisdictionCode !== r.jurisdictionCode;
  return (
    <div className="wrap cartpage">
      <p className="small mb-2"><Link href="/cart">Cart</Link></p>
      <h1 className="h1 mb-3">Checkout</h1>
      <div className="cart-layout">
        <div>
          {wrongProvince ? <p className="callout bad">Your account is set to a different province from {r.tradeName}. You can only order from stores where you live.</p>
            : !policy.allows("orders.online") ? <p className="callout warn">{policy.offMessage("orders.online")}</p>
            : options.length === 0 ? <p className="callout warn">{loc.name} isn't offering pickup or delivery right now. <Link href="/cart">Choose another location</Link></p>
            : <CheckoutForm options={options} name={user.name} store={r.tradeName} />}
        </div>
        <aside className="summary" aria-label="Order summary">
          <p className="h4">{r.tradeName}, {loc.name}</p>
          <ul className="list">
            {lines.map((l) => (
              <li key={l.productId} className="row" style={{ padding: "8px 0", flexWrap: "nowrap", ["--gap" as string]: "10px" }}>
                <span className="thumb" style={{ width: 48, height: 48, padding: 5, borderRadius: 10, background: `var(--t-${l.product.category})` }}><PackArt p={l.product} /></span>
                <span className="grow small">{l.quantity} × {l.product.name}<br /><span className="muted xs">{l.product.size}</span></span>
                <span className="small num">{money(l.lineCents)}</span>
              </li>
            ))}
          </ul>
          <dl>
            <dt>Subtotal</dt><dd>{money(cart.subtotalCents)}</dd>
            {loc.offersDelivery && <><dt className="muted">Delivery, if chosen</dt><dd className="muted">{money(r.deliveryFeeCents)}</dd></>}
            <dt className="total">Pay at handover</dt><dd className="total">{money(cart.subtotalCents)}+</dd>
          </dl>
          <LimitMeter grams={cart.grams} />
          <p className="xs muted">Prices are set by the store and include no Cairn fees. Taxes are applied by the store at payment.</p>
        </aside>
      </div>
      <style>{`.cartpage { padding-block: var(--s5) var(--s8); } .cart-layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: var(--s6); align-items: start; } @media (max-width: 860px) { .cart-layout { grid-template-columns: 1fr; } .summary { position: static; order: -1; } }`}</style>
    </div>
  );
}
