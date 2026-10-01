import { ConsoleShell } from "@/components/console/shell";
import { requirePartner } from "@/lib/auth/access";
import { getPolicy } from "@/lib/compliance";

const LABEL: Record<string, string> = { APPLIED: "Application received", UNDER_REVIEW: "Under review", VERIFIED: "Verified partner", SUSPENDED: "Suspended", REJECTED: "Not approved" };

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { user, partner } = await requirePartner();
  const policy = await getPolicy(partner.jurisdictionCode);
  return (
    <ConsoleShell
      title="Partner"
      who={{ name: `${partner.displayName}`, detail: <><span className={`status ${partner.status === "VERIFIED" ? "ok" : partner.status === "SUSPENDED" || partner.status === "REJECTED" ? "bad" : "warn"}`}>{LABEL[partner.status]}</span><br />@{partner.handle}, {policy.name}</> }}
      groups={[
        { items: [{ href: "/partner", label: "Overview", exact: true }] },
        { label: "Share", items: [{ href: "/partner/links", label: "Links and QR codes" }, { href: "/partner/stores", label: "Stores" }] },
        { label: "Results", items: [{ href: "/partner/earnings", label: "Earnings" }] },
        { label: "You", items: [{ href: "/partner/profile", label: "Profile" }, { href: "/partner/conduct", label: "Terms and rules" }] },
      ]}
      switcher={[
        ...(user.roles.includes("RETAILER") ? [{ href: "/retailer", label: "Store console" }] : []),
        ...(user.roles.includes("ADMIN") ? [{ href: "/admin", label: "Admin" }] : []),
        ...(partner.status === "VERIFIED" ? [{ href: `/p/${partner.handle}`, label: "View public profile" }] : []),
      ]}
    >
      {children}
    </ConsoleShell>
  );
}
