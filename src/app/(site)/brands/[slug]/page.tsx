import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { CATEGORY_LABEL } from "@/lib/format";
import { discover, orderBlock, toListings } from "@/lib/queries";
import { getVisitor } from "@/lib/visitor";

export default async function Brand({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = await getVisitor();
  if (!v.policy) return <div className="wrap section"><p className="muted">Choose your province or territory to start.</p></div>;
  const { products } = await discover(v.policy, v.near, { brand: slug, sort: v.near ? "near" : "name" });
  if (!products.length) notFound();
  const name = products[0].brand;
  const listings = toListings(products);
  const cats = [...new Set(products.map((p) => p.category))];
  const stores = [...new Map(products.map((p) => [p.retailer.id, p.retailer])).values()];
  return (
    <div className="wrap" style={{ paddingBlock: "40px 96px" }}>
      <p className="small mb-3"><Link href="/brands">Brands</Link></p>
      <header className="brand-hero">
        <h1 className="display" style={{ fontSize: "clamp(2.8rem, 6vw, 5rem)" }}>{name}</h1>
        <p className="lede">{listings.length} {listings.length === 1 ? "product" : "products"} across {cats.map((c) => CATEGORY_LABEL[c].toLowerCase()).join(", ")}, carried by {stores.length} licensed {stores.length === 1 ? "store" : "stores"} in {v.policy.name}.</p>
        <p className="small">Stocked at {stores.map((s, i) => <span key={s.id}>{i ? ", " : ""}<Link href={`/stores/${s.slug}`}>{s.tradeName}</Link></span>)}</p>
      </header>
      <div className="pgrid mt-5">
        {listings.map((x) => (
          <ProductCard key={x.id} p={x} store={{ name: x.retailer.tradeName, slug: x.retailer.slug }} showPrice={v.policy!.allows("retail.prices")}
            orderable={orderBlock(v.policy!, x.retailer)} stock={x.best?.stock} distance={x.best?.distance} />
        ))}
      </div>
      <style>{`.brand-hero { display: grid; gap: 16px; max-width: 760px; padding-bottom: 32px; border-bottom: 1px solid var(--rule); }`}</style>
    </div>
  );
}
