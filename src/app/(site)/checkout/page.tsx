import Link from "next/link";
import { redirect } from "next/navigation";
import { PackArt } from "@/components/pack-art";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { LimitMeter } from "@/components/shop/limit-meter";
import { requireUser } from "@/lib/auth/session";
import { getCart } from "@/lib/cart";
import { getPolicy } from "@/lib/compliance";
import { money } from "@/lib/format";
import { fmtKm } from "@/lib/geo";
import { etaLabel } from "@/lib/routing";

export const metadata = { title: "Checkout" };

export default async function Checkout() {
  const user = await requireUser("/checkout");
  if (user.idStatus !== "VERIFIED") redirect("/account/verify?next=/checkout");
  const cart = await getCart();
  if (!cart || cart.lines.length === 0 || !cart.plan) redirect("/cart");
  const policy = await getPolicy(user.jurisdictionCode);
  const plan = cart.plan;
  const f = cart.fulfilment;

  return (
    <div className="wrap cartpage">
      <p className="small mb-2"><Link href="/cart">← Back to cart</Link></p>
      <h1 className="h1 mb-3">Checkout</h1>
      <div className="cart-layout">
        <div>
          {!cart.canCheckout ? (
            <div className="stack">{cart.problems.map((p) => <p key={p} className="callout warn">{p}</p>)}<Link href="/cart" className="btn">Back to cart</Link></div>
          ) : (
            <CheckoutForm fulfilment={f} name={user.name} address={user.address ?? null} parts={plan.shipments.length} />
          )}
        </div>
        <aside className="summary" aria-label="Order summary">
          {plan.shipments.map((sh, i) => (
            <section key={sh.location.id} className="seller">
              <p className="xs muted">{plan.shipments.length > 1 ? `Part ${i + 1} of ${plan.shipments.length} · ` : ""}{f === "DELIVERY" ? "Delivered and sold by" : "Pick up from"}</p>
              <p className="strong">{sh.retailer.tradeName}</p>
              <p className="xs muted">{sh.retailer.legalName} · Licensed by {policy.regulator}{sh.retailer.trust.licence ? ` · Licence ${sh.retailer.trust.licence.number}` : ""}</p>
              <p className="xs muted">{f === "PICKUP" ? `${sh.location.street}, ${sh.location.city}${sh.distanceKm != null ? ` · ${fmtKm(sh.distanceKm)}` : ""} · ` : ""}{etaLabel(sh, f)}</p>
              <ul className="list mt-1">
                {sh.items.map((l) => (
                  <li key={l.key} className="row" style={{ padding: "8px 0", flexWrap: "nowrap", ["--gap" as string]: "10px" }}>
                    <span className="thumb" style={{ width: 44, height: 44, padding: 5, borderRadius: 10, background: `var(--t-${l.product.category})` }}><PackArt p={l.product} /></span>
                    <span className="grow small">{l.quantity} × {l.product.name}<br /><span className="muted xs">{l.product.brand} · {l.product.size}</span></span>
                    <span className="small num">{money(l.lineCents)}</span>
                  </li>
                ))}
              </ul>
              {sh.feeCents > 0 && <p className="row between xs"><span className="muted">Delivery</span><span className="num">{money(sh.feeCents)}</span></p>}
            </section>
          ))}
          <dl>
            <dt>Subtotal</dt><dd>{money(cart.subtotalCents)}</dd>
            {f === "DELIVERY" && <><dt>Delivery</dt><dd>{cart.feeCents ? money(cart.feeCents) : "Free"}</dd></>}
            <dt className="total">Pay at the door</dt><dd className="total">{money(cart.totalCents)}</dd>
          </dl>
          <LimitMeter grams={cart.grams} />
          <p className="xs muted">Prices are set by each store. Taxes are added by the store when you pay. Cairn adds no fees.</p>
        </aside>
      </div>
      <style>{`
        .cartpage { padding-block: var(--s5) var(--s8); }
        .cart-layout { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: var(--s6); align-items: start; }
        .seller { display: grid; gap: 2px; padding-bottom: 14px; border-bottom: 1px solid var(--rule-soft); }
        @media (max-width: 860px) { .cart-layout { grid-template-columns: 1fr; } .summary { position: static; order: -1; } }
      `}</style>
    </div>
  );
}
