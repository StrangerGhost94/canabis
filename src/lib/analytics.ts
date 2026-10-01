import "server-only";
import { and, eq, gte, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { lastNDays } from "@/components/console/chart";

type Scope = { partnerId?: string; retailerId?: string; campaignId?: string };

function where(table: typeof schema.referralEvents | typeof schema.conversions, s: Scope, since: Date) {
  const c: SQL[] = [gte(table.createdAt, since)];
  if (s.partnerId) c.push(eq(table.partnerId, s.partnerId));
  if (s.retailerId) c.push(eq(table.retailerId, s.retailerId));
  if (s.campaignId) c.push(eq(table.campaignId, s.campaignId));
  return and(...c);
}

/** Daily visits, hand-offs and store-confirmed purchases. */
export async function daily(scope: Scope, n = 30, attributedOnly = true) {
  const days = lastNDays(n);
  const since = new Date(days[0] + "T00:00:00Z");
  const ev = await db
    .select({ d: sql<string>`to_char(${schema.referralEvents.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`, type: schema.referralEvents.type, c: sql<number>`count(*)::int` })
    .from(schema.referralEvents)
    .where(and(where(schema.referralEvents, scope, since), attributedOnly ? sql`${schema.referralEvents.partnerId} is not null` : undefined, sql`${schema.referralEvents.riskScore} < 50`))
    .groupBy(sql`1`, schema.referralEvents.type);
  const conv = await db
    .select({ d: sql<string>`to_char(${schema.conversions.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`, c: sql<number>`count(*)::int`, cents: sql<number>`coalesce(sum(${schema.conversions.orderCents}),0)::int`, comm: sql<number>`coalesce(sum(${schema.conversions.commissionCents}),0)::int` })
    .from(schema.conversions)
    .where(and(where(schema.conversions, scope, since), sql`${schema.conversions.status} in ('REPORTED','CONFIRMED')`))
    .groupBy(sql`1`);
  const pick = (type: string) => days.map((d) => ev.find((e) => e.d === d && e.type === type)?.c ?? 0);
  const visits = pick("VISIT"), handoffs = pick("HANDOFF");
  const purchases = days.map((d) => conv.find((c) => c.d === d)?.c ?? 0);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  return {
    days, visits, handoffs, purchases,
    totals: {
      visits: sum(visits), handoffs: sum(handoffs), purchases: sum(purchases),
      orderCents: conv.reduce((a, c) => a + c.cents, 0), commissionCents: conv.reduce((a, c) => a + c.comm, 0),
    },
  };
}

export const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
