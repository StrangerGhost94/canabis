import "server-only";
import { and, count, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Lightweight referral-fraud heuristics. Scores are explainable on purpose:
 * every flag shows reviewers exactly which rule fired.
 */
export async function scoreVisit(ev: { ipHash: string; partnerId: string; visitorHash: string }) {
  const hourAgo = new Date(Date.now() - 3600e3);
  const [{ c: fromIp }] = await db
    .select({ c: count() })
    .from(schema.referralEvents)
    .where(and(eq(schema.referralEvents.ipHash, ev.ipHash), eq(schema.referralEvents.partnerId, ev.partnerId), gt(schema.referralEvents.createdAt, hourAgo)));
  const [{ c: sameVisitor }] = await db
    .select({ c: count() })
    .from(schema.referralEvents)
    .where(and(eq(schema.referralEvents.visitorHash, ev.visitorHash), gt(schema.referralEvents.createdAt, hourAgo)));

  const reasons: string[] = [];
  let score = 0;
  if (fromIp > 20) { score += 50; reasons.push(`${fromIp} visits from one network in an hour`); }
  if (sameVisitor > 5) { score += 30; reasons.push(`Same browser followed ${sameVisitor} links in an hour`); }

  if (score >= 50) {
    const existing = await db.query.riskFlags.findFirst({
      where: and(eq(schema.riskFlags.subjectId, ev.partnerId), eq(schema.riskFlags.status, "OPEN"), eq(schema.riskFlags.reason, "Unusual referral traffic")),
    });
    if (!existing) {
      await db.insert(schema.riskFlags).values({
        subjectType: "partner", subjectId: ev.partnerId, reason: "Unusual referral traffic",
        severity: score >= 80 ? "HIGH" : "MEDIUM", details: { reasons },
      });
    }
  }
  return score;
}
