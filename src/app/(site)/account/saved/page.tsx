import { eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { CairnMark } from "@/components/cairn";
import { LabelTile } from "@/components/label-tile";
import { SaveButton } from "@/components/save-button";
import { requireUser } from "@/lib/auth/session";
import { getPolicy } from "@/lib/compliance";
import { money } from "@/lib/format";
import { listedRetailers } from "@/lib/queries";

export const metadata = { title: "Saved" };

export default async function Saved() {
  const u = await requireUser("/account/saved");
  const favs = await db.query.favourites.findMany({ where: eq(schema.favourites.userId, u.id), with: { product: true, retailer: true }, orderBy: (f, { desc }) => desc(f.createdAt) });
  const listed = new Map((await listedRetailers(u.jurisdictionCode)).map((r) => [r.id, r]));
  const policy = await getPolicy(u.jurisdictionCode);
  const stores = favs.filter((f) => f.retailer);
  const products = favs.filter((f) => f.product);

  if (!favs.length) {
    return (
      <div className="empty panel">
        <span className="cairn" aria-hidden><i /><i /><i /></span>
        <p className="h4">Nothing saved yet</p>
        <p className="muted small">Tap the heart on a store or product to keep it here. If a saved store's licence lapses, you'll see it flagged.</p>
        <Link href="/shop" className="btn primary sm">Start shopping</Link>
      </div>
    );
  }
  return (
    <div className="stack" style={{ ["--gap" as string]: "32px", maxWidth: 860 }}>
      {stores.length > 0 && (
        <section>
          <h2 className="h3 mb-2">Stores</h2>
          <ul className="list ruled">
            {stores.map(({ retailer: r }) => {
              const l = listed.get(r!.id);
              return (
                <li key={r!.id} className="row" style={{ padding: "12px 0" }}>
                  {l ? <CairnMark trust={l.trust} size={22} /> : <span className="cairn expired" style={{ ["--cs" as string]: "22px" }}><i /><i /><i /></span>}
                  <Link href={`/stores/${r!.slug}`} className="grow strong">{r!.tradeName}</Link>
                  {!l && <span className="status bad">No longer listed</span>}
                  <SaveButton kind="retailer" id={r!.id} saved back="/account/saved" label={r!.tradeName} />
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {products.length > 0 && (
        <section>
          <h2 className="h3 mb-2">Products</h2>
          <ul className="list ruled">
            {products.map(({ product: p }) => {
              const l = listed.get(p!.retailerId);
              return (
                <li key={p!.id} className="row" style={{ padding: "12px 0", flexWrap: "nowrap" }}>
                  <LabelTile p={p!} />
                  <div className="grow">
                    {l ? <Link href={`/products/${p!.id}`} className="strong">{p!.name}</Link> : <span className="strong">{p!.name}</span>}
                    <p className="small muted">{p!.brand}, {p!.size}{l ? ` at ${l.tradeName}` : ""}</p>
                    {!l && <span className="status bad">Store no longer listed</span>}
                  </div>
                  {l && policy.allows("retail.prices") && <span className="num strong">{money(p!.priceCents)}</span>}
                  <SaveButton kind="product" id={p!.id} saved back="/account/saved" label={p!.name} />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
