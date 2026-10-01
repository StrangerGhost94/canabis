"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";

type L = { href: string; label: ReactNode };

function Inner({ links, className }: { links: L[]; className: string }) {
  const path = usePathname();
  const sp = useSearchParams();
  const here = path + (sp.get("category") ? `?category=${sp.get("category")}` : "");
  const isCurrent = (href: string) => (href.includes("?") ? here === href : href === "/" ? path === "/" : here === href || (path.startsWith(href + "/") ));
  return (
    <nav className={className} aria-label="Primary">
      {links.map((l) => <Link key={l.href} href={l.href} aria-current={isCurrent(l.href) ? "page" : undefined}>{l.label}</Link>)}
    </nav>
  );
}

export function NavLinks({ links, className = "nav" }: { links: L[]; className?: string }) {
  return <Suspense fallback={<nav className={className} />}><Inner links={links} className={className} /></Suspense>;
}
