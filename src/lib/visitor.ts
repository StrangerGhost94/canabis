import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getPolicy, getJurisdictions } from "./compliance";
import { getSession } from "./auth/session";
import { resolvePlace } from "./geo";

export const REGION_COOKIE = "cairn_region";
export const AGE_COOKIE = "cairn_age";
export const NEAR_COOKIE = "cairn_near";
export const REF_COOKIE = "cairn_ref";
export const VISITOR_COOKIE = "cairn_vid";

/**
 * Who is looking, from where. Signed-in users use their account's province;
 * visitors choose one at the gate. Everything downstream reads policy from here.
 */
export const getVisitor = cache(async () => {
  const jar = await cookies();
  const session = await getSession();
  const codes = new Set((await getJurisdictions()).map((j) => j.code));
  const cookieRegion = jar.get(REGION_COOKIE)?.value;
  const region = session?.user.jurisdictionCode ?? (cookieRegion && codes.has(cookieRegion) ? cookieRegion : null);
  const policy = region ? await getPolicy(region) : null;
  const ageOk = !!session || (!!region && jar.get(AGE_COOKIE)?.value === region);
  const nearKey = jar.get(NEAR_COOKIE)?.value;
  const near = nearKey ? resolvePlace(nearKey) : null;
  return { user: session?.user ?? null, region, policy, ageOk, near: near && near.jur === region ? near : null };
});
