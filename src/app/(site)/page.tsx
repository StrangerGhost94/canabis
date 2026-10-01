import Link from "next/link";
import { Faq } from "@/components/faq";
import { IconBag, IconCheck, IconPin, IconSearch, IconShield, IconStore } from "@/components/icons";
import { NearControl } from "@/components/discover/near-form";
import { PackArt } from "@/components/pack-art";
import { ProductCard } from "@/components/product-card";
import { StoreCard } from "@/components/store-card";
import { allowedCategories } from "@/lib/compliance";
import { CATEGORIES, CATEGORY_BLURB, CATEGORY_LABEL, n } from "@/lib/format";
import { brandsFor, COLLECTIONS, discover, orderBlock, toListings } from "@/lib/queries";
import { getVisitor } from "@/lib/visitor";

export default async function Home() {
  const v = await getVisitor();
  const policy = v.policy;
  const res = policy ? await discover(policy, v.near, { sort: "new" }) : null;
  const listings = res ? toListings(res.products) : [];
  const fresh = listings.filter((l) => l.best?.stock !== "OUT").slice(0, 8);
  const brands = policy ? (await brandsFor(policy)).slice(0, 6) : [];
  const stores = (res?.stores ?? []).slice(0, 3);
  const cats = policy ? allowedCategories(policy, CATEGORIES).filter((c) => c !== "ACCESSORY") : [];
  const showPrices = !!policy?.allows("retail.prices");
  const canOrder = !!policy?.allows("orders.online");
  const delivery = canOrder && !!policy?.allows("retail.delivery");
  const open = !!res && res.stores.length > 0;
  const place = policy?.name ?? "your province";
  const quick = [
    ...cats.slice(0, 4).map((c) => ({ href: `/shop?category=${c}`, label: CATEGORY_LABEL[c] })),
    ...(showPrices ? [{ href: "/shop?collection=under30", label: COLLECTIONS.under30.title }] : []),
    { href: "/shop?collection=cbd", label: COLLECTIONS.cbd.title },
  ];

  return (
    <>
      {/* ── Hero ── */}
      <section className="night hero-wrap">
        <div className="wrap hero">
          <div className="hero-copy">
            <span className="kicker">Licensed cannabis · {place}</span>
            <h1 className="display">Every licensed store near you. <em>One simple cart.</em></h1>
            <p className="lede">
              See what each licensed store in {place} has on its shelves, compare prices, and
              {canOrder ? ` order ahead for pickup${delivery ? " or delivery" : ""}. You pay the store when you collect, after a quick ID check.` : " find the store with what you want before you go."}
            </p>
            <form action="/shop" className="hero-search" role="search">
              <IconSearch aria-hidden />
              <label htmlFor="hq" className="sr-only">Search products, brands or stores</label>
              <input id="hq" name="q" className="grow" placeholder="Try “pre-rolls”, “CBD gummies” or a store name" autoComplete="off" />
              <button className="btn brass">Search</button>
            </form>
            {open && quick.length > 0 && (
              <nav className="quick" aria-label="Popular">
                {quick.map((q) => <Link key={q.href} href={q.href}>{q.label}</Link>)}
              </nav>
            )}
          </div>

          <aside className="hero-card" aria-label="How Cairn works">
            <p className="kicker">How it works</p>
            <ol>
              <li><span className="hc-n">1</span><div><p className="strong">Find it</p><p className="small">Search every licensed shelf in {place}. Same product at several stores? See them side by side.</p></div></li>
              <li><span className="hc-n">2</span><div><p className="strong">{canOrder ? "Order from one store" : "Pick your store"}</p><p className="small">{canOrder ? "Fill your cart from the store you choose. It confirms and tells you when it's ready." : "Check stock and hours before you go."}</p></div></li>
              <li><span className="hc-n">3</span><div><p className="strong">Show ID, pay, done</p><p className="small">The store checks your government ID and takes payment at handover.</p></div></li>
            </ol>
            {open
              ? <p className="hero-stat"><b className="num">{n(listings.length)}</b> products from <b className="num">{n(res!.stores.length)}</b> licensed {res!.stores.length === 1 ? "store" : "stores"}{v.near ? ` near ${v.near.label}` : ""}</p>
              : <p className="hero-stat">Stores in {place} are joining now.</p>}
          </aside>
        </div>
      </section>

      {/* ── Promise ── */}
      <section className="promise-strip" aria-label="Why Cairn">
        <div className="wrap promise-grid">
          <div><IconShield aria-hidden /><p><b>Licensed stores only</b><span>Every store's provincial licence is checked by a person before it's listed.</span></p></div>
          <div><IconSearch aria-hidden /><p><b>Compare before you buy</b><span>Prices, stock and THC/CBD from each store's own menu.</span></p></div>
          <div><IconBag aria-hidden /><p><b>{canOrder ? `Pickup${delivery ? " or delivery" : ""}` : "Know before you go"}</b><span>{canOrder ? "Order ahead and skip the browsing at the counter." : "Live stock and opening hours for every location."}</span></p></div>
          <div><IconCheck aria-hidden /><p><b>Nothing to pay online</b><span>You pay the store directly. Cairn never handles your money.</span></p></div>
        </div>
      </section>

      {open ? (
        <>
          {cats.length > 0 && (
            <section className="wrap sec" aria-labelledby="formats">
              <div className="section-head">
                <div><span className="kicker">Browse</span><h2 id="formats" className="h2">What are you looking for?</h2></div>
                <Link href="/guide#formats">What's the difference?</Link>
              </div>
              <div className="formats">
                {cats.map((c) => (
                  <Link key={c} href={`/shop?category=${c}`} className="format">
                    <span className="format-art" style={{ background: `var(--t-${c})` }}><PackArt p={{ category: c, brand: CATEGORY_LABEL[c].split(" ")[0], name: c }} /></span>
                    <span className="format-name">{CATEGORY_LABEL[c]}</span>
                    <span className="format-blurb">{CATEGORY_BLURB[c]}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {fresh.length > 0 && (
            <section className="wrap sec" aria-labelledby="new">
              <div className="section-head">
                <div><span className="kicker">Just in</span><h2 id="new" className="h2">New on the shelves</h2></div>
                <Link href="/shop?collection=new">See all</Link>
              </div>
              <div className="pgrid">
                {fresh.map((p) => (
                  <ProductCard key={p.id} p={p} store={{ name: p.retailer.tradeName, slug: p.retailer.slug }} showPrice={showPrices}
                    orderable={orderBlock(policy!, p.retailer)} stock={p.best?.stock} distance={p.best?.distance} />
                ))}
              </div>
            </section>
          )}

          {stores.length > 0 && (
            <section className="wrap sec" aria-labelledby="stores">
              <div className="section-head">
                <div><span className="kicker">Licensed &amp; verified</span><h2 id="stores" className="h2">{v.near ? `Stores near ${v.near.label}` : `Stores in ${place}`}</h2></div>
                <Link href="/stores">All stores</Link>
              </div>
              {!v.near && (
                <div className="near-callout">
                  <IconPin aria-hidden />
                  <p><b>See what's closest.</b> Add your postal code to sort stores and products by distance.</p>
                  <NearControl label={null} next="/" compact />
                </div>
              )}
              <div className="store-grid">{stores.map((r) => <StoreCard key={r.id} r={r} policy={policy!} />)}</div>
            </section>
          )}

          {brands.length > 0 && (
            <section className="wrap sec" aria-labelledby="brands">
              <div className="section-head">
                <div><span className="kicker">Producers</span><h2 id="brands" className="h2">Brands on Cairn</h2></div>
                <Link href="/brands">All brands</Link>
              </div>
              <div className="brand-row">
                {brands.map((b) => (
                  <Link key={b.slug} href={`/brands/${b.slug}`} className="brand-tile">
                    <span className="bt-name">{b.name}</span>
                    <span className="xs muted">{b.productCount} {b.productCount === 1 ? "product" : "products"} · {b.storeCount} {b.storeCount === 1 ? "store" : "stores"}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="wrap sec opening" aria-labelledby="opening">
          <div className="opening-card">
            <span className="kicker">Opening soon</span>
            <h2 id="opening" className="h1">Cairn is opening in {place}</h2>
            <p className="lede">
              {policy && !policy.allows("retail.directory")
                ? `We list stores in ${place} once the provincial rules have been reviewed. Retail there is licensed by ${policy.regulator}.`
                : "Licensed stores are joining now. Each one appears the moment its licence has been checked against the provincial registry, with its full menu, prices and hours."}
            </p>
            <div className="row">
              <Link href="/sign-up" className="btn signal lg">Create your account</Link>
              <Link href="/guide" className="btn lg">Read the guide</Link>
            </div>
            <p className="small muted">Own a licensed store? <Link href="/for-stores">List it on Cairn</Link> — it's free to apply.</p>
          </div>
          <div className="opening-side">
            <p className="kicker">For licensed stores</p>
            <ol className="opening-steps">
              <li><span className="n">1</span><div><p className="strong">Apply with your licence</p><p className="small muted">Your provincial licence, locations and hours.</p></div></li>
              <li><span className="n">2</span><div><p className="strong">We verify it</p><p className="small muted">A person checks it against the regulator's public registry.</p></div></li>
              <li><span className="n">3</span><div><p className="strong">Your shelf goes live</p><p className="small muted">Menu, live stock, and orders straight to your counter.</p></div></li>
            </ol>
            <Link href="/for-stores" className="btn primary">List your store</Link>
          </div>
        </section>
      )}

      {/* ── Guide ── */}
      <section className="wrap sec" aria-labelledby="guide">
        <div className="section-head">
          <div><span className="kicker">New to cannabis?</span><h2 id="guide" className="h2">The basics, in plain language</h2></div>
          <Link href="/guide">Open the guide</Link>
        </div>
        <div className="icards">
          <Link href="/guide#labels" className="icard"><span className="ic"><IconSearch /></span><p className="h4">Reading a label</p><p className="small muted">What THC and CBD numbers mean, and why edibles show milligrams.</p></Link>
          <Link href="/guide#formats" className="icard"><span className="ic"><IconBag /></span><p className="h4">Formats explained</p><p className="small muted">Flower, pre-rolls, vapes, edibles and more — what each one is.</p></Link>
          <Link href="/guide#start-low" className="icard"><span className="ic"><IconShield /></span><p className="h4">Start low, go slow</p><p className="small muted">Health Canada's guidance for trying a product for the first time.</p></Link>
          <Link href="/guide#rules" className="icard"><span className="ic"><IconStore /></span><p className="h4">The rules in {policy?.name ?? "Canada"}</p><p className="small muted">Legal age{policy ? ` (${policy.legalAge}+)` : ""}, the 30 g limit, and where you can consume.</p></Link>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="wrap sec" aria-labelledby="how">
        <div className="section-head">
          <div><span className="kicker">Ordering</span><h2 id="how" className="h2">How an order works</h2></div>
          <Link href="/how-it-works">How we check stores</Link>
        </div>
        <ol className="steps">
          <li><p className="h4">One store per order</p><p className="small muted">Compare offers, then fill your cart from the store you choose. That way it's prepared and handed over in one go.</p></li>
          <li><p className="h4">The store confirms</p><p className="small muted">You get a notification when the store accepts, when it's being prepared, and when it's ready{delivery ? " or on its way" : ""}.</p></li>
          <li><p className="h4">ID, then payment</p><p className="small muted">Bring valid government photo ID{policy ? ` showing you're ${policy.legalAge} or older` : ""}. The store checks it and takes payment at handover.</p></li>
        </ol>
      </section>

      {/* ── FAQ ── */}
      <section className="wrap sec faq-sec" aria-labelledby="faq">
        <div>
          <span className="kicker">Questions</span>
          <h2 id="faq" className="h2">Good to know</h2>
          <p className="muted mt-1">Still unsure? <Link href="/guide">The guide</Link> covers the basics.</p>
        </div>
        <Faq legalAge={policy?.legalAge ?? null} place={place} canOrder={canOrder} />
      </section>

      <section className="band" aria-label="Work with Cairn">
        <div className="wrap grid-2 section">
          <div className="stack">
            <span className="kicker">For stores</span>
            <h2 className="h2">Sell on Cairn</h2>
            <p>A storefront, a live menu, and pickup and delivery orders sent straight to your counter. Every store is licence-checked before it opens.</p>
            <Link href="/for-stores" className="btn brass">List your store</Link>
          </div>
          <div className="stack">
            <span className="kicker">For creators</span>
            <h2 className="h2">Recommend stores you trust</h2>
            <p>Verified partners share links to stores they know and see what their recommendations lead to. Partners never sell or handle product.</p>
            <Link href="/partners" className="btn">About partners</Link>
          </div>
        </div>
      </section>

      <style>{`
        .hero-wrap { overflow: hidden; }
        .hero { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, .85fr); gap: clamp(32px, 6vw, 88px); align-items: center; padding-block: clamp(48px, 7vw, 104px); }
        .hero-copy { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; min-width: 0; }
        .hero .display { color: var(--night-ink); }
        .hero .display em { font-style: italic; color: var(--brass-soft); }
        .hero .lede { color: var(--night-mute); max-width: 54ch; }
        .hero-search { display: flex; align-items: center; gap: 12px; max-width: 620px; height: 64px; padding: 0 8px 0 22px; background: var(--white); color: var(--ink-plum); border-radius: 999px; box-shadow: 0 20px 50px -20px rgba(0,0,0,.6); }
        .hero-search svg { color: var(--smoke); flex: none; }
        .hero-search input { border: 0; background: transparent; height: 100%; font-size: max(16px, var(--t-md)); outline: none; min-width: 0; color: var(--ink-plum); }
        .hero-search .btn { min-height: 48px; padding: 0 24px; }
        .quick { display: flex; flex-wrap: wrap; gap: 8px; }
        .quick a { padding: 7px 14px; border-radius: 999px; border: 1px solid rgba(243,239,232,.18); color: var(--night-ink); text-decoration: none; font-size: var(--t-sm); background: rgba(255,255,255,.03); }
        .quick a:hover { border-color: var(--brass); background: rgba(176,141,87,.12); }
        .hero-card { display: grid; gap: 18px; padding: 28px; border-radius: 22px; background: linear-gradient(160deg, rgba(255,255,255,.07), rgba(255,255,255,.02)); border: 1px solid rgba(243,239,232,.12); backdrop-filter: blur(6px); }
        .hero-card ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 18px; }
        .hero-card li { display: grid; grid-template-columns: 36px 1fr; gap: 14px; }
        .hero-card li p.small { color: var(--night-mute); margin-top: 2px; }
        .hc-n { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 99px; border: 1px solid var(--brass); color: var(--brass-soft); font-family: var(--font-display); font-size: 1.1rem; }
        .hero-stat { padding-top: 16px; border-top: 1px solid rgba(243,239,232,.12); font-size: var(--t-sm); color: var(--night-mute); }
        .hero-stat b { color: var(--night-ink); font-size: 1.05rem; }
        .promise-strip { background: var(--surface); border-bottom: 1px solid var(--rule); }
        .promise-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; }
        .promise-grid > div { display: flex; gap: 14px; align-items: flex-start; padding: 26px 22px; border-left: 1px solid var(--rule-soft); }
        .promise-grid > div:first-child { border-left: 0; padding-left: 0; }
        .promise-grid svg { flex: none; width: 22px; height: 22px; color: var(--brass); margin-top: 2px; }
        .promise-grid b { display: block; font-weight: 640; margin-bottom: 2px; }
        .promise-grid span { font-size: var(--t-sm); color: var(--ink-2); }
        .formats { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 16px; }
        .format { display: grid; gap: 4px; align-content: start; color: var(--ink); text-decoration: none; }
        .format-art { display: block; aspect-ratio: 4 / 3; border-radius: var(--r-tile); padding: 12% 26%; margin-bottom: 10px; transition: transform .25s var(--ease), box-shadow .25s; }
        .format:hover .format-art { transform: translateY(-3px); box-shadow: var(--shadow-card); }
        .format-name { font-family: var(--font-display); font-size: 1.3rem; line-height: 1.1; }
        .format-blurb { font-size: var(--t-sm); color: var(--ink-2); }
        .near-callout { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 18px 22px; margin-bottom: 18px; border-radius: var(--r-tile); background: var(--brass-soft); }
        .near-callout > svg { width: 22px; height: 22px; flex: none; }
        .near-callout > p { flex: 1 1 260px; }
        .near-callout .near { flex: 1 1 320px; }
        .store-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .brand-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
        .brand-tile { display: grid; gap: 6px; align-content: center; justify-items: center; text-align: center; padding: 34px 12px; border-radius: var(--r-tile); background: var(--surface); border: 1px solid var(--rule-soft); color: var(--ink); text-decoration: none; transition: box-shadow .2s, border-color .2s; }
        .brand-tile:hover { box-shadow: var(--shadow-card); border-color: var(--rule); }
        .bt-name { font-family: var(--font-display); font-size: 1.4rem; font-style: italic; }
        .opening { display: grid; grid-template-columns: 1.3fr 1fr; gap: 24px; align-items: stretch; }
        .opening-card { display: grid; gap: 18px; align-content: start; padding: clamp(28px, 4vw, 48px); background: var(--surface); border: 1px solid var(--rule-soft); border-radius: 22px; }
        .opening-side { display: grid; gap: 22px; align-content: start; padding: clamp(28px, 4vw, 48px); background: var(--brass-soft); border-radius: 22px; }
        .opening-steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 20px; }
        .opening-steps li { display: grid; grid-template-columns: 40px 1fr; gap: 12px; }
        .opening-steps .n { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 99px; background: var(--night); color: var(--brass-soft); font-family: var(--font-display); }
        .faq-sec { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 2fr); gap: clamp(24px, 5vw, 72px); align-items: start; }
        .band .kicker { color: var(--brass); }
        @media (max-width: 1000px) { .brand-row { grid-template-columns: repeat(3, 1fr); } .promise-grid { grid-template-columns: 1fr 1fr; } .promise-grid > div:nth-child(3) { border-left: 0; padding-left: 0; } }
        @media (max-width: 900px) { .hero, .opening, .faq-sec { grid-template-columns: minmax(0, 1fr); } }
        @media (max-width: 760px) {
          .hero { padding-block: 36px 40px; gap: 28px; }
          .hero-search { height: 56px; padding-left: 16px; }
          .hero-search .btn { padding: 0 16px; min-height: 42px; }
          .hero-card { padding: 22px; }
          .promise-grid { grid-template-columns: 1fr; }
          .promise-grid > div { border-left: 0; padding: 16px 0; border-top: 1px solid var(--rule-soft); }
          .promise-grid > div:first-child { border-top: 0; }
          .store-grid { grid-template-columns: 1fr; }
          .brand-row { grid-template-columns: 1fr 1fr; }
          .formats { grid-template-columns: 1fr 1fr; gap: 12px; }
          .format-blurb { font-size: var(--t-xs); }
        }
      `}</style>
    </>
  );
}
