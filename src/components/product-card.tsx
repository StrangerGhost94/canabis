import Link from "next/link";
import { CATEGORY_LABEL, money, potency } from "@/lib/format";
import { fmtKm } from "@/lib/geo";
import { AddToCart } from "./add-to-cart";
import { PackArt } from "./pack-art";

export type CardProduct = {
  id: string; name: string; brand: string; category: string; size: string; priceCents: number; imageKey?: string | null;
  potencyUnit: string; thcMin: number | null; thcMax: number | null; cbdMin: number | null; cbdMax: number | null;
  offerCount?: number; minPriceCents?: number;
};

export const brandSlug = (b: string) => b.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-");

/**
 * A listing. Reads top to bottom the way people decide: what it is (brand,
 * name, format, size), how strong (THC / CBD), where and for how much.
 * A product several stores sell is one card that leads to a store comparison.
 */
export function ProductCard({ p, store, showPrice, orderable, stock, distance, showStore = true }: {
  p: CardProduct; store: { name: string; slug: string }; showPrice: boolean; orderable: string | null; stock?: "IN_STOCK" | "LOW" | "OUT"; distance?: number | null; showStore?: boolean;
}) {
  const pot = potency(p);
  const out = stock === "OUT";
  const offers = p.offerCount ?? 1;
  const multi = offers > 1;
  const from = multi && p.minPriceCents != null && p.minPriceCents < p.priceCents;
  return (
    <article className={`pcard ${out ? "is-out" : ""}`}>
      <Link href={`/products/${p.id}`} className="pcard-shelf" style={{ background: `var(--t-${p.category})` }} aria-hidden tabIndex={-1}>
        <PackArt p={p} />
        {stock === "LOW" && <span className="pcard-flag">Low stock</span>}
        {out && <span className="pcard-flag out">Out of stock</span>}
      </Link>
      <div className="pcard-body">
        <Link href={`/brands/${brandSlug(p.brand)}`} className="pcard-brand" style={{ position: "relative", zIndex: 1 }}>{p.brand}</Link>
        <Link href={`/products/${p.id}`} className="pcard-name">{p.name}</Link>
        <p className="pcard-meta">{CATEGORY_LABEL[p.category]} · {p.size}</p>
        {(pot.thc || pot.cbd) && (
          <p className="pcard-pills num">
            {pot.thc && <span className="pill thc"><b>THC</b>{pot.thc}</span>}
            {pot.cbd && <span className="pill cbd"><b>CBD</b>{pot.cbd}</span>}
          </p>
        )}
        <div className="pcard-foot">
          <div style={{ minWidth: 0 }}>
            <span className="pcard-price">
              {showPrice
                ? <>{from && <small>From</small>}{money(from ? p.minPriceCents! : p.priceCents)}</>
                : <small>Price shown in store</small>}
            </span>
            {showStore && (
              <p className="pcard-where mt-1">
                {multi
                  ? <span>At {offers} stores</span>
                  : <><span className="lic" aria-label="Licensed store">✓</span><Link href={`/stores/${store.slug}`}>{store.name}</Link>{distance != null && <span className="num">· {fmtKm(distance)}</span>}</>}
              </p>
            )}
          </div>
          {!out && !multi && <AddToCart productId={p.id} name={p.name} disabled={orderable} />}
          {!out && multi && <Link href={`/products/${p.id}#offers`} className="btn sm">Compare</Link>}
        </div>
      </div>
    </article>
  );
}
