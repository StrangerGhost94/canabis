"use server";
import { and, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { fail, ok, UserFacingError, type ActionState } from "@/lib/actions/result";
import { audit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getSession, requireUser } from "@/lib/auth/session";
import { ageFrom, getPolicy } from "@/lib/compliance";
import { rateLimit } from "@/lib/rate-limit";

export async function markAllRead() {
  const u = await requireUser();
  await db.update(schema.notifications).set({ readAt: new Date() }).where(and(eq(schema.notifications.userId, u.id), isNull(schema.notifications.readAt)));
  revalidatePath("/account/notifications");
}

export async function updateProfile(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const u = await requireUser();
    const d = z.object({
      name: z.string().trim().min(2, "Enter your name.").max(80),
      region: z.string().length(2),
    }).parse(Object.fromEntries(form));
    const full = await db.query.users.findFirst({ where: eq(schema.users.id, u.id) });
    const policy = await getPolicy(d.region);
    if (ageFrom(full!.birthDate) < policy.legalAge) throw new UserFacingError(`The legal age in ${policy.name} is ${policy.legalAge}.`);
    await db.update(schema.users).set({ name: d.name, jurisdictionCode: d.region }).where(eq(schema.users.id, u.id));
    await audit({ actorId: u.id, action: "user.update_profile", targetType: "user", targetId: u.id, metadata: { region: d.region } });
    revalidatePath("/", "layout");
    return ok("Saved.");
  } catch (e) {
    return fail(e, form);
  }
}

export async function changePassword(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const u = await requireUser();
    await rateLimit(`pw:${u.id}`, 5, 900);
    const d = z.object({
      current: z.string().min(1, "Enter your current password."),
      next: z.string().min(12, "Use at least 12 characters.").max(200),
    }).parse(Object.fromEntries(form));
    const full = await db.query.users.findFirst({ where: eq(schema.users.id, u.id) });
    if (!(await verifyPassword(full!.passwordHash, d.current))) throw new z.ZodError([{ code: "custom", path: ["current"], message: "That isn't your current password." }]);
    await db.update(schema.users).set({ passwordHash: await hashPassword(d.next) }).where(eq(schema.users.id, u.id));
    // End every other session.
    const s = await getSession();
    await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, u.id), ne(schema.sessions.id, s!.sessionId)));
    await audit({ actorId: u.id, action: "user.change_password", targetType: "user", targetId: u.id });
    return ok("Password changed. Other devices have been signed out.");
  } catch (e) {
    return fail(e, form);
  }
}

export async function signOutEverywhere() {
  const u = await requireUser();
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, u.id));
  await audit({ actorId: u.id, action: "user.sign_out_all", targetType: "user", targetId: u.id });
  redirect("/sign-in");
}
