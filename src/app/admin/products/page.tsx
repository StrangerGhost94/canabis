import { desc, eq, ilike, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { setProductStatus } from "@/app/actions/admin";
import { ConsoleHead } from "@/components/console/shell";
import { screenCopy } from "@/lib/compliance/copy-check";
import { CATEGORY_LABEL, money } from "@/lib/format";

export const metadata = { title: "Products" };

export default async function Products({ searchParams }: { searchParams: Promise<{ q?: string; flagged?: string }> }) {
  const { q, flagged } = await searchParams;
  const like = q ? `%${q.replace(/[%_\\]/g, "")}%` : null;
  const ps = await db.query.products.findMany({
    where: flagged ? eq(schema.products.status, "FLAGGED") : like ? or(ilike(schema.products.name, like), ilike(schema.products.brand, like)) : undefined,
    with: { retailer: true }, orderBy: desc(schema.products.updatedAt), limit: 150,
  });
  return (
    <>
      <ConsoleHead title="Products" sub="Every listing is screened for health claims and youth-appealing language when saved. Hold anything that slips through." />
      <form className="row mb-2"><input name="q" defaultValue={q} className="input" placeholder="Search products or brands" style={{ maxWidth: 320, minHeight: 40 }} /><button className="btn sm">Search</button><a href="/admin/products?flagged=1" className={`chip ${flagged ? "on" : ""}`}>Held only</a></form>
      <div className="panel table-wrap">
        <table>
          <thead><tr><th>Product</th><th>Store</th><th>Format</th><th className="r">Price</th><th>Screen</th><th>Status</th><th /></tr></thead>
          <tbody>
            {ps.map((p) => {
              const issue = screenCopy(`${p.name} ${p.description ?? ""}`);
              return (
                <tr key={p.id}>
                  <td><span className="strong">{p.name}</span><br /><span className="muted">{p.brand}, {p.size}</span></td>
                  <td>{p.retailer.tradeName}</td>
                  <td>{CATEGORY_LABEL[p.category]}</td>
                  <td className="r num">{money(p.priceCents)}</td>
                  <td>{issue ? <span className="status bad" title={issue}>Issue</span> : <span className="status ok">Clear</span>}</td>
                  <td><span className={`status ${p.status === "ACTIVE" ? "ok" : p.status === "FLAGGED" ? "bad" : "idle"}`}>{p.status === "FLAGGED" ? "Held" : p.status.toLowerCase()}</span></td>
                  <td><form action={setProductStatus}><input type="hidden" name="id" value={p.id} /><button name="status" value={p.status === "FLAGGED" ? "ACTIVE" : "FLAGGED"} className="linkbtn small">{p.status === "FLAGGED" ? "Release" : "Hold"}</button></form></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
