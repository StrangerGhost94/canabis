import Link from "next/link";
import { CATEGORY_LABEL, money, potency } from "@/lib/format";
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
export function ProductCard({ p, showPrice, orderable, stock, deliverable = null }: {
  p: CardProduct; store?: { name: string; slug: string }; showPrice: boolean; orderable: string | null; stock?: "IN_STOCK" | "LOW" | "OUT"; distance?: number | null; showStore?: boolean;
  /** true: a licensed store delivers this to the buyer; false: not to their address yet; null: we don't know where they are. */
  deliverable?: boolean | null;
}) {
  const pot = potency(p);
  const out = stock === "OUT";
  const from = deliverable == null && (p.offerCount ?? 1) > 1 && p.minPriceCents != null && p.minPriceCents < p.priceCents;
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
            <p className={`pcard-where mt-1 ${deliverable ? "ok" : ""}`}>
              {deliverable === true ? "Delivers to you" : deliverable === false ? "Not delivering to you yet" : "From licensed stores"}
            </p>
          </div>
          {!out && <AddToCart productId={p.id} name={p.name} disabled={orderable} />}
        </div>
      </div>
    </article>
  );
}
