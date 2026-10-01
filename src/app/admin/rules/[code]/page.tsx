import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { RuleForm } from "@/components/admin/forms";
import { ConsoleHead } from "@/components/console/shell";
import { RULE_KEYS, RULES } from "@/lib/compliance/rules";
import { relTime } from "@/lib/format";

export default async function JurisdictionRules({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const j = await db.query.jurisdictions.findFirst({ where: eq(schema.jurisdictions.code, code.toUpperCase()), with: { rules: true } });
  if (!j) notFound();
  return (
    <>
      <p className="small mb-2"><Link href="/admin/rules">Jurisdiction rules</Link></p>
      <ConsoleHead title={j.name} sub={<>Legal age {j.legalAge}. {j.retailModel}. Regulator: {j.regulator}. <span className="xs">Age source: {j.ageSource}</span></>} />
      <div className="stack" style={{ ["--gap" as string]: "16px" }}>
        {RULE_KEYS.map((k) => {
          const r = j.rules.find((x) => x.key === k);
          return (
            <section key={k} id={k} className="panel rule-card">
              <div className="panel-pad">
                <div className="row" style={{ ["--gap" as string]: "8px" }}><h2 className="h4">{RULES[k].label}</h2></div>
                <p className="xs muted code" style={{ background: "none", padding: 0 }}>{k}</p>
                <p className="small muted mt-1">When off, people see: “{RULES[k].off}”</p>
                {r?.reviewedAt && <p className="xs muted mt-1">Last changed {relTime(r.reviewedAt)}{r.source ? `. Basis: ${r.source}` : ""}</p>}
              </div>
              <div className="panel-pad" style={{ borderLeft: "1px solid var(--rule)" }}>
                <RuleForm code={j.code} ruleKey={k} status={r?.status ?? "UNCONFIRMED"} source={r?.source ?? ""} notes={r?.notes ?? ""} />
              </div>
            </section>
          );
        })}
      </div>
      <style>{`.rule-card { display: grid; grid-template-columns: 1fr 1.2fr; } @media (max-width: 1000px) { .rule-card { grid-template-columns: 1fr; } .rule-card > :last-child { border-left: 0 !important; border-top: 1px solid var(--rule); } }`}</style>
    </>
  );
}
