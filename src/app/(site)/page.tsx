import Link from "next/link";
import { IconSearch } from "@/components/icons";
import { PackArt } from "@/components/pack-art";
import { ProductCard } from "@/components/product-card";
import { StoreCard } from "@/components/store-card";
import { allowedCategories } from "@/lib/compliance";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/format";
import { discover, orderBlock } from "@/lib/queries";
import { getVisitor } from "@/lib/visitor";

const SHELF_BRANDS: Record<string, string> = { FLOWER: "Paperbirch", PRE_ROLL: "Low Tide", VAPE: "Muskeg", EDIBLE: "Fieldwork", BEVERAGE: "Shale & Co.", EXTRACT: "Granite Hollow", TOPICAL: "Northcourt", CAPSULE: "Spruce Line", SEED: "Paperbirch" };

export default async function Home() {
  const v = await getVisitor();
  const policy = v.policy;
  const res = policy ? await discover(policy, v.near, { sort: v.near ? "near" : "name" }) : null;
  const cats = policy ? allowedCategories(policy, CATEGORIES).filter((c) => c !== "ACCESSORY") : CATEGORIES.slice(0, 6);
  const canOrder = !!policy?.allows("orders.online");
  const showPrices = !!policy?.allows("retail.prices");
  // Interleave stores so the shelf shows the marketplace, not just the nearest shop.
  const pool = (res?.products ?? []).filter((p) => p.best && p.best.stock !== "OUT");
  const byStore = new Map<string, typeof pool>();
  for (const p of pool) byStore.set(p.retailerId, [...(byStore.get(p.retailerId) ?? []), p]);
  const picks: typeof pool = [];
  const seen = new Set<string>();
  for (let round = 0; picks.length < 10 && round < 20; round++) {
    for (const list of byStore.values()) {
      const p = list.find((x) => !seen.has(x.name));
      if (p && picks.length < 10) { picks.push(p); seen.add(p.name); list.splice(list.indexOf(p), 1); }
    }
  }
  const stores = (res?.stores ?? []).slice(0, 6);
  const area = v.near?.label ?? policy?.name ?? "your area";

  return (
    <>
      <section className="wrap home-hero">
        <div className="stack hero-copy" style={{ ["--gap" as string]: "22px" }}>
          <h1 className="display">Licensed cannabis, ordered from stores near you.</h1>
          <p className="lede">
            Browse what licensed stores in {policy?.name ?? "your province"} have on the shelf{canOrder ? ", order for pickup or delivery, and pay the store when it's handed over" : ", then buy in store"}. Every store's licence is checked before it's listed.
          </p>
          <form action="/shop" className="hero-search" role="search">
            <IconSearch aria-hidden />
            <label htmlFor="hq" className="sr-only">Search products, brands or stores</label>
            <input id="hq" name="q" className="grow" placeholder="Search products, brands or stores" autoComplete="off" />
            <button className="btn primary">Search</button>
          </form>
          {res && <p className="small muted">{res.products.length} products from {res.stores.length} licensed {res.stores.length === 1 ? "store" : "stores"}{v.near ? ` near ${v.near.label}` : ` in ${policy?.name}`}.</p>}
        </div>
        <nav className="shelf-wall" aria-label="Shop by format">
          {cats.slice(0, 6).map((c) => (
            <Link key={c} href={`/shop?category=${c}`} className="shelf" style={{ background: `var(--t-${c})` }}>
              <span className="shelf-art"><PackArt p={{ category: c, brand: SHELF_BRANDS[c] ?? "Cairn", name: c }} /></span>
              <span className="shelf-label">{CATEGORY_LABEL[c]}</span>
            </Link>
          ))}
        </nav>
      </section>

      {policy && !policy.allows("retail.directory") ? (
        <section className="wrap section-tight">
          <div className="callout"><p className="strong">No stores listed in {policy.name} yet</p><p className="muted small">{policy.offMessage("retail.directory")} Retail there is run by {policy.regulator}.</p></div>
        </section>
      ) : (
        <>
          {picks.length > 0 && (
            <section className="wrap section-tight" aria-labelledby="near-picks">
              <div className="row between mb-3">
                <h2 id="near-picks" className="h2">{canOrder ? `In stock near ${area}` : `On the shelf near ${area}`}</h2>
                <Link href="/shop" className="btn sm">Shop all</Link>
              </div>
              <div className="pgrid">
                {picks.map((p) => (
                  <ProductCard key={p.id} p={p} store={{ name: p.retailer.tradeName, slug: p.retailer.slug }} showPrice={showPrices}
                    orderable={orderBlock(policy!, p.retailer)} stock={p.best?.stock} distance={p.best?.distance} />
                ))}
              </div>
            </section>
          )}

          {stores.length > 0 && (
            <section className="wrap section-tight" aria-labelledby="stores-near">
              <div className="row between mb-3">
                <h2 id="stores-near" className="h2">Stores {v.near ? "nearby" : `in ${policy?.name}`}</h2>
                <Link href="/stores" className="btn sm">All stores</Link>
              </div>
              <div className="store-grid">
                {stores.map((r) => <StoreCard key={r.id} r={r} policy={policy!} />)}
              </div>
            </section>
          )}
        </>
      )}

      <section className="wrap section-tight" aria-labelledby="how">
        <h2 id="how" className="h2 mb-3">How ordering works</h2>
        <ol className="how">
          <li><span className="how-n">1</span><div><p className="h4">Fill a cart from one store</p><p className="muted small">Each order comes from a single licensed store, so it's prepared and handed over in one go.</p></div></li>
          <li><span className="how-n">2</span><div><p className="h4">The store accepts it</p><p className="muted small">You'll get a notification when it's being prepared and when it's ready, with a time estimate.</p></div></li>
          <li><span className="how-n">3</span><div><p className="h4">Show ID and pay the store</p><p className="muted small">At the counter or at your door. The store checks government ID and takes payment. Cairn never does.</p></div></li>
        </ol>
        <p className="small muted mt-3">Orders follow the 30 g public-possession limit, counted from each product's dried-cannabis equivalent. <Link href="/how-it-works">How we check stores</Link></p>
      </section>

      <section className="band" aria-label="Work with Cairn">
        <div className="wrap grid-2 section">
          <div className="stack">
            <h2 className="h2">Sell on Cairn</h2>
            <p>Licensed retailers list their menu, take pickup and delivery orders, and see which partners send them customers. Every store's licence is reviewed before it goes live.</p>
            <Link href="/for-stores" className="btn signal">List your store</Link>
          </div>
          <div className="stack">
            <h2 className="h2">Recommend stores you trust</h2>
            <p>Verified partners share links to stores they know and see what their recommendations lead to. Partners never sell or handle product.</p>
            <Link href="/partners" className="btn">About the partner program</Link>
          </div>
        </div>
      </section>

      <style>{`
        .home-hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: clamp(28px, 5vw, 72px); align-items: center; padding-block: clamp(28px, 5vw, 64px); }
        .hero-search { display: flex; align-items: center; gap: 10px; max-width: 560px; height: 58px; padding: 0 6px 0 20px; background: var(--surface); border: 1.5px solid var(--ink); border-radius: 999px; }
        .hero-search:focus-within { box-shadow: 0 0 0 4px color-mix(in srgb, var(--lake) 18%, transparent); }
        .hero-search input { border: 0; background: transparent; height: 100%; font-size: max(16px, var(--t-md)); outline: none; min-width: 0; }
        .shelf-wall { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .shelf { position: relative; display: grid; aspect-ratio: 1 / 1.08; border-radius: var(--r-tile); text-decoration: none; color: var(--ink); overflow: hidden; transition: transform .2s var(--ease); }
        .shelf:hover { transform: translateY(-3px); }
        .shelf-art { padding: 10% 14% 22%; animation: rise-in .6s var(--ease) both; }
        .shelf:nth-child(2) .shelf-art { animation-delay: .06s } .shelf:nth-child(3) .shelf-art { animation-delay: .12s }
        .shelf:nth-child(4) .shelf-art { animation-delay: .18s } .shelf:nth-child(5) .shelf-art { animation-delay: .24s } .shelf:nth-child(6) .shelf-art { animation-delay: .3s }
        @keyframes rise-in { from { transform: translateY(14px); opacity: 0; } }
        .shelf-label { position: absolute; left: 14px; bottom: 12px; font-weight: 650; font-size: var(--t-base); }
        .section-tight { padding-block: clamp(28px, 4.5vw, 56px); }
        .store-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
        .how { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .how li { display: flex; gap: 14px; padding: 20px; background: var(--surface); border-radius: var(--r-panel); }
        .how-n { flex: none; width: 34px; height: 34px; border-radius: 999px; background: var(--sun); display: grid; place-items: center; font-weight: 700; color: #1f2148; }
        .how li > div { display: grid; gap: 4px; align-content: start; }
        .band { background: var(--indigo); color: #eef0f6; margin-top: var(--s6); }
        .band .btn:not(.signal) { --b-bg: transparent; --b-fg: #eef0f6; --b-bd: #565a8f; }
        @media (max-width: 900px) {
          .home-hero { grid-template-columns: 1fr; }
          .how { grid-template-columns: 1fr; }
        }
        @media (max-width: 760px) {
          .shelf-wall { grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .shelf-label { font-size: 12px; left: 10px; bottom: 8px; }
          .hero-search { height: 52px; }
          .store-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
