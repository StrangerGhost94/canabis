import { NavLinks } from "@/components/nav-links";
import { requireUser } from "@/lib/auth/session";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/account");
  return (
    <div className="wrap section-account">
      <NavLinks className="nav account-tabs" links={[
        { href: "/account", label: "Overview" },
        { href: "/account/verify", label: "ID verification" },
        { href: "/account/saved", label: "Saved" },
        { href: "/account/notifications", label: "Notifications" },
        { href: "/account/settings", label: "Settings" },
      ]} />
      <div className="mt-4">{children}</div>
      <style>{`
        .section-account { padding-block: var(--s6) var(--s8); }
        .account-tabs { display: flex !important; overflow-x: auto; border-bottom: 1px solid var(--rule); gap: 4px; scrollbar-width: none; }
        .account-tabs a { white-space: nowrap; border-radius: 0; padding: 12px 12px; }
      `}</style>
    </div>
  );
}
