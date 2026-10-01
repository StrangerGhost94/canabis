/**
 * Seed Cairn.
 *
 *   npm run db:seed            → jurisdictions + rule rows (all UNCONFIRMED) + one admin
 *   DEMO_MODE=true npm run db:seed → also fictional demo stores, partners and activity
 *
 * Every demo row has isDemo = true and every demo licence number starts with
 * "DEMO-". None of these businesses, licences, people or orders exist.
 */
import { hash } from "@node-rs/argon2";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as s from "../src/db/schema";
import { RULE_KEYS, type RuleKey } from "../src/lib/compliance/rules";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: s });
const DEMO = process.env.DEMO_MODE === "true";
const PASSWORD = process.env.SEED_PASSWORD ?? "cairn-demo-2026";

const AGE_SOURCE =
  "Seeded from publicly reported provincial/territorial minimum ages (2026). Confirm against current legislation before launch.";

const JURISDICTIONS = [
  { code: "AB", name: "Alberta", legalAge: 18, regulator: "Alberta Gaming, Liquor and Cannabis (AGLC)", retailModel: "Licensed private retail" },
  { code: "BC", name: "British Columbia", legalAge: 19, regulator: "Liquor and Cannabis Regulation Branch (LCRB)", retailModel: "Licensed private and government retail" },
  { code: "MB", name: "Manitoba", legalAge: 19, regulator: "Liquor, Gaming and Cannabis Authority of Manitoba", retailModel: "Licensed private retail" },
  { code: "NB", name: "New Brunswick", legalAge: 19, regulator: "Cannabis NB", retailModel: "Government retail" },
  { code: "NL", name: "Newfoundland and Labrador", legalAge: 19, regulator: "Newfoundland and Labrador Liquor Corporation", retailModel: "Licensed private retail" },
  { code: "NS", name: "Nova Scotia", legalAge: 19, regulator: "Nova Scotia Liquor Corporation", retailModel: "Government retail" },
  { code: "NT", name: "Northwest Territories", legalAge: 19, regulator: "NWT Liquor and Cannabis Commission", retailModel: "Government-authorised retail" },
  { code: "NU", name: "Nunavut", legalAge: 19, regulator: "Nunavut Liquor and Cannabis Commission", retailModel: "Licensed retail" },
  { code: "ON", name: "Ontario", legalAge: 19, regulator: "Alcohol and Gaming Commission of Ontario (AGCO)", retailModel: "Licensed private retail" },
  { code: "PE", name: "Prince Edward Island", legalAge: 19, regulator: "PEI Cannabis Management Corporation", retailModel: "Government retail" },
  { code: "QC", name: "Québec", legalAge: 21, regulator: "Société québécoise du cannabis (SQDC)", retailModel: "Government retail" },
  { code: "SK", name: "Saskatchewan", legalAge: 19, regulator: "Saskatchewan Liquor and Gaming Authority (SLGA)", retailModel: "Licensed private retail" },
  { code: "YT", name: "Yukon", legalAge: 19, regulator: "Cannabis Licensing Board, Yukon", retailModel: "Licensed private retail" },
];

/**
 * Simulated determinations used ONLY in demo mode, so the product can be
 * explored end-to-end. They are flagged isDemo and shown as "Demo setting" in
 * the admin console. They are not legal conclusions.
 */
const DEMO_RULES: Record<string, Partial<Record<RuleKey, "ALLOWED" | "PROHIBITED">>> = {
  ON: Object.fromEntries(RULE_KEYS.map((k) => [k, "ALLOWED"])) as Record<RuleKey, "ALLOWED">,
  BC: {
    "retail.directory": "ALLOWED", "retail.products": "ALLOWED", "retail.prices": "ALLOWED",
    "retail.onlineHandoff": "ALLOWED", "retail.pickup": "ALLOWED", "product.vapes": "ALLOWED",
    "product.edibles": "ALLOWED", "partner.referrals": "ALLOWED", "partner.profiles": "ALLOWED",
    // compensation left UNCONFIRMED to demonstrate the fail-closed state
  },
  AB: {
    "retail.directory": "ALLOWED", "retail.products": "ALLOWED", "retail.pickup": "ALLOWED",
    "product.edibles": "ALLOWED", "product.vapes": "ALLOWED",
    // prices, partner features left UNCONFIRMED
  },
};

const H = (open: string, close: string, days = [0, 1, 2, 3, 4, 5, 6]) => days.map((d) => ({ d, open, close }));
const days = (n: number) => new Date(Date.now() + n * 86400e3).toISOString().slice(0, 10);

async function main() {
  console.log(`Seeding${DEMO ? " (with demo data)" : ""}…`);

  await db.insert(s.jurisdictions)
    .values(JURISDICTIONS.map((j) => ({ ...j, ageSource: AGE_SOURCE })))
    .onConflictDoNothing();
  for (const j of JURISDICTIONS) {
    await db.insert(s.jurisdictionRules)
      .values(RULE_KEYS.map((key) => ({ jurisdictionCode: j.code, key })))
      .onConflictDoNothing();
  }

  const pw = await hash(PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const [admin] = await db.insert(s.users).values({
    email: "admin@cairn.demo", name: "Platform Admin", passwordHash: pw, birthDate: "1985-04-02",
    jurisdictionCode: "ON", roles: ["CUSTOMER", "ADMIN"], isDemo: DEMO,
  }).onConflictDoNothing().returning();

  if (!DEMO) {
    console.log("Done. Admin: admin@cairn.demo");
    return pool.end();
  }
  if (!admin) {
    console.log("Demo data already present — run `npm run db:reset` to start over.");
    return pool.end();
  }

  for (const [code, rules] of Object.entries(DEMO_RULES)) {
    for (const [key, status] of Object.entries(rules)) {
      await db.update(s.jurisdictionRules).set({
        status, isDemo: true, reviewedById: admin.id, reviewedAt: new Date(),
        source: "DEMO — simulated determination for development. Not legal advice; must be replaced by counsel-reviewed sources.",
      }).where(sql`${s.jurisdictionRules.jurisdictionCode} = ${code} AND ${s.jurisdictionRules.key} = ${key}`);
    }
  }

  // ── People (fictional) ──
  const mkUser = async (email: string, name: string, roles: ("CUSTOMER" | "RETAILER" | "PARTNER")[], jur: string, birth = "1990-06-15") =>
    (await db.insert(s.users).values({ email, name, passwordHash: pw, birthDate: birth, jurisdictionCode: jur, roles, isDemo: true }).returning())[0];

  const customer = await mkUser("customer@cairn.demo", "Avery Morin", ["CUSTOMER"], "ON");
  const owner = await mkUser("retailer@cairn.demo", "Dana Okafor", ["CUSTOMER", "RETAILER"], "ON");
  const partnerUser = await mkUser("partner@cairn.demo", "Jules Tremblay", ["CUSTOMER", "PARTNER"], "ON");
  const partnerUser2 = await mkUser("partner.bc@cairn.demo", "Noor Haddad", ["CUSTOMER", "PARTNER"], "BC");
  const applicantUser = await mkUser("applicant@cairn.demo", "Sam Whitlock", ["CUSTOMER", "PARTNER"], "ON");

  // ── Stores (fictional) ──
  type StoreSeed = {
    slug: string; tradeName: string; legalName: string; jur: string; status: "VERIFIED" | "PENDING_REVIEW" | "SUSPENDED";
    about: string; licence: { status: "VERIFIED" | "PENDING" | "EXPIRED"; expires: string };
    locations: { name: string; street: string; city: string; postal: string; lat: number; lng: number; hours: ReturnType<typeof H>; pickup?: boolean; delivery?: boolean }[];
    ordering?: boolean;
  };
  const stores: StoreSeed[] = [
    {
      slug: "larchmont-supply", tradeName: "Larchmont Supply", legalName: "Larchmont Supply Inc. (demo)", jur: "ON", status: "VERIFIED", ordering: true,
      about: "A small shop with a short menu that changes weekly. Staff can walk you through formats and dosing labels in person.",
      licence: { status: "VERIFIED", expires: days(400) },
      locations: [
        { name: "Queen West", street: "812 Queen St W", city: "Toronto", postal: "M6J 1G3", lat: 43.6457, lng: -79.4112, hours: H("10:00", "22:00"), pickup: true },
        { name: "Leslieville", street: "1120 Queen St E", city: "Toronto", postal: "M4M 1K8", lat: 43.6619, lng: -79.3364, hours: H("11:00", "21:00"), pickup: true, delivery: true },
      ],
    },
    {
      slug: "harbourline", tradeName: "Harbourline", legalName: "Harbourline Retail Ltd. (demo)", jur: "ON", status: "VERIFIED", ordering: true,
      about: "Large-format store near the waterfront with one of the broader beverage and topical selections downtown.",
      licence: { status: "VERIFIED", expires: days(210) },
      locations: [{ name: "Waterfront", street: "35 Bathurst St", city: "Toronto", postal: "M5V 2P3", lat: 43.6389, lng: -79.4004, hours: H("09:00", "23:00"), pickup: true, delivery: true }],
    },
    {
      slug: "ordinal", tradeName: "Ordinal", legalName: "Ordinal Cannabis Co. (demo)", jur: "ON", status: "VERIFIED",
      about: "Neighbourhood shop focused on Ontario-grown producers. In-store only.",
      licence: { status: "VERIFIED", expires: days(55) },
      locations: [{ name: "Christie", street: "720 Bloor St W", city: "Toronto", postal: "M6G 1L4", lat: 43.6639, lng: -79.4185, hours: H("10:00", "21:00") }],
    },
    {
      slug: "byward-provisions", tradeName: "Byward Provisions", legalName: "Byward Provisions Inc. (demo)", jur: "ON", status: "VERIFIED",
      about: "Market-district store. Licence lapsed in this demo to show how expired listings are handled.",
      licence: { status: "VERIFIED", expires: days(-12) },
      locations: [{ name: "ByWard Market", street: "55 York St", city: "Ottawa", postal: "K1N 5T1", lat: 45.4281, lng: -75.6918, hours: H("10:00", "22:00") }],
    },
    {
      slug: "fieldnote", tradeName: "Fieldnote", legalName: "Fieldnote Retail Corp. (demo)", jur: "ON", status: "PENDING_REVIEW",
      about: "New store awaiting licence review. Not visible to customers.",
      licence: { status: "PENDING", expires: days(700) },
      locations: [{ name: "Dundas", street: "1550 Dundas St W", city: "Toronto", postal: "M6K 1T5", lat: 43.6497, lng: -79.4338, hours: H("10:00", "22:00") }],
    },
    {
      slug: "slackwater", tradeName: "Slackwater", legalName: "Slackwater Holdings Ltd. (demo)", jur: "BC", status: "VERIFIED", ordering: true,
      about: "Mount Pleasant shop with long hours and a broad pre-roll wall.",
      licence: { status: "VERIFIED", expires: days(300) },
      locations: [
        { name: "Main Street", street: "2410 Main St", city: "Vancouver", postal: "V5T 3E2", lat: 49.2639, lng: -123.1007, hours: H("09:00", "23:00"), pickup: true },
        { name: "West 4th", street: "2205 W 4th Ave", city: "Vancouver", postal: "V6K 1N9", lat: 49.2681, lng: -123.1578, hours: H("10:00", "22:00"), pickup: true },
      ],
    },
    {
      slug: "coastal-registry", tradeName: "Coastal Registry", legalName: "Coastal Registry Retail Inc. (demo)", jur: "BC", status: "VERIFIED",
      about: "Downtown store near the stadium district.",
      licence: { status: "VERIFIED", expires: days(500) },
      locations: [{ name: "Gastown", street: "301 Water St", city: "Vancouver", postal: "V6B 1B8", lat: 49.2846, lng: -123.1088, hours: H("10:00", "22:00"), pickup: true }],
    },
    {
      slug: "chinook-counter", tradeName: "Chinook Counter", legalName: "Chinook Counter Ltd. (demo)", jur: "AB", status: "VERIFIED",
      about: "Beltline shop. Prices aren't shown on Cairn in Alberta in this demo configuration.",
      licence: { status: "VERIFIED", expires: days(365) },
      locations: [{ name: "17th Ave", street: "1012 17 Ave SW", city: "Calgary", postal: "T2T 0A5", lat: 51.0378, lng: -114.0841, hours: H("10:00", "02:00".replace("02", "23")), pickup: true }],
    },
    {
      slug: "tamarack-house", tradeName: "Tamarack House", legalName: "Tamarack House Inc. (demo)", jur: "ON", status: "SUSPENDED",
      about: "Suspended in this demo after a compliance review.",
      licence: { status: "VERIFIED", expires: days(250) },
      locations: [{ name: "Kensington", street: "212 Augusta Ave", city: "Toronto", postal: "M5T 2L6", lat: 43.6544, lng: -79.4021, hours: H("10:00", "22:00") }],
    },
  ];

  // ── Fictional brands & products ──
  const BRANDS = ["Paperbirch", "Shale & Co.", "Low Tide", "Granite Hollow", "Muskeg", "Fieldwork", "Northcourt", "Spruce Line"];
  type P = { name: string; category: typeof s.categoryEnum.enumValues[number]; size: string; unit: "%" | "mg"; thc: [number, number] | null; cbd: [number, number] | null; price: number; desc: string };
  const CATALOGUE: P[] = [
    { name: "Shoreline", category: "FLOWER", size: "3.5 g", unit: "%", thc: [19, 23], cbd: [0, 0.5], price: 3299, desc: "Whole flower, hang-dried, hand-trimmed. Packaged on date shown on label." },
    { name: "Overcast", category: "FLOWER", size: "7 g", unit: "%", thc: [14, 17], cbd: [0, 1], price: 4999, desc: "Whole flower in a resealable glass jar." },
    { name: "Even Keel", category: "FLOWER", size: "3.5 g", unit: "%", thc: [6, 9], cbd: [8, 11], price: 3499, desc: "Balanced THC and CBD flower." },
    { name: "Lantern", category: "PRE_ROLL", size: "3 × 0.5 g", unit: "%", thc: [20, 24], cbd: [0, 0.5], price: 2299, desc: "Pre-rolls with unbleached papers and paper tips." },
    { name: "Dockside", category: "PRE_ROLL", size: "10 × 0.35 g", unit: "%", thc: [17, 21], cbd: [0, 0.5], price: 3899, desc: "Smaller-format pre-rolls in a tin." },
    { name: "Long Exposure", category: "VAPE", size: "1 g cartridge", unit: "%", thc: [82, 88], cbd: [0, 1], price: 5499, desc: "510-thread cartridge. Battery sold separately." },
    { name: "Still Water", category: "VAPE", size: "0.5 g all-in-one", unit: "%", thc: [70, 76], cbd: [0, 2], price: 3999, desc: "Disposable all-in-one device." },
    { name: "Two Lakes", category: "EDIBLE", size: "5 × 2 mg", unit: "mg", thc: [10, 10], cbd: [0, 0], price: 699, desc: "Soft chews, 2 mg THC each. 10 mg per package." },
    { name: "Half Light", category: "EDIBLE", size: "2 × 5 mg", unit: "mg", thc: [10, 10], cbd: [20, 20], price: 899, desc: "Dark chocolate, 5 mg THC and 10 mg CBD per square." },
    { name: "Ripple", category: "BEVERAGE", size: "355 mL", unit: "mg", thc: [5, 5], cbd: [0, 0], price: 649, desc: "Sparkling beverage, 5 mg THC per can." },
    { name: "Clear Sound", category: "BEVERAGE", size: "355 mL", unit: "mg", thc: [2, 2], cbd: [10, 10], price: 599, desc: "Sparkling beverage, 2 mg THC and 10 mg CBD." },
    { name: "Bedrock", category: "EXTRACT", size: "1 g", unit: "%", thc: [65, 72], cbd: [0, 1], price: 4499, desc: "Pressed hash." },
    { name: "Cold Front", category: "TOPICAL", size: "50 mL", unit: "mg", thc: [0, 0], cbd: [500, 500], price: 4299, desc: "Topical lotion. For external use only." },
    { name: "Measure", category: "CAPSULE", size: "30 × 10 mg", unit: "mg", thc: [0, 0], cbd: [300, 300], price: 3999, desc: "Softgel capsules, 10 mg CBD each." },
    { name: "Pilot", category: "SEED", size: "5 seeds", unit: "%", thc: null, cbd: null, price: 4999, desc: "Feminized seeds for personal cultivation where permitted." },
  ];

  const partnerIds: Record<string, string> = {};
  const [jules] = await db.insert(s.partners).values({
    userId: partnerUser.id, handle: "jules", displayName: "Jules Tremblay", jurisdictionCode: "ON",
    bio: "I write a monthly newsletter about Toronto shops worth knowing: who stocks what, opening hours, and which ones take time with first-timers.",
    status: "VERIFIED", audience: "Newsletter, ~2,400 subscribers who confirmed they're 19+ at signup.",
    channels: ["Newsletter", "Personal website"], attestedAt: new Date(), verifiedAt: new Date(Date.now() - 40 * 86400e3), isDemo: true,
  }).returning();
  const [noor] = await db.insert(s.partners).values({
    userId: partnerUser2.id, handle: "noor", displayName: "Noor Haddad", jurisdictionCode: "BC",
    bio: "Vancouver-based reviewer. I keep a running list of stores with good accessibility.",
    status: "VERIFIED", audience: "Website and age-gated community forum.", channels: ["Website"], attestedAt: new Date(),
    verifiedAt: new Date(Date.now() - 20 * 86400e3), isDemo: true,
  }).returning();
  await db.insert(s.partners).values({
    userId: applicantUser.id, handle: "samw", displayName: "Sam Whitlock", jurisdictionCode: "ON",
    bio: "Podcast host covering the Ontario retail market.", status: "UNDER_REVIEW",
    audience: "Podcast, ~6,000 monthly listeners. Show notes behind an age gate.", channels: ["Podcast"], attestedAt: new Date(), isDemo: true,
  });
  partnerIds.ON = jules.id;
  partnerIds.BC = noor.id;

  let si = 0;
  for (const st of stores) {
    const [r] = await db.insert(s.retailers).values({
      slug: st.slug, tradeName: st.tradeName, legalName: st.legalName, jurisdictionCode: st.jur, status: st.status,
      about: st.about, website: `https://${st.slug}.example`, orderingUrl: st.ordering ? `https://${st.slug}.example/order` : null, isDemo: true,
    }).returning();
    if (st.slug === "larchmont-supply") await db.insert(s.retailerMembers).values({ userId: owner.id, retailerId: r.id, role: "OWNER" });

    const locs = await db.insert(s.locations).values(st.locations.map((l) => ({
      retailerId: r.id, name: l.name, street: l.street, city: l.city, postalCode: l.postal, jurisdictionCode: st.jur,
      lat: l.lat, lng: l.lng, hours: l.hours, offersPickup: !!l.pickup, offersDelivery: !!l.delivery, phone: "555-0100 (demo)",
    }))).returning();

    await db.insert(s.licences).values({
      retailerId: r.id, locationId: locs[0].id, number: `DEMO-${st.jur}-${String(1001 + si).padStart(5, "0")}`, holderName: st.legalName,
      jurisdictionCode: st.jur, issuedAt: days(-500), expiresAt: st.licence.expires, status: st.licence.status,
      method: st.licence.status === "PENDING" ? null : "DEMO_SIMULATED",
      sourceReference: st.licence.status === "PENDING" ? null : `simulated:DEMO-${st.jur}-${1001 + si}`,
      verifiedAt: st.licence.status === "PENDING" ? null : new Date(Date.now() - 30 * 86400e3),
      verifiedById: st.licence.status === "PENDING" ? null : admin.id, isDemo: true,
    });

    // Each store carries a different slice of the catalogue, from rotating brands.
    const picks = CATALOGUE.filter((_, i) => (i + si) % 3 !== 0 || i < 3);
    for (const [i, p] of picks.entries()) {
      const brand = BRANDS[(i + si * 3) % BRANDS.length];
      const drift = ((si * 7 + i * 3) % 5) * 50;
      const [prod] = await db.insert(s.products).values({
        retailerId: r.id, name: p.name, brand, category: p.category, size: p.size, potencyUnit: p.unit,
        thcMin: p.thc?.[0] ?? null, thcMax: p.thc?.[1] ?? null, cbdMin: p.cbd?.[0] ?? null, cbdMax: p.cbd?.[1] ?? null,
        priceCents: p.price + drift, description: p.desc, isDemo: true,
      }).returning();
      for (const [li, loc] of locs.entries()) {
        const roll = (i * 5 + li * 3 + si) % 9;
        await db.insert(s.inventory).values({
          productId: prod.id, locationId: loc.id, status: roll === 0 ? "OUT" : roll < 3 ? "LOW" : "IN_STOCK",
        });
      }
    }
    si++;
  }

  // ── Partnerships, campaigns and simulated activity ──
  const R = Object.fromEntries((await db.select().from(s.retailers)).map((r) => [r.slug, r]));
  await db.insert(s.partnerRetailers).values([
    { partnerId: jules.id, retailerId: R["larchmont-supply"].id, status: "ACTIVE", commissionBps: 500 },
    { partnerId: jules.id, retailerId: R["harbourline"].id, status: "ACTIVE", commissionBps: 400 },
    { partnerId: jules.id, retailerId: R["ordinal"].id, status: "REQUESTED" },
    { partnerId: noor.id, retailerId: R["slackwater"].id, status: "ACTIVE" },
  ]);
  const camps = await db.insert(s.campaigns).values([
    { partnerId: jules.id, retailerId: R["larchmont-supply"].id, name: "October newsletter", code: "jul-oct26" },
    { partnerId: jules.id, retailerId: R["larchmont-supply"].id, name: "Leslieville guide", code: "jul-lslv" },
    { partnerId: jules.id, retailerId: R["harbourline"].id, name: "Waterfront feature", code: "jul-wtrf" },
    { partnerId: noor.id, retailerId: R["slackwater"].id, name: "Accessibility list", code: "noor-a11y" },
  ]).returning();

  const events: (typeof s.referralEvents.$inferInsert)[] = [];
  const convs: (typeof s.conversions.$inferInsert)[] = [];
  let ref = 1;
  for (let d = 34; d >= 0; d--) {
    for (const c of camps) {
      const base = c.code === "jul-oct26" ? (d < 18 ? 14 : 3) : c.code === "noor-a11y" ? 6 : 4;
      const visits = Math.max(0, Math.round(base + Math.sin(d * 1.3 + c.code.length) * base * 0.5));
      for (let v = 0; v < visits; v++) {
        const at = new Date(Date.now() - d * 86400e3 - ((v * 3571) % 86400) * 1000);
        events.push({ type: "VISIT", campaignId: c.id, partnerId: c.partnerId, retailerId: c.retailerId, visitorHash: `demo-${d}-${v}-${c.code}`, jurisdictionCode: c.partnerId === noor.id ? "BC" : "ON", createdAt: at, isDemo: true });
        if (v % 3 === 0) events.push({ type: "HANDOFF", campaignId: c.id, partnerId: c.partnerId, retailerId: c.retailerId, visitorHash: `demo-${d}-${v}-${c.code}`, jurisdictionCode: c.partnerId === noor.id ? "BC" : "ON", createdAt: new Date(at.getTime() + 120e3), isDemo: true });
        if (v % 7 === 0 && v > 0) {
          const order = 3000 + ((v * 977 + d * 131) % 9000);
          const onPay = c.partnerId === jules.id;
          const bps = c.retailerId === R["harbourline"].id ? 400 : 500;
          convs.push({
            retailerId: c.retailerId, campaignId: c.id, partnerId: c.partnerId, externalRef: `DEMO-ORDER-${ref++}`,
            orderCents: order, reportedVia: v % 2 ? "api" : "console", status: d > 3 ? "CONFIRMED" : "REPORTED",
            commissionCents: onPay ? Math.round((order * bps) / 10000) : null,
            commissionStatus: onPay ? (d > 30 ? "PAID" : d > 3 ? "APPROVED" : "PENDING") : "NOT_APPLICABLE",
            createdAt: new Date(at.getTime() + 3600e3), isDemo: true,
          });
        }
      }
    }
  }
  for (let i = 0; i < events.length; i += 500) await db.insert(s.referralEvents).values(events.slice(i, i + 500));
  await db.insert(s.conversions).values(convs);

  // ── Review queue, risk and notifications ──
  await db.insert(s.riskFlags).values([
    { subjectType: "partner", subjectId: noor.id, reason: "Unusual referral traffic", severity: "MEDIUM", details: { reasons: ["31 visits from one network in an hour", "Demo flag for review walkthrough"] } },
    { subjectType: "retailer", subjectId: R["tamarack-house"].id, reason: "Product description reported by a customer", severity: "HIGH", status: "ACTIONED", resolution: "Listing suspended pending review (demo).", resolvedById: admin.id, resolvedAt: new Date() },
  ]);
  await db.insert(s.notifications).values([
    { userId: owner.id, title: "Jules Tremblay asked to partner with Larchmont Supply", body: "Review their profile before accepting. Referrals only start once you accept.", href: "/retailer/partners" },
    { userId: partnerUser.id, title: "Ordinal hasn't responded yet", body: "Your partnership request is waiting on the store.", href: "/partner/stores" },
    { userId: customer.id, title: "Welcome to Cairn", body: "Every store you see here has had its licence reviewed. Tap the cairn on any store to see the record.", href: "/trust" },
  ]);
  await db.insert(s.auditLogs).values([
    { actorId: admin.id, action: "seed.demo", targetType: "system", metadata: { note: "Demo dataset created" } },
  ]);

  // A retailer user who hasn't finished onboarding.
  await mkUser("newstore@cairn.demo", "Priya Raman", ["CUSTOMER", "RETAILER"], "ON");

  console.log(`Done. Demo accounts use password "${PASSWORD}":
  admin@cairn.demo · retailer@cairn.demo · partner@cairn.demo · partner.bc@cairn.demo
  applicant@cairn.demo · newstore@cairn.demo · customer@cairn.demo`);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
