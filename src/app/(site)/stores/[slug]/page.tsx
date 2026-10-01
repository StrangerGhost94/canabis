import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { CairnMark, TrustRecord } from "@/components/cairn";
import { IconPin } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { SaveButton } from "@/components/save-button";
import { TrustButton } from "@/components/trust-button";
import { allowedCategories, getPolicy } from "@/lib/compliance";
import { CATEGORIES, CATEGORY_LABEL, money } from "@/lib/format";
import { DAYS, fmtKm, fmtTime, km, openState } from "@/lib/geo";
import { orderBlock, productsForStore, storeBySlug } from "@/lib/queries";
import { getVisitor } from "@/lib/visitor";
import { fmtDate } from "@/lib/verification/trust";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const r = await storeBySlug((await params).slug);
  return { title: r?.tradeName ?? "Store" };
}

export default async function StorePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ loc?: string; category?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const r = await storeBySlug(slug);
  if (!r) notFound();
  const v = await getVisitor();
  const policy = await getPolicy(r.jurisdictionCode);
  const t = r.trust;
  const record = <TrustRecord trust={t} retailerName={r.legalName} regulator={policy.regulator} registryUrl={policy.registryUrl} />;

  if (!t.listed) {
    return (
      <div className="wrap section stack" style={{ maxWidth: 720 }}>
        <p className="small"><Link href="/stores">Stores</Link></p>
        <h1 className="h1">{r.tradeName}</h1>
        <div className={`callout ${t.state === "expired" || t.state === "suspended" ? "bad" : "warn"}`}>
          <p className="strong">{t.headline}</p>
          <p className="small muted">
            {t.state === "expired" && `This store's licence expired on ${fmtDate(t.licence!.expiresAt)}. Its listing and ordering are paused until a renewed licence is reviewed.`}
            {t.state === "suspended" && "Cairn has suspended this listing after a review. It isn't taking orders on Cairn."}
            {t.state === "pending" && "This store hasn't completed Cairn's licence review, so it isn't listed yet."}
          </p>
        </div>
        <div className="panel panel-pad">{record}</div>
        <Link href="/stores" className="btn">Find a listed store</Link>
      </div>
    );
  }

  const elsewhere = v.region && v.region !== r.jurisdictionCode;
  const block = elsewhere ? `This store is in ${policy.name}. You can only order from stores in your own province.` : orderBlock(policy, r);
  const loc = r.locations.find((l) => l.id === sp.loc) ?? [...r.locations].sort((a, b) => (v.near ? km(v.near, a) - km(v.near, b) : 0))[0];
  const cats = allowedCategories(policy, CATEGORIES);
  const all = policy.allows("retail.products") ? await productsForStore(r.id, cats) : [];
  const present = cats.filter((c) => all.some((p) => p.category === c));
  const products = sp.category ? all.filter((p) => p.category === sp.category) : all;
  const showPrices = policy.allows("retail.prices");
  const saved = v.user ? !!(await db.query.favourites.findFirst({ where: and(eq(schema.favourites.userId, v.user.id), eq(schema.favourites.retailerId, r.id)) })) : false;
  const o = loc ? openState(loc.hours, loc.jurisdictionCode) : null;
  const pickup = !block && policy.allows("retail.pickup") && loc?.offersPickup;
  const delivery = !block && policy.allows("retail.delivery") && loc?.offersDelivery;
  const today = new Date().getDay();
  const qs = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ loc: sp.loc, category: sp.category, ...patch }).filter(([, x]) => x) as [string, string][]);
    return `/stores/${r.slug}${q.size ? `?${q}` : ""}`;
  };

  return (
    <div className="wrap store">
      {r.coverKey && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="store-cover" src={`/media/${r.coverKey}`} alt={`${r.tradeName} storefront`} />
      )}
      <header className={`store-hero ${r.coverKey ? "on-cover" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className="scard-mark big" aria-hidden>{r.logoKey ? <img src={`/media/${r.logoKey}`} alt="" /> : r.tradeName.slice(0, 1)}</span>
        <div className="stack grow" style={{ ["--gap" as string]: "10px", minWidth: 0 }}>
          <div className="row" style={{ ["--gap" as string]: "10px" }}>
            <h1 className="h1">{r.tradeName}</h1>
            <SaveButton kind="retailer" id={r.id} saved={saved} back={`/stores/${r.slug}`} label={r.tradeName} />
          </div>
          {r.about && <p className="muted" style={{ maxWidth: "62ch" }}>{r.about}</p>}
          <div className="row" style={{ ["--gap" as string]: "8px" }}>
            <TrustButton title="Licence record" trigger={<><CairnMark trust={t} size={16} label={false} /><span className="seal">Licensed store</span><span className="more">View licence</span></>}>{record}</TrustButton>
            {o && <span className={`status ${o.open ? "ok" : "idle"}`}>{o.label}</span>}
            {pickup && <span className="tag">Pickup in about {r.pickupLeadMinutes} min</span>}
            {delivery && <span className="tag">Delivery {money(r.deliveryFeeCents)}, {money(r.deliveryMinimumCents)} minimum</span>}
            {block && <span className="tag">In store only</span>}
          </div>
        </div>
      </header>

      <div className="store-layout">
        <section aria-labelledby="menu">
          <div className="row between mb-2">
            <h2 id="menu" className="h3">{block ? "On the shelf" : "Order from this store"}</h2>
            <span className="xs muted">{t.stones[2].ok ? t.stones[2].detail : "Availability may be out of date"}</span>
          </div>
          {block && <p className="callout small mb-3">{block}</p>}
          {present.length > 1 && (
            <nav className="seg mb-3" aria-label="Formats">
              <Link href={qs({ category: undefined })} className={`chip ${!sp.category ? "on" : ""}`}>All</Link>
              {present.map((c) => <Link key={c} href={qs({ category: c })} className={`chip ${sp.category === c ? "on" : ""}`}>{CATEGORY_LABEL[c]}</Link>)}
            </nav>
          )}
          {!policy.allows("retail.products") ? <p className="callout small">{policy.offMessage("retail.products")}</p> : products.length === 0 ? <p className="muted">No products published yet.</p> : (
            <div className="pgrid">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} store={{ name: r.tradeName, slug: r.slug }} showStore={false} showPrice={showPrices}
                  orderable={block} stock={p.inventory.find((i) => i.locationId === loc?.id)?.status ?? "OUT"} />
              ))}
            </div>
          )}
        </section>

        <aside className="store-side stack" style={{ ["--gap" as string]: "16px" }}>
          {r.locations.length > 1 && (
            <nav className="panel panel-pad stack" style={{ ["--gap" as string]: "8px" }} aria-label="Locations">
              <p className="small strong">Showing stock at</p>
              {r.locations.map((l) => (
                <Link key={l.id} href={qs({ loc: l.id })} className={`loc-opt ${l.id === loc?.id ? "on" : ""}`} aria-current={l.id === loc?.id ? "true" : undefined}>
                  <span className="strong">{l.name}</span>
                  <span className="xs muted">{l.street}{v.near && !l.geoApproximate ? `, ${fmtKm(km(v.near, l))}` : ""}</span>
                </Link>
              ))}
            </nav>
          )}
          {loc && (
            <div className="panel panel-pad stack" style={{ ["--gap" as string]: "10px" }}>
              <p className="h4">{loc.name}</p>
              <p className="small">{loc.street}, {loc.city} {loc.postalCode}</p>
              <table className="hours num" aria-label={`Hours for ${loc.name}`}>
                <tbody>
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                    const h = loc.hours.find((x) => x.d === d);
                    return <tr key={d} className={d === today ? "today" : ""}><td>{DAYS[d].slice(0, 3)}</td><td>{h ? `${fmtTime(h.open)} – ${fmtTime(h.close)}` : "Closed"}</td></tr>;
                  })}
                </tbody>
              </table>
              <a className="small row" style={{ ["--gap" as string]: "4px" }} href={`https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=17/${loc.lat}/${loc.lng}`} target="_blank" rel="noreferrer"><IconPin width={16} />Open in map</a>
            </div>
          )}
          <div className="sold-by">
            <p className="small muted">You buy from</p>
            <p className="strong">{r.legalName}</p>
            <p className="xs muted tabular">Licence {t.licence?.number}, {policy.regulator}</p>
            <p className="small mt-1">The store prepares your order, checks government ID and takes payment at handover. Cairn never takes payment.</p>
          </div>
        </aside>
      </div>
      <style>{`
        .store { padding-block: var(--s5) var(--s8); }
        .store-cover { width: 100%; height: clamp(180px, 28vw, 360px); object-fit: cover; display: block; }
        .store-hero { display: flex; gap: 24px; align-items: flex-start; padding: 32px; background: var(--surface); border: 1px solid var(--rule); margin-bottom: var(--s6); }
        .store-hero.on-cover { margin: -64px 24px var(--s6); position: relative; }
        .store-hero .h1 { font-size: clamp(2.2rem, 4vw, 3.4rem); }
        .scard-mark.big { width: 88px; height: 88px; font-size: 2.6rem; }
        .store-layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: var(--s6); align-items: start; }
        .store-side { position: sticky; top: 130px; }
        .loc-opt { display: grid; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--rule); color: var(--ink); text-decoration: none; }
        .loc-opt.on { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); }
        @media (max-width: 960px) { .store-layout { grid-template-columns: 1fr; } .store-side { position: static; } }
        @media (max-width: 600px) { .store-hero { flex-direction: column; padding: 18px; } .scard-mark.big { width: 56px; height: 56px; font-size: 1.6rem; } }
      `}</style>
    </div>
  );
}
