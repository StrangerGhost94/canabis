import { NextResponse, type NextRequest } from "next/server";
import { safeEqual } from "@/lib/crypto";
import { sweepLicences } from "@/lib/verification/sweep";

/** Call daily from your scheduler with header `x-cron-secret: $CRON_SECRET`. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("x-cron-secret") ?? "";
  if (!secret || !safeEqual(secret, given)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await sweepLicences());
}
