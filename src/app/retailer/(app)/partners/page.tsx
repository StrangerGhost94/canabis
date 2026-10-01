import { eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { respondToPartner } from "@/app/actions/retailer";
import { ConsoleHead } from "@/components/console/shell";
import { daily } from "@/lib/analytics";
import { requireRetailer } from "@/lib/auth/access";
import { getPolicy } from "@/lib/compliance";
import { money, n, relTime } from "@/lib/format";

export const metadata = { title: "Partners" };

export default async function RetailerPartners() {
  const { retailer, memberRole } = await requireRetailer();
  const policy = await getPolicy(retailer.jurisdictionCode);
  const ties = await db.query.partnerRetailers.findMany({ where: eq(schema.partnerRetailers.retailerId, retailer.id), with: { partner: true }, orderBy: (t, { desc }) => desc(t.updatedAt) });
  const pay = policy.allows("partner.compensation");
  const owner = memberRole === "OWNER";
  const requested = ties.filter((t) => t.status === "REQUESTED");
  const active = ties.filter((t) => t.status === "ACTIVE");
  const stats = new Map(await Promise.all(active.map(async (t) => [t.partnerId, (await daily({ retailerId: retailer.id, partnerId: t.partnerId }, 30)).totals] as const)));

  return (
    <>
      <ConsoleHead title="Partners" sub={policy.allows("partner.referrals")
        ? `Partners recommend your store with tracked links. ${pay ? "You can offer a commission on confirmed purchases." : "Referral payments aren't enabled in your province, so partnerships are unpaid."}`
        : policy.offMessage("partner.referrals")} />

      {requested.length > 0 && (
        <section className="mb-3">
          <h2 className="h4 mb-2">Requests</h2>
          <ul className="list ruled">
            {requested.map((t) => (
              <li key={t.partnerId} className="row between" style={{ padding: "16px 0" }}>
                <div className="grow" style={{ minWidth: 240 }}>
                  <p className="strong">{t.partner.displayName} <span className="muted small">@{t.partner.handle}</span>{t.partner.isDemo && <span className="tag demo" style={{ marginLeft: 8 }}>Demo</span>}</p>
                  <p className="small muted">{t.partner.audience}</p>
                  <p className="xs muted">Requested {relTime(t.createdAt)}. <Link href={`/p/${t.partner.handle}`}>View profile</Link></p>
                </div>
                {owner && (
                  <form action={respondToPartner} className="row">
                    <input type="hidden" name="partnerId" value={t.partnerId} />
                    {pay && <label className="small row" style={{ ["--gap" as string]: "6px" }}>Commission <input name="commission" className="input" inputMode="decimal" defaultValue="5" style={{ width: 64, minHeight: 34 }} />%</label>}
                    <button name="decision" value="DECLINED" className="btn sm">Decline</button>
                    <button name="decision" value="ACTIVE" className="btn primary sm">Accept</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="h4 mb-2">Active partners</h2>
        {active.length === 0 ? (
          <div className="empty panel"><span className="cairn" aria-hidden><i /><i /><i /></span><p className="h4">No active partners</p><p className="small muted">Verified partners in your province can request to recommend your store. Requests appear here.</p></div>
        ) : (
          <div className="panel table-wrap">
            <table>
              <thead><tr><th>Partner</th><th className="r">Visits</th><th className="r">Purchases</th><th className="r">Order value</th>{pay && <th className="r">Commission</th>}<th /></tr></thead>
              <tbody>
                {active.map((t) => {
                  const s = stats.get(t.partnerId)!;
                  return (
                    <tr key={t.partnerId}>
                      <td><span className="strong">{t.partner.displayName}</span><br /><span className="muted">@{t.partner.handle}</span></td>
                      <td className="r num">{n(s.visits)}</td>
                      <td className="r num">{n(s.purchases)}</td>
                      <td className="r num">{money(s.orderCents)}</td>
                      {pay && <td className="r num">{t.commissionBps ? `${t.commissionBps / 100}%` : "None"}</td>}
                      <td className="r">{owner && <form action={respondToPartner}><input type="hidden" name="partnerId" value={t.partnerId} /><button name="decision" value="ENDED" className="linkbtn small">End</button></form>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="xs muted" style={{ padding: "8px 12px" }}>Last 30 days. Visits exclude traffic flagged as suspicious.</p>
          </div>
        )}
      </section>
    </>
  );
}
