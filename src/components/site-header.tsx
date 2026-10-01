import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { cartCount } from "@/lib/cart";
import { allowedCategories, getJurisdictions } from "@/lib/compliance";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/format";
import { getVisitor } from "@/lib/visitor";
import { DemoRibbon } from "./demo-ribbon";
import { IconBag, IconBell, IconSearch } from "./icons";
import { NavLinks } from "./nav-links";
import { ChangeRegionButton, RegionGate } from "./region-gate";

export async function SiteHeader({ path }: { path: string }) {
  const v = await getVisitor();
  const jurisdictions = (await getJurisdictions()).map(({ code, name, legalAge }) => ({ code, name, legalAge }));
  const unread = v.user
    ? (await db.select({ c: count() }).from(schema.notifications).where(and(eq(schema.notifications.userId, v.user.id), isNull(schema.notifications.readAt))))[0].c
    : 0;
  const items = await cartCount();
  const cats = v.policy ? allowedCategories(v.policy, CATEGORIES).filter((c) => c !== "ACCESSORY") : [];
  const workspace = v.user?.roles.includes("ADMIN") ? { href: "/admin", label: "Admin" }
    : v.user?.roles.includes("RETAILER") ? { href: "/retailer", label: "Store console" }
    : v.user?.roles.includes("PARTNER") ? { href: "/partner", label: "Partner console" } : null;

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <DemoRibbon />
      <div className="utility">
        <div className="wrap">
          <span className="seal-txt"><span className="seal-dot" aria-hidden /><span>Licensed stores only<span className="hide-sm">. Every licence checked before it's listed.</span></span></span>
          <span className="grow" />
          {v.policy && (v.user
            ? <Link href="/account/settings" title="Your account's province">{v.policy.name}, {v.policy.legalAge}+</Link>
            : <ChangeRegionButton label={`${v.policy.name}, ${v.policy.legalAge}+`} className="" />)}
          <Link href="/for-stores" className="hide-sm">Sell on Cairn</Link>
          {workspace && <Link href={workspace.href} className="hide-sm">{workspace.label}</Link>}
          {v.user ? <Link href="/account" className="hide-sm">{v.user.name.split(" ")[0]}</Link> : <Link href={`/sign-in?next=${encodeURIComponent(path)}`} className="hide-sm">Sign in</Link>}
        </div>
      </div>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <Link href="/" className="brand" aria-label="Cairn home"><span className="cairn" aria-hidden><i /><i /><i /></span>Cairn</Link>
          <form action="/shop" role="search" className="top-search hide-sm">
            <IconSearch aria-hidden />
            <label htmlFor="top-q" className="sr-only">Search products, brands and stores</label>
            <input id="top-q" name="q" placeholder="Search products, brands and stores" autoComplete="off" />
          </form>
          <div className="grow show-sm" />
          <div className="row top-actions" style={{ ["--gap" as string]: "6px", flexWrap: "nowrap" }}>
            {v.user && (
              <>
                <Link href="/orders" className="btn ghost sm hide-sm">Orders</Link>
                <Link href="/account/saved" className="btn ghost sm hide-sm">Saved</Link>
                <Link href="/account/notifications" className="btn ghost sm icon-btn hide-sm" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
                  <IconBell />{unread > 0 && <span className="dot" aria-hidden />}
                </Link>
              </>
            )}
            <Link href="/cart" className="cart-btn" aria-label={`Cart, ${items} ${items === 1 ? "item" : "items"}`}>
              <IconBag />{items > 0 && <span className="cart-count num">{items}</span>}
            </Link>
          </div>
        </div>
        {cats.length > 0 && (
          <div className="wrap cat-row hide-sm">
            <NavLinks className="nav cats" links={[
              { href: "/shop", label: "Shop all" },
              ...cats.map((c) => ({ href: `/shop?category=${c}`, label: CATEGORY_LABEL[c] })),
              { href: "/brands", label: "Brands" },
              { href: "/stores", label: "Stores" },
            ]} />
          </div>
        )}
      </header>
      {(!v.ageOk || !v.region) && !v.user && !path.startsWith("/sign-") && <RegionGate jurisdictions={jurisdictions} current={v.region} next={path} />}
      {v.ageOk && !v.user && !path.startsWith("/sign-") && <RegionGate jurisdictions={jurisdictions} current={v.region} next={path} dismissible open={false} />}
    </>
  );
}
