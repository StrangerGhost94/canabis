"use server";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { fail, ok, UserFacingError, type ActionState } from "@/lib/actions/result";
import { audit } from "@/lib/audit";
import { requireRetailer, requireRetailerOwner, assertOwnsProduct } from "@/lib/auth/access";
import { requireRole } from "@/lib/auth/session";
import { getPolicy } from "@/lib/compliance";
import { screenCopy } from "@/lib/compliance/copy-check";
import { randomToken, sha256, shortCode } from "@/lib/crypto";
import { resolvePlace } from "@/lib/geo";
import { notify } from "@/lib/notify";
import { storeDocument } from "@/lib/uploads";
import { adminIds } from "@/lib/verification/sweep";

const CENTROIDS: Record<string, [number, number]> = {
  AB: [53.93, -116.58], BC: [53.73, -127.65], MB: [53.76, -98.81], NB: [46.56, -66.46], NL: [53.14, -57.66],
  NS: [44.68, -63.74], NT: [64.83, -124.84], NU: [70.3, -83.11], ON: [51.25, -85.32], PE: [46.51, -63.42],
  QC: [52.94, -73.55], SK: [52.94, -106.45], YT: [64.28, -135.0],
};

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").slice(0, 40);
const url = z.string().trim().url("Enter a full URL, starting with https://").max(300).refine((u) => u.startsWith("https://"), "Use an https:// address.");
const optionalUrl = z.union([z.literal(""), url]).transform((v) => v || null);
const Postal = z.string().trim().toUpperCase().regex(/^[A-Z]\d[A-Z] ?\d[A-Z]\d$/, "Enter a Canadian postal code, like M6J 1G3.");
const Hours = z.object({ open: z.string().regex(/^\d{2}:\d{2}$/), close: z.string().regex(/^\d{2}:\d{2}$/) });

// ─── Onboarding ─────────────────────────────────────────────────────────────

export async function createStore(_: ActionState, form: FormData): Promise<ActionState> {
  let done = false;
  try {
    const user = await requireRole("RETAILER", "/retailer/onboarding");
    const already = await db.query.retailerMembers.findFirst({ where: eq(schema.retailerMembers.userId, user.id) });
    if (already) throw new UserFacingError("Your account already manages a store.");
    const d = z.object({
      tradeName: z.string().trim().min(2, "Enter the name customers know you by.").max(60),
      legalName: z.string().trim().min(2, "Enter the licensed legal entity.").max(120),
      about: z.string().trim().max(400).optional(),
      locName: z.string().trim().min(2, "Name this location, e.g. its neighbourhood.").max(40),
      street: z.string().trim().min(3, "Enter the street address.").max(120),
      city: z.string().trim().min(2, "Enter the city.").max(60),
      postalCode: Postal,
      open: z.string().regex(/^\d{2}:\d{2}$/, "Opening time"),
      close: z.string().regex(/^\d{2}:\d{2}$/, "Closing time"),
      licenceNumber: z.string().trim().min(3, "Enter your licence number.").max(40),
      expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the expiry date."),
      attest: z.literal("yes", { errorMap: () => ({ message: "Confirm the licence details are accurate." }) }),
    }).parse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
    if (d.expiresAt <= new Date().toISOString().slice(0, 10)) throw new z.ZodError([{ code: "custom", path: ["expiresAt"], message: "This licence has already expired." }]);
    const about = d.about || null;
    const copyIssue = screenCopy(about);
    if (copyIssue) throw new z.ZodError([{ code: "custom", path: ["about"], message: copyIssue }]);
    const file = form.get("document");
    if (!(file instanceof File) || file.size === 0) throw new z.ZodError([{ code: "custom", path: ["document"], message: "Attach a copy of your licence." }]);

    const place = resolvePlace(d.postalCode);
    const [lat, lng] = place && place.jur === user.jurisdictionCode ? [place.lat, place.lng] : CENTROIDS[user.jurisdictionCode];
    let slug = slugify(d.tradeName) || "store";
    if (await db.query.retailers.findFirst({ where: eq(schema.retailers.slug, slug) })) slug = `${slug}-${shortCode(4)}`;

    const retailerId = await db.transaction(async (tx) => {
      const [r] = await tx.insert(schema.retailers).values({
        slug, tradeName: d.tradeName, legalName: d.legalName, jurisdictionCode: user.jurisdictionCode, about, status: "PENDING_REVIEW",
      }).returning();
      await tx.insert(schema.retailerMembers).values({ userId: user.id, retailerId: r.id, role: "OWNER" });
      const [loc] = await tx.insert(schema.locations).values({
        retailerId: r.id, name: d.locName, street: d.street, city: d.city, postalCode: d.postalCode, jurisdictionCode: user.jurisdictionCode,
        lat, lng, geoApproximate: !(place && place.jur === user.jurisdictionCode), hours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ d: day, open: d.open, close: d.close })),
      }).returning();
      await tx.insert(schema.licences).values({
        retailerId: r.id, locationId: loc.id, number: d.licenceNumber, holderName: d.legalName, jurisdictionCode: user.jurisdictionCode,
        expiresAt: d.expiresAt, status: "PENDING",
        reviewNotes: place ? null : "Location coordinates approximated from province — confirm address during review.",
      });
      return r.id;
    });
    const lic = await db.query.licences.findFirst({ where: eq(schema.licences.retailerId, retailerId) });
    await storeDocument(file, { uploadedById: user.id, licenceId: lic!.id });
    await audit({ actorId: user.id, action: "retailer.create", targetType: "retailer", targetId: retailerId });
    await notify(await adminIds(), { title: `New store to review: ${d.tradeName}`, body: `Licence ${d.licenceNumber} in ${user.jurisdictionCode}.`, href: "/admin/verification" });
    done = true;
  } catch (e) {
    return fail(e, form);
  }
  if (done) redirect("/retailer?welcome=1");
  return null;
}

// ─── Products & stock ───────────────────────────────────────────────────────

const ProductInput = z.object({
  name: z.string().trim().min(2, "Enter the product name.").max(80),
  brand: z.string().trim().min(2, "Enter the brand.").max(60),
  category: z.enum(schema.categoryEnum.enumValues),
  size: z.string().trim().min(1, "Enter the package size, e.g. 3.5 g.").max(40),
  potencyUnit: z.enum(["%", "mg"]),
  thcMin: z.coerce.number().min(0).max(1000).optional(),
  thcMax: z.coerce.number().min(0).max(1000).optional(),
  cbdMin: z.coerce.number().min(0).max(1000).optional(),
  cbdMax: z.coerce.number().min(0).max(1000).optional(),
  price: z.coerce.number({ invalid_type_error: "Enter a price." }).positive("Enter a price.").max(10000),
  description: z.string().trim().max(600).optional(),
});

function parseProduct(form: FormData) {
  const raw = Object.fromEntries([...form.entries()].map(([k, v]) => [k, v === "" ? undefined : v]));
  const d = ProductInput.parse(raw);
  const issue = screenCopy(`${d.name} ${d.description ?? ""}`);
  if (issue) throw new z.ZodError([{ code: "custom", path: ["description"], message: issue }]);
  for (const k of ["thc", "cbd"] as const) {
    const lo = d[`${k}Min`], hi = d[`${k}Max`];
    if (lo != null && hi != null && lo > hi) throw new z.ZodError([{ code: "custom", path: [`${k}Max`], message: "Maximum must be at least the minimum." }]);
  }
  return {
    name: d.name, brand: d.brand, category: d.category, size: d.size, potencyUnit: d.potencyUnit,
    thcMin: d.thcMin ?? null, thcMax: d.thcMax ?? d.thcMin ?? null, cbdMin: d.cbdMin ?? null, cbdMax: d.cbdMax ?? d.cbdMin ?? null,
    priceCents: Math.round(d.price * 100), description: d.description || null,
  };
}

export async function saveProduct(_: ActionState, form: FormData): Promise<ActionState> {
  let dest: string | null = null;
  try {
    const { user, retailer } = await requireRetailer();
    const values = parseProduct(form);
    const id = String(form.get("id") ?? "");
    if (id) {
      await assertOwnsProduct(retailer.id, id);
      await db.update(schema.products).set(values).where(eq(schema.products.id, id));
      await audit({ actorId: user.id, action: "product.update", targetType: "product", targetId: id });
    } else {
      const [p] = await db.insert(schema.products).values({ ...values, retailerId: retailer.id }).returning();
      const locs = await db.query.locations.findMany({ where: eq(schema.locations.retailerId, retailer.id) });
      if (locs.length) await db.insert(schema.inventory).values(locs.map((l) => ({ productId: p.id, locationId: l.id, status: "IN_STOCK" as const })));
      await audit({ actorId: user.id, action: "product.create", targetType: "product", targetId: p.id });
    }
    revalidatePath("/retailer/products");
    dest = "/retailer/products?saved=1";
  } catch (e) {
    return fail(e, form);
  }
  redirect(dest);
}

export async function setStock(form: FormData) {
  const { retailer } = await requireRetailer();
  const d = z.object({ productId: z.string(), locationId: z.string(), status: z.enum(["IN_STOCK", "LOW", "OUT"]) }).parse(Object.fromEntries(form));
  await assertOwnsProduct(retailer.id, d.productId);
  const loc = await db.query.locations.findFirst({ where: and(eq(schema.locations.id, d.locationId), eq(schema.locations.retailerId, retailer.id)) });
  if (!loc) throw new Error("Location not found.");
  await db.insert(schema.inventory).values(d).onConflictDoUpdate({ target: [schema.inventory.productId, schema.inventory.locationId], set: { status: d.status, updatedAt: new Date() } });
  revalidatePath("/retailer/products");
}

/** "Confirm all" — tells customers the menu is current without changing anything. */
export async function confirmStock() {
  const { user, retailer } = await requireRetailer();
  const locs = await db.query.locations.findMany({ where: eq(schema.locations.retailerId, retailer.id), columns: { id: true } });
  for (const l of locs) await db.update(schema.inventory).set({ updatedAt: new Date() }).where(eq(schema.inventory.locationId, l.id));
  await audit({ actorId: user.id, action: "inventory.confirm", targetType: "retailer", targetId: retailer.id });
  revalidatePath("/retailer", "layout");
}

export async function setProductVisibility(form: FormData) {
  const { user, retailer } = await requireRetailer();
  const id = String(form.get("id"));
  const p = await assertOwnsProduct(retailer.id, id);
  if (p.status === "FLAGGED") throw new Error("Flagged products can only be restored by Cairn review.");
  const status = p.status === "ACTIVE" ? "HIDDEN" : "ACTIVE";
  await db.update(schema.products).set({ status }).where(eq(schema.products.id, id));
  await audit({ actorId: user.id, action: `product.${status.toLowerCase()}`, targetType: "product", targetId: id });
  revalidatePath("/retailer/products");
}

// ─── Locations ──────────────────────────────────────────────────────────────

export async function saveLocation(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { user, retailer } = await requireRetailerOwner();
    const d = z.object({
      id: z.string().optional(),
      name: z.string().trim().min(2).max(40),
      street: z.string().trim().min(3).max(120),
      city: z.string().trim().min(2).max(60),
      postalCode: Postal,
      phone: z.string().trim().max(30).optional(),
    }).parse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v !== "")));
    const hours = [0, 1, 2, 3, 4, 5, 6].flatMap((day) => {
      if (form.get(`closed-${day}`) === "on") return [];
      const h = Hours.safeParse({ open: form.get(`open-${day}`), close: form.get(`close-${day}`) });
      return h.success ? [{ d: day, ...h.data }] : [];
    });
    const flags = { offersPickup: form.get("offersPickup") === "on", offersDelivery: form.get("offersDelivery") === "on" };
    if (d.id) {
      const loc = await db.query.locations.findFirst({ where: and(eq(schema.locations.id, d.id), eq(schema.locations.retailerId, retailer.id)) });
      if (!loc) throw new UserFacingError("Location not found.");
      await db.update(schema.locations).set({ name: d.name, street: d.street, city: d.city, postalCode: d.postalCode, phone: d.phone ?? null, hours, ...flags }).where(eq(schema.locations.id, d.id));
      await audit({ actorId: user.id, action: "location.update", targetType: "location", targetId: d.id });
    } else {
      const place = resolvePlace(d.postalCode);
      const [lat, lng] = place?.jur === retailer.jurisdictionCode ? [place.lat, place.lng] : CENTROIDS[retailer.jurisdictionCode];
      // A new location needs its own licence in most provinces; it stays inactive until reviewed.
      const [loc] = await db.insert(schema.locations).values({ retailerId: retailer.id, name: d.name, street: d.street, city: d.city, postalCode: d.postalCode, phone: d.phone ?? null, jurisdictionCode: retailer.jurisdictionCode, lat, lng, geoApproximate: place?.jur !== retailer.jurisdictionCode, hours, active: false, ...flags }).returning();
      await audit({ actorId: user.id, action: "location.create", targetType: "location", targetId: loc.id });
      await notify(await adminIds(), { title: `${retailer.tradeName} added a location`, body: `${d.name}, ${d.city}. Review before activating.`, href: "/admin/retailers" });
    }
    revalidatePath("/retailer/locations");
    return ok(d.id ? "Location saved." : "Location added. It goes live once Cairn confirms it's covered by a licence.");
  } catch (e) {
    return fail(e, form);
  }
}

// ─── Store profile ──────────────────────────────────────────────────────────

export async function saveStoreProfile(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { user, retailer } = await requireRetailerOwner();
    const d = z.object({
      tradeName: z.string().trim().min(2).max(60),
      about: z.string().trim().max(400).optional(),
      website: optionalUrl,
      orderingUrl: optionalUrl,
    }).parse({ tradeName: form.get("tradeName"), about: form.get("about") || undefined, website: form.get("website") ?? "", orderingUrl: form.get("orderingUrl") ?? "" });
    const issue = screenCopy(d.about);
    if (issue) throw new z.ZodError([{ code: "custom", path: ["about"], message: issue }]);
    await db.update(schema.retailers).set({ tradeName: d.tradeName, about: d.about ?? null, website: d.website, orderingUrl: d.orderingUrl }).where(eq(schema.retailers.id, retailer.id));
    await audit({ actorId: user.id, action: "retailer.update_profile", targetType: "retailer", targetId: retailer.id, metadata: { orderingUrl: d.orderingUrl } });
    revalidatePath("/retailer", "layout");
    return ok("Store profile saved.");
  } catch (e) {
    return fail(e, form);
  }
}

// ─── Licence renewal ────────────────────────────────────────────────────────

export async function submitLicence(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { user, retailer } = await requireRetailerOwner();
    const d = z.object({
      number: z.string().trim().min(3, "Enter the licence number.").max(40),
      expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the expiry date."),
    }).parse({ number: form.get("number"), expiresAt: form.get("expiresAt") });
    if (d.expiresAt <= new Date().toISOString().slice(0, 10)) throw new z.ZodError([{ code: "custom", path: ["expiresAt"], message: "That date has already passed." }]);
    const file = form.get("document");
    if (!(file instanceof File) || file.size === 0) throw new z.ZodError([{ code: "custom", path: ["document"], message: "Attach the licence document." }]);
    const [lic] = await db.insert(schema.licences).values({
      retailerId: retailer.id, number: d.number, holderName: retailer.legalName, jurisdictionCode: retailer.jurisdictionCode, expiresAt: d.expiresAt, status: "PENDING",
    }).returning();
    await storeDocument(file, { uploadedById: user.id, licenceId: lic.id });
    await audit({ actorId: user.id, action: "licence.submit", targetType: "licence", targetId: lic.id });
    await notify(await adminIds(), { title: `Licence submitted by ${retailer.tradeName}`, body: `${d.number}, expires ${d.expiresAt}.`, href: "/admin/verification" });
    revalidatePath("/retailer/compliance");
    return ok("Submitted. You'll get a notification when the review is done.");
  } catch (e) {
    return fail(e, form);
  }
}

// ─── Partners ───────────────────────────────────────────────────────────────

export async function respondToPartner(form: FormData) {
  const { user, retailer } = await requireRetailerOwner();
  const d = z.object({ partnerId: z.string(), decision: z.enum(["ACTIVE", "DECLINED", "ENDED"]), commission: z.coerce.number().min(0).max(30).optional() })
    .parse({ partnerId: form.get("partnerId"), decision: form.get("decision"), commission: form.get("commission") || undefined });
  const tie = await db.query.partnerRetailers.findFirst({ where: and(eq(schema.partnerRetailers.partnerId, d.partnerId), eq(schema.partnerRetailers.retailerId, retailer.id)), with: { partner: true } });
  if (!tie) throw new Error("Partnership not found.");
  const policy = await getPolicy(retailer.jurisdictionCode);
  const commissionBps = d.decision === "ACTIVE" && policy.allows("partner.compensation") && d.commission != null ? Math.round(d.commission * 100) : tie.commissionBps;
  await db.update(schema.partnerRetailers).set({ status: d.decision, commissionBps }).where(and(eq(schema.partnerRetailers.partnerId, d.partnerId), eq(schema.partnerRetailers.retailerId, retailer.id)));
  await audit({ actorId: user.id, action: `partnership.${d.decision.toLowerCase()}`, targetType: "partner", targetId: d.partnerId, metadata: { retailerId: retailer.id, commissionBps } });
  await notify([tie.partner.userId], {
    title: d.decision === "ACTIVE" ? `${retailer.tradeName} accepted your partnership` : d.decision === "DECLINED" ? `${retailer.tradeName} declined your request` : `${retailer.tradeName} ended your partnership`,
    body: d.decision === "ACTIVE" ? "Your links to this store now count toward your results." : "Links to this store will no longer be attributed to you.",
    href: "/partner/stores",
  });
  revalidatePath("/retailer/partners");
}

// ─── Conversions & API keys ─────────────────────────────────────────────────

export async function reportConversion(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { user, retailer } = await requireRetailer();
    const d = z.object({
      campaignCode: z.string().trim().min(3, "Enter the partner link code.").max(32),
      externalRef: z.string().trim().min(1, "Enter your order reference.").max(64),
      order: z.coerce.number().positive("Enter the order total.").max(100000),
    }).parse(Object.fromEntries(form));
    const { recordConversion } = await import("@/lib/conversions");
    await recordConversion({ retailerId: retailer.id, campaignCode: d.campaignCode, externalRef: d.externalRef, orderCents: Math.round(d.order * 100), via: "console", actorId: user.id });
    revalidatePath("/retailer/referrals");
    return ok("Purchase recorded.");
  } catch (e) {
    return fail(e, form);
  }
}

export async function createApiKey(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { user, retailer } = await requireRetailerOwner();
    const name = z.string().trim().min(2, "Name the key, e.g. the system that uses it.").max(40).parse(form.get("name"));
    const prefix = `ck_${shortCode(8)}`;
    const secret = randomToken(24);
    await db.insert(schema.retailerApiKeys).values({ retailerId: retailer.id, name, prefix, keyHash: sha256(secret) });
    await audit({ actorId: user.id, action: "api_key.create", targetType: "retailer", targetId: retailer.id, metadata: { prefix } });
    revalidatePath("/retailer/referrals");
    return { ok: true, message: `${prefix}.${secret}` };
  } catch (e) {
    return fail(e, form);
  }
}

export async function revokeApiKey(form: FormData) {
  const { user, retailer } = await requireRetailerOwner();
  const id = String(form.get("id"));
  await db.update(schema.retailerApiKeys).set({ revokedAt: new Date() }).where(and(eq(schema.retailerApiKeys.id, id), eq(schema.retailerApiKeys.retailerId, retailer.id), isNull(schema.retailerApiKeys.revokedAt)));
  await audit({ actorId: user.id, action: "api_key.revoke", targetType: "retailer", targetId: retailer.id, metadata: { id } });
  revalidatePath("/retailer/referrals");
}
