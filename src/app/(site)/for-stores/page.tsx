import Link from "next/link";

export const metadata = { title: "For stores" };

export default function ForStores() {
  return (
    <>
      <section className="wrap section stack" style={{ ["--gap" as string]: "20px", maxWidth: 860 }}>
        <h1 className="display" style={{ fontSize: "clamp(2.4rem, 5vw, 4.2rem)" }}>Take pickup and delivery orders from customers nearby.</h1>
        <p className="lede">Cairn is a marketplace for licensed retailers only. Customers browse your menu, order for pickup or delivery, and pay you when you hand it over. You stay the seller; Cairn never takes payment.</p>
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
          <li><span className="step-n">4</span><p className="h4">Start taking orders</p><p className="muted">Publish your menu, turn on ordering, and accept orders as they arrive.</p></li>
        </ol>
      </section>
      <section className="wrap section rule-top grid-2">
        <div className="stack"><h2 className="h3">Your console</h2><p className="muted">An order board with new, preparing and ready columns, menu and stock by location, delivery settings, partner requests and results, and your licence record.</p></div>
        <div className="stack"><h2 className="h3">What Cairn won't do</h2><p className="muted">We don't take payment or check ID on your behalf, and partners never sell for you. Every sale, ID check and handover stays with your licence.</p></div>
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
