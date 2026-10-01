import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { ConsoleHead } from "@/components/console/shell";
import { PackArt } from "@/components/pack-art";
import { OrderActions } from "@/components/retailer/order-actions";
import { OrderProgress } from "@/components/shop/order-progress";
import { requireRetailer } from "@/lib/auth/access";
import { money } from "@/lib/format";
import { round } from "@/lib/cart";
import { STATUS_LABEL } from "@/lib/orders";

export default async function RetailerOrder({ params }: { params: Promise<{ id: string }> }) {
  const { retailer } = await requireRetailer();
  const { id } = await params;
  const o = await db.query.orders.findFirst({
    where: and(eq(schema.orders.id, id), eq(schema.orders.retailerId, retailer.id)),
    with: { items: { with: { product: { with: { inventory: true } } } }, events: { orderBy: (e, { asc }) => asc(e.createdAt) }, location: true, partner: true },
  });
  if (!o) notFound();
  return (
    <>
      <p className="small mb-2"><Link href="/retailer/orders">Orders</Link></p>
      <ConsoleHead title={`Order ${o.number}`} sub={<>{STATUS_LABEL[o.status]}. {o.fulfilment === "PICKUP" ? `Pickup at ${o.location.name}` : "Delivery"}{o.partner ? `. Referred by ${o.partner.displayName}` : ""}.</>} />
      <section className="panel panel-pad mb-3"><OrderProgress fulfilment={o.fulfilment} status={o.status} events={o.events} /></section>
      <div className="grid-2" style={{ alignItems: "start", gap: 20 }}>
        <section className="panel panel-pad">
          <h2 className="h4 mb-2">Pick list</h2>
          <ul className="list">
            {o.items.map((i) => {
              const stock = i.product?.inventory.find((x) => x.locationId === o.locationId)?.status;
              return (
                <li key={i.id} className="row" style={{ padding: "10px 0", flexWrap: "nowrap", ["--gap" as string]: "12px" }}>
                  <span className="thumb" style={{ width: 52, height: 52, padding: 6, borderRadius: 12, background: `var(--t-${i.category})` }}><PackArt p={i} /></span>
                  <span className="grow small"><span className="strong">{i.quantity} × {i.name}</span><br /><span className="muted">{i.brand}, {i.size}</span>{stock === "OUT" && <><br /><span className="status bad">Now marked out of stock</span></>}</span>
                  <span className="small num">{money(i.unitPriceCents * i.quantity)}</span>
                </li>
              );
            })}
          </ul>
          <dl className="kv mt-2">
            <dt>Subtotal</dt><dd className="num">{money(o.subtotalCents)}</dd>
            {o.deliveryFeeCents > 0 && <><dt>Delivery fee</dt><dd className="num">{money(o.deliveryFeeCents)}</dd></>}
            <dt>Collect</dt><dd className="num strong">{money(o.totalCents)} + tax</dd>
            <dt>Dried equivalent</dt><dd className="num">{round(o.equivalentGrams)} g of 30 g</dd>
          </dl>
        </section>
        <div className="stack" style={{ ["--gap" as string]: "16px" }}>
          <section className="panel panel-pad stack">
            <h2 className="h4">Customer</h2>
            <p className="small"><span className="strong">{o.contactName}</span><br />{o.contactPhone}</p>
            {o.deliveryAddress && <p className="small">{o.deliveryAddress.street}{o.deliveryAddress.unit ? `, ${o.deliveryAddress.unit}` : ""}<br />{o.deliveryAddress.city} {o.deliveryAddress.postalCode}</p>}
            {o.notes && <p className="callout small">“{o.notes}”</p>}
            <p className="xs muted">Hand over only to the person named, after checking government ID shows they're of legal age.</p>
          </section>
          <section className="panel panel-pad"><OrderActions o={{ id: o.id, status: o.status, fulfilment: o.fulfilment, lead: retailer.pickupLeadMinutes }} /></section>
        </div>
      </div>
      <style>{`.kv { display: grid; grid-template-columns: 1fr auto; gap: 6px 16px; margin: 0; font-size: var(--t-sm); } .kv dt { color: var(--ink-2); } .kv dd { margin: 0; text-align: right; } .decline summary { cursor: pointer; color: var(--ink-2); }`}</style>
    </>
  );
}
