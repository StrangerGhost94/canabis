import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { TrustRecord } from "@/components/cairn";
import { ConsoleHead } from "@/components/console/shell";
import { LicenceForm } from "@/components/retailer/forms";
import { requireRetailer } from "@/lib/auth/access";
import { getPolicy } from "@/lib/compliance";
import { RULE_KEYS, RULES } from "@/lib/compliance/rules";
import { lastInventoryUpdates } from "@/lib/queries";
import { fmtDate, trustFor } from "@/lib/verification/trust";

export const metadata = { title: "Licence and rules" };

const LS: Record<string, string> = { VERIFIED: "ok", PENDING: "warn", REJECTED: "bad", EXPIRED: "bad", REVOKED: "bad" };

export default async function Compliance() {
  const { retailer, memberRole } = await requireRetailer();
  const policy = await getPolicy(retailer.jurisdictionCode);
  const licences = await db.query.licences.findMany({ where: eq(schema.licences.retailerId, retailer.id), with: { documents: true }, orderBy: desc(schema.licences.createdAt) });
  const trust = trustFor(retailer, licences, (await lastInventoryUpdates([retailer.id])).get(retailer.id));
  return (
    <>
      <ConsoleHead title="Licence and rules" sub={`What customers see when they open your cairn, and the rules Cairn applies in ${policy.name}.`} />
      <div className="grid-2" style={{ alignItems: "start" }}>
        <section className="panel panel-pad">
          <h2 className="h4 mb-2">Your public record</h2>
          <TrustRecord trust={trust} retailerName={retailer.legalName} regulator={policy.regulator} registryUrl={policy.registryUrl} />
        </section>
        <section className="stack">
          <h2 className="h4">Licences on file</h2>
          <ul className="list ruled">
            {licences.map((l) => (
              <li key={l.id} style={{ padding: "12px 0" }}>
                <div className="row between"><span className="strong num">{l.number}</span><span className={`status ${LS[l.status]}`}>{l.status[0] + l.status.slice(1).toLowerCase()}</span></div>
                <p className="small muted">Expires {fmtDate(l.expiresAt)}{l.verifiedAt ? `. Checked ${fmtDate(l.verifiedAt)}` : ""}</p>
                {l.reviewNotes && <p className="small">Reviewer note: {l.reviewNotes}</p>}
                {l.documents.map((d) => <a key={d.id} className="small" href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer">{d.originalName}</a>)}
              </li>
            ))}
          </ul>
          {memberRole === "OWNER" && (
            <div className="panel panel-pad mt-2">
              <h3 className="h4 mb-2">Submit a renewal or new licence</h3>
              <LicenceForm />
            </div>
          )}
        </section>
      </div>
      <section className="mt-4">
        <h2 className="h4 mb-2">What Cairn shows in {policy.name}</h2>
        <div className="panel table-wrap">
          <table>
            <thead><tr><th>Feature</th><th>Status</th><th>Basis</th></tr></thead>
            <tbody>
              {RULE_KEYS.map((k) => {
                const s = policy.state(k);
                return (
                  <tr key={k}>
                    <td>{RULES[k].label}</td>
                    <td><span className={`status ${s === "ALLOWED" ? "ok" : s === "PROHIBITED" ? "bad" : "idle"}`}>{s === "ALLOWED" ? "On" : s === "PROHIBITED" ? "Off" : "Not yet reviewed"}</span></td>
                    <td className="muted">{s === "UNCONFIRMED" ? "Off until reviewed" : "Reviewed by Cairn compliance"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
