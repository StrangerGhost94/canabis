"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getJurisdictions } from "@/lib/compliance";
import { isProd } from "@/lib/env";
import { resolvePlace } from "@/lib/geo";
import { AGE_COOKIE, NEAR_COOKIE, REGION_COOKIE } from "@/lib/visitor";
import { fail, UserFacingError, type ActionState } from "@/lib/actions/result";

const opts = { httpOnly: true, sameSite: "lax" as const, secure: isProd, path: "/", maxAge: 60 * 60 * 24 * 30 };

export async function confirmRegion(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { region, adult } = z.object({
      region: z.string().min(2, "Choose your province or territory."),
      adult: z.literal("yes", { errorMap: () => ({ message: "Confirm you meet the legal age to continue." }) }),
    }).parse({ region: form.get("region") ?? "", adult: form.get("adult") ?? "" });
    const codes = (await getJurisdictions()).map((j) => j.code);
    if (!codes.includes(region)) throw new UserFacingError("Choose your province or territory.");
    const jar = await cookies();
    jar.set(REGION_COOKIE, region, opts);
    jar.set(AGE_COOKIE, region, opts);
    if (jar.get(NEAR_COOKIE)) jar.delete(NEAR_COOKIE);
  } catch (e) {
    return fail(e, form);
  }
  redirect(String(form.get("next") || "/"));
}

export async function setNear(_: ActionState, form: FormData): Promise<ActionState> {
  const q = String(form.get("near") ?? "").slice(0, 40);
  const place = resolvePlace(q);
  const jar = await cookies();
  if (!place) return { error: "We couldn't find that area. Try a postal code like M6J 1G3, or a city name." };
  if (place.jur !== jar.get(REGION_COOKIE)?.value) {
    return { error: "That area is in a different province. Change your province first." };
  }
  jar.set(NEAR_COOKIE, place.key, opts);
  redirect(String(form.get("next") || "/shop"));
}

export async function clearNear() {
  (await cookies()).delete(NEAR_COOKIE);
  redirect("/shop");
}
