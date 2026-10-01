import { and, eq, ilike, inArray, ne } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { CairnMark, TrustRecord } from "@/components/cairn";
import { IconArrowOut } from "@/components/icons";
import { LabelTile } from "@/components/label-tile";
import { SaveButton } from "@/components/save-button";
import { TrustButton } from "@/components/trust-button";
import { RESTRICTED_CATEGORY_RULE, getPolicy } from "@/lib/compliance";
import { CATEGORY_LABEL, money, potency } from "@/lib/format";
import { fmtKm, km, openState } from "@/lib/geo";
import { listedRetailers } from "@/lib/queries";
import { getVisitor } from "@/lib/visitor";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await db.query.products.findFirst({ where: eq(schema.products.id, (await params).id), columns: { name: true, brand: true } });
  return { title: p ? `${p.name} by ${p.brand}` : "Product" };
}

const STOCK = { IN_STOCK: ["ok", "In stock"], LOW: ["warn", "Low stock"], OUT: ["idle", "Out of stock"] } as const;

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.query.products.findFirst({ where: and(eq(schema.products.id, id), eq(schema.products.status, "ACTIVE")), with: { inventory: true } });
  if (!p) notFound();
  const v = await getVisitor();
  const r = (await listedRetailers((await db.query.retailers.findFirst({ where: eq(schema.retailers.id, p.retailerId), columns: { jurisdictionCode: true } }))!.jurisdictionCode)).find((x) => x.id === p.retailerId);
  if (!r) notFound(); // store not listed (expired, suspended, pending)
  const policy = await getPolicy(r.jurisdictionCode);
  const rule = RESTRICTED_CATEGORY_RULE[p.category];
  if (!policy.allows("retail.products") || (rule && !policy.allows(rule))) notFound();

  const pot = potency(p);
  const showPrices = policy.allows("retail.prices");
  const canOrder = !!r.orderingUrl && policy.allows("retail.onlineHandoff") && v.region === r.jurisdictionCode;
  const saved = v.user ? !!(await db.query.favourites.findFirst({ where: and(eq(schema.favourites.userId, v.user.id), eq(schema.favourites.productId, p.id)) })) : false;

  // Same product at other listed stores in the province.
  const others = await db.query.products.findMany({
    where: and(ilike(schema.products.name, p.name), ilike(schema.products.brand, p.brand), ne(schema.products.id, p.id), eq(schema.products.status, "ACTIVE"),
      inArray(schema.products.retailerId, (await listedRetailers(r.jurisdictionCode)).map((x) => x.id).concat("_"))),
    with: { retailer: true },
  });

  const record = <TrustRecord trust={r.trust} retailerName={r.legalName} regulator={policy.regulator} registryUrl={policy.registryUrl} />;

  return (
    <div className="wrap product">
      <p className="small mb-3"><Link href={`/discover?category=${p.category}`}>{CATEGORY_LABEL[p.category]}</Link> at <Link href={`/stores/${r.slug}`}>{r.tradeName}</Link></p>
      <div className="product-grid">
        <div className="stack pg-label" style={{ ["--gap" as string]: "24px" }}>
          <LabelTile p={p} size="lg" />
          <dl className="facts">
            <div><dt>Brand</dt><dd>{p.brand}</dd></div>
            <div><dt>Size</dt><dd>{p.size}</dd></div>
            <div><dt>Format</dt><dd>{CATEGORY_LABEL[p.category]}</dd></div>
            <div><dt>Potency unit</dt><dd>{pot.thc || pot.cbd ? (p.potencyUnit === "mg" ? "mg per package" : "% by weight") : "Not listed"}</dd></div>
          </dl>
          <p className="xs muted">Values as published by the store from the product label. Check the package for exact values.</p>
        </div>
        <div className="stack pg-head" style={{ ["--gap" as string]: "16px" }}>
          <div className="row between top">
            <div>
              <h1 className="h1">{p.name}</h1>
              <p className="lede">{p.brand}, {p.size}</p>
            </div>
            <SaveButton kind="product" id={p.id} saved={saved} back={`/products/${p.id}`} label={p.name} />
          </div>
          {showPrices ? <p className="h2 num">{money(p.priceCents)}</p> : <p className="muted">{policy.offMessage("retail.prices")}</p>}
          {p.description && <p className="prose">{p.description}</p>}
        </div>
        <div className="stack pg-body" style={{ ["--gap" as string]: "20px" }}>
          <div className="sold-by">
            <p className="small muted">Sold by</p>
            <div className="row between">
              <p className="h4">{r.legalName}</p>
              {r.isDemo && <span className="tag demo">Demo</span>}
            </div>
            <TrustButton title="Verification record" trigger={<><CairnMark trust={r.trust} size={18} label={false} /><span>{r.trust.headline}</span><span className="more">View record</span></>}>{record}</TrustButton>
            <div className="table-wrap"><table className="mt-1">
              <thead><tr><th>Location</th><th>Availability</th><th className="r">Status</th></tr></thead>
              <tbody>
                {r.locations.map((l) => {
                  const inv = p.inventory.find((i) => i.locationId === l.id);
                  const [c, t] = STOCK[inv?.status ?? "OUT"];
                  const o = openState(l.hours, l.jurisdictionCode);
                  return (
                    <tr key={l.id}>
                      <td><span className="strong">{l.name}</span><br /><span className="muted">{l.street}{v.near && !l.geoApproximate ? `, ${fmtKm(km(v.near, l))}` : ""}</span></td>
                      <td><span className={`status ${c}`}>{t}</span></td>
                      <td className="r"><span className={`status ${o.open ? "ok" : "idle"}`}>{o.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
            {canOrder ? (
              <a className="btn signal mt-1" href={`/go/${r.id}?product=${p.id}`} rel="nofollow">Continue to {r.tradeName}'s ordering page <IconArrowOut width={18} /></a>
            ) : (
              <Link className="btn mt-1" href={`/stores/${r.slug}`}>See store hours and address</Link>
            )}
            <p className="xs muted">Your order, ID check and payment happen with {r.tradeName}. Cairn doesn't process purchases.</p>
          </div>

          {others.length > 0 && (
            <div>
              <h2 className="h4 mb-2">Also at</h2>
              <ul className="list ruled">
                {others.map((o) => (
                  <li key={o.id}><Link className="list-link row between" style={{ padding: "10px 4px" }} href={`/products/${o.id}`}><span>{o.retailer.tradeName}</span>{showPrices && <span className="num">{money(o.priceCents)}</span>}</Link></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .product { padding-block: var(--s6) var(--s8); }
        .product-grid { display: grid; grid-template-columns: 300px minmax(0, 1fr); grid-template-areas: "label head" "label body"; gap: var(--s5) var(--s7); max-width: 1040px; align-items: start; }
        .product-grid > * { min-width: 0; }
        .pg-label { grid-area: label; } .pg-head { grid-area: head; } .pg-body { grid-area: body; }
        .facts { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin: 0; border-top: 1px solid var(--rule); }
        .facts div { padding: 10px 0; border-bottom: 1px solid var(--rule); }
        .facts dt { font-size: var(--t-xs); color: var(--ink-2); }
        .facts dd { margin: 2px 0 0; font-weight: 600; }
        @media (max-width: 760px) { .product-grid { grid-template-columns: 1fr; grid-template-areas: "head" "label" "body"; } }
      `}</style>
    </div>
  );
}
