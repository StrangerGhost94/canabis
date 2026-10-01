import Link from "next/link";
import { CairnMark } from "@/components/cairn";
import { HeroCairn } from "@/components/hero-cairn";
import { IconSearch } from "@/components/icons";
import { fmtKm, km, openState } from "@/lib/geo";
import { listedRetailers } from "@/lib/queries";
import { getVisitor } from "@/lib/visitor";

export default async function Home() {
  const v = await getVisitor();
  const stores = v.policy?.allows("retail.directory") ? await listedRetailers(v.policy.code) : [];
  const rows = stores
    .flatMap((r) => r.locations.map((l) => ({ r, l, d: v.near && !l.geoApproximate ? km(v.near, l) : null, open: openState(l.hours, l.jurisdictionCode) })))
    .sort((a, b) => (a.d ?? Infinity) - (b.d ?? Infinity) || a.r.tradeName.localeCompare(b.r.tradeName))
    .slice(0, 6);

  return (
    <>
      <section className="wrap home-hero">
        <div className="stack" style={{ ["--gap" as string]: "24px" }}>
          <h1 className="display">Licensed stores, with the licence in plain sight.</h1>
          <p className="lede">
            Cairn is a directory of provincially licensed cannabis retailers in Canada. See what stores carry, check the record behind each one, then buy from the store. Cairn never sells cannabis.
          </p>
          <form action="/discover" className="home-search" role="search">
            <label htmlFor="hq" className="sr-only">Search products or stores</label>
            <IconSearch aria-hidden />
            <input id="hq" name="q" className="grow" placeholder="Search products or stores" autoComplete="off" />
            <button className="btn primary">Search</button>
          </form>
          <p className="small muted">
            {v.near ? <>Showing stores near {v.near.label}. </> : null}
            <Link href="/discover">Browse everything in {v.policy?.name ?? "your province"}</Link>
          </p>
        </div>
        <HeroCairn />
      </section>

      <section className="wrap section rule-top" aria-labelledby="who">
        <div className="who-grid">
          <h2 id="who" className="h2">Who does what</h2>
          <dl className="who">
            <div><dt className="h4">Stores sell</dt><dd className="muted">Licensed by your province or territory. They make the sale, check ID, and handle pickup or delivery where it's allowed.</dd></div>
            <div><dt className="h4">Cairn checks</dt><dd className="muted">We review each store's licence, show what it carries, and pause listings when anything lapses. We never hold product or take payment.</dd></div>
            <div><dt className="h4">Partners recommend</dt><dd className="muted">Verified writers and guides who point people to stores they know. Partners can't sell or reserve anything.</dd></div>
          </dl>
        </div>
      </section>

      <section className="wrap section rule-top" aria-labelledby="register">
        <div className="row between mb-3">
          <h2 id="register" className="h2">{v.near ? `Near ${v.near.label}` : `Listed in ${v.policy?.name ?? "your province"}`}</h2>
          {rows.length > 0 && <Link href="/discover?view=stores" className="btn sm">All stores</Link>}
        </div>
        {!v.policy ? (
          <p className="muted">Choose your province or territory to see stores.</p>
        ) : !v.policy.allows("retail.directory") ? (
          <div className="callout"><p className="strong">No listings in {v.policy.name} yet</p><p className="muted small">{v.policy.offMessage("retail.directory")} Cairn only lists stores once the rules for a province or territory have been reviewed. Retail there is run by {v.policy.regulator}.</p></div>
        ) : rows.length === 0 ? (
          <p className="muted">No stores are listed here yet.</p>
        ) : (
          <ul className="list ruled register">
            {rows.map(({ r, l, d, open }) => (
              <li key={l.id}>
                <Link href={`/stores/${r.slug}`} className="list-link register-row">
                  <CairnMark trust={r.trust} size={20} />
                  <span className="grow">
                    <span className="strong">{r.tradeName}</span>
                    <span className="muted"> {l.name}, {l.city}</span>
                  </span>
                  <span className={`status ${open.open ? "ok" : "idle"} hide-sm`}>{open.label}</span>
                  {d != null && <span className="small muted num" style={{ minWidth: 56, textAlign: "right" }}>{fmtKm(d)}</span>}
                  {r.isDemo && <span className="tag demo">Demo</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="wrap section rule-top" aria-labelledby="buy">
        <h2 id="buy" className="h2 mb-3">How buying works</h2>
        <ol className="steps">
          <li><span className="step-n">1</span><p className="h4">Find it</p><p className="muted">Search what stores near you have in stock, by format, THC and CBD content, and price where provincial rules allow prices to be shown.</p></li>
          <li><span className="step-n">2</span><p className="h4">Check the record</p><p className="muted">Open the cairn on any store to see its licence number, the regulator, and when it was last checked.</p></li>
          <li><span className="step-n">3</span><p className="h4">Buy from the store</p><p className="muted">Visit in person or continue to the store's own ordering page. Your purchase, ID check and receipt are with the store.</p></li>
        </ol>
      </section>

      <section className="band" aria-label="Work with Cairn">
        <div className="wrap grid-2 section">
          <div className="stack">
            <h2 className="h2">Run a licensed store?</h2>
            <p>List your locations and menu, see which partners send people your way, and keep your licence record current in one place. Listing is reviewed before it goes live.</p>
            <Link href="/for-stores" className="btn signal">List your store</Link>
          </div>
          <div className="stack">
            <h2 className="h2">Know your local stores?</h2>
            <p>Partners publish a profile, share tracked links to stores they recommend, and see what their recommendations lead to. Every partner is verified, and availability depends on provincial rules.</p>
            <Link href="/partners" className="btn">About the partner program</Link>
          </div>
        </div>
      </section>

      <style>{`
        .home-hero { display: grid; grid-template-columns: 1.25fr 1fr; gap: clamp(32px, 6vw, 88px); align-items: center; padding-block: clamp(40px, 7vw, 96px); }
        .home-search { display: flex; align-items: center; gap: 10px; max-width: 560px; padding: 6px 6px 6px 16px; background: var(--surface); border: 1px solid var(--ink); border-radius: var(--r-ctl); }
        .home-search:focus-within { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent); }
        .home-search input { border: 0; background: transparent; min-height: 44px; font-size: max(16px, var(--t-md)); outline: none; }
        .who-grid { display: grid; grid-template-columns: 1fr 3fr; gap: var(--s6); }
        .who { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s6); margin: 0; }
        .who dd { margin: 8px 0 0; }
        .register-row { display: flex; align-items: center; gap: 14px; padding: 14px 4px; }
        .steps { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s6); }
        .steps li { display: grid; gap: 8px; align-content: start; border-top: 2px solid var(--ink); padding-top: 16px; }
        .step-n { font-size: var(--t-2xl); font-stretch: 75%; font-weight: 600; line-height: 1; font-variant-numeric: tabular-nums; }
        .band { background: var(--spruce); color: #e3e6e1; }
        .band .btn:not(.signal) { --b-bg: transparent; --b-fg: #e3e6e1; --b-bd: #56746b; }
        @media (max-width: 900px) {
          .home-hero, .who-grid { grid-template-columns: 1fr; }
          .who, .steps { grid-template-columns: 1fr; gap: var(--s5); }
        }
      `}</style>
    </>
  );
}
