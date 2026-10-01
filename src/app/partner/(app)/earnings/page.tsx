import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ConsoleHead } from "@/components/console/shell";
import { requirePartner } from "@/lib/auth/access";
import { getPolicy } from "@/lib/compliance";
import { money, relTime } from "@/lib/format";

export const metadata = { title: "Earnings" };
const CS: Record<string, [string, string]> = { PENDING: ["warn", "Pending"], APPROVED: ["ok", "Approved"], PAID: ["ok", "Paid"], WITHHELD: ["bad", "Withheld"], NOT_APPLICABLE: ["idle", "Unpaid"] };

export default async function Earnings() {
  const { partner } = await requirePartner();
  const policy = await getPolicy(partner.jurisdictionCode);
  const conv = await db.query.conversions.findMany({ where: eq(schema.conversions.partnerId, partner.id), with: { retailer: true, campaign: true }, orderBy: desc(schema.conversions.createdAt), limit: 100 });
  const sum = (s: string) => conv.filter((c) => c.commissionStatus === s).reduce((a, c) => a + (c.commissionCents ?? 0), 0);

  if (!policy.allows("partner.compensation")) {
    return (
      <>
        <ConsoleHead title="Earnings" />
        <div className="callout stack" style={{ maxWidth: 640, ["--gap" as string]: "8px" }}>
          <p className="strong">Referral earnings aren't available in {policy.name}</p>
          <p className="small muted">Cairn only enables payments to partners once the rules for a province or territory have been reviewed and confirm it's permitted. Until then, recommendations are unpaid and your profile says so. Purchases from your links still show in your results.</p>
          <p className="small muted">{conv.length} purchase{conv.length === 1 ? "" : "s"} from your links so far.</p>
        </div>
      </>
    );
  }
  return (
    <>
      <ConsoleHead title="Earnings" sub="A share of purchases stores confirm, at the rate each store agreed. Each line shows exactly which order it came from." />
      <dl className="metrics mb-3">
        <div className="metric"><dt>Pending</dt><dd>{money(sum("PENDING"))}</dd><p className="delta">Awaiting store confirmation</p></div>
        <div className="metric"><dt>Approved</dt><dd>{money(sum("APPROVED"))}</dd><p className="delta">Included in next payout</p></div>
        <div className="metric"><dt>Paid</dt><dd>{money(sum("PAID"))}</dd><p className="delta">All time</p></div>
      </dl>
      <div className="panel table-wrap">
        <table>
          <thead><tr><th>When</th><th>Store</th><th>Link</th><th>Order</th><th className="r">Order total</th><th className="r">Your share</th><th>Status</th></tr></thead>
          <tbody>
            {conv.map((c) => (
              <tr key={c.id}>
                <td className="muted nowrap">{relTime(c.createdAt)}</td><td>{c.retailer.tradeName}</td><td className="muted">{c.campaign?.name}</td><td className="num muted">{c.externalRef}</td>
                <td className="r num">{c.orderCents ? money(c.orderCents) : "—"}</td><td className="r num strong">{c.commissionCents ? money(c.commissionCents) : "—"}</td>
                <td><span className={`status ${CS[c.commissionStatus][0]}`}>{CS[c.commissionStatus][1]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="xs muted mt-2">Payouts require completed tax details and are processed by a payment provider; no payout provider is connected in this environment.</p>
    </>
  );
}
