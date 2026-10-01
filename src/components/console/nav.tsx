"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { IconMenu, IconX } from "../icons";

export type NavGroup = { label?: string; items: { href: string; label: string; count?: number; exact?: boolean }[] };

export function ConsoleNav({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  return (
    <nav className="side-nav" aria-label="Sections">
      {groups.map((g, i) => (
        <div key={i} style={{ display: "contents" }}>
          {g.label && <p className="group">{g.label}</p>}
          {g.items.map((it) => {
            const active = it.exact ? path === it.href : path === it.href || path.startsWith(it.href + "/");
            return (
              <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}>
                {it.label}
                {!!it.count && <span className="count" aria-label={`${it.count} waiting`}>{it.count}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function MobileConsoleNav({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const path = usePathname();
  useEffect(() => { ref.current?.close(); }, [path]);
  return (
    <>
      <button className="btn ghost sm" onClick={() => ref.current?.showModal()} aria-label="Open menu"><IconMenu /></button>
      <dialog ref={ref} className="sheet console-drawer" aria-label="Menu">
        <div className="dialog-head"><span className="h4">Menu</span><button className="btn ghost sm" onClick={() => ref.current?.close()} aria-label="Close"><IconX /></button></div>
        <div className="dialog-body stack" style={{ ["--gap" as string]: "16px" }}>{children}</div>
      </dialog>
    </>
  );
}
