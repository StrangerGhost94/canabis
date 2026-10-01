import { count, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { ConsoleShell } from "@/components/console/shell";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN", "/admin");
  const [[{ c: lic }], [{ c: par }], [{ c: risk }]] = await Promise.all([
    db.select({ c: count() }).from(schema.licences).where(eq(schema.licences.status, "PENDING")),
    db.select({ c: count() }).from(schema.partners).where(sql`${schema.partners.status} in ('APPLIED','UNDER_REVIEW')`),
    db.select({ c: count() }).from(schema.riskFlags).where(eq(schema.riskFlags.status, "OPEN")),
  ]);
  return (
    <ConsoleShell
      title="Admin"
      who={{ name: user.name, detail: "Platform administrator" }}
      groups={[
        { items: [{ href: "/admin", label: "Overview", exact: true }] },
        { label: "Review", items: [
          { href: "/admin/verification", label: "Verification queue", count: lic + par },
          { href: "/admin/risk", label: "Risk and reports", count: risk },
        ] },
        { label: "Ecosystem", items: [
          { href: "/admin/retailers", label: "Retailers" },
          { href: "/admin/partners", label: "Partners" },
          { href: "/admin/users", label: "Users" },
          { href: "/admin/products", label: "Products" },
          { href: "/admin/referrals", label: "Referrals and commissions" },
        ] },
        { label: "Governance", items: [
          { href: "/admin/rules", label: "Jurisdiction rules" },
          { href: "/admin/audit", label: "Audit log" },
          { href: "/admin/system", label: "System" },
        ] },
      ]}
      switcher={[]}
    >
      {children}
    </ConsoleShell>
  );
}
