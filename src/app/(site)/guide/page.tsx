import Link from "next/link";
import { Faq } from "@/components/faq";
import { PackArt } from "@/components/pack-art";
import { allowedCategories, getJurisdictions } from "@/lib/compliance";
import { CATEGORIES, CATEGORY_BLURB, CATEGORY_LABEL } from "@/lib/format";
import { getVisitor } from "@/lib/visitor";

export const metadata = { title: "Guide: cannabis basics in plain language", description: "How to read a cannabis label, what each format is, Health Canada's lower-risk guidance, and the rules where you live." };

const EQUIV: { what: string; amount: string }[] = [
  { what: "Dried cannabis (flower, pre-rolls)", amount: "1 g" },
  { what: "Fresh cannabis", amount: "5 g" },
  { what: "Solid edibles", amount: "15 g" },
  { what: "Beverages and other liquids", amount: "70 g" },
  { what: "Concentrates and extracts", amount: "0.25 g" },
  { what: "Seeds", amount: "1 seed" },
];

export default async function Guide() {
  const v = await getVisitor();
  const policy = v.policy;
  const jurs = await getJurisdictions();
  const cats = (policy ? allowedCategories(policy, CATEGORIES) : CATEGORIES).filter((c) => c !== "ACCESSORY");
  const toc = [["labels", "Reading a label"], ["formats", "Formats explained"], ["start-low", "Start low, go slow"], ["rules", "The rules"], ["faq", "Ordering on Cairn"]];

  return (
    <>
      <section className="night">
        <div className="wrap guide-hero">
          <span className="kicker">The Cairn guide</span>
          <h1 className="display" style={{ fontSize: "clamp(2.4rem, 5vw, 4.2rem)" }}>Cannabis basics, <em>in plain language.</em></h1>
          <p className="lede">Everything you need to shop with confidence: what the numbers on a label mean, how the formats differ, and the rules {policy ? `in ${policy.name}` : "where you live"}. Facts only — no hype.</p>
          <nav className="guide-toc" aria-label="On this page">{toc.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}</nav>
        </div>
      </section>

      <div className="wrap guide">
        <section id="labels" className="g-sec">
          <div className="g-head"><span className="kicker">01</span><h2 className="h2">Reading a label</h2></div>
          <div className="g-body">
            <div className="icards">
              <div className="icard"><p className="pill thc" style={{ justifySelf: "start" }}><b>THC</b></p><p className="h4">Tetrahydrocannabinol</p><p className="small muted">The main compound in cannabis that causes intoxication — the "high". Higher numbers mean a stronger product.</p></div>
              <div className="icard"><p className="pill cbd" style={{ justifySelf: "start" }}><b>CBD</b></p><p className="h4">Cannabidiol</p><p className="small muted">Another compound found in cannabis. CBD does not cause intoxication on its own.</p></div>
            </div>
            <div className="g-note">
              <p><b>Percent or milligrams?</b> Flower, pre-rolls, vapes and extracts show THC and CBD as a <b>percentage</b> of weight. Edibles, drinks, capsules and topicals show <b>milligrams (mg)</b> per unit or per package, because you consume a measured amount.</p>
              <p><b>Why a range?</b> Cannabis is a plant, so potency varies a little between batches. Stores publish the range on the label; the package in your hand is the final word.</p>
              <p><b>Edibles have a cap.</b> In Canada, a package of edibles or drinks can contain at most 10 mg of THC.</p>
            </div>
          </div>
        </section>

        <section id="formats" className="g-sec">
          <div className="g-head"><span className="kicker">02</span><h2 className="h2">Formats explained</h2></div>
          <div className="g-body">
            <div className="g-formats">
              {cats.map((c) => (
                <Link key={c} href={`/shop?category=${c}`} className="g-format">
                  <span className="g-art" style={{ background: `var(--t-${c})` }}><PackArt p={{ category: c, brand: CATEGORY_LABEL[c].split(" ")[0], name: c }} /></span>
                  <span><span className="h4" style={{ display: "block" }}>{CATEGORY_LABEL[c]}</span><span className="small muted">{CATEGORY_BLURB[c]}</span></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="start-low" className="g-sec">
          <div className="g-head"><span className="kicker">03</span><h2 className="h2">Start low, go slow</h2></div>
          <div className="g-body">
            <p className="lede" style={{ color: "var(--ink-2)" }}>Health Canada's advice for anyone trying cannabis, or a new product, for the first time.</p>
            <ul className="g-list">
              <li><b>Choose a lower THC product.</b> Products with less THC, or with CBD alongside THC, are a gentler place to start.</li>
              <li><b>Edibles and drinks take time.</b> Effects can take 30 minutes to 2 hours to start and several hours to peak. Wait before taking more.</li>
              <li><b>Inhaled products act fast.</b> Effects from smoking or vaping begin within minutes.</li>
              <li><b>Don't mix.</b> Avoid combining cannabis with alcohol or other substances.</li>
              <li><b>Never drive high.</b> Impairment can last for hours after the effects seem to fade, and driving while impaired is a criminal offence.</li>
              <li><b>Store it safely.</b> Keep products in their child-resistant packaging, away from children and pets. Many edibles look like ordinary snacks.</li>
            </ul>
            <p className="small muted">Source and more detail: <a href="https://www.canada.ca/en/health-canada/services/drugs-medication/cannabis.html" rel="noreferrer">Health Canada — Cannabis</a>. If cannabis use is affecting your health or life, talk to a health professional.</p>
          </div>
        </section>

        <section id="rules" className="g-sec">
          <div className="g-head"><span className="kicker">04</span><h2 className="h2">The rules</h2></div>
          <div className="g-body">
            <div className="icards">
              <div className="icard"><p className="h4">Legal age</p><p className="small muted">{policy ? <>In {policy.name} you must be <b>{policy.legalAge} or older</b> to buy, carry or use cannabis.</> : "Set by each province and territory."} Stores check government ID at handover, every time.</p></div>
              <div className="icard"><p className="h4">30 g in public</p><p className="small muted">An adult can carry up to 30 g of dried cannabis, or the equivalent, in public. Your Cairn cart tracks this for you.</p></div>
              <div className="icard"><p className="h4">Borders</p><p className="small muted">Taking cannabis across Canada's international border, in either direction, is illegal — even to places where it's legal.</p></div>
              <div className="icard"><p className="h4">Where to consume</p><p className="small muted">Set by your province and city. Many places restrict use in public spaces, near schools and in vehicles.</p></div>
            </div>
            <div className="g-two">
              <div>
                <h3 className="h4 mb-2">What counts as 1 g of dried cannabis</h3>
                <table className="g-table"><tbody>{EQUIV.map((e) => <tr key={e.what}><td>{e.what}</td><td className="r num strong">{e.amount}</td></tr>)}</tbody></table>
              </div>
              <div>
                <h3 className="h4 mb-2">Legal age by province and territory</h3>
                <table className="g-table"><tbody>{jurs.map((j) => <tr key={j.code} className={j.code === v.region ? "here" : ""}><td>{j.name}</td><td className="r num strong">{j.legalAge}+</td></tr>)}</tbody></table>
              </div>
            </div>
            <p className="xs muted">General information, not legal advice. Laws change; check your provincial government's website for the current rules.</p>
          </div>
        </section>

        <section id="faq" className="g-sec">
          <div className="g-head"><span className="kicker">05</span><h2 className="h2">Ordering on Cairn</h2></div>
          <div className="g-body"><Faq legalAge={policy?.legalAge ?? null} place={policy?.name ?? "your province"} canOrder={!!policy?.allows("orders.online")} /></div>
        </section>

        <section className="g-cta">
          <h2 className="h2">Ready to browse?</h2>
          <p className="muted">Every licensed shelf {policy ? `in ${policy.name}` : "near you"}, side by side.</p>
          <Link href="/shop" className="btn signal lg">Start shopping</Link>
        </section>
      </div>

      <style>{`
        .guide-hero { display: grid; gap: 22px; padding-block: clamp(48px, 7vw, 96px); max-width: 900px; }
        .guide-hero .display { color: var(--night-ink); }
        .guide-hero em { font-style: italic; color: var(--brass-soft); }
        .guide-toc { display: flex; flex-wrap: wrap; gap: 8px; }
        .guide-toc a { padding: 7px 14px; border-radius: 999px; border: 1px solid rgba(243,239,232,.18); color: var(--night-ink); text-decoration: none; font-size: var(--t-sm); }
        .guide-toc a:hover { border-color: var(--brass); }
        .guide { padding-bottom: var(--s8); }
        .g-sec { display: grid; grid-template-columns: minmax(0, 280px) minmax(0, 1fr); gap: clamp(20px, 5vw, 64px); padding-block: clamp(40px, 6vw, 80px); border-bottom: 1px solid var(--rule); scroll-margin-top: 140px; }
        .g-head { display: grid; gap: 6px; align-content: start; position: sticky; top: 150px; }
        .g-body { display: grid; gap: 24px; min-width: 0; }
        .g-note { display: grid; gap: 14px; padding: 24px 26px; border-radius: var(--r-tile); background: var(--brass-soft); }
        .g-formats { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 12px; }
        .g-format { display: flex; gap: 16px; align-items: center; padding: 12px; border-radius: var(--r-tile); background: var(--surface); border: 1px solid var(--rule-soft); color: var(--ink); text-decoration: none; transition: box-shadow .2s; }
        .g-format:hover { box-shadow: var(--shadow-card); }
        .g-art { flex: none; width: 84px; height: 84px; border-radius: 14px; padding: 12px; display: block; }
        .g-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 12px; }
        .g-list li { padding: 16px 20px 16px 48px; background: var(--surface); border: 1px solid var(--rule-soft); border-radius: var(--r-panel); position: relative; }
        .g-list li::before { content: ""; position: absolute; left: 20px; top: 22px; width: 10px; height: 10px; border-radius: 99px; border: 2px solid var(--brass); }
        .g-two { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .g-table { background: var(--surface); border-radius: var(--r-panel); overflow: hidden; border: 1px solid var(--rule-soft); }
        .g-table td { padding: 10px 16px; }
        .g-table tr.here td { background: var(--brass-soft); }
        .g-cta { display: grid; gap: 12px; justify-items: center; text-align: center; padding-block: var(--s8) 0; }
        @media (max-width: 860px) { .g-sec { grid-template-columns: 1fr; } .g-head { position: static; } .g-two { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}
