import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { audit } from "../audit";
import { notify } from "../notify";

/**
 * Daily job: expire lapsed licences and remind owners 30 and 7 days ahead.
 * Discovery already hides lapsed licences at read time; this records the
 * state change and tells people about it.
 */
export async function sweepLicences(actorId: string | null = null) {
  const today = new Date().toISOString().slice(0, 10);
  const lapsed = await db.update(schema.licences).set({ status: "EXPIRED" })
    .where(and(eq(schema.licences.status, "VERIFIED"), lt(schema.licences.expiresAt, today)))
    .returning();
  for (const l of lapsed) {
    await audit({ actorId, action: "licence.expire", targetType: "licence", targetId: l.id, metadata: { number: l.number } });
    await notify(await owners(l.retailerId), {
      title: "Your licence has expired and your listing is paused",
      body: `Licence ${l.number} expired on ${l.expiresAt}. Upload your renewal to restore the listing.`,
      href: "/retailer/compliance",
    });
  }
  let reminded = 0;
  for (const days of [30, 7]) {
    const target = new Date(Date.now() + days * 86400e3).toISOString().slice(0, 10);
    const soon = await db.query.licences.findMany({ where: and(eq(schema.licences.status, "VERIFIED"), eq(schema.licences.expiresAt, target)) });
    for (const l of soon) {
      reminded++;
      await notify(await owners(l.retailerId), {
        title: `Your licence expires in ${days} days`,
        body: `Upload the renewal for ${l.number} before ${l.expiresAt} to keep your listing live.`,
        href: "/retailer/compliance",
      });
    }
  }
  return { expired: lapsed.length, reminded };
}

async function owners(retailerId: string) {
  const m = await db.select({ u: schema.retailerMembers.userId }).from(schema.retailerMembers).where(eq(schema.retailerMembers.retailerId, retailerId));
  return m.map((x) => x.u);
}

export async function adminIds() {
  const rows = await db.select({ id: schema.users.id }).from(schema.users).where(sql`'ADMIN' = any(${schema.users.roles})`);
  return rows.map((r) => r.id);
}
