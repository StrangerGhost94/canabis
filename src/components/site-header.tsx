import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { cartCount } from "@/lib/cart";
import { allowedCategories, getJurisdictions } from "@/lib/compliance";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/format";
import { getVisitor } from "@/lib/visitor";
import { IconBag, IconBell, IconPin, IconReceipt, IconSearch, IconUser } from "./icons";
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

  const firstName = v.user?.name.split(" ")[0];

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div className="utility">
        <div className="wrap">
          <span className="promise"><span>Licensed stores only</span><span>Compare prices across stores</span><span>Pay the store at pickup or delivery</span></span>
          <span className="grow" />
          {v.policy && <span className="show-sm">{v.user ? <Link href="/account/settings">{v.policy.name} · {v.policy.legalAge}+</Link> : <ChangeRegionButton className="" label={`${v.policy.name} · ${v.policy.legalAge}+`} />}</span>}
          <Link href="/guide" className="hide-sm">New to cannabis?</Link>
          <Link href="/for-stores" className="hide-sm">Sell on Cairn</Link>
          {workspace && <Link href={workspace.href}>{workspace.label}</Link>}
        </div>
      </div>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <Link href="/" className="brand" aria-label="Cairn home"><span className="cairn" aria-hidden><i /><i /><i /></span>Cairn</Link>
          <form action="/shop" role="search" className="top-search hide-sm">
            <IconSearch aria-hidden />
            <label htmlFor="top-q" className="sr-only">Search products, brands and stores</label>
            <input id="top-q" name="q" placeholder="Search flower, pre-rolls, brands, stores…" autoComplete="off" />
            <button className="btn primary sm">Search</button>
          </form>
          {v.policy && (v.user
            ? <Link href="/account/settings" className="loc-pill hide-sm" title="Change your province"><IconPin width={18} height={18} aria-hidden /><span><small>Shopping in</small><b>{v.near ? v.near.label : v.policy.name}</b></span></Link>
            : <ChangeRegionButton className="loc-pill hide-sm" label={<><IconPin width={18} height={18} aria-hidden /><span><small>Shopping in · {v.policy.legalAge}+</small><b>{v.near ? v.near.label : v.policy.name}</b></span></>} />)}
          <div className="row top-actions" style={{ ["--gap" as string]: "4px", flexWrap: "nowrap" }}>
            {v.user ? (
              <>
                <Link href="/orders" className="top-link hide-sm"><IconReceipt width={18} height={18} aria-hidden />Orders</Link>
                <Link href="/account/notifications" className="top-link hide-sm" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
                  <IconBell width={18} height={18} />{unread > 0 && <span className="dot" aria-hidden />}
                </Link>
                <Link href="/account" className="top-link hide-sm"><IconUser width={18} height={18} aria-hidden />{firstName}</Link>
              </>
            ) : (
              <Link href={`/sign-in?next=${encodeURIComponent(path)}`} className="top-link hide-sm"><IconUser width={18} height={18} aria-hidden />Sign in</Link>
            )}
            <Link href="/cart" className="cart-btn" aria-label={`Cart, ${items} ${items === 1 ? "item" : "items"}`}>
              <IconBag width={18} height={18} aria-hidden /><span className="lbl">Cart</span>{items > 0 && <span className="cart-count num">{items}</span>}
            </Link>
          </div>
        </div>
        {cats.length > 0 && (
          <div className="cat-row hide-sm">
            <div className="wrap">
              <NavLinks className="nav cats" links={[
                { href: "/shop", label: "Shop all" },
                ...cats.map((c) => ({ href: `/shop?category=${c}`, label: CATEGORY_LABEL[c] })),
                { href: "/brands", label: "Brands" },
                { href: "/stores", label: "Stores" },
                { href: "/guide", label: "Guide" },
              ]} />
            </div>
          </div>
        )}
      </header>
      {(!v.ageOk || !v.region) && !v.user && !path.startsWith("/sign-") && <RegionGate jurisdictions={jurisdictions} current={v.region} next={path} />}
      {v.ageOk && !v.user && !path.startsWith("/sign-") && <RegionGate jurisdictions={jurisdictions} current={v.region} next={path} dismissible open={false} />}
    </>
  );
}
