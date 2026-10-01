import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { readAttribution, visitorHash } from "@/lib/attribution";
import { getPolicy } from "@/lib/compliance";
import { rateLimit, RateLimitError } from "@/lib/rate-limit";
import { clientIpHash } from "@/lib/request";
import { listedRetailers } from "@/lib/queries";

/**
 * Hand-off to a retailer's own ordering page. Logged so retailers and partners
 * can see what Cairn referred — Cairn never sees the order itself.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ retailerId: string }> }) {
  const { retailerId } = await params;
  const productId = req.nextUrl.searchParams.get("product");
  const retailer = await db.query.retailers.findFirst({ where: eq(schema.retailers.id, retailerId) });
  const back = new URL(retailer ? `/stores/${retailer.slug}` : "/discover", req.url);
  if (!retailer?.orderingUrl) return NextResponse.redirect(back);

  const policy = await getPolicy(retailer.jurisdictionCode);
  const listed = (await listedRetailers(retailer.jurisdictionCode)).some((r) => r.id === retailer.id);
  if (!listed || !policy.allows("retail.onlineHandoff")) return NextResponse.redirect(back);

  const ipHash = await clientIpHash();
  try { await rateLimit(`go:${ipHash}`, 60, 60); } catch (e) { if (e instanceof RateLimitError) return NextResponse.redirect(back); throw e; }

  const a = await readAttribution();
  const attributed = a && a.retailerId === retailer.id;
  await db.insert(schema.referralEvents).values({
    type: "HANDOFF", retailerId: retailer.id, productId: productId || null, visitorHash: await visitorHash(), ipHash,
    jurisdictionCode: retailer.jurisdictionCode,
    campaignId: attributed ? a.campaignId : null, partnerId: attributed ? a.partnerId : null,
  });

  const dest = new URL(retailer.orderingUrl);
  dest.searchParams.set("utm_source", "cairn");
  return NextResponse.redirect(dest, 303);
}
