import Link from "next/link";
import { chooseFulfilment } from "@/app/actions/cart";
import { NearControl } from "@/components/discover/near-form";
import { IconCheck, IconPin, IconShield } from "@/components/icons";
import { PackArt } from "@/components/pack-art";
import { LimitMeter } from "@/components/shop/limit-meter";
import { QtyStepper } from "@/components/shop/qty-form";
import { getSession } from "@/lib/auth/session";
import { getCart, POSSESSION_LIMIT_G } from "@/lib/cart";
import { getPolicy } from "@/lib/compliance";
import { money } from "@/lib/format";
import { etaLabel } from "@/lib/routing";

export const metadata = { title: "Cart" };

export default async function Cart() {
  const cart = await getCart();
  const session = await getSession();
  if (!cart || cart.lines.length === 0) {
    return (
      <div className="wrap section" style={{ maxWidth: 640 }}>
        <div className="empty panel">
          <span className="cairn" aria-hidden><i /><i /><i /></span>
          <h1 className="h3">Your cart is empty</h1>
          <p className="small muted">Add anything you like. We'll send your order to the nearest licensed store that has it.</p>
          <Link href="/shop" className="btn primary sm">Start shopping</Link>
        </div>
      </div>
    );
  }
  const policy = cart.jurisdictionCode ? await getPolicy(cart.jurisdictionCode) : null;
  const showPrices = !!policy?.allows("retail.prices");
  const canDeliver = !!policy?.allows("retail.delivery");
  const canPickup = !!policy?.allows("retail.pickup");
  const plan = cart.plan;
  const byKey = new Map(plan?.shipments.flatMap((sh, i) => sh.items.map((it) => [it.key, { ...it, shipment: i }] as const)) ?? []);
  const verified = session?.user.idStatus === "VERIFIED";
  const pending = session?.user.idStatus === "PENDING";
  const deliveries = plan?.shipments.length ?? 0;

  return (
    <div className="wrap cartpage">
      <h1 className="h1 mb-1">Your cart</h1>
      <p className="muted mb-3">You choose the products. We send the order to the nearest licensed store that has them.</p>
      <div className="cart-layout">
        <div className="stack" style={{ ["--gap" as string]: "16px" }}>
          <section className="panel panel-pad stack" style={{ ["--gap" as string]: "14px" }} aria-label="Delivery">
            {(canDeliver || canPickup) && (
              <form action={chooseFulfilment} className="seg-toggle" role="radiogroup" aria-label="How do you want it?">
                {canDeliver && <button name="fulfilment" value="DELIVERY" className={cart.fulfilment === "DELIVERY" ? "on" : ""} aria-pressed={cart.fulfilment === "DELIVERY"}>Delivery</button>}
                {canPickup && <button name="fulfilment" value="PICKUP" className={cart.fulfilment === "PICKUP" ? "on" : ""} aria-pressed={cart.fulfilment === "PICKUP"}>Pickup</button>}
              </form>
            )}
            {cart.point ? (
              <div className="row between">
                <p className="row small" style={{ ["--gap" as string]: "8px" }}><IconPin width={18} height={18} aria-hidden />{cart.fulfilment === "DELIVERY" ? "Delivering to" : "Near"} <b>{cart.point.label}</b></p>
                <Link href={session ? "/account/settings#address" : "/shop"} className="small">Change</Link>
              </div>
            ) : (
              <div className="stack" style={{ ["--gap" as string]: "8px" }}>
                <p className="small"><b>Where should it go?</b> Add your postal code to find the nearest store that delivers to you.</p>
                <NearControl label={null} next="/cart" compact />
              </div>
            )}
          </section>

          {cart.problems.map((p) => <p key={p} className="callout warn small">{p}</p>)}

          <ul className="list panel" style={{ padding: "4px 18px" }}>
            {cart.lines.map((l) => {
              const routed = byKey.get(l.key);
              return (
                <li key={l.productId} className="cart-line">
                  <Link href={`/products/${l.productId}`} className="thumb" style={{ background: `var(--t-${l.product.category})` }} aria-hidden tabIndex={-1}><PackArt p={l.product} /></Link>
                  <div className="grow stack" style={{ ["--gap" as string]: "6px", minWidth: 0 }}>
                    <div>
                      <Link href={`/products/${l.productId}`} className="strong" style={{ color: "var(--ink)" }}>{l.product.name}</Link>
                      <p className="small muted">{l.product.brand} · {l.product.size}</p>
                      {plan && !routed && <p className="status bad xs">Not available {cart.fulfilment === "DELIVERY" ? "for delivery to you" : "near you"} right now</p>}
                      {routed && deliveries > 1 && <p className="xs muted">Delivery {routed.shipment + 1} of {deliveries}</p>}
                    </div>
                    <QtyStepper productId={l.productId} quantity={l.quantity} name={l.product.name} />
                  </div>
                  <span className="strong num" style={{ textDecoration: routed || !plan ? undefined : "line-through" }}>
                    {showPrices && routed ? money(routed.lineCents) : showPrices && !plan ? money(l.product.priceCents * l.quantity) : ""}
                  </span>
                </li>
              );
            })}
          </ul>
          <Link href="/shop" className="small">Keep shopping</Link>
        </div>

        <aside className="summary" aria-label="Order summary">
          {plan && plan.shipments.length > 0 && (
            <div className="route-box">
              <IconCheck aria-hidden />
              <div>
                <p className="strong">{deliveries === 1 ? `1 ${cart.fulfilment === "DELIVERY" ? "delivery" : "pickup"}` : `${deliveries} ${cart.fulfilment === "DELIVERY" ? "deliveries" : "pickups"}`} from licensed stores near you</p>
                {plan.shipments.map((sh, i) => <p key={sh.location.id} className="xs muted">{deliveries > 1 ? `${i + 1}. ` : ""}{etaLabel(sh, cart.fulfilment)}</p>)}
                {deliveries > 1 && <p className="xs muted mt-1">No single store has everything, so your order comes in {deliveries} parts.</p>}
              </div>
            </div>
          )}
          <dl>
            <dt>Items</dt><dd>{cart.count}</dd>
            <dt>Subtotal</dt><dd>{showPrices ? money(cart.subtotalCents) : "Priced by the store"}</dd>
            {cart.fulfilment === "DELIVERY" && <><dt>Delivery</dt><dd>{cart.feeCents ? money(cart.feeCents) : "Free"}</dd></>}
            {showPrices && <><dt className="total">Pay at the door</dt><dd className="total">{money(cart.totalCents)}</dd></>}
          </dl>
          <LimitMeter grams={cart.grams} limit={POSSESSION_LIMIT_G} />

          {!session ? (
            <Link href="/sign-in?next=/checkout" className="btn signal block">Sign in to check out</Link>
          ) : !verified ? (
            <div className="verify-box">
              <IconShield aria-hidden />
              <div className="stack" style={{ ["--gap" as string]: "8px" }}>
                <p className="strong">{pending ? "We're checking your ID" : "Verify your ID to order"}</p>
                <p className="xs muted">{pending ? "Usually within a few hours. We'll notify you the moment you're approved." : "A one-time check that you're of legal age. Once verified, you can order anywhere Cairn delivers."}</p>
                {!pending && <Link href="/account/verify" className="btn signal sm">Verify my ID</Link>}
              </div>
            </div>
          ) : cart.canCheckout ? (
            <Link href="/checkout" className="btn signal block">Checkout</Link>
          ) : (
            <button className="btn primary block" disabled>Checkout</button>
          )}
          <p className="xs muted">Nothing to pay now. You pay the licensed store when your order arrives, after it checks your ID.</p>
        </aside>
      </div>
      <style>{`
        .cartpage { padding-block: var(--s5) var(--s8); }
        .cart-layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: var(--s6); align-items: start; }
        .cart-line { display: flex; gap: 16px; align-items: flex-start; padding: 16px 0; }
        .seg-toggle { display: inline-flex; padding: 4px; border-radius: 999px; background: var(--bg); border: 1px solid var(--rule); }
        .seg-toggle button { border: 0; background: none; padding: 8px 20px; border-radius: 999px; font: inherit; font-weight: 600; font-size: var(--t-sm); cursor: pointer; color: var(--ink-2); }
        .seg-toggle button.on { background: var(--ink); color: var(--bg); }
        .route-box, .verify-box { display: flex; gap: 12px; padding: 14px 16px; border-radius: 14px; background: var(--brass-soft); }
        .route-box svg, .verify-box svg { flex: none; width: 20px; height: 20px; margin-top: 2px; }
        .verify-box { background: color-mix(in srgb, var(--oxblood) 8%, var(--surface)); }
        @media (max-width: 860px) { .cart-layout { grid-template-columns: 1fr; } .summary { position: static; } }
      `}</style>
    </div>
  );
}
