import Link from "next/link";
import { count, and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { getJurisdictions } from "@/lib/compliance";
import { getVisitor } from "@/lib/visitor";
import { IconBell } from "./icons";
import { ChangeRegionButton, RegionGate } from "./region-gate";
import { NavLinks } from "./nav-links";
import { DemoRibbon } from "./demo-ribbon";

export async function SiteHeader({ path }: { path: string }) {
  const v = await getVisitor();
  const jurisdictions = (await getJurisdictions()).map(({ code, name, legalAge }) => ({ code, name, legalAge }));
  const unread = v.user
    ? (await db.select({ c: count() }).from(schema.notifications).where(and(eq(schema.notifications.userId, v.user.id), isNull(schema.notifications.readAt))))[0].c
    : 0;
  const console = v.user?.roles.includes("ADMIN") ? { href: "/admin", label: "Admin" }
    : v.user?.roles.includes("RETAILER") ? { href: "/retailer", label: "Store console" }
    : v.user?.roles.includes("PARTNER") ? { href: "/partner", label: "Partner console" } : null;

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <DemoRibbon />
      <header className="topbar">
        <div className="wrap topbar-inner">
          <Link href="/" className="brand" aria-label="Cairn home">
            <span className="cairn" aria-hidden><i /><i /><i /></span>
            Cairn
          </Link>
          <NavLinks
            links={[
              { href: "/discover", label: "Discover" },
              { href: "/how-it-works", label: "How verification works" },
              { href: "/partners", label: "Partners" },
              { href: "/for-stores", label: "For stores" },
            ]}
          />
          <div className="grow" />
          {v.policy && (
            v.user
              ? <Link href="/account/settings" className="region-pill" title="Your account's province">{v.policy.name}, {v.policy.legalAge}+</Link>
              : <ChangeRegionButton label={`${v.policy.name}, ${v.policy.legalAge}+`} />
          )}
          {v.user ? (
            <div className="row" style={{ ["--gap" as string]: "4px" }}>
              {console && <Link href={console.href} className="btn ghost sm hide-sm">{console.label}</Link>}
              <Link href="/account/notifications" className="btn ghost sm" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} style={{ position: "relative" }}>
                <IconBell />
                {unread > 0 && <span aria-hidden style={{ position: "absolute", top: 6, right: 8, width: 8, height: 8, borderRadius: 9, background: "var(--accent)" }} />}
              </Link>
              <Link href="/account" className="btn sm hide-sm">{v.user.name.split(" ")[0]}</Link>
            </div>
          ) : (
            <Link href={`/sign-in?next=${encodeURIComponent(path)}`} className="btn sm hide-sm">Sign in</Link>
          )}
        </div>
      </header>
      {(!v.ageOk || !v.region) && !v.user && !path.startsWith("/sign-") && <RegionGate jurisdictions={jurisdictions} current={v.region} next={path} />}
      {v.ageOk && !v.user && <RegionGate jurisdictions={jurisdictions} current={v.region} next={path} dismissible open={false} />}
    </>
  );
}
