import Link from "next/link";
import { PackArt } from "@/components/pack-art";
import { CATEGORY_LABEL } from "@/lib/format";
import { brandsFor } from "@/lib/queries";
import { getVisitor } from "@/lib/visitor";

export const metadata = { title: "Brands" };

export default async function Brands() {
  const v = await getVisitor();
  if (!v.policy) return <div className="wrap section"><p className="muted">Choose your province or territory to start.</p></div>;
  const brands = await brandsFor(v.policy);
  const byLetter = new Map<string, typeof brands>();
  for (const b of [...brands].sort((a, b) => a.name.localeCompare(b.name))) {
    const l = /[a-z]/i.test(b.name[0]) ? b.name[0].toUpperCase() : "#";
    byLetter.set(l, [...(byLetter.get(l) ?? []), b]);
  }
  return (
    <div className="wrap" style={{ paddingBlock: "40px 96px" }}>
      <div className="section-head"><h1 className="h1">Brands</h1><span className="small muted">{brands.length} carried by licensed stores in {v.policy.name}</span></div>
      {brands.length === 0 ? (
        <div className="empty panel"><span className="cairn" aria-hidden><i /><i /><i /></span><p className="h4">No brands listed yet</p><p className="small muted">Brands appear here as licensed stores publish their menus.</p></div>
      ) : (
        <>
          <div className="brand-feature">
            {brands.slice(0, 4).map((b) => (
              <Link key={b.slug} href={`/brands/${b.slug}`} className="bf-tile">
                <span className="bf-art" style={{ background: `var(--t-${b.sample.category})` }}><PackArt p={b.sample} /></span>
                <span className="bf-name">{b.name}</span>
                <span className="xs muted">{b.productCount} {b.productCount === 1 ? "product" : "products"} at {b.storeCount} {b.storeCount === 1 ? "store" : "stores"}</span>
              </Link>
            ))}
          </div>
          <div className="brand-index">
            {[...byLetter.entries()].map(([l, list]) => (
              <section key={l} aria-label={l}>
                <p className="bi-letter">{l}</p>
                <ul>{list.map((b) => <li key={b.slug}><Link href={`/brands/${b.slug}`}>{b.name}</Link><span className="xs muted"> {b.categories.map((c) => CATEGORY_LABEL[c]).slice(0, 3).join(", ")}</span></li>)}</ul>
              </section>
            ))}
          </div>
        </>
      )}
      <style>{`
        .brand-feature { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 64px; }
        .bf-tile { display: grid; gap: 4px; color: var(--ink); text-decoration: none; }
        .bf-art { aspect-ratio: 4 / 5; padding: 18%; display: block; margin-bottom: 10px; }
        .bf-name { font-family: var(--font-display); font-size: 1.5rem; font-weight: 500; }
        .brand-index { columns: 4 220px; column-gap: 40px; }
        .brand-index section { break-inside: avoid; margin-bottom: 28px; }
        .bi-letter { font-family: var(--font-display); font-size: 2rem; border-bottom: 1px solid var(--rule); margin-bottom: 10px; }
        .brand-index ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
        .brand-index a { color: var(--ink); font-weight: 560; }
        @media (max-width: 860px) { .brand-feature { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </div>
  );
}
