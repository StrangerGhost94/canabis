import Link from "next/link";
import { PackArt } from "@/components/pack-art";
import { buyerPoint } from "@/lib/cart";
import { allowedCategories } from "@/lib/compliance";
import { CATEGORIES, CATEGORY_BLURB, CATEGORY_LABEL } from "@/lib/format";
import { discover } from "@/lib/queries";
import { getVisitor } from "@/lib/visitor";

export default async function Home() {
  const v = await getVisitor();
  const policy = v.policy;
  const point = await buyerPoint();
  const res = policy ? await discover(policy, point, { sort: "new" }) : null;
  const open = !!res && res.stores.length > 0;
  const cats = policy ? allowedCategories(policy, CATEGORIES).filter((c) => c !== "ACCESSORY").slice(0, 6) : [];
  const place = policy?.name ?? "your province";
  const age = policy?.legalAge ?? 19;
  const user = v.user;
  const verified = user?.idStatus === "VERIFIED";

  return (
    <>
      <section className="wrap hero-shell">
        <div className="hero night">
          <div className="hero-copy">
            <h1 className="display">Licensed cannabis, delivered.</h1>
            <p className="hero-lede">
              Every licensed store in {place}, in one app. Verify your ID once, order in a minute, and the nearest store brings it to your door.
            </p>
            <div className="hero-cta">
              {!user ? (
                <>
                  <Link href="/sign-up" className="btn light lg">Create free account</Link>
                  <Link href="/sign-in" className="btn on-night lg">Sign in</Link>
                </>
              ) : !verified ? (
                <>
                  <Link href="/account/verify" className="btn light lg">{user.idStatus === "PENDING" ? "Check verification" : "Verify my ID"}</Link>
                  <Link href="/shop" className="btn on-night lg">Browse the shop</Link>
                </>
              ) : (
                <>
                  <Link href="/shop" className="btn light lg">Start shopping</Link>
                  <Link href="/orders" className="btn on-night lg">My orders</Link>
                </>
              )}
            </div>
            <ul className="hero-proof">
              <li>Licensed stores only</li>
              <li>Pay at the door</li>
              <li>{age}+, ID checked on delivery</li>
            </ul>
          </div>

          <div className="hero-visual" aria-hidden>
            <div className="phone">
              <div className="phone-notch" />
              <div className="screen">
                <p className="s-top"><span className="s-logo"><span className="cairn"><i className="on" /><i className="on" /><i className="on" /></span>Cairn</span><span className="s-dot" /></p>
                <div className="s-status">
                  <p className="s-label">On its way</p>
                  <p className="s-time">Arrives in 28 min</p>
                  <div className="s-bar"><span /></div>
                  <ol className="s-steps"><li className="done">Accepted</li><li className="done">Packed</li><li className="now">Out for delivery</li></ol>
                </div>
                <div className="s-items">
                  <div className="s-item"><span className="s-art" style={{ background: "var(--t-PRE_ROLL)" }}><PackArt p={{ category: "PRE_ROLL", brand: "Fern", name: "a" }} /></span><span><b>Pre-rolls</b><small>3 × 0.5 g</small></span></div>
                  <div className="s-item"><span className="s-art" style={{ background: "var(--t-EDIBLE)" }}><PackArt p={{ category: "EDIBLE", brand: "Juno", name: "b" }} /></span><span><b>Gummies</b><small>CBD 10 mg</small></span></div>
                </div>
                <p className="s-foot">Delivered by a licensed store near you</p>
              </div>
            </div>
            <span className="float f1">ID verified</span>
            <span className="float f2">Nearest store found</span>
          </div>
        </div>
      </section>

      <section className="wrap how" aria-labelledby="how-h">
        <h2 id="how-h" className="h2">Three steps. That's it.</h2>
        <ol className="how-steps">
          <li><span className="hn">1</span><p className="h4">Verify once</p><p className="muted">Snap your ID and a selfie. We confirm you're {age}+, then delete the photos.</p></li>
          <li><span className="hn">2</span><p className="h4">Order what you like</p><p className="muted">Browse every licensed shelf near you. No store hunting — we pick the closest one that has it.</p></li>
          <li><span className="hn">3</span><p className="h4">Get it delivered</p><p className="muted">The store brings it over, checks your ID at the door, and you pay them. Moved? It just works.</p></li>
        </ol>
      </section>

      {open && cats.length > 0 && (
        <section className="wrap cats-sec" aria-labelledby="cats-h">
          <div className="row between mb-3"><h2 id="cats-h" className="h2">What are you after?</h2><Link href="/shop" className="btn sm">See everything</Link></div>
          <div className="cat-tiles">
            {cats.map((c) => (
              <Link key={c} href={`/shop?category=${c}`} className="cat-tile" style={{ background: `var(--t-${c})` }}>
                <span className="ct-art"><PackArt p={{ category: c, brand: CATEGORY_LABEL[c].split(" ")[0], name: c }} /></span>
                <span className="ct-name">{CATEGORY_LABEL[c]}</span>
                <span className="ct-blurb">{CATEGORY_BLURB[c]}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="wrap end-cta">
        <div className="end-card">
          <h2 className="h1">{open ? "Your first order is minutes away." : `Opening in ${place} soon.`}</h2>
          <p className="muted">{open ? "Create your account, verify once, and you're set." : "Create your account now and you'll be ready the day the first stores go live."}</p>
          <div className="row" style={{ justifyContent: "center" }}>
            {!user ? <Link href="/sign-up" className="btn signal lg">Create free account</Link> : <Link href="/shop" className="btn signal lg">Go to the shop</Link>}
          </div>
          <p className="small muted">Run a licensed store? <Link href="/for-stores">Sell on Cairn</Link></p>
        </div>
      </section>

      <style>{`
        .hero-shell { padding-top: clamp(12px, 2vw, 24px); }
        .hero { position: relative; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: clamp(24px, 4vw, 64px); align-items: center; padding: clamp(36px, 6vw, 88px); border-radius: 32px; overflow: hidden; min-height: min(78vh, 720px); }
        .hero-copy { display: grid; grid-template-columns: minmax(0, 1fr); gap: 28px; min-width: 0; position: relative; z-index: 1; }
        .hero .display { color: #fff; font-size: clamp(3rem, 7.2vw, 6.4rem); max-width: 10ch; }
        .hero-lede { font-size: clamp(1.05rem, 1.4vw, 1.25rem); line-height: 1.55; color: var(--night-mute); max-width: 44ch; }
        .hero-cta { display: flex; flex-wrap: wrap; gap: 12px; }
        .hero-proof { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 10px 22px; font-size: var(--t-sm); color: var(--night-ink); }
        .hero-proof li { display: inline-flex; align-items: center; gap: 8px; }
        .hero-proof li::before { content: ""; width: 16px; height: 16px; border-radius: 99px; background: var(--lilac) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 8.2l2.3 2.3 4.7-5' fill='none' stroke='%230f1714' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/16px no-repeat; }

        .hero-visual { position: relative; display: grid; place-items: center; min-height: 520px; }
        .phone { position: relative; width: 300px; height: 600px; border-radius: 46px; background: #06110d; padding: 12px; box-shadow: 0 0 0 1.5px rgba(255,255,255,.12), 0 40px 80px -30px rgba(0,0,0,.7), 0 0 120px -20px rgba(200,184,255,.35); transform: rotate(-4deg); }
        .phone-notch { position: absolute; top: 20px; left: 50%; width: 92px; height: 26px; margin-left: -46px; border-radius: 99px; background: #06110d; z-index: 2; }
        .screen { height: 100%; border-radius: 36px; background: var(--white); color: var(--ink-plum); padding: 52px 18px 18px; display: flex; flex-direction: column; gap: 14px; overflow: hidden; }
        .s-top { display: flex; justify-content: space-between; align-items: center; }
        .s-logo { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-display); font-weight: 700; letter-spacing: -0.04em; font-size: 1.1rem; }
        .s-logo .cairn { --cs: 12px; }
        .s-logo .cairn i.on { background: var(--ink-plum); }
        .s-dot { width: 28px; height: 28px; border-radius: 99px; background: var(--t-CAPSULE); }
        .s-status { display: grid; gap: 8px; padding: 16px; border-radius: 22px; background: var(--night); color: #fff; }
        .s-label { font-size: 12px; color: var(--lilac); font-weight: 600; }
        .s-time { font-family: var(--font-display); font-size: 1.55rem; font-weight: 650; letter-spacing: -0.03em; line-height: 1.05; }
        .s-bar { height: 6px; border-radius: 99px; background: rgba(255,255,255,.15); overflow: hidden; }
        .s-bar span { display: block; height: 100%; width: 72%; border-radius: 99px; background: linear-gradient(90deg, #3fbf8a, var(--lilac)); }
        .s-steps { list-style: none; margin: 0; padding: 0; display: flex; justify-content: space-between; font-size: 10.5px; color: rgba(255,255,255,.55); }
        .s-steps .done, .s-steps .now { color: #fff; }
        .s-steps .now { font-weight: 700; }
        .s-items { display: grid; gap: 10px; }
        .s-item { display: flex; gap: 12px; align-items: center; padding: 10px; border-radius: 18px; background: var(--gallery); font-size: 13px; }
        .s-item b { display: block; font-weight: 650; }
        .s-item small { color: var(--smoke); }
        .s-art { flex: none; width: 54px; height: 54px; border-radius: 14px; padding: 6px; display: block; }
        .s-foot { margin-top: auto; text-align: center; font-size: 11.5px; color: var(--smoke); }
        .float { position: absolute; padding: 10px 16px; border-radius: 999px; font-size: 13.5px; font-weight: 650; box-shadow: 0 16px 30px -12px rgba(0,0,0,.5); white-space: nowrap; }
        .float.f1 { top: 16%; left: 2%; background: var(--lilac); color: var(--ink-plum); }
        .float.f2 { bottom: 18%; right: 0; background: #fff; color: var(--ink-plum); }
        .float.f2::before { content: ""; display: inline-block; width: 8px; height: 8px; border-radius: 99px; background: #3fbf8a; margin-right: 8px; vertical-align: 1px; }
        @media (prefers-reduced-motion: no-preference) {
          .phone { animation: lift .9s var(--ease) both; }
          .float { animation: pop .6s var(--ease) both; }
          .float.f1 { animation-delay: .5s; } .float.f2 { animation-delay: .75s; }
          @keyframes lift { from { opacity: 0; transform: translateY(40px) rotate(-4deg); } }
          @keyframes pop { from { opacity: 0; transform: translateY(10px) scale(.92); } }
        }

        .how { padding-block: clamp(56px, 8vw, 112px) clamp(24px, 4vw, 48px); }
        .how .h2 { font-size: clamp(2rem, 3.6vw, 3rem); max-width: 16ch; }
        .how-steps { list-style: none; margin: 40px 0 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(24px, 4vw, 56px); }
        .how-steps li { display: grid; gap: 10px; align-content: start; padding-top: 22px; border-top: 2px solid var(--ink); }
        .how-steps .hn { font-family: var(--font-display); font-size: 3.4rem; font-weight: 650; line-height: 1; letter-spacing: -0.05em; color: var(--accent); }
        .how-steps .h4 { font-size: 1.3rem; font-family: var(--font-display); letter-spacing: -0.02em; }
        .how-steps .muted { max-width: 34ch; }

        .cats-sec { padding-block: clamp(32px, 4vw, 56px); }
        .cat-tiles { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
        .cat-tile { display: grid; gap: 4px; align-content: start; padding: 16px; border-radius: 24px; color: var(--ink); text-decoration: none; transition: transform .2s var(--ease); }
        .cat-tile:hover { transform: translateY(-3px); }
        .ct-art { display: block; aspect-ratio: 1; padding: 12% 18%; }
        .ct-name { font-family: var(--font-display); font-weight: 650; font-size: 1.15rem; letter-spacing: -0.02em; }
        .ct-blurb { font-size: 12.5px; color: var(--ink-2); }

        .end-cta { padding-block: clamp(24px, 4vw, 48px) clamp(56px, 8vw, 112px); }
        .end-card { display: grid; gap: 16px; justify-items: center; text-align: center; padding: clamp(40px, 6vw, 80px) 24px; border-radius: 32px; background: var(--brass-soft); }
        .end-card .h1 { font-size: clamp(2rem, 4.2vw, 3.4rem); max-width: 18ch; }

        @media (max-width: 1100px) { .cat-tiles { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 900px) {
          .hero { grid-template-columns: minmax(0, 1fr); min-height: 0; padding: 36px 24px 0; }
          .hero-visual { min-height: 0; height: 420px; overflow: hidden; align-items: start; padding-top: 20px; }
          .phone { width: 260px; height: 520px; }
          .s-time { font-size: 1.3rem; }
          .float.f1 { left: 0; top: 12%; } .float.f2 { right: 0; bottom: auto; top: 46%; }
          .how-steps { grid-template-columns: 1fr; }
        }
        @media (max-width: 560px) {
          .hero { border-radius: 24px; }
          .hero-cta .btn { flex: 1 1 100%; }
          .cat-tiles { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </>
  );
}
