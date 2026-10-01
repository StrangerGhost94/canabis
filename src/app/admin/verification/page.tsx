import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { LicenceReviewForm, PartnerReviewForm } from "@/components/admin/forms";
import { ConsoleHead } from "@/components/console/shell";
import { getPolicy } from "@/lib/compliance";
import { isDemo } from "@/lib/env";
import { relTime } from "@/lib/format";
import { fmtDate } from "@/lib/verification/trust";

export const metadata = { title: "Verification queue" };

export default async function Verification({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab === "partners" ? "partners" : "licences";
  const licences = await db.query.licences.findMany({ where: eq(schema.licences.status, "PENDING"), with: { retailer: { with: { locations: true } }, documents: true }, orderBy: (l, { asc }) => asc(l.createdAt) });
  const partners = await db.query.partners.findMany({ where: sql`${schema.partners.status} in ('APPLIED','UNDER_REVIEW')`, with: { user: true }, orderBy: (p, { asc }) => asc(p.createdAt) });
  return (
    <>
      <ConsoleHead title="Verification queue" sub="Nothing goes live without a decision recorded here. Oldest first." />
      <div className="seg mb-3" role="tablist">
        <Link role="tab" aria-selected={tab === "licences"} href="/admin/verification" className={`chip ${tab === "licences" ? "on" : ""}`}>Licences ({licences.length})</Link>
        <Link role="tab" aria-selected={tab === "partners"} href="/admin/verification?tab=partners" className={`chip ${tab === "partners" ? "on" : ""}`}>Partners ({partners.length})</Link>
      </div>

      {tab === "licences" ? (
        licences.length === 0 ? <Empty what="licences" /> : (
          <div className="stack" style={{ ["--gap" as string]: "20px" }}>
            {await Promise.all(licences.map(async (l) => {
              const policy = await getPolicy(l.jurisdictionCode);
              return (
                <article key={l.id} className="panel review">
                  <div className="panel-pad stack" style={{ ["--gap" as string]: "12px" }}>
                    <div className="row" style={{ ["--gap" as string]: "8px" }}><h2 className="h3">{l.retailer.tradeName}</h2>{l.isDemo && <span className="tag demo">Demo</span>}</div>
                    <dl className="kv">
                      <dt>Licence number</dt><dd className="num strong">{l.number}</dd>
                      <dt>Holder</dt><dd>{l.holderName}</dd>
                      <dt>Province</dt><dd>{policy.name}</dd>
                      <dt>Expires</dt><dd>{fmtDate(l.expiresAt)}</dd>
                      <dt>Locations</dt><dd>{l.retailer.locations.map((x) => `${x.street}, ${x.city} ${x.postalCode}`).join("; ")}</dd>
                      <dt>Submitted</dt><dd>{relTime(l.createdAt)}</dd>
                      <dt>Documents</dt><dd>{l.documents.length ? l.documents.map((d) => <a key={d.id} href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer">{d.originalName}</a>) : <span className="muted">None uploaded</span>}</dd>
                    </dl>
                    {l.reviewNotes && <p className="callout warn small">{l.reviewNotes}</p>}
                    <p className="small">Check against: {policy.registryUrl ? <a href={policy.registryUrl} target="_blank" rel="noreferrer">{policy.regulator} registry</a> : <span>{policy.regulator} public registry</span>}. Confirm the number, holder, address and expiry all match.</p>
                  </div>
                  <div className="panel-pad review-form"><LicenceReviewForm licenceId={l.id} demoAllowed={isDemo} isDemoLicence={l.number.startsWith("DEMO-")} /></div>
                </article>
              );
            }))}
          </div>
        )
      ) : partners.length === 0 ? <Empty what="partner applications" /> : (
        <div className="stack" style={{ ["--gap" as string]: "20px" }}>
          {partners.map((p) => (
            <article key={p.id} className="panel review">
              <div className="panel-pad stack" style={{ ["--gap" as string]: "12px" }}>
                <div className="row" style={{ ["--gap" as string]: "8px" }}><h2 className="h3">{p.displayName}</h2><span className="muted">@{p.handle}</span>{p.isDemo && <span className="tag demo">Demo</span>}</div>
                <dl className="kv">
                  <dt>Account</dt><dd>{p.user.email}</dd>
                  <dt>Province</dt><dd>{p.jurisdictionCode}</dd>
                  <dt>Channels</dt><dd>{p.channels.join(", ")}</dd>
                  <dt>Audience</dt><dd>{p.audience}</dd>
                  <dt>Bio</dt><dd>{p.bio}</dd>
                  <dt>Agreed to terms</dt><dd>{p.attestedAt ? fmtDate(p.attestedAt) : "No"}</dd>
                </dl>
                <p className="small muted">Check that their channels exist, use age-gating, and contain no sales activity, health claims or youth-oriented content.</p>
              </div>
              <div className="panel-pad review-form"><PartnerReviewForm partnerId={p.id} /></div>
            </article>
          ))}
        </div>
      )}
      <style>{`
        .review { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); }
        .review-form { border-left: 1px solid var(--rule); background: color-mix(in srgb, var(--surface) 60%, var(--bg)); border-radius: 0 var(--r-panel) var(--r-panel) 0; }
        .kv { display: grid; grid-template-columns: 140px 1fr; gap: 6px 16px; margin: 0; font-size: var(--t-sm); }
        .kv dt { color: var(--ink-2); }
        .kv dd { margin: 0; }
        @media (max-width: 1000px) { .review { grid-template-columns: 1fr; } .review-form { border-left: 0; border-top: 1px solid var(--rule); border-radius: 0 0 var(--r-panel) var(--r-panel); } .kv { grid-template-columns: 1fr; } .kv dd { margin-bottom: 6px; } }
      `}</style>
    </>
  );
}

function Empty({ what }: { what: string }) {
  return <div className="empty panel"><span className="cairn" aria-hidden><i /><i /><i /></span><p className="h4">No {what} waiting</p><p className="small muted">New submissions appear here, and admins are notified.</p></div>;
}
