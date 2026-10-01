import { and, count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ConsoleShell } from "@/components/console/shell";
import { requireRetailer } from "@/lib/auth/access";
import { lastInventoryUpdates } from "@/lib/queries";
import { trustFor } from "@/lib/verification/trust";
import { CairnMark } from "@/components/cairn";

export default async function RetailerLayout({ children }: { children: React.ReactNode }) {
  const { user, retailer } = await requireRetailer();
  const licences = await db.query.licences.findMany({ where: eq(schema.licences.retailerId, retailer.id) });
  const trust = trustFor(retailer, licences, (await lastInventoryUpdates([retailer.id])).get(retailer.id));
  const [{ c: requests }] = await db.select({ c: count() }).from(schema.partnerRetailers).where(and(eq(schema.partnerRetailers.retailerId, retailer.id), eq(schema.partnerRetailers.status, "REQUESTED")));
  return (
    <ConsoleShell
      title="Store"
      who={{ name: retailer.tradeName, detail: <span className="row top" style={{ ["--gap" as string]: "8px", flexWrap: "nowrap", marginTop: 4 }}><span style={{ paddingTop: 3 }}><CairnMark trust={trust} size={12} label={false} /></span>{trust.headline}</span> }}
      groups={[
        { items: [{ href: "/retailer", label: "Overview", exact: true }] },
        { label: "Your listing", items: [
          { href: "/retailer/products", label: "Menu and stock" },
          { href: "/retailer/locations", label: "Locations and hours" },
          { href: "/retailer/settings", label: "Store profile" },
        ] },
        { label: "Referrals", items: [
          { href: "/retailer/partners", label: "Partners", count: requests },
          { href: "/retailer/referrals", label: "Purchases and API" },
        ] },
        { label: "Compliance", items: [{ href: "/retailer/compliance", label: "Licence and rules" }] },
      ]}
      switcher={[
        ...(user.roles.includes("PARTNER") ? [{ href: "/partner", label: "Partner console" }] : []),
        ...(user.roles.includes("ADMIN") ? [{ href: "/admin", label: "Admin" }] : []),
        { href: `/stores/${retailer.slug}`, label: "View public listing" },
      ]}
    >
      {children}
    </ConsoleShell>
  );
}
