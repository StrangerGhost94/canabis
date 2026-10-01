import { and, eq, ilike, inArray, ne } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { AddToCart } from "@/components/add-to-cart";
import { CairnMark, TrustRecord } from "@/components/cairn";
import { PackArt } from "@/components/pack-art";
import { SaveButton } from "@/components/save-button";
import { TrustButton } from "@/components/trust-button";
import { RESTRICTED_CATEGORY_RULE, getPolicy } from "@/lib/compliance";
import { CATEGORY_LABEL, money, potency } from "@/lib/format";
import { fmtKm, km, openState } from "@/lib/geo";
import { listedRetailers, orderBlock } from "@/lib/queries";
import { getVisitor } from "@/lib/visitor";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await db.query.products.findFirst({ where: eq(schema.products.id, (await params).id), columns: { name: true, brand: true } });
  return { title: p ? `${p.name} by ${p.brand}` : "Product" };
}

const STOCK = { IN_STOCK: ["ok", "In stock"], LOW: ["warn", "Low stock"], OUT: ["idle", "Out of stock"] } as const;

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.query.products.findFirst({ where: and(eq(schema.products.id, id), eq(schema.products.status, "ACTIVE")), with: { inventory: true, retailer: { columns: { jurisdictionCode: true } } } });
  if (!p) notFound();
  const listed = await listedRetailers(p.retailer.jurisdictionCode);
  const r = listed.find((x) => x.id === p.retailerId);
  if (!r) notFound();
  const policy = await getPolicy(r.jurisdictionCode);
  const rule = RESTRICTED_CATEGORY_RULE[p.category];
  if (!policy.allows("retail.products") || (rule && !policy.allows(rule))) notFound();
  const v = await getVisitor();

  const pot = potency(p);
  const showPrices = policy.allows("retail.prices");
  const block = v.region && v.region !== r.jurisdictionCode ? `This store is in ${policy.name}. You can only order from stores in your own province.` : orderBlock(policy, r);
  const locs = r.locations.map((l) => ({ ...l, stock: p.inventory.find((i) => i.locationId === l.id)?.status ?? "OUT", d: v.near && !l.geoApproximate ? km(v.near, l) : null }))
    .sort((a, b) => (a.stock === "OUT" ? 1 : 0) - (b.stock === "OUT" ? 1 : 0) || (a.d ?? 0) - (b.d ?? 0));
  const best = locs.find((l) => l.stock !== "OUT");
  const saved = v.user ? !!(await db.query.favourites.findFirst({ where: and(eq(schema.favourites.userId, v.user.id), eq(schema.favourites.productId, p.id)) })) : false;
  const others = await db.query.products.findMany({
    where: and(ilike(schema.products.name, p.name), ilike(schema.products.brand, p.brand), eq(schema.products.size, p.size), ne(schema.products.id, p.id), eq(schema.products.status, "ACTIVE"), inArray(schema.products.retailerId, listed.map((x) => x.id).concat("_"))),
    with: { retailer: true, inventory: true },
  });
  type Offer = { id: string; retailer: typeof r; priceCents: number; current: boolean; stocked: typeof locs; nearest: (typeof locs)[number] | undefined };
  const toOffer = (o: { id: string; priceCents: number; retailerId: string; inventory: { locationId: string; status: string }[] }, current: boolean): Offer => {
    const lr = listed.find((x) => x.id === o.retailerId)!;
    const ls = lr.locations.map((l) => ({ ...l, stock: (o.inventory.find((i) => i.locationId === l.id)?.status ?? "OUT") as keyof typeof STOCK, d: v.near && !l.geoApproximate ? km(v.near, l) : null }));
    const stocked = ls.filter((l) => l.stock !== "OUT").sort((a, b) => (a.d ?? 0) - (b.d ?? 0));
    return { id: o.id, retailer: lr, priceCents: o.priceCents, current, stocked, nearest: stocked[0] };
  };
  const canBuy = (o: Offer) => !!o.nearest && !orderBlock(policy, o.retailer);
  // In stock first, then stores you can order from, then cheapest.
  const offers = [toOffer(p, true), ...others.map((o) => toOffer(o, false))]
    .sort((a, b) => Number(!!b.nearest) - Number(!!a.nearest) || Number(canBuy(b)) - Number(canBuy(a)) || a.priceCents - b.priceCents);
  const inStock = offers.filter((o) => o.nearest);
  const low = inStock.length ? Math.min(...inStock.map((o) => o.priceCents)) : null;
  const lead = inStock[0];
  const leadBlock = lead ? (v.region && v.region !== lead.retailer.jurisdictionCode ? block : orderBlock(policy, lead.retailer)) : null;
  const ordering = policy.allows("orders.online");
  const brandHref = `/brands/${p.brand.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-")}`;

  return (
    <div className="wrap product">
      <nav className="crumbs small mb-3" aria-label="Breadcrumb"><Link href="/shop">Shop</Link><span>/</span><Link href={`/shop?category=${p.category}`}>{CATEGORY_LABEL[p.category]}</Link><span>/</span><span aria-current="page">{p.name}</span></nav>
      <div className="product-grid">
        <div className="pd-shelf" style={{ background: `var(--t-${p.category})` }}><PackArt p={p} size={420} /></div>
        <div className="stack" style={{ ["--gap" as string]: "22px" }}>
          <div className="row between top" style={{ flexWrap: "nowrap" }}>
            <div>
              <Link href={brandHref} className="pcard-brand">{p.brand}</Link>
              <h1 className="h1" style={{ fontSize: "clamp(2.4rem, 4.5vw, 3.6rem)", marginTop: 4 }}>{p.name}</h1>
              <p className="muted mt-1">{CATEGORY_LABEL[p.category]} · {p.size}</p>
            </div>
            <SaveButton kind="product" id={p.id} saved={saved} back={`/products/${p.id}`} label={p.name} />
          </div>

          <div className="pd-price">
            {showPrices && low != null
              ? <p><span className="num pd-amt">{money(low)}</span>{offers.length > 1 && <span className="muted"> lowest of {inStock.length} {inStock.length === 1 ? "store" : "stores"} in stock</span>}</p>
              : showPrices ? <p className="muted">Out of stock everywhere right now.</p> : <p className="muted">{policy.offMessage("retail.prices")}</p>}
          </div>

          <dl className="facts">
            <div><dt>THC <span className="hint-i">intoxicating</span></dt><dd className="num">{pot.thc ?? "Not listed"}</dd></div>
            <div><dt>CBD <span className="hint-i">non-intoxicating</span></dt><dd className="num">{pot.cbd ?? "Not listed"}</dd></div>
            <div><dt>Format</dt><dd>{CATEGORY_LABEL[p.category]}</dd></div>
            <div><dt>Counts toward your 30 g limit</dt><dd className="num">{p.equivalentGrams} g</dd></div>
          </dl>
          <p className="xs muted" style={{ marginTop: 8 }}>From the product label, as published by the store. The package is the final word. <Link href="/guide#labels">How to read a label</Link></p>

          {lead && (
            <div className="pd-buy">
              <div className="row between" style={{ alignItems: "flex-start" }}>
                <div>
                  <p className="xs muted">{offers.length > 1 ? (lead.priceCents === low ? "Best price" : canBuy(lead) ? "Best price to order online" : "Available at") : "Sold by"}</p>
                  <p className="strong" style={{ fontSize: "var(--t-md)" }}>{lead.retailer.tradeName}</p>
                  <p className="small muted">{lead.nearest!.name}, {lead.nearest!.street}{lead.nearest!.d != null ? ` · ${fmtKm(lead.nearest!.d)}` : ""}</p>
                </div>
                {showPrices && <p className="num strong" style={{ fontSize: "1.35rem" }}>{money(lead.priceCents)}</p>}
              </div>
              <div className="row small" style={{ ["--gap" as string]: "14px" }}>
                <span className={`status ${STOCK[lead.nearest!.stock][0]}`}>{STOCK[lead.nearest!.stock][1]}</span>
                <span className={`status ${openState(lead.nearest!.hours, lead.nearest!.jurisdictionCode).open ? "ok" : "idle"}`}>{openState(lead.nearest!.hours, lead.nearest!.jurisdictionCode).label}</span>
                <span className="seal">Licensed store</span>
              </div>
              {leadBlock ? <p className="small muted">{leadBlock}</p> : <AddToCart variant="full" productId={lead.id} name={p.name} locationId={lead.nearest!.id} />}
              {ordering && !leadBlock && <p className="xs muted">Nothing to pay now. Show your ID and pay {lead.retailer.tradeName} at pickup{policy.allows("retail.delivery") ? " or delivery" : ""}.</p>}
            </div>
          )}
          {!lead && <div className="callout"><p className="strong">Out of stock right now</p><p className="small muted">Save it and check back — stores update their stock throughout the day.</p></div>}

          {p.description && <p className="prose">{p.description}</p>}

          <section id="offers" aria-labelledby="offers-h">
            <div className="row between mb-2">
              <h2 id="offers-h" className="h3">{offers.length > 1 ? `Compare ${offers.length} stores` : "Where to get it"}</h2>
              {!v.near && <Link href="/shop" className="small">Set your location for distances</Link>}
            </div>
            <ul className="offers">
              {offers.map((o) => {
                const st = o.nearest ? openState(o.nearest.hours, o.nearest.jurisdictionCode) : null;
                const ob = orderBlock(policy, o.retailer);
                const pick = policy.allows("retail.pickup") && o.retailer.acceptsOrders && o.stocked.some((l) => l.offersPickup);
                const del = policy.allows("retail.delivery") && o.retailer.acceptsOrders && o.stocked.some((l) => l.offersDelivery);
                return (
                  <li key={o.id} className={`offer ${o === lead ? "is-lead" : ""} ${!o.nearest ? "is-out" : ""}`}>
                    <div className="offer-main">
                      <p className="row" style={{ ["--gap" as string]: "8px" }}>
                        <Link href={`/stores/${o.retailer.slug}`} className="offer-name">{o.retailer.tradeName}</Link>
                        {showPrices && o.nearest && o.priceCents === low && offers.length > 1 && <span className="tag best">Lowest price</span>}
                      </p>
                      <p className="xs muted">{o.nearest ? `${o.nearest.name}${o.nearest.d != null ? ` · ${fmtKm(o.nearest.d)}` : ""}${o.stocked.length > 1 ? ` · in stock at ${o.stocked.length} locations` : ""}` : "Out of stock at every location"}</p>
                      <p className="row xs" style={{ ["--gap" as string]: "6px", marginTop: 6 }}>
                        {st && <span className={`status ${st.open ? "ok" : "idle"} xs`}>{st.label}</span>}
                        {pick && <span className="tag">Pickup</span>}
                        {del && <span className="tag">Delivery</span>}
                        {ob && <span className="tag">In store only</span>}
                      </p>
                    </div>
                    {showPrices && <span className="num offer-price">{money(o.priceCents)}</span>}
                    {o.nearest && !ob ? <AddToCart productId={o.id} name={`${p.name} from ${o.retailer.tradeName}`} locationId={o.nearest.id} /> : <span style={{ width: 40 }} />}
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="pd-licence">
            <p className="small muted">Seller of this listing</p>
            <p className="strong">{r.legalName}</p>
            <TrustButton title="Licence record" trigger={<><CairnMark trust={r.trust} size={16} label={false} /><span className="seal">Licensed store</span><span className="more">View licence</span></>}>
              <TrustRecord trust={r.trust} retailerName={r.legalName} regulator={policy.regulator} registryUrl={policy.registryUrl} />
            </TrustButton>
          </div>
        </div>
      </div>
      <style>{`
        .product { padding-block: var(--s5) var(--s8); }
        .crumbs { display: flex; gap: 8px; flex-wrap: wrap; color: var(--ink-2); }
        .crumbs a { color: var(--ink-2); text-decoration: none; }
        .crumbs a:hover { color: var(--ink); text-decoration: underline; }
        .crumbs [aria-current] { color: var(--ink); }
        .product-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--s7); align-items: start; }
        .pd-shelf { position: sticky; top: 150px; aspect-ratio: 4 / 5; padding: 14%; }
        .pd-amt { font-size: 2rem; font-weight: 650; margin-right: 8px; }
        .facts { display: grid; grid-template-columns: 1fr 1fr; margin: 0; background: var(--surface); border: 1px solid var(--rule-soft); overflow: hidden; }
        .facts div { padding: 14px 18px; border-bottom: 1px solid var(--rule-soft); }
        .facts div:nth-child(odd) { border-right: 1px solid var(--rule-soft); }
        .facts div:nth-last-child(-n+2) { border-bottom: 0; }
        .facts dt { font-size: var(--t-xs); color: var(--ink-2); }
        .facts dd { margin: 2px 0 0; font-weight: 650; font-size: var(--t-lg); }
        .hint-i { font-size: 11px; padding: 1px 7px; border-radius: 99px; background: var(--bg); margin-left: 4px; }
        .pd-buy p + p { margin-top: 2px; }
        .pd-buy { display: grid; gap: 14px; padding: 22px; border-radius: var(--r-tile); background: var(--surface); border: 1.5px solid var(--ink); box-shadow: var(--shadow-card); }
        .offers { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
        .offer { display: flex; align-items: center; gap: 16px; padding: 16px 18px; background: var(--surface); border: 1px solid var(--rule-soft); border-radius: var(--r-panel); }
        .offer.is-lead { border-color: var(--brass); }
        .offer.is-out { opacity: .6; }
        .offer-main { flex: 1; min-width: 0; }
        .offer-name { color: var(--ink); font-weight: 650; text-decoration: none; }
        .offer-name:hover { text-decoration: underline; }
        .offer-price { font-weight: 650; min-width: 72px; text-align: right; }
        .tag.best { background: color-mix(in srgb, var(--pine) 12%, var(--surface)); color: var(--pine); border-color: transparent; }
        .pd-licence { display: grid; gap: 6px; padding-top: 18px; border-top: 1px solid var(--rule); }
        @media (max-width: 860px) { .product-grid { grid-template-columns: 1fr; gap: var(--s5); } .pd-shelf { position: static; max-width: 460px; aspect-ratio: 5 / 4; } }
      `}</style>
    </div>
  );
}
