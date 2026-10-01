"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { fail, ok, UserFacingError, type ActionState } from "@/lib/actions/result";
import { audit } from "@/lib/audit";
import { requirePartner } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/session";
import { getPolicy } from "@/lib/compliance";
import { screenCopy } from "@/lib/compliance/copy-check";
import { shortCode } from "@/lib/crypto";
import { notify } from "@/lib/notify";
import { listedRetailers } from "@/lib/queries";
import { adminIds } from "@/lib/verification/sweep";

const Handle = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$/, "3–24 letters, numbers or hyphens.");

export async function applyPartner(_: ActionState, form: FormData): Promise<ActionState> {
  let done = false;
  try {
    const user = await requireUser("/partners/apply");
    if (await db.query.partners.findFirst({ where: eq(schema.partners.userId, user.id) })) throw new UserFacingError("You've already applied.");
    const d = z.object({
      handle: Handle,
      displayName: z.string().trim().min(2, "Enter the name you publish under.").max(60),
      bio: z.string().trim().min(20, "Write at least a sentence about what you cover.").max(400),
      audience: z.string().trim().min(20, "Describe your audience and how you keep it to adults.").max(600),
      channels: z.string().trim().min(3, "List where you publish.").max(200),
      conduct: z.literal("yes", { errorMap: () => ({ message: "You need to agree to the partner terms." }) }),
    }).parse(Object.fromEntries(form));
    const issue = screenCopy(d.bio);
    if (issue) throw new z.ZodError([{ code: "custom", path: ["bio"], message: issue.replace("Product copy", "Profile copy") }]);
    if (await db.query.partners.findFirst({ where: eq(schema.partners.handle, d.handle) })) throw new z.ZodError([{ code: "custom", path: ["handle"], message: "That handle is taken." }]);
    const [p] = await db.insert(schema.partners).values({
      userId: user.id, handle: d.handle, displayName: d.displayName, bio: d.bio, audience: d.audience,
      channels: d.channels.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 8),
      jurisdictionCode: user.jurisdictionCode, attestedAt: new Date(), status: "UNDER_REVIEW",
    }).returning();
    if (!user.roles.includes("PARTNER")) await db.update(schema.users).set({ roles: [...user.roles, "PARTNER"] }).where(eq(schema.users.id, user.id));
    await audit({ actorId: user.id, action: "partner.apply", targetType: "partner", targetId: p.id });
    await notify(await adminIds(), { title: `Partner application: ${d.displayName}`, body: `@${d.handle} in ${user.jurisdictionCode}.`, href: "/admin/verification?tab=partners" });
    done = true;
  } catch (e) {
    return fail(e, form);
  }
  if (done) redirect("/partner");
  return null;
}

export async function updatePartnerProfile(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { user, partner } = await requirePartner();
    const d = z.object({ displayName: z.string().trim().min(2).max(60), bio: z.string().trim().max(400) }).parse(Object.fromEntries(form));
    const issue = screenCopy(d.bio);
    if (issue) throw new z.ZodError([{ code: "custom", path: ["bio"], message: issue.replace("Product copy", "Profile copy") }]);
    await db.update(schema.partners).set(d).where(eq(schema.partners.id, partner.id));
    await audit({ actorId: user.id, action: "partner.update_profile", targetType: "partner", targetId: partner.id });
    revalidatePath("/partner/profile");
    return ok("Profile saved.");
  } catch (e) {
    return fail(e, form);
  }
}

async function requireActivePartner() {
  const ctx = await requirePartner();
  if (ctx.partner.status !== "VERIFIED") throw new UserFacingError("This is available once your partner account is verified.");
  return ctx;
}

export async function requestPartnership(form: FormData) {
  const { user, partner } = await requireActivePartner();
  const retailerId = z.string().parse(form.get("retailerId"));
  const policy = await getPolicy(partner.jurisdictionCode);
  if (!policy.allows("partner.referrals")) throw new UserFacingError(policy.offMessage("partner.referrals"));
  const r = (await listedRetailers(partner.jurisdictionCode)).find((x) => x.id === retailerId);
  if (!r) throw new UserFacingError("That store isn't listed in your province.");
  await db.insert(schema.partnerRetailers).values({ partnerId: partner.id, retailerId, status: "REQUESTED" })
    .onConflictDoUpdate({ target: [schema.partnerRetailers.partnerId, schema.partnerRetailers.retailerId], set: { status: "REQUESTED" } });
  await audit({ actorId: user.id, action: "partnership.request", targetType: "retailer", targetId: retailerId });
  const owners = await db.select({ u: schema.retailerMembers.userId }).from(schema.retailerMembers).where(eq(schema.retailerMembers.retailerId, retailerId));
  await notify(owners.map((o) => o.u), { title: `${partner.displayName} asked to partner with ${r.tradeName}`, body: "Review their profile before accepting.", href: "/retailer/partners" });
  revalidatePath("/partner/stores");
}

export async function createCampaign(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { user, partner } = await requireActivePartner();
    const d = z.object({
      name: z.string().trim().min(2, "Name the link after where you'll share it.").max(60),
      retailerId: z.string().min(1, "Choose a store."),
      productId: z.string().optional(),
    }).parse({ name: form.get("name"), retailerId: form.get("retailerId") ?? "", productId: form.get("productId") || undefined });
    const tie = await db.query.partnerRetailers.findFirst({ where: and(eq(schema.partnerRetailers.partnerId, partner.id), eq(schema.partnerRetailers.retailerId, d.retailerId), eq(schema.partnerRetailers.status, "ACTIVE")) });
    if (!tie) throw new UserFacingError("You can only create links for stores that have accepted your partnership.");
    if (d.productId) {
      const p = await db.query.products.findFirst({ where: and(eq(schema.products.id, d.productId), eq(schema.products.retailerId, d.retailerId)) });
      if (!p) throw new UserFacingError("That product isn't on this store's menu.");
    }
    const code = `${partner.handle.slice(0, 4)}-${shortCode(5)}`;
    await db.insert(schema.campaigns).values({ partnerId: partner.id, retailerId: d.retailerId, productId: d.productId ?? null, name: d.name, code });
    await audit({ actorId: user.id, action: "campaign.create", targetType: "campaign", targetId: code });
    revalidatePath("/partner/links");
    return ok(`Link created: /r/${code}`);
  } catch (e) {
    return fail(e, form);
  }
}

export async function setCampaignStatus(form: FormData) {
  const { user, partner } = await requirePartner();
  const d = z.object({ id: z.string(), status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]) }).parse(Object.fromEntries(form));
  await db.update(schema.campaigns).set({ status: d.status }).where(and(eq(schema.campaigns.id, d.id), eq(schema.campaigns.partnerId, partner.id)));
  await audit({ actorId: user.id, action: `campaign.${d.status.toLowerCase()}`, targetType: "campaign", targetId: d.id });
  revalidatePath("/partner/links");
}
