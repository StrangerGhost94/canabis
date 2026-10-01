"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCompass, IconHeart, IconSearch, IconUser } from "./icons";

/** Mobile-only primary navigation, thumb-reachable, safe-area aware. */
export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/", label: "Home", icon: IconCompass, match: (p: string) => p === "/" },
    { href: "/discover", label: "Discover", icon: IconSearch, match: (p: string) => p.startsWith("/discover") || p.startsWith("/stores") || p.startsWith("/products") },
    { href: "/account/saved", label: "Saved", icon: IconHeart, match: (p: string) => p.startsWith("/account/saved") },
    { href: signedIn ? "/account" : "/sign-in", label: signedIn ? "Account" : "Sign in", icon: IconUser, match: (p: string) => (p.startsWith("/account") && !p.startsWith("/account/saved")) || p.startsWith("/sign-") },
  ];
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map(({ href, label, icon: Icon, match }) => (
        <Link key={href} href={href} aria-current={match(path) ? "page" : undefined}>
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}
