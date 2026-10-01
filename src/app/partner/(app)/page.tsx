import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { DailyBars } from "@/components/console/chart";
import { ConsoleHead } from "@/components/console/shell";
import { daily, pct } from "@/lib/analytics";
import { requirePartner } from "@/lib/auth/access";
import { getPolicy } from "@/lib/compliance";
import { money, n } from "@/lib/format";

export const metadata = { title: "Partner overview" };

export default async function PartnerHome() {
  const { partner } = await requirePartner();
  const policy = await getPolicy(partner.jurisdictionCode);

  if (partner.status !== "VERIFIED") {
    const steps = [
      { t: "Application received", done: true },
      { t: "Reviewed by Cairn", done: false, current: partner.status === "UNDER_REVIEW" || partner.status === "APPLIED" },
      { t: "Connect with stores and share links", done: false },
    ];
    return (
      <>
        <ConsoleHead title={partner.status === "SUSPENDED" ? "Your partner account is suspended" : partner.status === "REJECTED" ? "Your application wasn't approved" : "Your application is under review"}
          sub={partner.status === "SUSPENDED" || partner.status === "REJECTED" ? partner.reviewNotes ?? "Contact support for details." : "Reviews usually take a few business days. We'll notify you either way."} />
        {(partner.status === "APPLIED" || partner.status === "UNDER_REVIEW") && (
          <ol className="list ruled" style={{ maxWidth: 560 }}>
            {steps.map((s, i) => (
              <li key={s.t} className="row" style={{ padding: "14px 0", ["--gap" as string]: "14px" }}>
                <span className="num" style={{ width: 28, height: 28, borderRadius: 99, display: "grid", placeItems: "center", background: s.done ? "var(--ink)" : "transparent", color: s.done ? "var(--bg)" : "var(--ink)", border: "1.5px solid var(--ink)", fontWeight: 600 }}>{i + 1}</span>
                <span className={s.current ? "strong" : s.done ? "" : "muted"}>{s.t}{s.current ? ", in progress" : ""}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="small muted mt-3">Meanwhile you can <Link href="/partner/profile">polish your profile</Link> and read the <Link href="/partner/conduct">partner terms</Link>.</p>
      </>
    );
  }

  const a = await daily({ partnerId: partner.id }, 30);
  const camps = await db.query.campaigns.findMany({ where: eq(schema.campaigns.partnerId, partner.id), with: { retailer: true }, orderBy: desc(schema.campaigns.createdAt) });
  const per = await Promise.all(camps.slice(0, 6).map(async (c) => ({ c, t: (await daily({ campaignId: c.id }, 30)).totals })));
  const pay = policy.allows("partner.compensation");

  return (
    <>
      <ConsoleHead title={`Hi, ${partner.displayName.split(" ")[0]}`} sub="What your recommendations led to over the last 30 days." actions={<Link href="/partner/links" className="btn primary sm">New link</Link>} />
      {!policy.allows("partner.referrals") && <p className="callout warn small mb-3">{policy.offMessage("partner.referrals")} Your links still work but aren't attributed.</p>}
      <dl className="metrics">
        <div className="metric"><dt>Visits</dt><dd>{n(a.totals.visits)}</dd><p className="delta">People who followed your links</p></div>
        <div className="metric"><dt>Placed an order</dt><dd>{n(a.totals.handoffs)}</dd><p className="delta">{pct(a.totals.handoffs, a.totals.visits)} of visits</p></div>
        <div className="metric"><dt>Purchases</dt><dd>{n(a.totals.purchases)}</dd><p className="delta">Confirmed by stores</p></div>
        <div className="metric"><dt>{pay ? "Earned" : "Earnings"}</dt><dd>{pay ? money(a.totals.commissionCents) : "—"}</dd><p className="delta">{pay ? "Pending and approved" : "Not available in your province"}</p></div>
      </dl>
      <section className="panel panel-pad mt-3">
        <h2 className="h4 mb-2">Daily, last 30 days</h2>
        <DailyBars label="Partner activity" days={a.days} series={[{ name: "Visits", values: a.visits }, { name: "Placed an order", values: a.handoffs, alt: true }]} />
      </section>
      <section className="mt-3">
        <h2 className="h4 mb-2">Your links</h2>
        <div className="panel table-wrap">
          <table>
            <thead><tr><th>Link</th><th>Store</th><th className="r">Visits</th><th className="r">To store</th><th className="r">Purchases</th></tr></thead>
            <tbody>
              {per.map(({ c, t }) => (
                <tr key={c.id}><td><span className="strong">{c.name}</span><br /><span className="muted">/r/{c.code}</span></td><td>{c.retailer.tradeName}</td><td className="r num">{n(t.visits)}</td><td className="r num">{n(t.handoffs)}</td><td className="r num">{n(t.purchases)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
