import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { DemoRibbon } from "../demo-ribbon";
import { ConsoleNav, MobileConsoleNav, type NavGroup } from "./nav";

/** One shell for every workspace, so stores, partners and admins share a vocabulary. */
export function ConsoleShell({ title, who, groups, children, switcher }: {
  title: string;
  who: { name: string; detail: React.ReactNode };
  groups: NavGroup[];
  children: React.ReactNode;
  switcher: { href: string; label: string }[];
}) {
  const side = (
    <>
      <Link href="/" className="brand"><span className="cairn" aria-hidden><i /><i /><i /></span>Cairn <span className="small muted" style={{ fontWeight: 500, fontStretch: "100%" }}>{title}</span></Link>
      <div className="console-who">
        <p className="strong small ellipsis">{who.name}</p>
        <div className="xs muted">{who.detail}</div>
      </div>
      <ConsoleNav groups={groups} />
      <div className="grow" />
      <div className="side-nav">
        {switcher.map((s) => <Link key={s.href} href={s.href}>{s.label}</Link>)}
        <Link href="/">Back to Cairn</Link>
        <form action={signOut}><button className="btn ghost sm" style={{ width: "100%", justifyContent: "flex-start", paddingLeft: 10 }}>Sign out</button></form>
      </div>
    </>
  );
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <DemoRibbon />
      <div className="console">
        <aside className="console-side" aria-label={`${title} navigation`}>{side}</aside>
        <div className="console-mtop">
          <Link href="/" className="brand" style={{ fontSize: "1.1rem" }}><span className="cairn" aria-hidden><i /><i /><i /></span>{title}</Link>
          <MobileConsoleNav>{side}</MobileConsoleNav>
        </div>
        <main id="main" className="console-main">{children}</main>
      </div>
    </>
  );
}

export function ConsoleHead({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="console-head">
      <div className="stack" style={{ ["--gap" as string]: "6px" }}>
        <h1 className="h1">{title}</h1>
        {sub && <p className="muted small" style={{ maxWidth: "70ch" }}>{sub}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}
