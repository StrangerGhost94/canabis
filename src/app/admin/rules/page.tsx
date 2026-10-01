import Link from "next/link";
import { db } from "@/db";
import { ConsoleHead } from "@/components/console/shell";
import { RULE_KEYS, RULES } from "@/lib/compliance/rules";

export const metadata = { title: "Jurisdiction rules" };

export default async function Rules() {
  const js = await db.query.jurisdictions.findMany({ with: { rules: true }, orderBy: (j, { asc }) => asc(j.code) });
  return (
    <>
      <ConsoleHead title="Jurisdiction rules" sub="Every capability is off until someone records a determination with its legal basis. Changes apply immediately and are written to the audit log." />
      <div className="legend mb-2">
        <span style={{ ["--c" as string]: "var(--moss)" }}>Permitted</span>
        <span style={{ ["--c" as string]: "var(--red)" }}>Not permitted</span>
        <span style={{ ["--c" as string]: "var(--stone)" }}>Not yet reviewed (off)</span>
      </div>
      <div className="panel table-wrap">
        <table className="matrix">
          <thead>
            <tr><th>Capability</th>{js.map((j) => <th key={j.code} className="c"><Link href={`/admin/rules/${j.code}`} title={j.name}>{j.code}</Link></th>)}</tr>
          </thead>
          <tbody>
            {RULE_KEYS.map((k) => (
              <tr key={k}>
                <td><span className="strong">{RULES[k].label}</span><br /><span className="xs muted">{RULES[k].group}</span></td>
                {js.map((j) => {
                  const r = j.rules.find((x) => x.key === k);
                  const st = r?.status ?? "UNCONFIRMED";
                  return (
                    <td key={j.code} className="c">
                      <Link href={`/admin/rules/${j.code}#${k}`} aria-label={`${j.name}: ${RULES[k].label}, ${st.toLowerCase()}`} className={`cell ${st}`} />
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr><td className="muted">Legal age</td>{js.map((j) => <td key={j.code} className="c num strong">{j.legalAge}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <style>{`
        .matrix th.c, .matrix td.c { text-align: center; padding: 8px 4px; }
        .cell { display: inline-block; width: 18px; height: 18px; border-radius: 5px; background: var(--rule-soft); box-shadow: inset 0 0 0 1px var(--rule); vertical-align: middle; }
        .cell.ALLOWED { background: var(--moss); box-shadow: none; }
        .cell.PROHIBITED { background: var(--red); box-shadow: none; }
      `}</style>
    </>
  );
}
