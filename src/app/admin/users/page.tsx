import { desc, ilike, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { setUserStatus } from "@/app/actions/admin";
import { ConsoleHead } from "@/components/console/shell";
import { requireRole } from "@/lib/auth/session";
import { relTime } from "@/lib/format";

export const metadata = { title: "Users" };

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireRole("ADMIN");
  const { q } = await searchParams;
  const like = q ? `%${q.replace(/[%_\\]/g, "")}%` : null;
  const us = await db.query.users.findMany({ where: like ? or(ilike(schema.users.email, like), ilike(schema.users.name, like)) : undefined, orderBy: desc(schema.users.createdAt), limit: 200, columns: { passwordHash: false, birthDate: false } });
  return (
    <>
      <ConsoleHead title="Users" sub="Dates of birth are never shown here. Suspending a user signs them out everywhere." />
      <form className="row mb-2"><input name="q" defaultValue={q} className="input" placeholder="Search name or email" style={{ maxWidth: 320, minHeight: 40 }} /><button className="btn sm">Search</button></form>
      <div className="panel table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Roles</th><th>Province</th><th>Joined</th><th>Status</th><th /></tr></thead>
          <tbody>
            {us.map((u) => (
              <tr key={u.id}>
                <td className="strong">{u.name}{u.isDemo && <span className="tag demo" style={{ marginLeft: 6 }}>Demo</span>}</td>
                <td>{u.email}</td>
                <td className="muted">{u.roles.map((r) => r.toLowerCase()).join(", ")}</td>
                <td>{u.jurisdictionCode}</td>
                <td className="muted nowrap">{relTime(u.createdAt)}</td>
                <td><span className={`status ${u.status === "ACTIVE" ? "ok" : "bad"}`}>{u.status === "ACTIVE" ? "Active" : "Suspended"}</span></td>
                <td>{u.id !== me.id && <form action={setUserStatus}><input type="hidden" name="id" value={u.id} /><button name="status" value={u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} className="linkbtn small">{u.status === "ACTIVE" ? "Suspend" : "Reactivate"}</button></form>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
