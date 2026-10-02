import { and, eq, ilike, inArray, ne } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { AddToCart } from "@/components/add-to-cart";
import { PackArt } from "@/components/pack-art";
import { SaveButton } from "@/components/save-button";
import { RESTRICTED_CATEGORY_RULE, getPolicy } from "@/lib/compliance";
import { CATEGORY_LABEL, money, potency } from "@/lib/format";
import { listedRetailers } from "@/lib/queries";
import { buyerPoint } from "@/lib/cart";
import { routedOffer } from "@/lib/routing";
import { getVisitor } from "@/lib/visitor";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await db.query.products.findFirst({ where: eq(schema.products.id, (await params).id), columns: { name: true, brand: true } });
  return { title: p ? `${p.name} by ${p.brand}` : "Product" };
}


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
  const saved = v.user ? !!(await db.query.favourites.findFirst({ where: and(eq(schema.favourites.userId, v.user.id), eq(schema.favourites.productId, p.id)) })) : false;
  const others = await db.query.products.findMany({
    where: and(ilike(schema.products.name, p.name), ilike(schema.products.brand, p.brand), eq(schema.products.size, p.size), ne(schema.products.id, p.id), eq(schema.products.status, "ACTIVE"), inArray(schema.products.retailerId, listed.map((x) => x.id).concat("_"))),
    with: { retailer: true, inventory: true },
  });
  const point = await buyerPoint();
  const all = [p, ...others];
  const routed = routedOffer(all, new Map(listed.map((x) => [x.id, x])), point);
  const orderOff = !policy.allows("orders.online") ? policy.offMessage("orders.online") : null;
  const wrongRegion = v.region && v.region !== r.jurisdictionCode ? `This product is sold in ${policy.name}. You can only order where you live.` : null;
  const canDeliver = policy.allows("retail.delivery");
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

          <dl className="facts">
            <div><dt>THC <span className="hint-i">intoxicating</span></dt><dd className="num">{pot.thc ?? "Not listed"}</dd></div>
            <div><dt>CBD <span className="hint-i">non-intoxicating</span></dt><dd className="num">{pot.cbd ?? "Not listed"}</dd></div>
            <div><dt>Format</dt><dd>{CATEGORY_LABEL[p.category]}</dd></div>
            <div><dt>Counts toward your 30 g limit</dt><dd className="num">{p.equivalentGrams} g</dd></div>
          </dl>
          <p className="xs muted" style={{ marginTop: 8 }}>From the product label, as published by the store. The package is the final word. <Link href="/guide#labels">How to read a label</Link></p>

          <div className="pd-buy">
            {routed ? (
              <>
                <div className="row between" style={{ alignItems: "flex-end" }}>
                  <div>
                    {showPrices ? <p className="num pd-amt">{money(routed.offer.priceCents)}</p> : <p className="muted">{policy.offMessage("retail.prices")}</p>}
                    <p className="small muted">{routed.deliverable ? (point?.saved ? `Delivers to ${point.label}` : `Delivers to ${point?.label}`) : point ? (canDeliver ? "Not delivering to your area yet — pickup may be available" : "Available for pickup") : "In stock at licensed stores"}</p>
                  </div>
                  <span className={`status ${routed.deliverable ? "ok" : "idle"}`}>{routed.deliverable ? "Available to you" : "In stock"}</span>
                </div>
                {orderOff || wrongRegion ? <p className="small muted">{orderOff ?? wrongRegion}</p> : <AddToCart variant="full" productId={routed.offer.id} name={p.name} />}
                <ul className="pd-promise xs">
                  <li>Filled by the nearest licensed store that has it</li>
                  <li>Nothing to pay now — pay the store at the door</li>
                  <li>ID checked on delivery{policy ? ` (${policy.legalAge}+)` : ""}</li>
                </ul>
                {!point && <p className="xs muted">Add your postal code in the cart to see the exact price and arrival time for your address.</p>}
              </>
            ) : (
              <div><p className="strong">Out of stock right now</p><p className="small muted">Save it and check back — stores update their stock throughout the day.</p></div>
            )}
          </div>

          {p.description && <p className="prose">{p.description}</p>}
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
        .pd-promise { list-style: none; margin: 0; padding: 12px 0 0; border-top: 1px solid var(--rule-soft); display: grid; gap: 6px; color: var(--ink-2); }
        .pd-promise li::before { content: "✓"; color: var(--pine); font-weight: 700; margin-right: 8px; }
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
