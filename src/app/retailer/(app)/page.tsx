import { and, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { confirmStock } from "@/app/actions/retailer";
import { DailyBars } from "@/components/console/chart";
import { ConsoleHead } from "@/components/console/shell";
import { daily, pct } from "@/lib/analytics";
import { requireRetailer } from "@/lib/auth/access";
import { getPolicy } from "@/lib/compliance";
import { money, n } from "@/lib/format";
import { lastInventoryUpdates } from "@/lib/queries";
import { fmtDate, trustFor } from "@/lib/verification/trust";

export const metadata = { title: "Store overview" };

export default async function RetailerHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { retailer } = await requireRetailer();
  const { welcome } = await searchParams;
  const licences = await db.query.licences.findMany({ where: eq(schema.licences.retailerId, retailer.id) });
  const updated = (await lastInventoryUpdates([retailer.id])).get(retailer.id);
  const trust = trustFor(retailer, licences, updated);
  const policy = await getPolicy(retailer.jurisdictionCode);
  const a = await daily({ retailerId: retailer.id }, 30);
  const allTraffic = await daily({ retailerId: retailer.id }, 30, false);
  const stock = await db.execute<{ status: string; c: number }>(sql`select i.status, count(*)::int c from inventory i join locations l on l.id = i.location_id where l.retailer_id = ${retailer.id} group by 1`);
  const out = stock.rows.find((r) => r.status === "OUT")?.c ?? 0;
  const requests = await db.query.partnerRetailers.findMany({ where: and(eq(schema.partnerRetailers.retailerId, retailer.id), eq(schema.partnerRetailers.status, "REQUESTED")), with: { partner: true } });
  const since = new Date(Date.now() - 30 * 86400e3);
  const ord = await db.execute<{ open: number; placed: number; done: number; sales: number }>(sql`select
      count(*) filter (where status in ('PLACED','ACCEPTED','READY','OUT_FOR_DELIVERY'))::int open,
      count(*) filter (where status = 'PLACED')::int placed,
      count(*) filter (where status = 'COMPLETED' and created_at >= ${since})::int done,
      coalesce(sum(total_cents) filter (where status = 'COMPLETED' and created_at >= ${since}), 0)::int sales
    from orders where retailer_id = ${retailer.id}`);
  const os = ord.rows[0];
  const daysLeft = trust.licence ? Math.ceil((new Date(trust.licence.expiresAt).getTime() - Date.now()) / 86400e3) : null;

  const todos = [
    os.placed > 0 && { tone: "signal", t: `${os.placed} new ${os.placed === 1 ? "order" : "orders"} waiting to be accepted`, d: "Customers are waiting to hear back.", href: "/retailer/orders", cta: "Open orders" },
    !retailer.acceptsOrders && trust.listed && { tone: "", t: "You're not taking orders on Cairn", d: "Customers can see your menu but can't order.", href: "/retailer/settings", cta: "Turn on ordering" },
    !trust.listed && trust.state === "pending" && { tone: "warn", t: "Your listing is waiting on licence review", d: "Cairn reviews every licence against the provincial registry. You'll be notified when it's done.", href: "/retailer/compliance", cta: "View licence" },
    trust.state === "expired" && { tone: "bad", t: "Your licence has expired — listing paused", d: "Upload your renewed licence to restore your listing.", href: "/retailer/compliance", cta: "Upload renewal" },
    daysLeft != null && daysLeft > 0 && daysLeft <= 60 && { tone: "warn", t: `Licence expires in ${daysLeft} days`, d: `On ${fmtDate(trust.licence!.expiresAt)}. Submit the renewal early so your listing doesn't pause.`, href: "/retailer/compliance", cta: "Submit renewal" },
    !trust.stones[2].ok && { tone: "warn", t: "Your menu is marked as possibly out of date", d: "Update stock, or confirm it's still accurate.", href: "/retailer/products", cta: "Update stock" },
    requests.length > 0 && { tone: "signal", t: `${requests.length} partner ${requests.length === 1 ? "request" : "requests"} waiting`, d: requests.map((r) => r.partner.displayName).join(", "), href: "/retailer/partners", cta: "Review" },
    out > 0 && { tone: "", t: `${out} product-location ${out === 1 ? "slot is" : "slots are"} out of stock`, d: "Customers see these as unavailable.", href: "/retailer/products", cta: "Review menu" },
  ].filter(Boolean) as { tone: string; t: string; d: string; href: string; cta: string }[];

  return (
    <>
      <ConsoleHead
        title={retailer.tradeName}
        sub={<>{trust.headline}. {policy.name}, licensed by {policy.regulator}.</>}
        actions={trust.listed ? <form action={confirmStock}><button className="btn sm">Confirm menu is current</button></form> : undefined}
      />
      {welcome && <p className="flash mb-3">Your store is set up and your licence is in the review queue.</p>}

      {todos.length > 0 && (
        <section className="stack mb-3" style={{ ["--gap" as string]: "8px" }} aria-label="Needs attention">
          {todos.map((t) => (
            <div key={t.t} className={`callout ${t.tone} row between`}>
              <div className="grow"><p className="strong">{t.t}</p><p className="small muted">{t.d}</p></div>
              <Link href={t.href} className="btn sm">{t.cta}</Link>
            </div>
          ))}
        </section>
      )}

      <dl className="metrics">
        <div className="metric"><dt>Open orders</dt><dd>{n(os.open)}</dd><p className="delta"><Link href="/retailer/orders">Order board</Link></p></div>
        <div className="metric"><dt>Completed orders</dt><dd>{n(os.done)}</dd><p className="delta">Last 30 days</p></div>
        <div className="metric"><dt>Sales through Cairn</dt><dd>{money(os.sales)}</dd><p className="delta">Collected by you, last 30 days</p></div>
        <div className="metric"><dt>Visits from partners</dt><dd>{n(a.totals.visits)}</dd><p className="delta">{pct(a.totals.purchases, a.totals.visits)} went on to buy</p></div>
      </dl>

      <section className="panel panel-pad mt-3">
        <div className="row between mb-2"><h2 className="h4">Partner referrals, last 30 days</h2><Link href="/retailer/partners" className="small">Partners</Link></div>
        <DailyBars label="Partner referrals" days={a.days} series={[{ name: "Visits", values: a.visits }, { name: "Purchases", values: a.purchases, alt: true }]} />
      </section>
    </>
  );
}
