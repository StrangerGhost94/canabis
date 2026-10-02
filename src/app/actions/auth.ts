"use server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSession } from "@/lib/auth/session";
import { ageFrom, getPolicy } from "@/lib/compliance";
import { fail, UserFacingError, type ActionState } from "@/lib/actions/result";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpHash } from "@/lib/request";

const safeNext = (n: FormDataEntryValue | null) => {
  const s = String(n ?? "/");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

const Email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(200);

export async function signIn(_: ActionState, form: FormData): Promise<ActionState> {
  let dest = "/";
  try {
    const ip = await clientIpHash();
    await rateLimit(`signin:ip:${ip}`, 20, 15 * 60);
    const { email, password } = z.object({
      email: Email,
      password: z.string().min(1, "Enter your password.").max(200),
    }).parse({ email: form.get("email"), password: form.get("password") });
    await rateLimit(`signin:acct:${email}`, 8, 15 * 60);

    const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
    const valid = user ? await verifyPassword(user.passwordHash, password) : await verifyAgainstDummy(password);
    if (!user || !valid) throw new UserFacingError("That email and password don't match an account.");
    if (user.status !== "ACTIVE") throw new UserFacingError("This account is suspended. Contact support to find out why.");

    await createSession(user.id);
    await audit({ actorId: user.id, action: "auth.sign_in", targetType: "user", targetId: user.id });
    dest = safeNext(form.get("next"));
    if (dest === "/") {
      dest = user.roles.includes("ADMIN") ? "/admin" : user.roles.includes("RETAILER") ? "/retailer" : user.roles.includes("PARTNER") ? "/partner" : "/";
    }
  } catch (e) {
    return fail(e, form);
  }
  redirect(dest);
}

const SignUp = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: Email,
  password: z.string().min(12, "Use at least 12 characters.").max(200),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth."),
  region: z.string().length(2, "Choose your province or territory."),
  intent: z.enum(["CUSTOMER", "RETAILER", "PARTNER"]).default("CUSTOMER"),
  terms: z.literal("yes", { errorMap: () => ({ message: "Accept the terms to create an account." }) }),
});

export async function signUp(_: ActionState, form: FormData): Promise<ActionState> {
  let dest = "/";
  try {
    await rateLimit(`signup:${await clientIpHash()}`, 5, 60 * 60);
    const d = SignUp.parse(Object.fromEntries(form));
    const policy = await getPolicy(d.region).catch(() => { throw new UserFacingError("Choose your province or territory."); });
    const age = ageFrom(d.birthDate);
    if (age > 120 || age < 0) throw new z.ZodError([{ code: "custom", path: ["birthDate"], message: "Check your date of birth." }]);
    if (age < policy.legalAge) {
      throw new UserFacingError(`You need to be ${policy.legalAge} or older to use Cairn in ${policy.name}.`);
    }
    const exists = await db.query.users.findFirst({ where: eq(schema.users.email, d.email), columns: { id: true } });
    if (exists) throw new z.ZodError([{ code: "custom", path: ["email"], message: "An account with this email already exists. Sign in instead." }]);

    const roles: ("CUSTOMER" | "RETAILER" | "PARTNER" | "ADMIN")[] = ["CUSTOMER"];
    if (d.intent !== "CUSTOMER") roles.push(d.intent);
    // The platform owner becomes admin by signing up with the address in ADMIN_EMAIL,
    // so no admin password ever has to live in deployment settings.
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.trim().toLowerCase() === d.email) roles.push("ADMIN");
    const [user] = await db.insert(schema.users).values({
      name: d.name, email: d.email, passwordHash: await hashPassword(d.password), birthDate: d.birthDate,
      jurisdictionCode: d.region, roles,
    }).returning({ id: schema.users.id });
    await createSession(user.id);
    await audit({ actorId: user.id, action: "auth.sign_up", targetType: "user", targetId: user.id, metadata: { intent: d.intent, admin: roles.includes("ADMIN") } });
    dest = d.intent === "RETAILER" ? "/retailer/onboarding" : d.intent === "PARTNER" ? "/partners/apply" : `/account/verify?next=${encodeURIComponent(safeNext(form.get("next")))}`;
  } catch (e) {
    return fail(e, form);
  }
  redirect(dest);
}

export async function signOut() {
  const s = await getSession();
  if (s) await audit({ actorId: s.user.id, action: "auth.sign_out", targetType: "user", targetId: s.user.id });
  await destroySession();
  redirect("/");
}
