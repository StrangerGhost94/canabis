import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { RiskForm } from "@/components/admin/forms";
import { ConsoleHead } from "@/components/console/shell";
import { relTime } from "@/lib/format";

export const metadata = { title: "Risk and reports" };
const SEV: Record<string, string> = { HIGH: "bad", MEDIUM: "warn", LOW: "idle" };

export default async function Risk() {
  const open = await db.query.riskFlags.findMany({ where: eq(schema.riskFlags.status, "OPEN"), orderBy: [desc(schema.riskFlags.severity), desc(schema.riskFlags.createdAt)] });
  const closed = await db.query.riskFlags.findMany({ where: (f, { ne }) => ne(f.status, "OPEN"), orderBy: desc(schema.riskFlags.resolvedAt), limit: 20 });
  const partnerIds = [...open, ...closed].filter((f) => f.subjectType === "partner").map((f) => f.subjectId);
  const retailerIds = [...open, ...closed].filter((f) => f.subjectType === "retailer").map((f) => f.subjectId);
  const names = new Map<string, string>([
    ...(await db.query.partners.findMany({ where: (p, { inArray }) => inArray(p.id, partnerIds.concat("_")) })).map((p) => [p.id, `${p.displayName} (partner)`] as [string, string]),
    ...(await db.query.retailers.findMany({ where: (r, { inArray }) => inArray(r.id, retailerIds.concat("_")) })).map((r) => [r.id, `${r.tradeName} (store)`] as [string, string]),
  ]);
  return (
    <>
      <ConsoleHead title="Risk and reports" sub="Automated flags and public reports. Flagged referral traffic is already excluded from results; decide whether further action is needed." />
      {open.length === 0 ? <div className="empty panel"><span className="cairn" aria-hidden><i /><i /><i /></span><p className="h4">Nothing open</p><p className="small muted">New flags and reports appear here.</p></div> : (
        <ul className="list ruled">
          {open.map((f) => (
            <li key={f.id} className="risk-row">
              <div className="stack" style={{ ["--gap" as string]: "4px" }}>
                <div className="row" style={{ ["--gap" as string]: "10px" }}><span className={`status ${SEV[f.severity]}`}>{f.severity.toLowerCase()}</span><p className="strong">{f.reason}</p></div>
                <p className="small">{names.get(f.subjectId) ?? f.subjectId}</p>
                <ul className="small muted" style={{ margin: 0, paddingLeft: "1.1em" }}>
                  {Array.isArray((f.details as { reasons?: string[] }).reasons) && (f.details as { reasons: string[] }).reasons.map((r) => <li key={r}>{r}</li>)}
                  {typeof (f.details as { details?: string }).details === "string" && <li>{(f.details as { details: string }).details}</li>}
                </ul>
                <p className="xs muted">Raised {relTime(f.createdAt)}</p>
              </div>
              <RiskForm id={f.id} />
            </li>
          ))}
        </ul>
      )}
      {closed.length > 0 && (
        <section className="mt-4">
          <h2 className="h4 mb-2">Recently resolved</h2>
          <div className="panel table-wrap"><table><tbody>
            {closed.map((f) => <tr key={f.id}><td>{f.reason}</td><td>{names.get(f.subjectId) ?? f.subjectId}</td><td className="muted">{f.resolution}</td><td><span className={`status ${f.status === "ACTIONED" ? "ok" : "idle"}`}>{f.status.toLowerCase()}</span></td></tr>)}
          </tbody></table></div>
        </section>
      )}
      <style>{`.risk-row { display: grid; grid-template-columns: 1fr minmax(260px, 360px); gap: 24px; padding: 20px 0; } @media (max-width: 800px) { .risk-row { grid-template-columns: 1fr; } }`}</style>
    </>
  );
}
