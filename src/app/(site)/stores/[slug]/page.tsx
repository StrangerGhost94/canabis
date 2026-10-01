import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { CairnMark, TrustRecord } from "@/components/cairn";
import { IconArrowOut, IconPin } from "@/components/icons";
import { LabelTile } from "@/components/label-tile";
import { SaveButton } from "@/components/save-button";
import { TrustButton } from "@/components/trust-button";
import { allowedCategories, getPolicy } from "@/lib/compliance";
import { CATEGORIES, CATEGORY_LABEL, money } from "@/lib/format";
import { DAYS, fmtKm, fmtTime, km, openState } from "@/lib/geo";
import { productsForStore, storeBySlug } from "@/lib/queries";
import { getVisitor } from "@/lib/visitor";
import { fmtDate } from "@/lib/verification/trust";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const r = await storeBySlug((await params).slug);
  return { title: r?.tradeName ?? "Store" };
}

const STOCK = { IN_STOCK: ["ok", "In stock"], LOW: ["warn", "Low"], OUT: ["idle", "Out"] } as const;

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await storeBySlug(slug);
  if (!r) notFound();
  const v = await getVisitor();
  const policy = await getPolicy(r.jurisdictionCode);
  const elsewhere = v.region && v.region !== r.jurisdictionCode;
  const t = r.trust;

  const record = (
    <TrustRecord trust={t} retailerName={r.legalName} regulator={policy.regulator} registryUrl={policy.registryUrl} />
  );

  if (!t.listed) {
    return (
      <div className="wrap section stack" style={{ maxWidth: 720 }}>
        <p className="small"><Link href="/discover">Discover</Link></p>
        <h1 className="h1">{r.tradeName}</h1>
        <div className={`callout ${t.state === "expired" || t.state === "suspended" ? "bad" : "warn"}`}>
          <p className="strong">{t.headline}</p>
          <p className="small muted">
            {t.state === "expired" && `This store's licence expired on ${fmtDate(t.licence!.expiresAt)}. Its listing is paused until a renewed licence is reviewed. Cairn won't link to its ordering page in the meantime.`}
            {t.state === "suspended" && "Cairn has suspended this listing after a review. It won't appear in search, and Cairn doesn't link to its ordering page."}
            {t.state === "pending" && "This store hasn't completed Cairn's licence review, so it isn't listed yet."}
          </p>
        </div>
        <div className="panel panel-pad">{record}</div>
        <Link href="/discover" className="btn">Find a listed store</Link>
      </div>
    );
  }

  const cats = allowedCategories(policy, CATEGORIES);
  const showProducts = policy.allows("retail.products");
  const products = showProducts ? await productsForStore(r.id, cats) : [];
  const showPrices = policy.allows("retail.prices");
  const canOrder = !!r.orderingUrl && policy.allows("retail.onlineHandoff") && !elsewhere;
  const savedStore = v.user ? !!(await db.query.favourites.findFirst({ where: and(eq(schema.favourites.userId, v.user.id), eq(schema.favourites.retailerId, r.id)) })) : false;
  const grouped = cats.map((c) => ({ c, items: products.filter((p) => p.category === c) })).filter((g) => g.items.length);
  const locById = new Map(r.locations.map((l) => [l.id, l]));
  const today = new Date().getDay();

  return (
    <div className="wrap store">
      <header className="store-head">
        <div className="stack" style={{ ["--gap" as string]: "14px" }}>
          <p className="small"><Link href="/discover?view=stores">Stores in {policy.name}</Link></p>
          <div className="row" style={{ ["--gap" as string]: "12px" }}>
            <h1 className="h1">{r.tradeName}</h1>
            {r.isDemo && <span className="tag demo">Demo listing</span>}
          </div>
          {r.about && <p className="lede">{r.about}</p>}
          <div className="row">
            <TrustButton title="Verification record" trigger={<><CairnMark trust={t} size={20} label={false} /><span>{t.headline}</span><span className="more">View record</span></>}>
              {record}
            </TrustButton>
            <SaveButton kind="retailer" id={r.id} saved={savedStore} back={`/stores/${r.slug}`} label={r.tradeName} />
          </div>
        </div>
        <aside className="sold-by" aria-label="Who you buy from">
          <p className="small muted">You buy from</p>
          <p className="h4">{r.legalName}</p>
          <p className="small muted tabular">Licence {t.licence?.number}, {policy.regulator}</p>
          <p className="small mt-1">The store makes the sale, checks ID and issues your receipt. Cairn doesn't take orders or payment.</p>
          {elsewhere ? (
            <p className="small callout warn mt-1">This store is in {policy.name}. You've set {v.policy?.name} as your province.</p>
          ) : canOrder ? (
            <a className="btn signal mt-1" href={`/go/${r.id}`} rel="nofollow">Order on {r.tradeName}'s site <IconArrowOut width={18} /></a>
          ) : (
            <p className="small muted mt-1">{r.orderingUrl ? policy.offMessage("retail.onlineHandoff") : "This store sells in person only."}</p>
          )}
        </aside>
      </header>

      <section aria-labelledby="locs" className="section-sm">
        <h2 id="locs" className="h3 mb-2">{r.locations.length === 1 ? "Location" : `${r.locations.length} locations`}</h2>
        <div className="locs">
          {r.locations.map((l) => {
            const o = openState(l.hours, l.jurisdictionCode);
            return (
              <div key={l.id} className="panel panel-pad stack" style={{ ["--gap" as string]: "10px" }}>
                <div className="row between top">
                  <div>
                    <p className="h4">{l.name}</p>
                    <p className="small">{l.street}, {l.city} {l.postalCode}</p>
                  </div>
                  {v.near && !l.geoApproximate && <span className="small muted num">{fmtKm(km(v.near, l))}</span>}
                </div>
                <span className={`status ${o.open ? "ok" : "idle"}`}>{o.label}</span>
                <table className="hours num" aria-label={`Hours for ${l.name}`}>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                      const h = l.hours.find((x) => x.d === d);
                      return <tr key={d} className={d === today ? "today" : ""}><td>{DAYS[d].slice(0, 3)}</td><td>{h ? `${fmtTime(h.open)} – ${fmtTime(h.close)}` : "Closed"}</td></tr>;
                    })}
                  </tbody>
                </table>
                <div className="row small" style={{ ["--gap" as string]: "12px" }}>
                  {policy.allows("retail.pickup") && l.offersPickup && <span className="tag">Pickup</span>}
                  {policy.allows("retail.delivery") && l.offersDelivery && <span className="tag">Delivery by the store</span>}
                  <a href={`https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=17/${l.lat}/${l.lng}`} target="_blank" rel="noreferrer" className="row" style={{ ["--gap" as string]: "4px" }}><IconPin width={16} />Map</a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="menu" className="section-sm">
        <div className="row between mb-2">
          <h2 id="menu" className="h3">What they carry</h2>
          <span className={t.stones[2].ok ? "small muted" : "status warn"}>{t.stones[2].ok ? t.stones[2].detail : "Availability may be out of date"}</span>
        </div>
        {!showProducts ? (
          <p className="callout small">{policy.offMessage("retail.products")}</p>
        ) : grouped.length === 0 ? (
          <p className="muted">This store hasn't published its menu yet.</p>
        ) : (
          grouped.map((g) => (
            <div key={g.c} className="menu-group">
              <h3 className="h4">{CATEGORY_LABEL[g.c]} <span className="muted small">{g.items.length}</span></h3>
              <ul className="list ruled">
                {g.items.map((p) => (
                  <li key={p.id}>
                    <Link href={`/products/${p.id}`} className="list-link menu-row">
                      <LabelTile p={p} />
                      <span className="grow">
                        <span className="strong">{p.name}</span>
                        <span className="small muted"> {p.brand}, {p.size}</span>
                        <span className="row small mt-1" style={{ ["--gap" as string]: "12px" }}>
                          {p.inventory.map((i) => {
                            const [c, label] = STOCK[i.status];
                            return <span key={i.locationId} className={`status ${c}`}>{r.locations.length > 1 ? `${locById.get(i.locationId)?.name}: ` : ""}{label}</span>;
                          })}
                        </span>
                      </span>
                      <span className="strong num">{showPrices ? money(p.priceCents) : ""}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
      <style>{`
        .store { padding-block: var(--s6) var(--s8); }
        .store-head { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: var(--s7); align-items: start; padding-bottom: var(--s6); border-bottom: 1px solid var(--rule); }
        .section-sm { padding-top: var(--s6); }
        .locs { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--s4); }
        .menu-group + .menu-group { margin-top: var(--s5); }
        .menu-group h3 { margin-bottom: var(--s2); }
        .menu-row { display: flex; gap: 16px; align-items: center; padding: 12px 4px; }
        @media (max-width: 860px) { .store-head { grid-template-columns: 1fr; gap: var(--s5); } }
      `}</style>
    </div>
  );
}
