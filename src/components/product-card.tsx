import Link from "next/link";
import { money, potency } from "@/lib/format";
import { fmtKm } from "@/lib/geo";
import { AddToCart } from "./add-to-cart";
import { PackArt } from "./pack-art";

export type CardProduct = {
  id: string; name: string; brand: string; category: string; size: string; priceCents: number; imageKey?: string | null;
  potencyUnit: string; thcMin: number | null; thcMax: number | null; cbdMin: number | null; cbdMax: number | null;
  offerCount?: number; minPriceCents?: number;
};

const brandSlug = (b: string) => b.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-");

/** A listing: image well, brand, name, facts, price. Several stores selling it shows as one card with offers. */
export function ProductCard({ p, store, showPrice, orderable, stock, distance, showStore = true }: {
  p: CardProduct; store: { name: string; slug: string; isDemo?: boolean }; showPrice: boolean; orderable: string | null; stock?: "IN_STOCK" | "LOW" | "OUT"; distance?: number | null; showStore?: boolean;
}) {
  const pot = potency(p);
  const out = stock === "OUT";
  const multi = (p.offerCount ?? 1) > 1;
  return (
    <article className={`pcard ${out ? "is-out" : ""}`}>
      <Link href={`/products/${p.id}`} className="pcard-shelf" style={{ background: `var(--t-${p.category})` }} aria-label={`${p.name} by ${p.brand}, ${p.size}`}>
        <PackArt p={p} />
        {stock === "LOW" && <span className="pcard-flag">Low stock</span>}
        {out && <span className="pcard-flag out">Out of stock</span>}
      </Link>
      <div className="pcard-body">
        <Link href={`/brands/${brandSlug(p.brand)}`} className="pcard-brand">{p.brand}</Link>
        <Link href={`/products/${p.id}`} className="pcard-name">{p.name}</Link>
        <p className="pcard-pot num xs">{p.size}<span>THC {pot.thc ?? "—"}</span><span>CBD {pot.cbd ?? "—"}</span></p>
        {showStore && (
          <p className="xs pcard-store">
            {multi ? (
              <Link href={`/products/${p.id}#offers`} className="pcard-offers">Sold by {p.offerCount} licensed stores</Link>
            ) : (
              <>
                <span className="lic" aria-label="Licensed store">✓</span>
                <Link href={`/stores/${store.slug}`}>{store.name}</Link>
                {distance != null && <span className="muted num">{fmtKm(distance)}</span>}
              </>
            )}
          </p>
        )}
        <div className="pcard-foot">
          <span className="pcard-price num">
            {showPrice ? (multi && p.minPriceCents != null && p.minPriceCents < p.priceCents ? <><span className="xs muted" style={{ fontWeight: 500 }}>From </span>{money(p.minPriceCents)}</> : money(p.priceCents)) : <span className="xs muted">Price at store</span>}
          </span>
          {!out && !multi && <AddToCart productId={p.id} name={p.name} disabled={orderable} />}
          {!out && multi && <Link href={`/products/${p.id}#offers`} className="btn sm">Compare</Link>}
        </div>
      </div>
    </article>
  );
}
