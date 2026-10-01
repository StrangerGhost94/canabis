import "server-only";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, schema } from "@/db";
import { isProd } from "../env";
import { randomToken, sha256 } from "../crypto";
import { clientIpHash, userAgent } from "../request";

export const SESSION_COOKIE = isProd ? "__Host-cairn_session" : "cairn_session";
const TTL_DAYS = 30;
const REFRESH_AFTER_MS = 24 * 3600 * 1000;

export type Role = "CUSTOMER" | "RETAILER" | "PARTNER" | "ADMIN";

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86400 * 1000);
  await db.insert(schema.sessions).values({
    userId,
    tokenHash: sha256(token),
    expiresAt,
    ipHash: await clientIpHash(),
    userAgent: await userAgent(),
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Resolve the signed-in user once per request. */
export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await db.query.sessions.findFirst({
    where: and(eq(schema.sessions.tokenHash, sha256(token)), gt(schema.sessions.expiresAt, new Date())),
    with: { user: { columns: { passwordHash: false } } },
  });
  if (!row || row.user.status !== "ACTIVE") return null;
  if (Date.now() - row.lastSeenAt.getTime() > REFRESH_AFTER_MS) {
    await db.update(schema.sessions).set({ lastSeenAt: new Date() }).where(eq(schema.sessions.id, row.id));
  }
  return { sessionId: row.id, user: row.user };
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSession>>>["user"];

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

export async function purgeExpiredSessions() {
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
}

export async function requireUser(next = "/") {
  const s = await getSession();
  if (!s) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return s.user;
}

export const hasRole = (user: { roles: Role[] } | null | undefined, role: Role) =>
  !!user?.roles.includes(role);

/** Gate a page or action on a role. Admins are not implicitly granted other roles. */
export async function requireRole(role: Role, next = "/") {
  const user = await requireUser(next);
  if (!hasRole(user, role)) redirect("/account?denied=1");
  return user;
}
