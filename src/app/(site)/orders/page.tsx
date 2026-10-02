import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { money, relTime } from "@/lib/format";
import { OPEN_STATUSES, STATUS_LABEL, STATUS_TONE } from "@/lib/orders";

export const metadata = { title: "Your orders" };

export default async function Orders({ searchParams }: { searchParams: Promise<{ placed?: string }> }) {
  const { placed } = await searchParams;
  const u = await requireUser("/orders");
  const orders = await db.query.orders.findMany({ where: eq(schema.orders.userId, u.id), with: { retailer: true, items: true, location: true }, orderBy: desc(schema.orders.createdAt), limit: 50 });
  const open = orders.filter((o) => OPEN_STATUSES.includes(o.status));
  const past = orders.filter((o) => !OPEN_STATUSES.includes(o.status));
  const Row = ({ o }: { o: (typeof orders)[number] }) => (
    <li>
      <Link href={`/orders/${o.id}`} className="order-row">
        <span className="grow">
          <span className="strong">{o.retailer.tradeName}</span> <span className="muted small">{o.fulfilment === "PICKUP" ? `pickup at ${o.location.name}` : "delivery"}</span><br />
          <span className="small muted">{(() => { const n = o.items.reduce((a, i) => a + i.quantity, 0); return `${n} ${n === 1 ? "item" : "items"}`; })()}, {o.number}, {relTime(o.createdAt)}</span>
        </span>
        <span className={`status ${STATUS_TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
        <span className="strong num" style={{ minWidth: 70, textAlign: "right" }}>{money(o.totalCents)}</span>
      </Link>
    </li>
  );
  return (
    <div className="wrap section-account" style={{ maxWidth: 860, paddingBlock: "24px 64px" }}>
      <h1 className="h1 mb-3">Your orders</h1>
      {placed && <p className="flash mb-3">Your order was placed in {placed} parts, each with the nearest licensed store that had those items. Each store will confirm here.</p>}
      {orders.length === 0 ? (
        <div className="empty panel"><span className="cairn" aria-hidden><i /><i /><i /></span><p className="h4">No orders yet</p><p className="small muted">When you order from a store, you can follow it here.</p><Link href="/shop" className="btn primary sm">Start shopping</Link></div>
      ) : (
        <div className="stack" style={{ ["--gap" as string]: "28px" }}>
          {open.length > 0 && <section><h2 className="h4 mb-2">In progress</h2><ul className="list panel" style={{ padding: "0 16px" }}>{open.map((o) => <Row key={o.id} o={o} />)}</ul></section>}
          {past.length > 0 && <section><h2 className="h4 mb-2">Past orders</h2><ul className="list panel" style={{ padding: "0 16px" }}>{past.map((o) => <Row key={o.id} o={o} />)}</ul></section>}
        </div>
      )}
      <style>{`.order-row { display: flex; align-items: center; gap: 16px; padding: 16px 0; color: var(--ink); text-decoration: none; flex-wrap: wrap; } .order-row:hover .strong { text-decoration: underline; }`}</style>
    </div>
  );
}
