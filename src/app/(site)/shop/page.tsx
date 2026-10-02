import { requireUser } from "@/lib/auth/session";
import Link from "next/link";
import { Suspense } from "react";
import { Filters } from "@/components/discover/filters";
import { NearControl } from "@/components/discover/near-form";
import { ProductCard } from "@/components/product-card";
import { allowedCategories } from "@/lib/compliance";
import { CATEGORIES, CATEGORY_LABEL, n } from "@/lib/format";
import { COLLECTIONS, discover, listingBlock, parseDiscover, toListings } from "@/lib/queries";
import { buyerPoint } from "@/lib/cart";
import { getVisitor } from "@/lib/visitor";

export const metadata = { title: "Shop" };

export default async function Shop({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser("/shop");
  const sp = await searchParams;
  const p = parseDiscover(sp);
  const v = await getVisitor();
  const qs = new URLSearchParams(Object.entries(sp).filter(([, x]) => typeof x === "string") as [string, string][]);
  const here = `/shop${qs.size ? `?${qs}` : ""}`;
  if (!v.policy) return <div className="wrap section"><p className="muted">Choose your province or territory to start.</p></div>;
  const policy = v.policy;
  const point = await buyerPoint();
  const { products, blocked } = await discover(policy, point, p);
  const showPrices = policy.allows("retail.prices");
  const cats = allowedCategories(policy, CATEGORIES).map((c) => ({ value: c, label: CATEGORY_LABEL[c] }));
  const hidden = CATEGORIES.filter((c) => !cats.some((x) => x.value === c));
  const activeCount = [p.category, p.ratio, p.max, p.stock, p.open].filter(Boolean).length;
  const sort = p.sort ?? (v.near ? "near" : "name");
  const sortHref = (s: string) => { const q = new URLSearchParams(qs); q.set("sort", s); return `/shop?${q}`; };
  const listings = toListings(products, point);
  const brandName = p.brand ? products.find((x) => x.brand.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-") === p.brand)?.brand : null;
  const collection = p.collection ? COLLECTIONS[p.collection] : null;
  const title = p.q ? `Results for “${p.q}”` : collection ? collection.title : brandName ?? (p.category ? CATEGORY_LABEL[p.category] : "Shop all");

  return (
    <div className="wrap shop">
      <div className="shop-head">
        <div>
          <h1 className="h1">{title}</h1>
          <p className="small muted mt-1" aria-live="polite">{collection ? `${collection.blurb} ` : ""}{n(listings.length)} {listings.length === 1 ? "listing" : "listings"} from licensed stores in {policy.name}{point ? ` · ${listings.filter((x) => x.deliverable).length} deliver to you` : ""}</p>
        </div>
        <NearControl label={point?.label ?? null} next={here} />
      </div>
      <form action="/shop" role="search" className="shop-search show-sm">
        <label htmlFor="sq" className="sr-only">Search</label>
        <input id="sq" name="q" defaultValue={p.q} placeholder="Search products, brands or stores" className="input" />
      </form>

      <div className="shop-body">
        <Suspense><Filters categories={cats} showPrice={showPrices} activeCount={activeCount} /></Suspense>
        <section aria-label="Products" className="shop-results">
          <div className="row between mb-3 shop-bar">
            <div className="row small" style={{ ["--gap" as string]: "6px" }}>
              <span className="muted">Sort</span>
              {[...(v.near ? [["near", "Nearest"]] : []), ["new", "Newest"], ["name", "Name"], ...(showPrices ? [["price", "Price"]] : []), ["potency", "THC"]].map(([k, l]) => (
                <Link key={k} href={sortHref(k)} className={`chip ${sort === k ? "on" : ""}`} aria-current={sort === k ? "true" : undefined}>{l}</Link>
              ))}
            </div>
          </div>

          {blocked ? (
            <div className="callout"><p className="strong">No stores listed in {policy.name} yet</p><p className="small muted">{policy.offMessage("retail.directory")}</p></div>
          ) : !policy.allows("retail.products") ? (
            <div className="callout"><p className="strong">Products aren't shown in {policy.name}</p><p className="small muted">{policy.offMessage("retail.products")} <Link href="/stores">Browse stores</Link></p></div>
          ) : listings.length === 0 ? (
            <div className="empty panel">
              <span className="cairn" aria-hidden><i /><i /><i /></span>
              <p className="h4">{p.q ? `Nothing matches “${p.q}”` : "Nothing matches these filters"}</p>
              <p className="muted small">Try a broader search or clear a filter. Only stores with a current, verified licence are shown.</p>
              <Link href="/shop" className="btn sm">Clear search and filters</Link>
            </div>
          ) : (
            <div className="pgrid">
              {listings.map((x) => (
                <ProductCard key={x.id} p={x} showPrice={showPrices} deliverable={x.deliverable}
                  orderable={listingBlock(policy, x.orderable)} stock={x.best?.stock} />
              ))}
            </div>
          )}
          {hidden.length > 0 && !blocked && <p className="xs muted mt-4">{hidden.map((h) => CATEGORY_LABEL[h]).join(", ")} aren't sold on Cairn in {policy.name}.</p>}
        </section>
      </div>
      <style>{`
        .shop { padding-block: var(--s5) var(--s8); }
        .shop-head { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--s4); flex-wrap: wrap; padding-bottom: var(--s5); }
        .shop-search { margin-bottom: var(--s3); }
        .shop-body { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: var(--s6); }
        .filter-rail { position: sticky; top: 150px; align-self: start; max-height: calc(100dvh - 170px); overflow-y: auto; padding: 4px 4px 4px 0; }
        .shop-head .h1 { font-size: clamp(2.2rem, 4vw, 3.4rem); }
        .filters legend { font-size: var(--t-sm); }
        .near-form { max-width: 360px; }
        .store-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        @media (max-width: 760px) {
          .shop-body { grid-template-columns: 1fr; gap: var(--s3); }
          .shop-head { padding-bottom: var(--s3); }
        }
      `}</style>
    </div>
  );
}
