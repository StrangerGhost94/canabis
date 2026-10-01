import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { signOut } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth/session";
import { getPolicy } from "@/lib/compliance";

export const metadata = { title: "Your account" };

export default async function Account({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const u = await requireUser("/account");
  const { denied } = await searchParams;
  const policy = await getPolicy(u.jurisdictionCode);
  const [{ c: saved }] = await db.select({ c: count() }).from(schema.favourites).where(eq(schema.favourites.userId, u.id));
  const consoles = [
    u.roles.includes("RETAILER") && { href: "/retailer", t: "Store console", d: "Menu, locations, licence and partners." },
    u.roles.includes("PARTNER") && { href: "/partner", t: "Partner console", d: "Links, campaigns and results." },
    u.roles.includes("ADMIN") && { href: "/admin", t: "Admin", d: "Reviews, rules, risk and audit." },
  ].filter(Boolean) as { href: string; t: string; d: string }[];

  return (
    <div className="stack" style={{ ["--gap" as string]: "28px", maxWidth: 760 }}>
      {denied && <p className="callout warn small">You don't have access to that area. If you think you should, contact your store's account owner or Cairn support.</p>}
      <div>
        <h1 className="h1">{u.name}</h1>
        <p className="muted">{u.email}, {policy.name}</p>
      </div>
      <dl className="metrics">
        <div className="metric"><dt>Orders</dt><dd><Link href="/orders">View</Link></dd><p className="delta">Track and review your orders</p></div>
        <div className="metric"><dt>Saved</dt><dd>{saved}</dd><p className="delta"><Link href="/account/saved">View saved</Link></p></div>
        <div className="metric"><dt>Legal age in {policy.name}</dt><dd>{policy.legalAge}+</dd><p className="delta">Confirmed from your date of birth</p></div>
      </dl>
      {consoles.length > 0 && (
        <div>
          <h2 className="h3 mb-2">Your workspaces</h2>
          <ul className="list ruled">
            {consoles.map((c) => <li key={c.href}><Link className="list-link" href={c.href} style={{ padding: "14px 4px" }}><span className="strong">{c.t}</span><br /><span className="small muted">{c.d}</span></Link></li>)}
          </ul>
        </div>
      )}
      {!u.roles.includes("PARTNER") && !u.roles.includes("RETAILER") && (
        <p className="small muted">Run a licensed store, or want to recommend stores? <Link href="/for-stores">List your store</Link> or <Link href="/partners">become a partner</Link>.</p>
      )}
      <form action={signOut}><button className="btn">Sign out</button></form>
    </div>
  );
}
