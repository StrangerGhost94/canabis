import { inArray, eq, and } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { db, schema } from "@/db";
import { CairnMark } from "@/components/cairn";
import { Filters } from "@/components/discover/filters";
import { Locator } from "@/components/discover/locator";
import { NearControl } from "@/components/discover/near-form";
import { IconSearch } from "@/components/icons";
import { LabelTile } from "@/components/label-tile";
import { SaveButton } from "@/components/save-button";
import { allowedCategories } from "@/lib/compliance";
import { CATEGORIES, CATEGORY_LABEL, money, n } from "@/lib/format";
import { fmtKm } from "@/lib/geo";
import { discover, parseDiscover } from "@/lib/queries";
import { getVisitor } from "@/lib/visitor";

export const metadata = { title: "Discover" };

const STOCK = { IN_STOCK: { c: "ok", t: "In stock" }, LOW: { c: "warn", t: "Low stock" }, OUT: { c: "idle", t: "Out of stock" } } as const;

export default async function Discover({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const p = parseDiscover(sp);
  const v = await getVisitor();
  const qs = new URLSearchParams(Object.entries(sp).filter(([, x]) => typeof x === "string") as [string, string][]);
  const here = `/discover${qs.size ? `?${qs}` : ""}`;

  if (!v.policy) return <div className="wrap section"><p className="muted">Choose your province or territory to start.</p></div>;
  const policy = v.policy;
  const { products, stores, blocked } = await discover(policy, v.near, p);
  const showPrices = policy.allows("retail.prices");
  const cats = allowedCategories(policy, CATEGORIES).map((c) => ({ value: c, label: CATEGORY_LABEL[c] }));
  const hidden = CATEGORIES.filter((c) => !cats.some((x) => x.value === c));

  const saved = v.user
    ? new Set((await db.select({ p: schema.favourites.productId }).from(schema.favourites).where(and(eq(schema.favourites.userId, v.user.id), inArray(schema.favourites.productId, products.map((x) => x.id).concat("_"))))).map((r) => r.p))
    : new Set<string | null>();

  const activeCount = [p.category, p.ratio, p.max, p.stock, p.open].filter(Boolean).length;
  const view = p.view ?? "products";
  const viewHref = (vw: string) => { const q = new URLSearchParams(qs); q.set("view", vw); return `/discover?${q}`; };
  const sortHref = (s: string) => { const q = new URLSearchParams(qs); q.set("sort", s); return `/discover?${q}`; };
  const sort = p.sort ?? (v.near ? "near" : "name");

  return (
    <div className="wrap discover">
      <div className="disc-head">
        <form action="/discover" role="search" className="disc-search">
          <IconSearch aria-hidden />
          <label htmlFor="dq" className="sr-only">Search</label>
          <input id="dq" name="q" defaultValue={p.q} placeholder="Product, brand or store" className="grow" autoComplete="off" />
          {view === "stores" && <input type="hidden" name="view" value="stores" />}
          <button className="btn primary sm">Search</button>
        </form>
        <NearControl label={v.near?.label ?? null} next={here} />
      </div>

      <div className="disc-body">
        <Suspense>
          <Filters categories={cats} showPrice={showPrices} activeCount={activeCount} />
        </Suspense>

        <section className="disc-results" aria-labelledby="results-title">
          <div className="row between disc-bar">
            <div className="seg" role="tablist" aria-label="Show">
              <Link role="tab" aria-selected={view === "products"} className={`chip ${view === "products" ? "on" : ""}`} href={viewHref("products")}>Products</Link>
              <Link role="tab" aria-selected={view === "stores"} className={`chip ${view === "stores" ? "on" : ""}`} href={viewHref("stores")}>Stores</Link>
            </div>
            {view === "products" && (
              <p className="small muted row" style={{ ["--gap" as string]: "6px" }}>
                Sort
                {[...(v.near ? [["near", "Nearest"]] : []), ["name", "Name"], ...(showPrices ? [["price", "Price"]] : []), ["potency", "THC"]].map(([k, l]) => (
                  <Link key={k} href={sortHref(k)} className={`chip ${sort === k ? "on" : ""}`} aria-current={sort === k ? "true" : undefined}>{l}</Link>
                ))}
              </p>
            )}
          </div>

          <h1 id="results-title" className="sr-only">Results</h1>
          <p className="small muted mb-2" aria-live="polite">
            {view === "products" ? `${n(products.length)} ${products.length === 1 ? "product" : "products"}` : `${n(stores.length)} ${stores.length === 1 ? "store" : "stores"}`} at licensed stores in {policy.name}
            {p.q ? <> matching “{p.q}”</> : null}
          </p>

          {blocked ? (
            <Notice title={`No listings in ${policy.name} yet`} body={`${policy.offMessage("retail.directory")} Retail in ${policy.name} is run by ${policy.regulator}.`} />
          ) : view === "products" ? (
            !policy.allows("retail.products") ? (
              <Notice title="Product availability isn't shown here" body={`${policy.offMessage("retail.products")} You can still browse stores.`} link={{ href: viewHref("stores"), label: "Browse stores" }} />
            ) : products.length === 0 ? (
              <Empty q={p.q} />
            ) : (
              <ul className="list ruled">
                {products.map((x) => (
                  <li key={x.id} className="prod-row">
                    <Link href={`/products/${x.id}`} className="prod-link" aria-label={`${x.name} by ${x.brand}, ${x.size}, at ${x.retailer.tradeName}`}>
                      <LabelTile p={x} />
                      <span className="prod-main">
                        <span className="h4">{x.name}</span>
                        <span className="small muted">{x.brand}, {x.size}</span>
                        <span className="row small prod-store" style={{ ["--gap" as string]: "8px" }}>
                          <CairnMark trust={x.retailer.trust} size={14} />
                          <span><span className="strong">{x.retailer.tradeName}</span>{x.best ? ` ${x.best.name}` : ""}</span>
                          {x.best?.distance != null && <span className="muted num">{fmtKm(x.best.distance)}</span>}
                        </span>
                        {x.best && <span className={`status ${STOCK[x.best.stock].c}`}>{STOCK[x.best.stock].t}{x.locations.length > 1 && x.best.stock !== "OUT" ? ` at ${x.best.name}` : ""}</span>}
                      </span>
                      <span className="prod-price num">{showPrices ? money(x.priceCents) : <span className="small muted">Price at store</span>}</span>
                    </Link>
                    <SaveButton kind="product" id={x.id} saved={saved.has(x.id)} back={here} label={x.name} />
                  </li>
                ))}
              </ul>
            )
          ) : stores.length === 0 ? (
            <Empty q={p.q} />
          ) : (
            <div className="stores-grid">
              <ul className="list ruled">
                {stores.map((r) => (
                  <li key={r.id}>
                    <Link href={`/stores/${r.slug}`} className="list-link store-row">
                      <CairnMark trust={r.trust} size={26} />
                      <span className="grow stack" style={{ ["--gap" as string]: "2px" }}>
                        <span className="row" style={{ ["--gap" as string]: "8px" }}><span className="h4">{r.tradeName}</span>{r.isDemo && <span className="tag demo">Demo</span>}</span>
                        {r.locs.map((l) => (
                          <span key={l.id} className="small row" style={{ ["--gap" as string]: "10px" }}>
                            <span>{l.name}, {l.street}</span>
                            <span className={`status ${l.hoursState.open ? "ok" : "idle"}`}>{l.hoursState.label}</span>
                            {l.distance != null && <span className="muted num">{fmtKm(l.distance)}</span>}
                          </span>
                        ))}
                        {activeCount > 0 && <span className="small muted">{r.matches} matching {r.matches === 1 ? "product" : "products"}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {v.near && (
                <div className="locator-wrap hide-sm">
                  <Locator near={v.near} points={stores.flatMap((r) => r.locs.filter((l) => !l.geoApproximate).map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, open: l.hoursState.open, label: `${r.tradeName} ${l.name}`, href: `/stores/${r.slug}` })))} />
                </div>
              )}
            </div>
          )}

          {hidden.length > 0 && !blocked && (
            <p className="xs muted mt-3">{hidden.map((h) => CATEGORY_LABEL[h]).join(", ")} aren't listed in {policy.name} on Cairn.</p>
          )}
        </section>
      </div>
      <style>{`
        .discover { padding-top: var(--s5); padding-bottom: var(--s8); }
        .disc-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--s4) var(--s6); align-items: center; padding-bottom: var(--s5); border-bottom: 1px solid var(--rule); }
        .disc-search { display: flex; align-items: center; gap: 10px; padding: 4px 4px 4px 14px; background: var(--surface); border: 1px solid var(--ink); border-radius: var(--r-ctl); max-width: 640px; }
        .disc-search input { border: 0; background: transparent; outline: none; min-height: 40px; font-size: max(16px, 1rem); }
        .near-form { max-width: 360px; }
        .disc-body { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: var(--s6); padding-top: var(--s5); }
        .filter-rail { position: sticky; top: 84px; align-self: start; max-height: calc(100dvh - 100px); overflow-y: auto; padding-right: 4px; }
        .filters legend { font-size: var(--t-sm); }
        .disc-bar { margin-bottom: var(--s3); }
        .prod-row { display: flex; align-items: center; gap: 4px; }
        .prod-link { flex: 1; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 18px; align-items: center; padding: 16px 4px; color: inherit; text-decoration: none; }
        .prod-link:hover { background: var(--hover); text-decoration: none; }
        .prod-link:hover .h4 { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
        .prod-main { display: grid; gap: 4px; min-width: 0; }
        .prod-price { font-weight: 600; font-size: var(--t-md); text-align: right; }
        .store-row { display: flex; gap: 16px; align-items: flex-start; padding: 18px 4px; }
        .stores-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: var(--s6); align-items: start; }
        .locator-wrap { position: sticky; top: 84px; padding: var(--s4); background: var(--surface); border: 1px solid var(--rule); border-radius: var(--r-panel); }
        @media (max-width: 1060px) { .stores-grid { grid-template-columns: 1fr; } .locator-wrap { display: none; } }
        @media (max-width: 760px) {
          .disc-head { grid-template-columns: 1fr; }
          .disc-body { grid-template-columns: 1fr; padding-top: var(--s3); gap: var(--s3); }
          .prod-link { grid-template-columns: auto minmax(0, 1fr); gap: 14px; align-items: start; }
          .prod-price { grid-column: 2; text-align: left; font-size: var(--t-base); }
          .label-tile { width: 92px; }
        }
      `}</style>
    </div>
  );
}

function Empty({ q }: { q?: string }) {
  return (
    <div className="empty panel">
      <span className="cairn" aria-hidden><i /><i /><i /></span>
      <p className="h4">{q ? `Nothing matches “${q}”` : "Nothing matches these filters"}</p>
      <p className="muted small">Try a broader search, or clear a filter. Only stores with a current, verified licence are shown.</p>
      <Link href="/discover" className="btn sm">Clear search and filters</Link>
    </div>
  );
}

function Notice({ title, body, link }: { title: string; body: string; link?: { href: string; label: string } }) {
  return (
    <div className="callout stack" style={{ ["--gap" as string]: "6px" }}>
      <p className="strong">{title}</p>
      <p className="small muted">{body}</p>
      {link && <Link href={link.href} className="small">{link.label}</Link>}
    </div>
  );
}
