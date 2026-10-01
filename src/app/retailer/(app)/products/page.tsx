import { eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { confirmStock, setProductVisibility } from "@/app/actions/retailer";
import { ConsoleHead } from "@/components/console/shell";
import { StockSelect } from "@/components/retailer/stock-select";
import { requireRetailer } from "@/lib/auth/access";
import { allowedCategories, getPolicy } from "@/lib/compliance";
import { CATEGORIES, CATEGORY_LABEL, money, potency } from "@/lib/format";

export const metadata = { title: "Menu and stock" };

export default async function Products({ searchParams }: { searchParams: Promise<{ saved?: string; q?: string }> }) {
  const { retailer } = await requireRetailer();
  const { saved, q } = await searchParams;
  const policy = await getPolicy(retailer.jurisdictionCode);
  const visibleCats = new Set(allowedCategories(policy, CATEGORIES));
  const locations = await db.query.locations.findMany({ where: eq(schema.locations.retailerId, retailer.id), orderBy: (l, { asc }) => asc(l.createdAt) });
  let products = await db.query.products.findMany({ where: eq(schema.products.retailerId, retailer.id), with: { inventory: true }, orderBy: (p, { asc }) => [asc(p.category), asc(p.name)] });
  if (q) products = products.filter((p) => `${p.name} ${p.brand}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <ConsoleHead
        title="Menu and stock"
        sub="Customers see stock per location. Changing a value counts as updating your menu."
        actions={<><form action={confirmStock}><button className="btn sm">Confirm all current</button></form><Link href="/retailer/products/new" className="btn primary sm">Add product</Link></>}
      />
      {saved && <p className="flash mb-3">Product saved.</p>}
      <form className="row mb-2" action="/retailer/products"><input name="q" defaultValue={q} className="input" placeholder="Filter by name or brand" style={{ maxWidth: 320, minHeight: 40 }} /><button className="btn sm">Filter</button></form>
      {products.length === 0 ? (
        <div className="empty panel">
          <span className="cairn" aria-hidden><i /><i /><i /></span>
          <p className="h4">{q ? "No products match" : "Your menu is empty"}</p>
          <p className="small muted">Add products with their label values. They appear on your listing once your licence is verified.</p>
          <Link href="/retailer/products/new" className="btn primary sm">Add your first product</Link>
        </div>
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr><th>Product</th><th>Label</th><th className="r">Price</th>{locations.map((l) => <th key={l.id}>{l.name}{!l.active && " (inactive)"}</th>)}<th>Listing</th><th /></tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const pot = potency(p);
                return (
                  <tr key={p.id}>
                    <td><span className="strong">{p.name}</span><br /><span className="muted">{p.brand}, {p.size}</span><br /><span className="xs muted">{CATEGORY_LABEL[p.category]}</span></td>
                    <td className="num nowrap">THC {pot.thc ?? "—"}<br />CBD {pot.cbd ?? "—"}</td>
                    <td className="r num">{money(p.priceCents)}</td>
                    {locations.map((l) => (
                      <td key={l.id}><StockSelect productId={p.id} locationId={l.id} value={p.inventory.find((i) => i.locationId === l.id)?.status ?? "OUT"} label={`${p.name} at ${l.name}`} /></td>
                    ))}
                    <td>
                      {p.status === "FLAGGED" ? <span className="status bad">Held for review</span>
                        : !visibleCats.has(p.category) ? <span className="status idle" title={policy.offMessage("product.vapes")}>Not shown in {policy.code}</span>
                        : <form action={setProductVisibility} className="row nowrap" style={{ ["--gap" as string]: "8px", flexWrap: "nowrap" }}><span className={`status ${p.status === "ACTIVE" ? "ok" : "idle"}`}>{p.status === "ACTIVE" ? "Shown" : "Hidden"}</span><input type="hidden" name="id" value={p.id} /><button className="linkbtn small">{p.status === "ACTIVE" ? "Hide" : "Show"}</button></form>}
                    </td>
                    <td><Link href={`/retailer/products/${p.id}`} className="small">Edit</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
