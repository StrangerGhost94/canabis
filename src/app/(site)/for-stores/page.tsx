import Link from "next/link";

export const metadata = { title: "For stores" };

export default function ForStores() {
  return (
    <>
      <section className="wrap section stack" style={{ ["--gap" as string]: "20px", maxWidth: 860 }}>
        <h1 className="display" style={{ fontSize: "clamp(2.4rem, 5vw, 4.2rem)" }}>Show people what you carry, and the licence that lets you sell it.</h1>
        <p className="lede">Cairn lists licensed cannabis retailers only. Customers see your menu, your hours and your verified licence, then buy from you, in store or on your own ordering page.</p>
        <div className="row">
          <Link href="/sign-up?as=RETAILER" className="btn signal">List your store</Link>
          <Link href="/how-it-works" className="btn">How we verify licences</Link>
        </div>
      </section>
      <section className="wrap section rule-top">
        <h2 className="h2 mb-3">Getting listed</h2>
        <ol className="steps4">
          <li><span className="step-n">1</span><p className="h4">Create your store</p><p className="muted">Trade name, legal entity, and each location's address and hours.</p></li>
          <li><span className="step-n">2</span><p className="h4">Submit your licence</p><p className="muted">Licence number, expiry, and a copy of the licence document.</p></li>
          <li><span className="step-n">3</span><p className="h4">We review it</p><p className="muted">A reviewer checks it against your regulator's public registry. You'll get a notification either way.</p></li>
          <li><span className="step-n">4</span><p className="h4">Go live</p><p className="muted">Publish your menu and availability. We remind you before your licence expires.</p></li>
        </ol>
      </section>
      <section className="wrap section rule-top grid-2">
        <div className="stack"><h2 className="h3">Your console</h2><p className="muted">Menu and stock by location, partner requests, referral analytics, your licence record, and an API for reporting purchases that came through partner links.</p></div>
        <div className="stack"><h2 className="h3">What Cairn won't do</h2><p className="muted">We don't take orders, payments or customer ID on your behalf, and we don't let partners sell for you. The sale and its compliance stay with your licence.</p></div>
      </section>
      <style>{`
        .steps4 { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s5); }
        .steps4 li { display: grid; gap: 8px; align-content: start; border-top: 2px solid var(--ink); padding-top: 16px; }
        .step-n { font-size: var(--t-2xl); font-stretch: 75%; font-weight: 600; line-height: 1; }
        @media (max-width: 900px) { .steps4 { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 520px) { .steps4 { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}
