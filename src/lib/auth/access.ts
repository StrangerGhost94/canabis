import "server-only";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { requireRole } from "./session";

/** The retailer the signed-in user operates, enforcing membership (RBAC + tenancy). */
export async function requireRetailer(next = "/retailer") {
  const user = await requireRole("RETAILER", next);
  const membership = await db.query.retailerMembers.findFirst({
    where: eq(schema.retailerMembers.userId, user.id),
    with: { retailer: true },
  });
  if (!membership) redirect("/retailer/onboarding");
  return { user, retailer: membership.retailer, memberRole: membership.role };
}

export async function requireRetailerOwner(next = "/retailer") {
  const ctx = await requireRetailer(next);
  if (ctx.memberRole !== "OWNER") throw new Error("Only the account owner can do this.");
  return ctx;
}

export async function requirePartner(next = "/partner") {
  const user = await requireRole("PARTNER", next);
  const partner = await db.query.partners.findFirst({ where: eq(schema.partners.userId, user.id) });
  if (!partner) redirect("/partners/apply");
  return { user, partner };
}

export async function assertOwnsProduct(retailerId: string, productId: string) {
  const p = await db.query.products.findFirst({
    where: and(eq(schema.products.id, productId), eq(schema.products.retailerId, retailerId)),
  });
  if (!p) throw new Error("Product not found.");
  return p;
}
