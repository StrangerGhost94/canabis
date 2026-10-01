import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { DailyBars } from "@/components/console/chart";
import { ConsoleHead } from "@/components/console/shell";
import { daily } from "@/lib/analytics";
import { money, n, relTime } from "@/lib/format";
import { fmtDate } from "@/lib/verification/trust";

export const metadata = { title: "Admin" };

export default async function AdminHome() {
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400e3).toISOString().slice(0, 10);
  const c = async (q: Promise<{ c: number }[]>) => (await q)[0].c;
  const [listed, pendingLic, partners, users, openRisk] = await Promise.all([
    c(db.select({ c: count() }).from(schema.retailers).where(eq(schema.retailers.status, "VERIFIED"))),
    c(db.select({ c: count() }).from(schema.licences).where(eq(schema.licences.status, "PENDING"))),
    c(db.select({ c: count() }).from(schema.partners).where(eq(schema.partners.status, "VERIFIED"))),
    c(db.select({ c: count() }).from(schema.users)),
    c(db.select({ c: count() }).from(schema.riskFlags).where(eq(schema.riskFlags.status, "OPEN"))),
  ]);
  const expiring = await db.query.licences.findMany({ where: and(eq(schema.licences.status, "VERIFIED"), gte(schema.licences.expiresAt, today), lte(schema.licences.expiresAt, in30)), with: { retailer: true } });
  const lapsed = await db.query.licences.findMany({ where: and(eq(schema.licences.status, "VERIFIED"), sql`${schema.licences.expiresAt} < ${today}`), with: { retailer: true } });
  const a = await daily({}, 30, false);
  const recent = await db.query.auditLogs.findMany({ with: { actor: true }, orderBy: (l, { desc }) => desc(l.createdAt), limit: 8 });

  return (
    <>
      <ConsoleHead title="Platform overview" sub="Everything that needs a decision is in the queues on the left. Counts update as reviews are completed." />
      <dl className="metrics">
        <div className="metric"><dt>Listed stores</dt><dd>{n(listed)}</dd><p className="delta"><Link href="/admin/retailers">All retailers</Link></p></div>
        <div className="metric"><dt>Licences to review</dt><dd>{n(pendingLic)}</dd><p className="delta"><Link href="/admin/verification">Open queue</Link></p></div>
        <div className="metric"><dt>Verified partners</dt><dd>{n(partners)}</dd><p className="delta"><Link href="/admin/partners">All partners</Link></p></div>
        <div className="metric"><dt>Open risk flags</dt><dd>{n(openRisk)}</dd><p className="delta"><Link href="/admin/risk">Review</Link></p></div>
        <div className="metric"><dt>Accounts</dt><dd>{n(users)}</dd><p className="delta"><Link href="/admin/users">Users</Link></p></div>
      </dl>

      {lapsed.length > 0 && (
        <div className="callout bad mt-3 row between">
          <div><p className="strong">{lapsed.length} verified {lapsed.length === 1 ? "licence has" : "licences have"} passed expiry</p><p className="small muted">Already hidden from customers. Run the licence check to record the change and notify stores: {lapsed.map((l) => l.retailer.tradeName).join(", ")}.</p></div>
          <Link href="/admin/system" className="btn sm">Run check</Link>
        </div>
      )}

      <div className="grid-2 mt-3" style={{ alignItems: "start" }}>
        <section className="panel panel-pad">
          <h2 className="h4 mb-2">Referral traffic, last 30 days</h2>
          <DailyBars label="Platform referral traffic" days={a.days} series={[{ name: "Partner visits", values: a.visits }, { name: "Hand-offs to stores", values: a.handoffs, alt: true }]} height={140} />
          <p className="small muted mt-2">{n(a.totals.purchases)} purchases reported by stores, {money(a.totals.orderCents)} in order value.</p>
        </section>
        <section className="panel">
          <div className="panel-head"><h2 className="h4">Licences expiring in 30 days</h2></div>
          {expiring.length === 0 ? <p className="panel-pad small muted">None.</p> : (
            <table><tbody>{expiring.map((l) => <tr key={l.id}><td>{l.retailer.tradeName}</td><td className="num muted">{l.number}</td><td className="r">{fmtDate(l.expiresAt)}</td></tr>)}</tbody></table>
          )}
        </section>
      </div>

      <section className="panel mt-3">
        <div className="panel-head"><h2 className="h4">Recent activity</h2><Link href="/admin/audit" className="small">Full audit log</Link></div>
        <table><tbody>
          {recent.map((r) => <tr key={r.id}><td className="code" style={{ background: "none" }}>{r.action}</td><td>{r.actor?.name ?? "System"}</td><td className="muted">{r.targetType}</td><td className="r muted nowrap">{relTime(r.createdAt)}</td></tr>)}
        </tbody></table>
      </section>
    </>
  );
}
