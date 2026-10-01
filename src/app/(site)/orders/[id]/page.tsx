import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { cancelOrder } from "@/app/actions/cart";
import { PackArt } from "@/components/pack-art";
import { OrderProgress } from "@/components/shop/order-progress";
import { requireUser } from "@/lib/auth/session";
import { money } from "@/lib/format";
import { fmtTime, STATUS_LABEL } from "@/lib/orders";

export const metadata = { title: "Order" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string }> }) {
  const u = await requireUser("/orders");
  const { id } = await params;
  const { placed } = await searchParams;
  const o = await db.query.orders.findFirst({
    where: and(eq(schema.orders.id, id), eq(schema.orders.userId, u.id)),
    with: { items: true, events: { orderBy: (e, { asc }) => asc(e.createdAt) }, retailer: true, location: true },
  });
  if (!o) notFound();
  const pickup = o.fulfilment === "PICKUP";
  const headline = {
    PLACED: `Waiting for ${o.retailer.tradeName} to accept`,
    ACCEPTED: pickup ? `Being prepared, ready around ${o.readyBy ? fmtTime(o.readyBy, o.jurisdictionCode) : "soon"}` : "Being prepared for delivery",
    READY: "Ready for pickup",
    OUT_FOR_DELIVERY: "On its way",
    COMPLETED: pickup ? "Picked up" : "Delivered",
    CANCELLED: "Cancelled",
    REJECTED: "Declined by the store",
  }[o.status];

  return (
    <div className="wrap" style={{ maxWidth: 960, paddingBlock: "24px 64px" }}>
      <p className="small mb-2"><Link href="/orders">Your orders</Link></p>
      {placed && <p className="flash mb-3">Order placed. {o.retailer.tradeName} has been notified, and you'll hear back here when it's accepted.</p>}
      <div className="row between top mb-3">
        <div>
          <p className="small muted">Order {o.number}</p>
          <h1 className="h1">{headline}</h1>
        </div>
        {o.status === "PLACED" && <form action={cancelOrder}><input type="hidden" name="orderId" value={o.id} /><button className="btn sm danger">Cancel order</button></form>}
      </div>
      <section className="panel panel-pad mb-3" aria-label={STATUS_LABEL[o.status]}><OrderProgress fulfilment={o.fulfilment} status={o.status} events={o.events} /></section>

      <div className="grid-2" style={{ alignItems: "start", gap: 20 }}>
        <section className="panel panel-pad stack">
          <h2 className="h4">{pickup ? "Pick up at" : "Delivering to"}</h2>
          {pickup ? (
            <p><span className="strong">{o.retailer.tradeName}, {o.location.name}</span><br />{o.location.street}, {o.location.city}<br /><a className="small" href={`https://www.openstreetmap.org/?mlat=${o.location.lat}&mlon=${o.location.lng}#map=17/${o.location.lat}/${o.location.lng}`} target="_blank" rel="noreferrer">Open in map</a></p>
          ) : (
            <p>{o.deliveryAddress?.street}{o.deliveryAddress?.unit ? `, ${o.deliveryAddress.unit}` : ""}<br />{o.deliveryAddress?.city} {o.deliveryAddress?.postalCode}</p>
          )}
          <div className="callout small">
            <p className="strong">Bring government ID</p>
            <p className="muted">{o.retailer.tradeName} checks that you're of legal age and takes payment {pickup ? "at the counter" : "at the door"}. The order can't be handed to anyone else.</p>
          </div>
          <p className="small muted">Questions about this order? Contact {o.retailer.tradeName}{o.location.phone ? ` at ${o.location.phone}` : ""}.</p>
        </section>
        <section className="panel panel-pad">
          <h2 className="h4 mb-2">Items</h2>
          <ul className="list">
            {o.items.map((i) => (
              <li key={i.id} className="row" style={{ padding: "8px 0", flexWrap: "nowrap", ["--gap" as string]: "12px" }}>
                <span className="thumb" style={{ width: 52, height: 52, padding: 6, borderRadius: 12, background: `var(--t-${i.category})` }}><PackArt p={i} /></span>
                <span className="grow small"><span className="strong">{i.quantity} × {i.name}</span><br /><span className="muted">{i.brand}, {i.size}</span></span>
                <span className="small num">{money(i.unitPriceCents * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="totals">
            <dt>Subtotal</dt><dd>{money(o.subtotalCents)}</dd>
            {o.deliveryFeeCents > 0 && <><dt>Delivery</dt><dd>{money(o.deliveryFeeCents)}</dd></>}
            <dt className="strong">To pay the store</dt><dd className="strong">{money(o.totalCents)} + tax</dd>
          </dl>
        </section>
      </div>
      <style>{`.totals { display: grid; grid-template-columns: 1fr auto; gap: 6px; margin: 12px 0 0; padding-top: 12px; border-top: 1px solid var(--rule); font-size: var(--t-sm); } .totals dd { margin: 0; font-variant-numeric: tabular-nums; }`}</style>
    </div>
  );
}
