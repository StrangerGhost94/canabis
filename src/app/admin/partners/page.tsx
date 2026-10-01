import { desc } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { StatusForm } from "@/components/admin/forms";
import { ConsoleHead } from "@/components/console/shell";
import { daily } from "@/lib/analytics";
import { n } from "@/lib/format";

export const metadata = { title: "Partners" };
const ST: Record<string, string> = { VERIFIED: "ok", APPLIED: "warn", UNDER_REVIEW: "warn", SUSPENDED: "bad", REJECTED: "idle" };

export default async function Partners() {
  const ps = await db.query.partners.findMany({ with: { user: true, retailers: true }, orderBy: desc(schema.partners.createdAt) });
  const stats = await Promise.all(ps.map((p) => daily({ partnerId: p.id }, 30)));
  return (
    <>
      <ConsoleHead title="Partners" sub="Suspending a partner pauses all their links immediately." />
      <div className="panel table-wrap">
        <table>
          <thead><tr><th>Partner</th><th>Province</th><th>Status</th><th className="r">Stores</th><th className="r">Visits (30d)</th><th className="r">Purchases</th><th style={{ minWidth: 280 }}>Enforcement</th></tr></thead>
          <tbody>
            {ps.map((p, i) => (
              <tr key={p.id}>
                <td><Link href={`/p/${p.handle}`} className="strong">{p.displayName}</Link><br /><span className="muted">@{p.handle}, {p.user.email}</span></td>
                <td>{p.jurisdictionCode}</td>
                <td><span className={`status ${ST[p.status]}`}>{p.status.replace("_", " ").toLowerCase()}</span></td>
                <td className="r num">{p.retailers.filter((r) => r.status === "ACTIVE").length}</td>
                <td className="r num">{n(stats[i].totals.visits)}</td>
                <td className="r num">{n(stats[i].totals.purchases)}</td>
                <td>{p.status === "VERIFIED" || p.status === "SUSPENDED" ? <StatusForm kind="partner" id={p.id} current={p.status} /> : <Link href="/admin/verification?tab=partners" className="small">Review application</Link>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
