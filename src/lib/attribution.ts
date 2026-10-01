import "server-only";
import { cookies } from "next/headers";
import { REF_COOKIE, VISITOR_COOKIE } from "./visitor";
import { pseudonymise } from "./crypto";

export type Attribution = { campaignId: string; partnerId: string; retailerId: string; at: number };

/** Last-touch attribution, 30 days, only for the retailer the link pointed to. */
export async function readAttribution(): Promise<Attribution | null> {
  const raw = (await cookies()).get(REF_COOKIE)?.value;
  if (!raw) return null;
  try {
    const a = JSON.parse(Buffer.from(raw, "base64url").toString()) as Attribution;
    if (Date.now() - a.at > 30 * 86400e3) return null;
    return a;
  } catch {
    return null;
  }
}

export const encodeAttribution = (a: Attribution) => Buffer.from(JSON.stringify(a)).toString("base64url");

export async function visitorHash() {
  const vid = (await cookies()).get(VISITOR_COOKIE)?.value ?? "anon";
  return pseudonymise(vid);
}
