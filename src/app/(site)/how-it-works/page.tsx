import { CairnMark } from "@/components/cairn";
import { ReportForm } from "@/components/report-form";
import { RULE_KEYS, RULES } from "@/lib/compliance/rules";
import { getVisitor } from "@/lib/visitor";
import type { Trust } from "@/lib/verification/trust";

export const metadata = { title: "How verification works" };

const mk = (state: Trust["state"], on: boolean[]): Pick<Trust, "state" | "stones" | "headline"> => ({
  state, headline: state, stones: on.map((ok, i) => ({ key: (["licence", "current", "listing"] as const)[i], ok, label: "", detail: "" })),
});

export default async function HowItWorks() {
  const v = await getVisitor();
  const states = [
    { t: mk("verified", [true, true, true]), h: "Listed", d: "Licence reviewed and current, and the store has updated its stock in the last 14 days." },
    { t: mk("verified", [true, true, false]), h: "Listed, menu may be stale", d: "Licence is fine, but the store hasn't updated availability recently. Call ahead." },
    { t: mk("pending", [false, true, false]), h: "Not listed", d: "We haven't finished reviewing the licence. The store doesn't appear in search." },
    { t: mk("expired", [true, false, false]), h: "Paused", d: "The licence has expired. The listing is hidden and we stop linking to the store's ordering page until a renewal is reviewed." },
  ];
  return (
    <div className="wrap section">
      <div className="hiw">
        <div className="stack prose" style={{ ["--gap" as string]: "16px" }}>
          <h1 className="h1">How verification works</h1>
          <p className="lede">Every store on Cairn carries a cairn: three stones, each standing for one thing we check. You'll see it next to every store name. Open it to see the record.</p>

          <h2 className="h2">The three stones</h2>
          <p><span className="strong">Top: licence checked.</span> Before a store is listed, a Cairn reviewer compares its licence with the provincial or territorial regulator's public registry, and records where and when. We don't accept a licence on a store's word.</p>
          <p><span className="strong">Middle: licence current.</span> We track every licence's expiry date. On the day a licence lapses, the store's listing pauses automatically and its products leave search.</p>
          <p><span className="strong">Base: availability fresh.</span> Stores publish what's in stock. If they haven't updated in two weeks, we say so.</p>
        </div>
        <ul className="list ruled states" aria-label="What each state looks like">
          {states.map((s) => (
            <li key={s.h} className="row top" style={{ padding: "16px 0", ["--gap" as string]: "16px", flexWrap: "nowrap" }}>
              <CairnMark trust={s.t} size={30} label={false} />
              <div><p className="strong">{s.h}</p><p className="small muted">{s.d}</p></div>
            </li>
          ))}
        </ul>
      </div>

      <div className="stack prose mt-5" style={{ ["--gap" as string]: "16px" }}>
        <h2 className="h2">Who sells, and who doesn't</h2>
        <p>Cairn is where you shop and place orders, but the licensed store is always the seller. When you order, the store accepts it, prepares it, checks your government ID and takes payment at the counter or your door. Cairn never holds product or takes payment. Every order comes from one store and stays within the 30 g public-possession limit.</p>
        <p>Partners are people who recommend stores. Each one applies, agrees to a code of conduct (no sales, no handling product, no marketing to anyone under the legal age, no health claims), and is reviewed before their links work. If a partner breaks those terms, their links stop attributing and their profile comes down.</p>

        <h2 className="h2">Watching for problems</h2>
        <p>We look for patterns that don't fit honest use, such as bursts of referral traffic from one network or listings that change in ways that break advertising rules. Flagged activity goes to a person, not just an algorithm, and every decision is written to a permanent audit log.</p>
      </div>

      <section id="rules" className="mt-5">
        <h2 className="h2 mb-2">What Cairn shows {v.policy ? `in ${v.policy.name}` : "where you are"}</h2>
        <p className="muted prose mb-3">Cannabis rules differ by province and territory. A feature is only switched on once its rules have been reviewed for that place. Anything not yet reviewed stays off.</p>
        {v.policy && (
          <div className="panel table-wrap" style={{ maxWidth: 760 }}>
            <table>
              <thead><tr><th>Feature</th><th>Status</th></tr></thead>
              <tbody>
                {RULE_KEYS.map((k) => {
                  const st = v.policy!.state(k);
                  return (
                    <tr key={k}>
                      <td>{RULES[k].label}</td>
                      <td><span className={`status ${st === "ALLOWED" ? "ok" : st === "PROHIBITED" ? "bad" : "idle"}`}>{st === "ALLOWED" ? "On" : st === "PROHIBITED" ? "Off, not permitted" : "Off, not yet reviewed"}</span>{st === "ALLOWED" && v.policy!.isDemo(k) && <span className="tag demo" style={{ marginLeft: 8 }}>Demo setting</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {v.policy && <p className="small muted mt-2">Legal age in {v.policy.name}: {v.policy.legalAge}. Regulator: {v.policy.regulator}.</p>}
      </section>

      <section id="report" className="mt-5 grid-2">
        <div className="stack prose">
          <h2 className="h2">Report a concern</h2>
          <p className="muted">Something look wrong — an expired licence, a store marketing to minors, a partner selling directly? Tell us. Reports go straight to the review queue. You don't need an account.</p>
          <p className="muted small">For anything urgent or unlawful, contact the provincial regulator or local police directly.</p>
        </div>
        <ReportForm />
      </section>
      <style>{`
        .hiw { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: var(--s7); align-items: start; }
        .states { position: sticky; top: 90px; }
        @media (max-width: 900px) { .hiw { grid-template-columns: 1fr; } .states { position: static; } }
      `}</style>
    </div>
  );
}
