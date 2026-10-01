import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { setCommissionStatus } from "@/app/actions/admin";
import { ConsoleHead } from "@/components/console/shell";
import { money, relTime } from "@/lib/format";

export const metadata = { title: "Referrals and commissions" };
const CS: Record<string, string> = { PENDING: "warn", APPROVED: "ok", PAID: "ok", WITHHELD: "bad", NOT_APPLICABLE: "idle" };

export default async function Referrals() {
  const cs = await db.query.conversions.findMany({ with: { retailer: true, partner: true, campaign: true }, orderBy: desc(schema.conversions.createdAt), limit: 150 });
  const total = (s: string) => cs.filter((c) => c.commissionStatus === s).reduce((a, c) => a + (c.commissionCents ?? 0), 0);
  return (
    <>
      <ConsoleHead title="Referrals and commissions" sub="Commissions only exist where compensation is permitted for the store's jurisdiction. Withhold anything tied to flagged traffic." />
      <dl className="metrics mb-3">
        <div className="metric"><dt>Pending</dt><dd>{money(total("PENDING"))}</dd></div>
        <div className="metric"><dt>Approved, unpaid</dt><dd>{money(total("APPROVED"))}</dd></div>
        <div className="metric"><dt>Paid</dt><dd>{money(total("PAID"))}</dd></div>
        <div className="metric"><dt>Withheld</dt><dd>{money(total("WITHHELD"))}</dd></div>
      </dl>
      <div className="panel table-wrap">
        <table>
          <thead><tr><th>When</th><th>Store</th><th>Partner</th><th>Order</th><th className="r">Total</th><th className="r">Commission</th><th>Status</th><th /></tr></thead>
          <tbody>
            {cs.map((c) => (
              <tr key={c.id}>
                <td className="muted nowrap">{relTime(c.createdAt)}</td>
                <td>{c.retailer.tradeName}</td>
                <td>{c.partner?.displayName ?? "—"}<br /><span className="muted">{c.campaign?.code}</span></td>
                <td className="num muted">{c.externalRef}<br />{c.reportedVia}</td>
                <td className="r num">{c.orderCents ? money(c.orderCents) : "—"}</td>
                <td className="r num">{c.commissionCents ? money(c.commissionCents) : "—"}</td>
                <td><span className={`status ${CS[c.commissionStatus]}`}>{c.commissionStatus === "NOT_APPLICABLE" ? "Not applicable" : c.commissionStatus.toLowerCase()}</span></td>
                <td className="nowrap">
                  {c.commissionStatus !== "NOT_APPLICABLE" && (
                    <form action={setCommissionStatus} className="row" style={{ ["--gap" as string]: "8px", flexWrap: "nowrap" }}>
                      <input type="hidden" name="id" value={c.id} />
                      {c.commissionStatus === "PENDING" && <button name="status" value="APPROVED" className="linkbtn small">Approve</button>}
                      {c.commissionStatus === "APPROVED" && <button name="status" value="PAID" className="linkbtn small">Mark paid</button>}
                      {(c.commissionStatus === "PENDING" || c.commissionStatus === "APPROVED") && <button name="status" value="WITHHELD" className="linkbtn small">Withhold</button>}
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
