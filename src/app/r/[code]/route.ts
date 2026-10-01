import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { encodeAttribution, visitorHash } from "@/lib/attribution";
import { getPolicy } from "@/lib/compliance";
import { isProd } from "@/lib/env";
import { listedRetailers } from "@/lib/queries";
import { rateLimit, RateLimitError } from "@/lib/rate-limit";
import { clientIpHash } from "@/lib/request";
import { scoreVisit } from "@/lib/risk";
import { REF_COOKIE } from "@/lib/visitor";

/**
 * Partner referral links. Attribution is only recorded when the partner is
 * verified, the partnership is active, the store is listed, and the store's
 * jurisdiction allows partner referrals. Otherwise the link still works — it
 * just lands on Cairn with no attribution.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const c = await db.query.campaigns.findFirst({
    where: eq(schema.campaigns.code, code.slice(0, 32)),
    with: { partner: true, retailer: true },
  });
  if (!c) return NextResponse.redirect(new URL("/discover", req.url));
  const dest = new URL(c.productId ? `/products/${c.productId}` : `/stores/${c.retailer.slug}`, req.url);

  const policy = await getPolicy(c.retailer.jurisdictionCode);
  const partnership = await db.query.partnerRetailers.findFirst({
    where: (pr, { and, eq }) => and(eq(pr.partnerId, c.partnerId), eq(pr.retailerId, c.retailerId)),
  });
  const listed = (await listedRetailers(c.retailer.jurisdictionCode)).some((r) => r.id === c.retailerId);
  const eligible = c.status === "ACTIVE" && c.partner.status === "VERIFIED" && partnership?.status === "ACTIVE"
    && listed && policy.allows("partner.referrals");
  if (!eligible) return NextResponse.redirect(dest);

  const ipHash = await clientIpHash();
  try { await rateLimit(`ref:${ipHash}`, 120, 3600); } catch (e) { if (e instanceof RateLimitError) return NextResponse.redirect(dest); throw e; }
  const vh = await visitorHash();
  const riskScore = await scoreVisit({ ipHash, partnerId: c.partnerId, visitorHash: vh });
  await db.insert(schema.referralEvents).values({
    type: "VISIT", campaignId: c.id, partnerId: c.partnerId, retailerId: c.retailerId, productId: c.productId,
    visitorHash: vh, ipHash, jurisdictionCode: c.retailer.jurisdictionCode, riskScore,
  });

  const res = NextResponse.redirect(dest);
  res.cookies.set(REF_COOKIE, encodeAttribution({ campaignId: c.id, partnerId: c.partnerId, retailerId: c.retailerId, at: Date.now() }), {
    httpOnly: true, sameSite: "lax", secure: isProd, path: "/", maxAge: 30 * 86400,
  });
  return res;
}
