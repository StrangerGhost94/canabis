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
import { geocode, provinceForPostal, resolvePlace } from "@/lib/geo";
import { notify } from "@/lib/notify";
import { deleteDocument, storeDocument } from "@/lib/uploads";
import { adminIds } from "@/lib/verification/sweep";

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
    const moved = d.region !== full!.jurisdictionCode;
    await db.update(schema.users).set({ name: d.name, jurisdictionCode: d.region, ...(moved ? { address: null } : {}) }).where(eq(schema.users.id, u.id));
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

/** Buyer ID verification: upload a government photo ID and a selfie for a person to review. */
export async function submitId(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const u = await requireUser("/account/verify");
    await rateLimit(`idv:${u.id}`, 5, 3600);
    if (u.idStatus === "VERIFIED") return ok("You're already verified.");
    const idFile = form.get("idDocument");
    const selfie = form.get("selfie");
    if (!(idFile instanceof File) || idFile.size === 0) throw new z.ZodError([{ code: "custom", path: ["idDocument"], message: "Add a photo of your government ID." }]);
    if (!(selfie instanceof File) || selfie.size === 0) throw new z.ZodError([{ code: "custom", path: ["selfie"], message: "Add a selfie so we can match you to the ID." }]);
    if (form.get("consent") !== "yes") throw new z.ZodError([{ code: "custom", path: ["consent"], message: "Confirm the ID is yours." }]);
    // Replace any earlier submission.
    const old = await db.query.documents.findMany({ where: eq(schema.documents.subjectUserId, u.id) });
    for (const d of old) await deleteDocument(d);
    await storeDocument(idFile, { uploadedById: u.id, subjectUserId: u.id });
    await storeDocument(selfie, { uploadedById: u.id, subjectUserId: u.id }, { imagesOnly: true });
    await db.update(schema.users).set({ idStatus: "PENDING", idSubmittedAt: new Date(), idReviewNotes: null }).where(eq(schema.users.id, u.id));
    await audit({ actorId: u.id, action: "buyer.id_submit", targetType: "user", targetId: u.id });
    await notify(await adminIds(), { title: "New buyer ID to review", body: `${u.name} submitted ID for verification.`, href: "/admin/verification#buyers" });
    revalidatePath("/", "layout");
  } catch (e) {
    return fail(e, form);
  }
  const next = String(form.get("next") || "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/account/verify");
}

/** Save (or change, after a move) where orders are delivered. Routing uses it right away. */
export async function saveAddress(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const u = await requireUser("/account/settings");
    const d = z.object({
      street: z.string().trim().min(3, "Enter the street address.").max(120),
      unit: z.string().trim().max(20).optional(),
      city: z.string().trim().min(2, "Enter the city.").max(60),
      postalCode: z.string().trim().toUpperCase().regex(/^[A-Z]\d[A-Z] ?\d[A-Z]\d$/, "Enter a postal code like M4M 2Y6."),
    }).parse(Object.fromEntries([...form.entries()].filter(([, v]) => v !== "")));
    const jur = provinceForPostal(d.postalCode);
    if (jur && jur !== u.jurisdictionCode) throw new UserFacingError("That postal code is in another province. Change your province below first — the legal age may be different there.");
    const g = await geocode(`${d.street}, ${d.city} ${d.postalCode}`) ?? await geocode(d.postalCode) ?? resolvePlace(d.city);
    if (!g) throw new UserFacingError("We couldn't find that address. Check the street and postal code.");
    await db.update(schema.users).set({ address: { ...d, lat: g.lat, lng: g.lng, label: `${d.street}, ${d.city}` } }).where(eq(schema.users.id, u.id));
    await audit({ actorId: u.id, action: "user.update_address", targetType: "user", targetId: u.id });
    revalidatePath("/", "layout");
    return ok("Address saved. New orders go to the nearest licensed store that delivers there.");
  } catch (e) {
    return fail(e, form);
  }
}
