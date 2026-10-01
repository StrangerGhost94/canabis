import { and, eq, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { UserFacingError } from "@/lib/actions/result";
import { recordConversion } from "@/lib/conversions";
import { safeEqual, sha256 } from "@/lib/crypto";
import { rateLimit, RateLimitError } from "@/lib/rate-limit";

const Body = z.object({
  campaign_code: z.string().min(3).max(32),
  order_ref: z.string().min(1).max(64),
  order_total_cents: z.number().int().positive().max(10_000_000),
});

/**
 * POST /api/v1/conversions
 * Authorization: Bearer ck_xxxxxxxx.secret
 * Retailers report purchases that arrived through partner links.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")?.match(/^Bearer (ck_[a-z0-9]+)\.([\w-]+)$/i);
  if (!auth) return err(401, "missing_or_malformed_key");
  try { await rateLimit(`api:${auth[1]}`, 300, 60); } catch (e) { if (e instanceof RateLimitError) return err(429, "rate_limited", { retry_after: e.retryAfterSeconds }); throw e; }

  const key = await db.query.retailerApiKeys.findFirst({ where: and(eq(schema.retailerApiKeys.prefix, auth[1]), isNull(schema.retailerApiKeys.revokedAt)) });
  if (!key || !safeEqual(key.keyHash, sha256(auth[2]))) return err(401, "invalid_key");
  await db.update(schema.retailerApiKeys).set({ lastUsedAt: new Date() }).where(eq(schema.retailerApiKeys.id, key.id));

  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch { return err(400, "invalid_body", { expected: { campaign_code: "string", order_ref: "string", order_total_cents: "integer" } }); }

  try {
    const c = await recordConversion({ retailerId: key.retailerId, campaignCode: body.campaign_code, externalRef: body.order_ref, orderCents: body.order_total_cents, via: "api", actorId: null });
    return NextResponse.json({ id: c.id, status: c.status, commission_status: c.commissionStatus }, { status: 201 });
  } catch (e) {
    if (e instanceof UserFacingError) return err(422, "rejected", { message: e.message });
    console.error(e);
    return err(500, "internal_error");
  }
}

const err = (status: number, code: string, extra: Record<string, unknown> = {}) => NextResponse.json({ error: code, ...extra }, { status });
