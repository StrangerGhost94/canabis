import { and, desc, eq, gte, inArray } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { ConsoleHead } from "@/components/console/shell";
import { requireRetailer } from "@/lib/auth/access";
import { money, relTime } from "@/lib/format";
import { fmtTime, STATUS_LABEL, STATUS_TONE } from "@/lib/orders";

export const metadata = { title: "Orders" };

export default async function RetailerOrders() {
  const { retailer } = await requireRetailer();
  const open = await db.query.orders.findMany({
    where: and(eq(schema.orders.retailerId, retailer.id), inArray(schema.orders.status, ["PLACED", "ACCEPTED", "READY", "OUT_FOR_DELIVERY"])),
    with: { items: true, location: true }, orderBy: (o, { asc }) => asc(o.createdAt),
  });
  const recent = await db.query.orders.findMany({
    where: and(eq(schema.orders.retailerId, retailer.id), inArray(schema.orders.status, ["COMPLETED", "CANCELLED", "REJECTED"]), gte(schema.orders.updatedAt, new Date(Date.now() - 7 * 86400e3))),
    with: { items: true, location: true }, orderBy: desc(schema.orders.updatedAt), limit: 30,
  });
  const cols = [
    { key: "new", title: "New", hint: "Accept or decline", items: open.filter((o) => o.status === "PLACED") },
    { key: "prep", title: "Preparing", hint: "Mark ready or send out", items: open.filter((o) => o.status === "ACCEPTED") },
    { key: "hand", title: "Ready to hand over", hint: "Check ID, take payment", items: open.filter((o) => o.status === "READY" || o.status === "OUT_FOR_DELIVERY") },
  ];
  const Card = ({ o }: { o: (typeof open)[number] }) => (
    <Link href={`/retailer/orders/${o.id}`} className="ocard">
      <span className="row between"><span className="strong num">{o.number}</span><span className="xs muted">{relTime(o.createdAt)}</span></span>
      <span className="small">{o.contactName}</span>
      <span className="xs muted">{(() => { const n = o.items.reduce((a, i) => a + i.quantity, 0); return `${n} ${n === 1 ? "item" : "items"}`; })()}, {money(o.totalCents)}</span>
      <span className="row xs" style={{ ["--gap" as string]: "6px" }}>
        <span className="tag">{o.fulfilment === "PICKUP" ? `Pickup, ${o.location.name}` : "Delivery"}</span>
        {o.readyBy && o.status === "ACCEPTED" && <span className="tag">Due {fmtTime(o.readyBy, o.jurisdictionCode)}</span>}
        {o.isDemo && <span className="tag demo">Demo</span>}
      </span>
    </Link>
  );
  return (
    <>
      <ConsoleHead title="Orders" sub={retailer.acceptsOrders ? "Orders arrive here and as notifications. Customers are told at every step." : <>Ordering is paused. <Link href="/retailer/settings">Turn it on</Link> to take new orders.</>} />
      <div className="board">
        {cols.map((c) => (
          <section key={c.key} className="board-col" aria-labelledby={`col-${c.key}`}>
            <div className="row between mb-2"><h2 id={`col-${c.key}`} className="h4">{c.title} <span className="muted small num">{c.items.length}</span></h2><span className="xs muted">{c.hint}</span></div>
            <div className="stack" style={{ ["--gap" as string]: "10px" }}>
              {c.items.length === 0 ? <p className="xs muted board-empty">Nothing here.</p> : c.items.map((o) => <Card key={o.id} o={o} />)}
            </div>
          </section>
        ))}
      </div>
      {recent.length > 0 && (
        <section className="mt-4">
          <h2 className="h4 mb-2">Last 7 days</h2>
          <div className="panel table-wrap"><table>
            <thead><tr><th>Order</th><th>Customer</th><th>Type</th><th className="r">Total</th><th>Status</th><th>Updated</th></tr></thead>
            <tbody>{recent.map((o) => (
              <tr key={o.id}><td><Link href={`/retailer/orders/${o.id}`} className="num">{o.number}</Link></td><td>{o.contactName}</td><td>{o.fulfilment === "PICKUP" ? "Pickup" : "Delivery"}</td><td className="r num">{money(o.totalCents)}</td><td><span className={`status ${STATUS_TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span></td><td className="muted nowrap">{relTime(o.updatedAt)}</td></tr>
            ))}</tbody>
          </table></div>
        </section>
      )}
      <style>{`
        .board { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .board-col { background: color-mix(in srgb, var(--surface) 55%, var(--bg)); border-radius: var(--r-panel); padding: 14px; min-height: 160px; }
        .ocard { display: grid; gap: 4px; padding: 14px; background: var(--surface); border-radius: 12px; color: var(--ink); text-decoration: none; border: 1px solid var(--rule-soft); }
        .ocard:hover { border-color: var(--ink); }
        .board-empty { padding: 12px 2px; }
        @media (max-width: 1000px) { .board { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}
