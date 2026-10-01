"use server";
import { z } from "zod";
import { db, schema } from "@/db";
import { fail, ok, type ActionState } from "@/lib/actions/result";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpHash } from "@/lib/request";

export async function reportConcern(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await rateLimit(`report:${await clientIpHash()}`, 5, 3600);
    const d = z.object({
      about: z.string().trim().min(2, "Tell us which store, partner or page this is about.").max(200),
      kind: z.enum(["licence", "conduct", "advertising", "minor", "other"]),
      details: z.string().trim().min(10, "Add a few details so a reviewer can follow up.").max(2000),
    }).parse(Object.fromEntries(form));
    const s = await getSession();
    const [flag] = await db.insert(schema.riskFlags).values({
      subjectType: "report", subjectId: d.about, reason: `Public report: ${d.kind}`,
      severity: d.kind === "minor" || d.kind === "licence" ? "HIGH" : "MEDIUM", details: { details: d.details, reporter: s?.user.id ?? "anonymous" },
    }).returning();
    await audit({ actorId: s?.user.id ?? null, action: "report.create", targetType: "risk_flag", targetId: flag.id });
    return ok("Thanks. A reviewer will look at this, usually within one business day.");
  } catch (e) {
    return fail(e, form);
  }
}
