import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { UserFacingError } from "./actions/result";
import { audit } from "./audit";
import { getPolicy } from "./compliance";

/**
 * Record a purchase the retailer says came through a partner link.
 * Commission is computed only where compensation is ALLOWED for the store's
 * jurisdiction and the partnership is active with an agreed rate.
 */
export async function recordConversion(i: {
  retailerId: string; campaignCode: string; externalRef: string; orderCents: number; via: "api" | "console"; actorId: string | null;
}) {
  const c = await db.query.campaigns.findFirst({ where: and(eq(schema.campaigns.code, i.campaignCode), eq(schema.campaigns.retailerId, i.retailerId)) });
  if (!c) throw new UserFacingError("No partner link with that code points to your store.");
  const tie = await db.query.partnerRetailers.findFirst({ where: and(eq(schema.partnerRetailers.partnerId, c.partnerId), eq(schema.partnerRetailers.retailerId, i.retailerId)) });
  const retailer = await db.query.retailers.findFirst({ where: eq(schema.retailers.id, i.retailerId) });
  const policy = await getPolicy(retailer!.jurisdictionCode);
  const paid = policy.allows("partner.compensation") && tie?.status === "ACTIVE" && !!tie.commissionBps;
  const existing = await db.query.conversions.findFirst({ where: and(eq(schema.conversions.retailerId, i.retailerId), eq(schema.conversions.externalRef, i.externalRef)) });
  if (existing) throw new UserFacingError("That order reference has already been reported.");
  const [conv] = await db.insert(schema.conversions).values({
    retailerId: i.retailerId, campaignId: c.id, partnerId: c.partnerId, externalRef: i.externalRef, orderCents: i.orderCents,
    reportedVia: i.via, commissionCents: paid ? Math.round((i.orderCents * tie!.commissionBps!) / 10000) : null,
    commissionStatus: paid ? "PENDING" : "NOT_APPLICABLE",
  }).returning();
  await audit({ actorId: i.actorId, action: "conversion.report", targetType: "conversion", targetId: conv.id, metadata: { via: i.via, campaign: c.code } });
  return conv;
}
