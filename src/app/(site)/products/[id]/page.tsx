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
    where: and(ilike(schema.products.name, p.name), ilike(schema.products.brand, p.brand), ne(schema.products.id, p.id), eq(schema.products.status, "ACTIVE"), inArray(schema.products.retailerId, listed.map((x) => x.id).concat("_"))),
    with: { retailer: true },
  });

  return (
    <div className="wrap product">
      <p className="small mb-3"><Link href={`/shop?category=${p.category}`}>{CATEGORY_LABEL[p.category]}</Link> at <Link href={`/stores/${r.slug}`}>{r.tradeName}</Link></p>
      <div className="product-grid">
        <div className="pd-shelf" style={{ background: `var(--t-${p.category})` }}><PackArt p={p} size={420} /></div>
        <div className="stack" style={{ ["--gap" as string]: "18px" }}>
          <div className="row between top" style={{ flexWrap: "nowrap" }}>
            <div>
              <h1 className="h1">{p.name}</h1>
              <p className="lede">{p.brand}, {p.size}</p>
            </div>
            <SaveButton kind="product" id={p.id} saved={saved} back={`/products/${p.id}`} label={p.name} />
          </div>
          <div className="row" style={{ ["--gap" as string]: "16px", alignItems: "baseline" }}>
            {showPrices ? <p className="h2 num">{money(p.priceCents)}</p> : <p className="muted">{policy.offMessage("retail.prices")}</p>}
            {best ? <span className={`status ${STOCK[best.stock][0]}`}>{STOCK[best.stock][1]}{locs.length > 1 ? ` at ${best.name}` : ""}</span> : <span className="status idle">Out of stock</span>}
          </div>
          <dl className="facts">
            <div><dt>THC</dt><dd className="num">{pot.thc ?? "Not listed"}</dd></div>
            <div><dt>CBD</dt><dd className="num">{pot.cbd ?? "Not listed"}</dd></div>
            <div><dt>Format</dt><dd>{CATEGORY_LABEL[p.category]}</dd></div>
            <div><dt>Counts toward 30 g limit</dt><dd className="num">{p.equivalentGrams} g</dd></div>
          </dl>
          {best ? <AddToCart variant="full" productId={p.id} name={p.name} disabled={block} locationId={best.id} /> : <p className="small muted">Not available to order right now.</p>}
          {p.description && <p className="prose">{p.description}</p>}
          <p className="xs muted">Values as published by the store from the product label. Check the package for exact values.</p>

          <div className="sold-by">
            <div className="row between"><p className="small muted">Sold by</p>{r.isDemo && <span className="tag demo">Demo</span>}</div>
            <p className="strong">{r.legalName}</p>
            <TrustButton title="Licence record" trigger={<><CairnMark trust={r.trust} size={16} label={false} /><span>Licensed store</span><span className="more">View licence</span></>}>
              <TrustRecord trust={r.trust} retailerName={r.legalName} regulator={policy.regulator} registryUrl={policy.registryUrl} />
            </TrustButton>
            <div className="table-wrap"><table className="mt-1"><tbody>
              {locs.map((l) => {
                const o = openState(l.hours, l.jurisdictionCode);
                return (
                  <tr key={l.id}>
                    <td><span className="strong">{l.name}</span><br /><span className="muted">{l.street}{l.d != null ? `, ${fmtKm(l.d)}` : ""}</span></td>
                    <td><span className={`status ${STOCK[l.stock][0]}`}>{STOCK[l.stock][1]}</span></td>
                    <td className="r"><span className={`status ${o.open ? "ok" : "idle"}`}>{o.label}</span></td>
                  </tr>
                );
              })}
            </tbody></table></div>
            <p className="xs muted">The store checks government ID and takes payment when you collect or receive your order.</p>
          </div>

          {others.length > 0 && (
            <div>
              <h2 className="h4 mb-2">Also at</h2>
              <ul className="list ruled">
                {others.map((o) => <li key={o.id}><Link className="list-link row between" style={{ padding: "10px 4px" }} href={`/products/${o.id}`}><span>{o.retailer.tradeName}</span>{showPrices && <span className="num">{money(o.priceCents)}</span>}</Link></li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .product { padding-block: var(--s5) var(--s8); }
        .product-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--s7); align-items: start; }
        .pd-shelf { position: sticky; top: 130px; aspect-ratio: 1 / 1; border-radius: 24px; padding: 12%; }
        .facts { display: grid; grid-template-columns: 1fr 1fr; margin: 0; background: var(--surface); border-radius: var(--r-panel); overflow: hidden; }
        .facts div { padding: 12px 16px; border-bottom: 1px solid var(--rule-soft); }
        .facts div:nth-child(odd) { border-right: 1px solid var(--rule-soft); }
        .facts div:nth-last-child(-n+2) { border-bottom: 0; }
        .facts dt { font-size: var(--t-xs); color: var(--ink-2); }
        .facts dd { margin: 2px 0 0; font-weight: 650; font-size: var(--t-md); }
        @media (max-width: 860px) { .product-grid { grid-template-columns: 1fr; gap: var(--s5); } .pd-shelf { position: static; max-width: 420px; } }
      `}</style>
    </div>
  );
}
