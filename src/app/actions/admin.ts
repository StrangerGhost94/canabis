"use server";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { fail, ok, UserFacingError, type ActionState } from "@/lib/actions/result";
import { audit } from "@/lib/audit";
import { destroyAllSessions, requireRole } from "@/lib/auth/session";
import { RULE_KEYS } from "@/lib/compliance/rules";
import { notify } from "@/lib/notify";
import { sweepLicences } from "@/lib/verification/sweep";
import { ageFrom, getPolicy } from "@/lib/compliance";
import { deleteDocument } from "@/lib/uploads";

const admin = () => requireRole("ADMIN", "/admin");

async function retailerOwners(retailerId: string) {
  return (await db.select({ u: schema.retailerMembers.userId }).from(schema.retailerMembers).where(eq(schema.retailerMembers.retailerId, retailerId))).map((r) => r.u);
}

// ─── Licence review ─────────────────────────────────────────────────────────

export async function reviewLicence(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const me = await admin();
    const d = z.object({
      licenceId: z.string(),
      decision: z.enum(["VERIFIED", "REJECTED"]),
      method: z.enum(["MANUAL_REGISTRY_CHECK"]),
      sourceReference: z.string().trim().max(300).optional(),
      notes: z.string().trim().max(1000).optional(),
    }).parse(Object.fromEntries([...form.entries()].filter(([, v]) => v !== "")));
    const lic = await db.query.licences.findFirst({ where: eq(schema.licences.id, d.licenceId), with: { retailer: true } });
    if (!lic || lic.status !== "PENDING") throw new UserFacingError("This licence isn't waiting for review.");

    let sourceReference = d.sourceReference ?? null;
    if (d.decision === "VERIFIED") {
      if (!sourceReference || sourceReference.length < 8) {
        throw new z.ZodError([{ code: "custom", path: ["sourceReference"], message: "Record where you confirmed it: the registry URL or record ID." }]);
      }
    } else if (!d.notes) {
      throw new z.ZodError([{ code: "custom", path: ["notes"], message: "Tell the store why, so they can fix it." }]);
    }

    await db.update(schema.licences).set({
      status: d.decision, method: d.decision === "VERIFIED" ? d.method : null, sourceReference,
      reviewNotes: d.notes ?? null, verifiedAt: d.decision === "VERIFIED" ? new Date() : null, verifiedById: me.id,
    }).where(eq(schema.licences.id, lic.id));
    if (d.decision === "VERIFIED") {
      // Supersede older licences for the same store.
      await db.update(schema.licences).set({ status: "EXPIRED" }).where(and(eq(schema.licences.retailerId, lic.retailerId), eq(schema.licences.status, "VERIFIED"), ne(schema.licences.id, lic.id)));
      if (lic.retailer.status === "PENDING_REVIEW" || lic.retailer.status === "DRAFT") {
        await db.update(schema.retailers).set({ status: "VERIFIED" }).where(eq(schema.retailers.id, lic.retailerId));
      }
      await db.update(schema.locations).set({ active: true }).where(eq(schema.locations.retailerId, lic.retailerId));
    }
    await audit({ actorId: me.id, action: `licence.${d.decision === "VERIFIED" ? "verify" : "reject"}`, targetType: "licence", targetId: lic.id, metadata: { method: d.method, sourceReference, notes: d.notes } });
    await notify(await retailerOwners(lic.retailerId), d.decision === "VERIFIED"
      ? { title: "Your licence was verified", body: `${lic.number} is on record. Your listing is live.`, href: "/retailer" }
      : { title: "Your licence couldn't be verified", body: d.notes!, href: "/retailer/compliance" });
    revalidatePath("/admin", "layout");
    return ok(d.decision === "VERIFIED" ? "Licence verified. The store is now listed." : "Licence rejected. The store has been told why.");
  } catch (e) {
    return fail(e, form);
  }
}

// ─── Partner review ─────────────────────────────────────────────────────────

export async function reviewPartner(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const me = await admin();
    const d = z.object({ partnerId: z.string(), decision: z.enum(["VERIFIED", "REJECTED"]), notes: z.string().trim().max(1000).optional() })
      .parse(Object.fromEntries([...form.entries()].filter(([, v]) => v !== "")));
    if (d.decision === "REJECTED" && !d.notes) throw new z.ZodError([{ code: "custom", path: ["notes"], message: "Give the applicant a reason." }]);
    const p = await db.query.partners.findFirst({ where: eq(schema.partners.id, d.partnerId) });
    if (!p) throw new UserFacingError("Partner not found.");
    await db.update(schema.partners).set({ status: d.decision, reviewNotes: d.notes ?? null, verifiedAt: d.decision === "VERIFIED" ? new Date() : null }).where(eq(schema.partners.id, p.id));
    await audit({ actorId: me.id, action: `partner.${d.decision === "VERIFIED" ? "verify" : "reject"}`, targetType: "partner", targetId: p.id, metadata: { notes: d.notes } });
    await notify([p.userId], d.decision === "VERIFIED"
      ? { title: "You're a verified Cairn partner", body: "Request partnerships with stores to start sharing links.", href: "/partner/stores" }
      : { title: "Your partner application wasn't approved", body: d.notes!, href: "/partner" });
    revalidatePath("/admin", "layout");
    return ok("Decision recorded.");
  } catch (e) {
    return fail(e, form);
  }
}

// ─── Enforcement ────────────────────────────────────────────────────────────

const Reason = z.string().trim().min(5, "Give a reason; it's recorded in the audit log.").max(500);

export async function setRetailerStatus(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const me = await admin();
    const d = z.object({ id: z.string(), status: z.enum(["VERIFIED", "SUSPENDED"]), reason: Reason }).parse(Object.fromEntries(form));
    await db.update(schema.retailers).set({ status: d.status }).where(eq(schema.retailers.id, d.id));
    await audit({ actorId: me.id, action: d.status === "SUSPENDED" ? "retailer.suspend" : "retailer.reinstate", targetType: "retailer", targetId: d.id, metadata: { reason: d.reason } });
    await notify(await retailerOwners(d.id), { title: d.status === "SUSPENDED" ? "Your listing has been suspended" : "Your listing has been reinstated", body: d.reason, href: "/retailer" });
    revalidatePath("/admin", "layout");
    return ok("Saved.");
  } catch (e) {
    return fail(e, form);
  }
}

export async function setPartnerStatus(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const me = await admin();
    const d = z.object({ id: z.string(), status: z.enum(["VERIFIED", "SUSPENDED"]), reason: Reason }).parse(Object.fromEntries(form));
    const p = await db.query.partners.findFirst({ where: eq(schema.partners.id, d.id) });
    await db.update(schema.partners).set({ status: d.status, reviewNotes: d.reason }).where(eq(schema.partners.id, d.id));
    if (d.status === "SUSPENDED") await db.update(schema.campaigns).set({ status: "PAUSED" }).where(and(eq(schema.campaigns.partnerId, d.id), eq(schema.campaigns.status, "ACTIVE")));
    await audit({ actorId: me.id, action: d.status === "SUSPENDED" ? "partner.suspend" : "partner.reinstate", targetType: "partner", targetId: d.id, metadata: { reason: d.reason } });
    if (p) await notify([p.userId], { title: d.status === "SUSPENDED" ? "Your partner account is suspended" : "Your partner account is reinstated", body: d.reason, href: "/partner" });
    revalidatePath("/admin", "layout");
    return ok("Saved.");
  } catch (e) {
    return fail(e, form);
  }
}

export async function setUserStatus(form: FormData) {
  const me = await admin();
  const d = z.object({ id: z.string(), status: z.enum(["ACTIVE", "SUSPENDED"]) }).parse(Object.fromEntries(form));
  if (d.id === me.id) throw new UserFacingError("You can't suspend your own account.");
  await db.update(schema.users).set({ status: d.status }).where(eq(schema.users.id, d.id));
  if (d.status === "SUSPENDED") await destroyAllSessions(d.id);
  await audit({ actorId: me.id, action: `user.${d.status.toLowerCase()}`, targetType: "user", targetId: d.id });
  revalidatePath("/admin/users");
}

export async function activateLocation(form: FormData) {
  const me = await admin();
  const id = z.string().parse(form.get("id"));
  await db.update(schema.locations).set({ active: true }).where(eq(schema.locations.id, id));
  await audit({ actorId: me.id, action: "location.activate", targetType: "location", targetId: id });
  revalidatePath("/admin/retailers");
}

export async function setProductStatus(form: FormData) {
  const me = await admin();
  const d = z.object({ id: z.string(), status: z.enum(["ACTIVE", "FLAGGED"]) }).parse(Object.fromEntries(form));
  const p = await db.query.products.findFirst({ where: eq(schema.products.id, d.id) });
  await db.update(schema.products).set({ status: d.status }).where(eq(schema.products.id, d.id));
  await audit({ actorId: me.id, action: d.status === "FLAGGED" ? "product.flag" : "product.restore", targetType: "product", targetId: d.id });
  if (p && d.status === "FLAGGED") await notify(await retailerOwners(p.retailerId), { title: `${p.name} is held for review`, body: "It's hidden from customers until the review is complete.", href: "/retailer/products" });
  revalidatePath("/admin/products");
}

export async function setCommissionStatus(form: FormData) {
  const me = await admin();
  const d = z.object({ id: z.string(), status: z.enum(["APPROVED", "WITHHELD", "PAID"]) }).parse(Object.fromEntries(form));
  const c = await db.query.conversions.findFirst({ where: eq(schema.conversions.id, d.id) });
  if (!c || c.commissionStatus === "NOT_APPLICABLE") throw new UserFacingError("This purchase has no commission.");
  await db.update(schema.conversions).set({ commissionStatus: d.status, status: d.status === "WITHHELD" ? "DISPUTED" : "CONFIRMED" }).where(eq(schema.conversions.id, d.id));
  await audit({ actorId: me.id, action: `commission.${d.status.toLowerCase()}`, targetType: "conversion", targetId: d.id });
  revalidatePath("/admin/referrals");
}

export async function resolveRisk(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const me = await admin();
    const d = z.object({ id: z.string(), status: z.enum(["DISMISSED", "ACTIONED"]), resolution: z.string().trim().min(5, "Record what you decided and why.").max(1000) }).parse(Object.fromEntries(form));
    await db.update(schema.riskFlags).set({ status: d.status, resolution: d.resolution, resolvedById: me.id, resolvedAt: new Date() }).where(eq(schema.riskFlags.id, d.id));
    await audit({ actorId: me.id, action: `risk.${d.status.toLowerCase()}`, targetType: "risk_flag", targetId: d.id, metadata: { resolution: d.resolution } });
    revalidatePath("/admin", "layout");
    return ok("Resolved.");
  } catch (e) {
    return fail(e, form);
  }
}

// ─── Jurisdiction rules ─────────────────────────────────────────────────────

export async function updateRule(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const me = await admin();
    const d = z.object({
      code: z.string().length(2),
      key: z.enum(RULE_KEYS as [string, ...string[]]),
      status: z.enum(["ALLOWED", "PROHIBITED", "UNCONFIRMED"]),
      source: z.string().trim().max(500).optional(),
      notes: z.string().trim().max(1000).optional(),
      confirm: z.string().optional(),
    }).parse(Object.fromEntries([...form.entries()].filter(([, v]) => v !== "")));
    if (d.status !== "UNCONFIRMED" && (!d.source || d.source.length < 10)) {
      throw new z.ZodError([{ code: "custom", path: ["source"], message: "Cite the statute, regulation or legal opinion this rests on." }]);
    }
    if (d.status === "ALLOWED" && d.confirm !== "yes") {
      throw new z.ZodError([{ code: "custom", path: ["confirm"], message: "Confirm this has been reviewed for this jurisdiction." }]);
    }
    const before = await db.query.jurisdictionRules.findFirst({ where: and(eq(schema.jurisdictionRules.jurisdictionCode, d.code), eq(schema.jurisdictionRules.key, d.key)) });
    await db.insert(schema.jurisdictionRules).values({ jurisdictionCode: d.code, key: d.key, status: d.status, source: d.source ?? null, notes: d.notes ?? null, isDemo: false, reviewedById: me.id, reviewedAt: new Date() })
      .onConflictDoUpdate({ target: [schema.jurisdictionRules.jurisdictionCode, schema.jurisdictionRules.key], set: { status: d.status, source: d.source ?? null, notes: d.notes ?? null, isDemo: false, reviewedById: me.id, reviewedAt: new Date() } });
    await audit({ actorId: me.id, action: "rule.update", targetType: "jurisdiction_rule", targetId: `${d.code}:${d.key}`, metadata: { from: before?.status ?? "UNCONFIRMED", to: d.status, source: d.source } });
    revalidatePath("/", "layout");
    return ok(`${d.code} ${d.key} set to ${d.status.toLowerCase()}.`);
  } catch (e) {
    return fail(e, form);
  }
}

export async function runLicenceSweep(_: ActionState): Promise<ActionState> {
  const me = await admin();
  const r = await sweepLicences(me.id);
  await audit({ actorId: me.id, action: "system.licence_sweep", targetType: "system", metadata: r });
  revalidatePath("/admin", "layout");
  return ok(`Checked licences: ${r.expired} expired, ${r.reminded} reminders sent.`);
}

// ─── Buyer ID review ────────────────────────────────────────────────────────

export async function reviewBuyer(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const me = await admin();
    const d = z.object({
      userId: z.string(),
      decision: z.enum(["VERIFIED", "REJECTED"]),
      notes: z.string().trim().max(500).optional(),
      matches: z.string().optional(),
    }).parse(Object.fromEntries([...form.entries()].filter(([, v]) => v !== "")));
    const u = await db.query.users.findFirst({ where: eq(schema.users.id, d.userId) });
    if (!u || u.idStatus !== "PENDING") throw new UserFacingError("This buyer isn't waiting for review.");
    if (d.decision === "VERIFIED") {
      if (d.matches !== "yes") throw new z.ZodError([{ code: "custom", path: ["matches"], message: "Confirm the ID matches and shows legal age." }]);
      const policy = await getPolicy(u.jurisdictionCode);
      if (ageFrom(u.birthDate) < policy.legalAge) throw new UserFacingError(`The account's date of birth is under ${policy.legalAge}, the legal age in ${policy.name}.`);
    } else if (!d.notes) {
      throw new z.ZodError([{ code: "custom", path: ["notes"], message: "Tell the buyer what to fix." }]);
    }
    await db.update(schema.users).set({ idStatus: d.decision, idReviewedAt: new Date(), idReviewedById: me.id, idReviewNotes: d.notes ?? null }).where(eq(schema.users.id, u.id));
    // Privacy: the images are only needed for the decision.
    const docs = await db.query.documents.findMany({ where: eq(schema.documents.subjectUserId, u.id) });
    for (const doc of docs) await deleteDocument(doc);
    await audit({ actorId: me.id, action: `buyer.id_${d.decision.toLowerCase()}`, targetType: "user", targetId: u.id, metadata: { notes: d.notes } });
    await notify([u.id], d.decision === "VERIFIED"
      ? { title: "You're verified", body: "Your ID checked out. You can now order anywhere Cairn delivers.", href: "/shop" }
      : { title: "We couldn't verify your ID", body: d.notes ?? "", href: "/account/verify" });
    revalidatePath("/admin/verification");
    return ok(d.decision === "VERIFIED" ? "Buyer verified. ID images deleted." : "Buyer notified. ID images deleted.");
  } catch (e) {
    return fail(e, form);
  }
}
