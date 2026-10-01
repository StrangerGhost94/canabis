import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { revokeApiKey } from "@/app/actions/retailer";
import { ConsoleHead } from "@/components/console/shell";
import { ApiKeyForm, ReportConversionForm } from "@/components/retailer/forms";
import { requireRetailer } from "@/lib/auth/access";
import { env } from "@/lib/env";
import { money, relTime } from "@/lib/format";

export const metadata = { title: "Purchases and API" };

const STATUS: Record<string, string> = { REPORTED: "warn", CONFIRMED: "ok", REVERSED: "idle", DISPUTED: "bad" };

export default async function Referrals() {
  const { retailer, memberRole } = await requireRetailer();
  const conv = await db.query.conversions.findMany({ where: eq(schema.conversions.retailerId, retailer.id), with: { partner: true, campaign: true }, orderBy: desc(schema.conversions.createdAt), limit: 50 });
  const keys = await db.query.retailerApiKeys.findMany({ where: eq(schema.retailerApiKeys.retailerId, retailer.id), orderBy: desc(schema.retailerApiKeys.createdAt) });
  return (
    <>
      <ConsoleHead title="Purchases and API" sub="Cairn never sees your orders. When someone who arrived through a partner link buys, report it here or from your point-of-sale through the API." />
      <section className="panel panel-pad mb-3">
        <h2 className="h4 mb-2">Record a purchase</h2>
        <ReportConversionForm />
      </section>
      <section className="mb-3">
        <h2 className="h4 mb-2">Recent purchases from partner links</h2>
        {conv.length === 0 ? <p className="muted small">None reported yet.</p> : (
          <div className="panel table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Partner</th><th>Link</th><th className="r">Total</th><th>Via</th><th>Status</th><th>When</th></tr></thead>
              <tbody>
                {conv.map((c) => (
                  <tr key={c.id}>
                    <td className="num">{c.externalRef}</td>
                    <td>{c.partner?.displayName ?? "—"}</td>
                    <td className="muted">{c.campaign?.code}</td>
                    <td className="r num">{c.orderCents ? money(c.orderCents) : "—"}</td>
                    <td className="muted">{c.reportedVia === "api" ? "API" : "Console"}</td>
                    <td><span className={`status ${STATUS[c.status]}`}>{c.status[0] + c.status.slice(1).toLowerCase()}</span></td>
                    <td className="muted nowrap">{relTime(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="panel panel-pad stack">
        <h2 className="h4">API keys</h2>
        <p className="small muted">Report purchases from your systems. Keys are shown once and stored hashed.</p>
        <pre className="code" style={{ padding: 12, whiteSpace: "pre-wrap", display: "block" }}>{`POST ${env.APP_URL}/api/v1/conversions
Authorization: Bearer ck_xxxxxxxx.<secret>
Content-Type: application/json

{ "campaign_code": "jul-oct26", "order_ref": "A-10492", "order_total_cents": 4599 }`}</pre>
        {keys.length > 0 && (
          <ul className="list ruled">
            {keys.map((k) => (
              <li key={k.id} className="row between" style={{ padding: "10px 0" }}>
                <span><span className="strong">{k.name}</span> <span className="code">{k.prefix}…</span></span>
                <span className="small muted">{k.revokedAt ? "Revoked" : k.lastUsedAt ? `Last used ${relTime(k.lastUsedAt)}` : "Never used"}</span>
                {!k.revokedAt && memberRole === "OWNER" && <form action={revokeApiKey}><input type="hidden" name="id" value={k.id} /><button className="btn danger sm">Revoke</button></form>}
              </li>
            ))}
          </ul>
        )}
        {memberRole === "OWNER" && <ApiKeyForm />}
      </section>
    </>
  );
}
