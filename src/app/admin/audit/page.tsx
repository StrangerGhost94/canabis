import { desc, ilike } from "drizzle-orm";
import { db, schema } from "@/db";
import { ConsoleHead } from "@/components/console/shell";

export const metadata = { title: "Audit log" };

export default async function Audit({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const { action } = await searchParams;
  const rows = await db.query.auditLogs.findMany({
    where: action ? ilike(schema.auditLogs.action, `${action.replace(/[%_\\]/g, "")}%`) : undefined,
    with: { actor: true }, orderBy: desc(schema.auditLogs.createdAt), limit: 200,
  });
  return (
    <>
      <ConsoleHead title="Audit log" sub="Append-only. IP addresses are stored as keyed hashes." />
      <form className="row mb-2">
        <select name="action" defaultValue={action ?? ""} className="select" style={{ maxWidth: 260, minHeight: 40 }}>
          <option value="">All actions</option>
          {["auth", "licence", "partner", "partnership", "retailer", "product", "rule", "risk", "commission", "conversion", "document", "user", "system"].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <button className="btn sm">Filter</button>
      </form>
      <div className="panel table-wrap">
        <table>
          <thead><tr><th>Time (UTC)</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="num nowrap muted">{r.createdAt.toISOString().replace("T", " ").slice(0, 19)}</td>
                <td>{r.actor?.email ?? "System"}</td>
                <td><span className="code">{r.action}</span></td>
                <td className="muted">{r.targetType}{r.targetId ? ` ${r.targetId.slice(0, 14)}` : ""}</td>
                <td className="xs muted" style={{ maxWidth: 340, wordBreak: "break-word" }}>{Object.keys(r.metadata).length ? JSON.stringify(r.metadata) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
