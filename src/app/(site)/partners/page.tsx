import Link from "next/link";
import { getVisitor } from "@/lib/visitor";

export const metadata = { title: "Partners" };

export default async function Partners() {
  const v = await getVisitor();
  const p = v.policy;
  const referrals = p?.allows("partner.referrals");
  const pay = p?.allows("partner.compensation");
  return (
    <>
      <section className="wrap section partners-hero">
        <div className="stack" style={{ ["--gap" as string]: "20px" }}>
          <h1 className="display" style={{ fontSize: "clamp(2.4rem, 5vw, 4.2rem)" }}>Recommend the stores you'd send a friend to.</h1>
          <p className="lede">Cairn partners are writers, guides and community organisers who know their local shops. You get a verified profile, links that show what your recommendations lead to, and a clear record of everything you've shared.</p>
          <div className="row">
            <Link href={v.user ? "/partners/apply" : "/sign-up?as=PARTNER"} className="btn primary">Apply to be a partner</Link>
            <Link href="/p/jules" className="btn">See an example profile</Link>
          </div>
          {p && (
            <p className={`small ${referrals ? "muted" : "callout warn"}`}>
              {referrals
                ? `Partner referrals are available in ${p.name}. ${pay ? "Referral earnings are available too." : "Referral earnings aren't available here, so recommendations are unpaid."}`
                : `${p.offMessage("partner.referrals")} You can still apply; we'll let you know when it opens.`}
            </p>
          )}
        </div>
        <div className="profile-preview panel" aria-hidden>
          <div className="pp-top">
            <span className="pp-avatar">JT</span>
            <div><p className="h4">Jules Tremblay</p><p className="small muted">Verified partner since August</p></div>
          </div>
          <p className="small">I write a monthly newsletter about Toronto shops worth knowing.</p>
          <div className="pp-row"><span>Larchmont Supply</span><span className="small muted">Queen West</span></div>
          <div className="pp-row"><span>Harbourline</span><span className="small muted">Waterfront</span></div>
          <div className="pp-stats">
            <div><span className="num h3">612</span><span className="xs muted">visits this month</span></div>
            <div><span className="num h3">204</span><span className="xs muted">went on to a store</span></div>
          </div>
        </div>
      </section>

      <section className="wrap section rule-top">
        <div className="grid-2">
          <div className="stack">
            <h2 className="h2">What you get</h2>
            <dl className="defs">
              <div><dt>A profile that's yours</dt><dd>A public page with your bio and the stores you recommend, with your verified status shown to every visitor.</dd></div>
              <div><dt>Links and QR codes</dt><dd>One link per store or product, for each place you share. Print the QR code for an event or a zine.</dd></div>
              <div><dt>Honest numbers</dt><dd>Visits, hand-offs to a store, and purchases the store confirms. We don't count bots or repeated clicks.</dd></div>
              <div><dt>Earnings, where permitted</dt><dd>Where provincial rules allow it and a store agrees, stores can pay a share of confirmed purchases. Payouts show exactly which orders they came from.</dd></div>
            </dl>
          </div>
          <div className="stack">
            <h2 className="h2">What partners agree to</h2>
            <p className="muted">These terms are what make a recommendation on Cairn worth trusting.</p>
            <ul className="rules-list">
              <li>You never sell, hold, reserve or deliver cannabis, and never take payment for it.</li>
              <li>You only share with audiences of legal age, and never in ways that appeal to young people.</li>
              <li>No health or therapeutic claims, no testimonials about effects, no lifestyle promises.</li>
              <li>You disclose when you may be paid for a recommendation. Cairn shows that disclosure on your profile automatically.</li>
              <li>Stores choose whether to work with you, and either side can end it.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="wrap section rule-top">
        <h2 className="h2 mb-3">How joining works</h2>
        <ol className="steps">
          <li><span className="step-n">1</span><p className="h4">Apply</p><p className="muted">Tell us who you are, where you publish, and how you keep your audience to adults.</p></li>
          <li><span className="step-n">2</span><p className="h4">Get reviewed</p><p className="muted">A person reviews your application, usually within a few business days.</p></li>
          <li><span className="step-n">3</span><p className="h4">Connect with stores</p><p className="muted">Request to partner with listed stores. Your links start counting once a store accepts.</p></li>
        </ol>
      </section>
      <style>{`
        .partners-hero { display: grid; grid-template-columns: 1.3fr 1fr; gap: var(--s8); align-items: center; }
        .profile-preview { padding: var(--s5); display: grid; gap: 14px; transform: rotate(1.2deg); box-shadow: var(--shadow-pop); }
        .pp-top { display: flex; gap: 12px; align-items: center; }
        .pp-avatar { width: 44px; height: 44px; border-radius: var(--stone-r); background: var(--ink); color: var(--bg); display: grid; place-items: center; font-weight: 650; }
        .pp-row { display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid var(--rule); }
        .pp-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-top: 12px; border-top: 2px solid var(--ink); }
        .pp-stats div { display: grid; }
        .defs { display: grid; gap: var(--s4); margin: 0; }
        .defs dt { font-weight: 600; }
        .defs dd { margin: 2px 0 0; color: var(--ink-2); }
        .rules-list { padding-left: 1.1em; display: grid; gap: 10px; margin: 0; }
        .steps { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s6); }
        .steps li { display: grid; gap: 8px; align-content: start; border-top: 2px solid var(--ink); padding-top: 16px; }
        .step-n { font-size: var(--t-2xl); font-stretch: 75%; font-weight: 600; line-height: 1; }
        @media (max-width: 900px) { .partners-hero { grid-template-columns: 1fr; gap: var(--s6); } .steps { grid-template-columns: 1fr; } .profile-preview { transform: none; } }
      `}</style>
    </>
  );
}
