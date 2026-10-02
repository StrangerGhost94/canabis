"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBag, IconHome, IconReceipt, IconSearch, IconUser } from "./icons";

/** Mobile primary navigation: thumb-reachable, safe-area aware, cart always one tap away. */
export function BottomNav({ signedIn, cartItems }: { signedIn: boolean; cartItems: number }) {
  const path = usePathname();
  const items = [
    { href: "/", label: "Home", icon: IconHome, match: (p: string) => p === "/" },
    { href: "/shop", label: "Shop", icon: IconSearch, match: (p: string) => p.startsWith("/shop") || p.startsWith("/stores") || p.startsWith("/products") },
    { href: "/cart", label: "Cart", icon: IconBag, match: (p: string) => p.startsWith("/cart") || p.startsWith("/checkout"), badge: cartItems },
    { href: "/orders", label: "Orders", icon: IconReceipt, match: (p: string) => p.startsWith("/orders") },
    { href: "/account", label: "Account", icon: IconUser, match: (p: string) => p.startsWith("/account") },
  ];
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map(({ href, label, icon: Icon, match, badge }) => (
        <Link key={href} href={href} aria-current={match(path) ? "page" : undefined} aria-label={badge ? `${label}, ${badge} items` : undefined}>
          <Icon />
          {!!badge && <span className="bn-badge num" aria-hidden>{badge}</span>}
          {label}
        </Link>
      ))}
    </nav>
  );
}
