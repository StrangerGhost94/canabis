"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLinks({ links, className = "nav" }: { links: { href: string; label: ReactNode }[]; className?: string }) {
  const path = usePathname();
  return (
    <nav className={className} aria-label="Primary">
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={path === l.href || (l.href !== "/" && path.startsWith(l.href + "/")) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
