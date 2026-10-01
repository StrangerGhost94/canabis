import Link from "next/link";
import { IconSearch } from "@/components/icons";
import { PackArt } from "@/components/pack-art";
import { ProductCard } from "@/components/product-card";
import { StoreCard } from "@/components/store-card";
import { allowedCategories } from "@/lib/compliance";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/format";
import { brandsFor, COLLECTIONS, discover, orderBlock, toListings } from "@/lib/queries";
import { getVisitor } from "@/lib/visitor";

const EDIT_ART: Record<string, { category: string; brand: string }> = {
  new: { category: "FLOWER", brand: "New" }, balanced: { category: "EDIBLE", brand: "Balanced" },
  cbd: { category: "CAPSULE", brand: "CBD" }, under30: { category: "PRE_ROLL", brand: "Value" },
};

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
  const open = !!res && res.stores.length > 0;
  const edits = (Object.keys(COLLECTIONS) as (keyof typeof COLLECTIONS)[]).filter((k) => k !== "under30" || showPrices);

  return (
    <>
      <section className="wrap hero">
        <div className="hero-copy">
          <h1 className="display">Every licensed shelf, in one market.</h1>
          <p className="lede">
            Browse what licensed stores in {policy?.name ?? "your province"} carry, compare offers across stores{canOrder ? ", and order for pickup or delivery. You pay the store when it's handed over" : ", then buy in store"}. No store is listed until its licence has been checked.
          </p>
          <form action="/shop" className="hero-search" role="search">
            <IconSearch aria-hidden />
            <label htmlFor="hq" className="sr-only">Search products, brands or stores</label>
            <input id="hq" name="q" className="grow" placeholder="Search products, brands or stores" autoComplete="off" />
            <button className="btn primary">Search</button>
          </form>
          {open && <p className="small muted">{listings.length} listings from {res!.stores.length} licensed {res!.stores.length === 1 ? "store" : "stores"}{v.near ? ` near ${v.near.label}` : ""}.</p>}
        </div>
        {!open && (
          <div className="edit" aria-hidden>
            {["FLOWER", "PRE_ROLL", "CAPSULE", "TOPICAL"].map((c) => (
              <span key={c} className="edit-tile" style={{ background: `var(--t-${c})` }}>
                <span className="edit-art"><PackArt p={{ category: c, brand: CATEGORY_LABEL[c].split(" ")[0], name: c }} /></span>
                <span className="edit-title">{CATEGORY_LABEL[c]}</span>
              </span>
            ))}
          </div>
        )}
        {open && (
          <nav className="edit" aria-label="Collections">
            {edits.map((k) => (
              <Link key={k} href={`/shop?collection=${k}`} className="edit-tile" style={{ background: `var(--t-${EDIT_ART[k].category})` }}>
                <span className="edit-art"><PackArt p={{ category: EDIT_ART[k].category, brand: EDIT_ART[k].brand, name: k }} /></span>
                <span className="edit-title">{COLLECTIONS[k].title}</span>
              </Link>
            ))}
          </nav>
        )}
      </section>

      {!open ? (
        <section className="wrap opening">
          <div className="opening-card">
            <h2 className="h2">Opening in {policy?.name ?? "your province"}</h2>
            <p className="muted">
              {policy && !policy.allows("retail.directory")
                ? `Cairn lists stores only once the rules for ${policy.name} have been reviewed. Retail there is licensed by ${policy.regulator}.`
                : "Licensed stores are joining now. Each one appears here after its licence has been checked against the provincial registry."}
            </p>
            <div className="row">
              <Link href="/for-stores" className="btn signal">List your licensed store</Link>
              <Link href="/partners" className="btn">Become a partner</Link>
            </div>
          </div>
          <ol className="opening-steps">
            <li><span className="n">1</span><p className="strong">Stores apply</p><p className="small muted">With their provincial licence and locations.</p></li>
            <li><span className="n">2</span><p className="strong">We check every licence</p><p className="small muted">Against the regulator's public registry, by a person.</p></li>
            <li><span className="n">3</span><p className="strong">Shelves open</p><p className="small muted">Menus, live stock, pickup and delivery where permitted.</p></li>
          </ol>
        </section>
      ) : (
        <>
          {cats.length > 0 && (
            <section className="wrap sec" aria-labelledby="formats">
              <div className="section-head"><h2 id="formats" className="h2">Shop by format</h2><Link href="/shop">Shop all</Link></div>
              <div className="formats">
                {cats.map((c) => (
                  <Link key={c} href={`/shop?category=${c}`} className="format" style={{ background: `var(--t-${c})` }}>
                    <span className="format-art"><PackArt p={{ category: c, brand: CATEGORY_LABEL[c].split(" ")[0], name: c }} /></span>
                    <span className="format-name">{CATEGORY_LABEL[c]}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {fresh.length > 0 && (
            <section className="wrap sec" aria-labelledby="new">
              <div className="section-head"><h2 id="new" className="h2">New on the shelves</h2><Link href="/shop?collection=new">View all</Link></div>
              <div className="pgrid">
                {fresh.map((p) => (
                  <ProductCard key={p.id} p={p} store={{ name: p.retailer.tradeName, slug: p.retailer.slug }} showPrice={showPrices}
                    orderable={orderBlock(policy!, p.retailer)} stock={p.best?.stock} distance={p.best?.distance} />
                ))}
              </div>
            </section>
          )}

          {brands.length > 0 && (
            <section className="wrap sec" aria-labelledby="brands">
              <div className="section-head"><h2 id="brands" className="h2">Brands on Cairn</h2><Link href="/brands">All brands</Link></div>
              <div className="brand-row">
                {brands.map((b) => (
                  <Link key={b.slug} href={`/brands/${b.slug}`} className="brand-tile">
                    <span className="bt-name">{b.name}</span>
                    <span className="xs muted">{b.productCount} {b.productCount === 1 ? "product" : "products"}, {b.storeCount} {b.storeCount === 1 ? "store" : "stores"}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {stores.length > 0 && (
            <section className="wrap sec" aria-labelledby="stores">
              <div className="section-head"><h2 id="stores" className="h2">{v.near ? "Stores near you" : `Stores in ${policy?.name}`}</h2><Link href="/stores">All stores</Link></div>
              <div className="store-grid">{stores.map((r) => <StoreCard key={r.id} r={r} policy={policy!} />)}</div>
            </section>
          )}

          <section className="wrap sec" aria-labelledby="how">
            <div className="section-head"><h2 id="how" className="h2">How ordering works</h2><Link href="/how-it-works">How we check stores</Link></div>
            <ol className="how">
              <li><span className="how-n">1</span><div><p className="h4">One store per order</p><p className="muted small">Compare offers, then fill a cart from the store you choose.</p></div></li>
              <li><span className="how-n">2</span><div><p className="h4">The store confirms</p><p className="muted small">You're notified when it's being prepared and when it's ready.</p></div></li>
              <li><span className="how-n">3</span><div><p className="h4">ID, then payment</p><p className="muted small">The store checks government ID and takes payment at handover.</p></div></li>
            </ol>
          </section>
        </>
      )}

      <section className="band" aria-label="Work with Cairn">
        <div className="wrap grid-2 section">
          <div className="stack">
            <h2 className="h2">Sell on Cairn</h2>
            <p>A storefront, live menu, pickup and delivery orders, and partners who send customers your way. Every store is licence-checked before it opens.</p>
            <Link href="/for-stores" className="btn signal">List your store</Link>
          </div>
          <div className="stack">
            <h2 className="h2">Recommend stores you trust</h2>
            <p>Verified partners share links to stores they know and see what their recommendations lead to. Partners never sell or handle product.</p>
            <Link href="/partners" className="btn">About partners</Link>
          </div>
        </div>
      </section>

      <style>{`
        .hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: clamp(32px, 6vw, 96px); align-items: end; padding-block: clamp(40px, 7vw, 104px) clamp(32px, 5vw, 72px); }
        .hero-copy { display: grid; gap: 26px; min-width: 0; }
        .hero-search { max-width: 100%; }
        .hero-search { display: flex; align-items: center; gap: 10px; max-width: 580px; height: 58px; padding: 0 6px 0 18px; background: var(--surface); border: 1px solid var(--ink); }
        .hero-search input { border: 0; background: transparent; height: 100%; font-size: max(16px, var(--t-md)); outline: none; min-width: 0; }
        .hero-search .btn { height: 44px; }
        .edit { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .edit-tile { position: relative; display: block; aspect-ratio: 1 / 1.05; color: var(--ink); text-decoration: none; overflow: hidden; }
        .edit-art { position: absolute; inset: 10% 18% 26%; display: block; transition: transform .6s var(--ease); }
        .edit-tile:hover .edit-art { transform: scale(1.05); }
        .edit-title { position: absolute; left: 16px; right: 16px; bottom: 14px; font-family: var(--font-display); font-size: clamp(1.1rem, 1.6vw, 1.45rem); font-weight: 500; line-height: 1.1; }
        .sec { padding-block: clamp(36px, 5vw, 72px); }
        .formats { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(150px, 1fr); gap: 12px; overflow-x: auto; scrollbar-width: none; }
        .format { position: relative; aspect-ratio: 3 / 4; color: var(--ink); text-decoration: none; }
        .format-art { position: absolute; inset: 14% 16% 30%; }
        .format-name { position: absolute; left: 14px; bottom: 12px; font-family: var(--font-display); font-size: 1.2rem; }
        .brand-row { display: grid; grid-template-columns: repeat(6, 1fr); border-top: 1px solid var(--rule); border-left: 1px solid var(--rule); }
        .brand-tile { display: grid; gap: 6px; align-content: center; justify-items: center; text-align: center; padding: 36px 12px; border-right: 1px solid var(--rule); border-bottom: 1px solid var(--rule); color: var(--ink); text-decoration: none; transition: background .2s; }
        .brand-tile:hover { background: var(--surface); }
        .bt-name { font-family: var(--font-display); font-size: 1.45rem; font-style: italic; }
        .store-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .how { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
        .how li { display: flex; gap: 16px; padding: 0; background: none; }
        .how-n { flex: none; font-family: var(--font-display); font-size: 2.6rem; line-height: .9; color: var(--brass); }
        .how li > div { display: grid; gap: 6px; align-content: start; }
        .band { color: #f1eff3; margin-top: var(--s6); }
        .band .btn:not(.signal) { --b-bg: transparent; --b-fg: #f1eff3; --b-bd: #57505f; }
        .opening { display: grid; grid-template-columns: 1.2fr 1fr; gap: 48px; padding-block: 24px 96px; align-items: start; }
        .opening-card { display: grid; gap: 18px; padding: 40px; background: var(--surface); border: 1px solid var(--rule); }
        .opening-steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 28px; }
        .opening-steps li { display: grid; grid-template-columns: 48px 1fr; column-gap: 12px; }
        .opening-steps .n { grid-row: span 2; font-family: var(--font-display); font-size: 2.4rem; line-height: 1; color: var(--brass); }
        @media (max-width: 1000px) { .brand-row { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 900px) { .hero, .opening { grid-template-columns: minmax(0, 1fr); } .how { grid-template-columns: 1fr; gap: 24px; } }
        @media (max-width: 760px) { .store-grid { grid-template-columns: 1fr; } .brand-row { grid-template-columns: 1fr 1fr; } .opening-card { padding: 24px; } .formats { grid-auto-columns: 42%; } }
      `}</style>
    </>
  );
}
