/**
 * Cairn — data model (PostgreSQL via Drizzle).
 *
 * Every row created by the seed script carries `isDemo = true`, and the UI
 * labels it as such, so it can never be mistaken for a real retailer, licence,
 * partner or transaction.
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean, date, doublePrecision, index, integer, jsonb, pgEnum, pgTable,
  primaryKey, text, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updated = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());
const ts = (name: string) => timestamp(name, { withTimezone: true });

// ─── Enums ──────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["CUSTOMER", "RETAILER", "PARTNER", "ADMIN"]);
export const accountStatus = pgEnum("account_status", ["ACTIVE", "SUSPENDED"]);
export const ruleStatus = pgEnum("rule_status", ["ALLOWED", "PROHIBITED", "UNCONFIRMED"]);
export const retailerStatus = pgEnum("retailer_status", [
  "DRAFT", "PENDING_REVIEW", "VERIFIED", "SUSPENDED", "REJECTED",
]);
export const memberRole = pgEnum("member_role", ["OWNER", "STAFF"]);
export const licenceStatus = pgEnum("licence_status", [
  "PENDING", "VERIFIED", "REJECTED", "EXPIRED", "REVOKED",
]);
export const verificationMethod = pgEnum("verification_method", [
  "MANUAL_REGISTRY_CHECK", // a reviewer compared the licence with the regulator's public registry
  "EXTERNAL_API", // a connected registry integration (none connected yet)
  "DEMO_SIMULATED", // development only — never a real verification
]);
export const categoryEnum = pgEnum("category", [
  "FLOWER", "PRE_ROLL", "VAPE", "EXTRACT", "EDIBLE", "BEVERAGE", "TOPICAL", "CAPSULE", "SEED", "ACCESSORY",
]);
export const productStatus = pgEnum("product_status", ["ACTIVE", "HIDDEN", "FLAGGED"]);
export const stockStatus = pgEnum("stock_status", ["IN_STOCK", "LOW", "OUT"]);
export const partnerStatus = pgEnum("partner_status", [
  "APPLIED", "UNDER_REVIEW", "VERIFIED", "SUSPENDED", "REJECTED",
]);
export const partnershipStatus = pgEnum("partnership_status", ["REQUESTED", "ACTIVE", "DECLINED", "ENDED"]);
export const campaignStatus = pgEnum("campaign_status", ["ACTIVE", "PAUSED", "ARCHIVED"]);
export const eventType = pgEnum("event_type", ["VISIT", "HANDOFF"]);
export const conversionStatus = pgEnum("conversion_status", ["REPORTED", "CONFIRMED", "REVERSED", "DISPUTED"]);
export const commissionStatus = pgEnum("commission_status", [
  "NOT_APPLICABLE", "PENDING", "APPROVED", "WITHHELD", "PAID",
]);
export const fulfilmentEnum = pgEnum("fulfilment", ["PICKUP", "DELIVERY"]);
export const orderStatus = pgEnum("order_status", [
  "PLACED", // waiting on the store
  "ACCEPTED", // store is preparing it
  "READY", // ready for pickup
  "OUT_FOR_DELIVERY",
  "COMPLETED", // handed over after an ID check
  "CANCELLED", // by the customer, before acceptance
  "REJECTED", // by the store
]);
export const riskSeverity = pgEnum("risk_severity", ["LOW", "MEDIUM", "HIGH"]);
export const riskStatus = pgEnum("risk_status", ["OPEN", "DISMISSED", "ACTIONED"]);

// ─── Jurisdictions & rules ──────────────────────────────────────────────────

export const jurisdictions = pgTable("jurisdictions", {
  code: text("code").primaryKey(), // ON, BC, QC …
  name: text("name").notNull(),
  legalAge: integer("legal_age").notNull(),
  ageSource: text("age_source").notNull(), // must be re-verified before launch
  regulator: text("regulator").notNull(),
  registryUrl: text("registry_url"),
  retailModel: text("retail_model").notNull(),
  notes: text("notes"),
});

/** A capability that may or may not be lawful in a jurisdiction. Only ALLOWED is "on". */
export const jurisdictionRules = pgTable("jurisdiction_rules", {
  id: id(),
  jurisdictionCode: text("jurisdiction_code").notNull().references(() => jurisdictions.code),
  key: text("key").notNull(),
  status: ruleStatus("status").notNull().default("UNCONFIRMED"),
  source: text("source"),
  notes: text("notes"),
  isDemo: boolean("is_demo").notNull().default(false),
  reviewedById: text("reviewed_by_id"),
  reviewedAt: ts("reviewed_at"),
  updatedAt: updated(),
}, (t) => [uniqueIndex("rule_jur_key").on(t.jurisdictionCode, t.key)]);

// ─── Identity ───────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  birthDate: date("birth_date", { mode: "string" }).notNull(),
  jurisdictionCode: text("jurisdiction_code").notNull().references(() => jurisdictions.code),
  roles: roleEnum("roles").array().notNull().default(sql`ARRAY['CUSTOMER']::role[]`),
  status: accountStatus("status").notNull().default("ACTIVE"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: created(),
  updatedAt: updated(),
});

export const sessions = pgTable("sessions", {
  id: id(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
  createdAt: created(),
  lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
}, (t) => [index("session_user").on(t.userId)]);

// ─── Retailers ──────────────────────────────────────────────────────────────

export const retailers = pgTable("retailers", {
  id: id(),
  slug: text("slug").notNull().unique(),
  tradeName: text("trade_name").notNull(),
  legalName: text("legal_name").notNull(),
  jurisdictionCode: text("jurisdiction_code").notNull().references(() => jurisdictions.code),
  status: retailerStatus("status").notNull().default("DRAFT"),
  about: text("about"),
  website: text("website"),
  orderingUrl: text("ordering_url"), // legacy: retailer's own ordering page (unused by the marketplace)
  logoKey: text("logo_key"), // store logo (public media)
  coverKey: text("cover_key"), // storefront cover photo (public media)
  acceptsOrders: boolean("accepts_orders").notNull().default(false),
  pickupLeadMinutes: integer("pickup_lead_minutes").notNull().default(30),
  deliveryFeeCents: integer("delivery_fee_cents").notNull().default(0),
  deliveryMinimumCents: integer("delivery_minimum_cents").notNull().default(0),
  deliveryRadiusKm: integer("delivery_radius_km").notNull().default(8),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("retailer_jur_status").on(t.jurisdictionCode, t.status)]);

export const retailerMembers = pgTable("retailer_members", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  retailerId: text("retailer_id").notNull().references(() => retailers.id, { onDelete: "cascade" }),
  role: memberRole("role").notNull().default("STAFF"),
  createdAt: created(),
}, (t) => [primaryKey({ columns: [t.userId, t.retailerId] })]);

export const locations = pgTable("locations", {
  id: id(),
  retailerId: text("retailer_id").notNull().references(() => retailers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  street: text("street").notNull(),
  city: text("city").notNull(),
  jurisdictionCode: text("jurisdiction_code").notNull().references(() => jurisdictions.code),
  postalCode: text("postal_code").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  phone: text("phone"),
  /** [{ d: 0-6 (Sun–Sat), open: "10:00", close: "22:00" }] */
  hours: jsonb("hours").$type<{ d: number; open: string; close: string }[]>().notNull().default([]),
  offersPickup: boolean("offers_pickup").notNull().default(false),
  offersDelivery: boolean("offers_delivery").notNull().default(false),
  /** true when coordinates came from a fallback, not a geocoder — distances are hidden */
  geoApproximate: boolean("geo_approximate").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: created(),
}, (t) => [index("location_jur").on(t.jurisdictionCode, t.active)]);

export const licences = pgTable("licences", {
  id: id(),
  retailerId: text("retailer_id").notNull().references(() => retailers.id, { onDelete: "cascade" }),
  locationId: text("location_id").references(() => locations.id, { onDelete: "set null" }),
  number: text("number").notNull(),
  holderName: text("holder_name").notNull(),
  jurisdictionCode: text("jurisdiction_code").notNull().references(() => jurisdictions.code),
  issuedAt: date("issued_at", { mode: "string" }),
  expiresAt: date("expires_at", { mode: "string" }).notNull(),
  status: licenceStatus("status").notNull().default("PENDING"),
  method: verificationMethod("method"),
  sourceReference: text("source_reference"),
  reviewNotes: text("review_notes"),
  verifiedAt: ts("verified_at"),
  verifiedById: text("verified_by_id"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: created(),
}, (t) => [index("licence_status").on(t.status, t.expiresAt)]);

export const documents = pgTable("documents", {
  id: id(),
  storageKey: text("storage_key").notNull().unique(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sha256: text("sha256").notNull(),
  uploadedById: text("uploaded_by_id").notNull(),
  licenceId: text("licence_id").references(() => licences.id, { onDelete: "cascade" }),
  partnerId: text("partner_id"),
  createdAt: created(),
});

// ─── Products ───────────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id: id(),
  retailerId: text("retailer_id").notNull().references(() => retailers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  category: categoryEnum("category").notNull(),
  size: text("size").notNull(),
  potencyUnit: text("potency_unit").notNull(), // "%" | "mg"
  thcMin: doublePrecision("thc_min"),
  thcMax: doublePrecision("thc_max"),
  cbdMin: doublePrecision("cbd_min"),
  cbdMax: doublePrecision("cbd_max"),
  priceCents: integer("price_cents").notNull(),
  description: text("description"), // factual only
  imageKey: text("image_key"), // optional pack shot uploaded by the store
  /** Grams of dried cannabis this package counts as under the federal 30 g public-possession limit. */
  equivalentGrams: doublePrecision("equivalent_grams").notNull().default(0),
  status: productStatus("status").notNull().default("ACTIVE"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("product_retailer").on(t.retailerId, t.status), index("product_category").on(t.category)]);

export const inventory = pgTable("inventory", {
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  status: stockStatus("status").notNull().default("IN_STOCK"),
  updatedAt: updated(),
}, (t) => [primaryKey({ columns: [t.productId, t.locationId] })]);

export const favourites = pgTable("favourites", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  retailerId: text("retailer_id").references(() => retailers.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, { onDelete: "cascade" }),
  createdAt: created(),
}, (t) => [
  uniqueIndex("fav_user_retailer").on(t.userId, t.retailerId),
  uniqueIndex("fav_user_product").on(t.userId, t.productId),
]);

// ─── Carts & orders ─────────────────────────────────────────────────────────

/** One cart per browser (cookie) or user, holding items from a single store. */
export const carts = pgTable("carts", {
  id: id(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  retailerId: text("retailer_id").references(() => retailers.id, { onDelete: "set null" }),
  locationId: text("location_id").references(() => locations.id, { onDelete: "set null" }),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("cart_user").on(t.userId)]);

export const cartItems = pgTable("cart_items", {
  cartId: text("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  addedAt: created(),
}, (t) => [primaryKey({ columns: [t.cartId, t.productId] })]);

/**
 * An order request to a licensed store. The store is the seller: it accepts
 * the order, checks ID, takes payment and hands over the product. Cairn never
 * takes payment.
 */
export const orders = pgTable("orders", {
  id: id(),
  number: text("number").notNull().unique(), // short human reference, e.g. C-7K2M9
  userId: text("user_id").notNull().references(() => users.id),
  retailerId: text("retailer_id").notNull().references(() => retailers.id),
  locationId: text("location_id").notNull().references(() => locations.id),
  fulfilment: fulfilmentEnum("fulfilment").notNull(),
  status: orderStatus("status").notNull().default("PLACED"),
  subtotalCents: integer("subtotal_cents").notNull(),
  deliveryFeeCents: integer("delivery_fee_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  equivalentGrams: doublePrecision("equivalent_grams").notNull(),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  deliveryAddress: jsonb("delivery_address").$type<{ street: string; unit?: string; city: string; postalCode: string } | null>(),
  notes: text("notes"),
  readyBy: ts("ready_by"),
  cancelReason: text("cancel_reason"),
  idChecked: boolean("id_checked").notNull().default(false),
  partnerId: text("partner_id").references(() => partners.id, { onDelete: "set null" }),
  campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  jurisdictionCode: text("jurisdiction_code").notNull(),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("order_user").on(t.userId, t.createdAt), index("order_retailer").on(t.retailerId, t.status)]);

export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  category: categoryEnum("category").notNull(),
  size: text("size").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  quantity: integer("quantity").notNull(),
  equivalentGrams: doublePrecision("equivalent_grams").notNull(),
});

export const orderEvents = pgTable("order_events", {
  id: id(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  status: orderStatus("status").notNull(),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  note: text("note"),
  createdAt: created(),
}, (t) => [index("order_event_order").on(t.orderId)]);

// ─── Partners & referrals ───────────────────────────────────────────────────

export const partners = pgTable("partners", {
  id: id(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  jurisdictionCode: text("jurisdiction_code").notNull().references(() => jurisdictions.code),
  status: partnerStatus("status").notNull().default("APPLIED"),
  audience: text("audience"),
  channels: jsonb("channels").$type<string[]>().notNull().default([]),
  attestedAt: ts("attested_at"),
  verifiedAt: ts("verified_at"),
  reviewNotes: text("review_notes"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: created(),
});

export const partnerRetailers = pgTable("partner_retailers", {
  partnerId: text("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  retailerId: text("retailer_id").notNull().references(() => retailers.id, { onDelete: "cascade" }),
  status: partnershipStatus("status").notNull().default("REQUESTED"),
  commissionBps: integer("commission_bps"), // honoured only where partner.compensation is ALLOWED
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [primaryKey({ columns: [t.partnerId, t.retailerId] })]);

export const campaigns = pgTable("campaigns", {
  id: id(),
  partnerId: text("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  retailerId: text("retailer_id").notNull().references(() => retailers.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  status: campaignStatus("status").notNull().default("ACTIVE"),
  createdAt: created(),
});

export const referralEvents = pgTable("referral_events", {
  id: id(),
  type: eventType("type").notNull(),
  campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  partnerId: text("partner_id").references(() => partners.id, { onDelete: "set null" }),
  retailerId: text("retailer_id").references(() => retailers.id, { onDelete: "set null" }),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  visitorHash: text("visitor_hash").notNull(),
  ipHash: text("ip_hash"),
  jurisdictionCode: text("jurisdiction_code"),
  riskScore: integer("risk_score").notNull().default(0),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: created(),
}, (t) => [
  index("ev_partner").on(t.partnerId, t.createdAt),
  index("ev_retailer").on(t.retailerId, t.createdAt),
  index("ev_ip").on(t.ipHash, t.createdAt),
]);

/** Reported by the retailer. Cairn never sees or processes the sale itself. */
export const conversions = pgTable("conversions", {
  id: id(),
  retailerId: text("retailer_id").notNull().references(() => retailers.id, { onDelete: "cascade" }),
  campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  partnerId: text("partner_id").references(() => partners.id, { onDelete: "set null" }),
  externalRef: text("external_ref").notNull(),
  orderCents: integer("order_cents"),
  reportedVia: text("reported_via").notNull(), // "api" | "console"
  status: conversionStatus("status").notNull().default("REPORTED"),
  commissionCents: integer("commission_cents"),
  commissionStatus: commissionStatus("commission_status").notNull().default("NOT_APPLICABLE"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: created(),
}, (t) => [uniqueIndex("conv_ref").on(t.retailerId, t.externalRef), index("conv_partner").on(t.partnerId, t.createdAt)]);

export const retailerApiKeys = pgTable("retailer_api_keys", {
  id: id(),
  retailerId: text("retailer_id").notNull().references(() => retailers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  prefix: text("prefix").notNull().unique(),
  keyHash: text("key_hash").notNull(),
  lastUsedAt: ts("last_used_at"),
  revokedAt: ts("revoked_at"),
  createdAt: created(),
});

// ─── Platform ───────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  href: text("href"),
  readAt: ts("read_at"),
  createdAt: created(),
}, (t) => [index("notif_user").on(t.userId, t.readAt)]);

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  ipHash: text("ip_hash"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: created(),
}, (t) => [index("audit_target").on(t.targetType, t.targetId), index("audit_time").on(t.createdAt)]);

export const riskFlags = pgTable("risk_flags", {
  id: id(),
  subjectType: text("subject_type").notNull(), // partner | retailer | campaign | user
  subjectId: text("subject_id").notNull(),
  reason: text("reason").notNull(),
  severity: riskSeverity("severity").notNull(),
  status: riskStatus("status").notNull().default("OPEN"),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  resolution: text("resolution"),
  resolvedById: text("resolved_by_id"),
  resolvedAt: ts("resolved_at"),
  createdAt: created(),
}, (t) => [index("risk_open").on(t.status, t.severity)]);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: ts("window_start").notNull(),
});

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updated(),
});

// ─── Relations (for the relational query API) ───────────────────────────────

export const jurisdictionRelations = relations(jurisdictions, ({ many }) => ({ rules: many(jurisdictionRules) }));
export const ruleRelations = relations(jurisdictionRules, ({ one }) => ({
  jurisdiction: one(jurisdictions, { fields: [jurisdictionRules.jurisdictionCode], references: [jurisdictions.code] }),
}));
export const userRelations = relations(users, ({ many, one }) => ({
  memberships: many(retailerMembers),
  partner: one(partners, { fields: [users.id], references: [partners.userId] }),
  jurisdiction: one(jurisdictions, { fields: [users.jurisdictionCode], references: [jurisdictions.code] }),
}));
export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
export const retailerRelations = relations(retailers, ({ many, one }) => ({
  members: many(retailerMembers),
  licences: many(licences),
  locations: many(locations),
  products: many(products),
  partners: many(partnerRetailers),
  campaigns: many(campaigns),
  jurisdiction: one(jurisdictions, { fields: [retailers.jurisdictionCode], references: [jurisdictions.code] }),
}));
export const memberRelations = relations(retailerMembers, ({ one }) => ({
  user: one(users, { fields: [retailerMembers.userId], references: [users.id] }),
  retailer: one(retailers, { fields: [retailerMembers.retailerId], references: [retailers.id] }),
}));
export const locationRelations = relations(locations, ({ one, many }) => ({
  retailer: one(retailers, { fields: [locations.retailerId], references: [retailers.id] }),
  inventory: many(inventory),
}));
export const licenceRelations = relations(licences, ({ one, many }) => ({
  retailer: one(retailers, { fields: [licences.retailerId], references: [retailers.id] }),
  location: one(locations, { fields: [licences.locationId], references: [locations.id] }),
  documents: many(documents),
}));
export const documentRelations = relations(documents, ({ one }) => ({
  licence: one(licences, { fields: [documents.licenceId], references: [licences.id] }),
}));
export const productRelations = relations(products, ({ one, many }) => ({
  retailer: one(retailers, { fields: [products.retailerId], references: [retailers.id] }),
  inventory: many(inventory),
}));
export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, { fields: [inventory.productId], references: [products.id] }),
  location: one(locations, { fields: [inventory.locationId], references: [locations.id] }),
}));
export const favouriteRelations = relations(favourites, ({ one }) => ({
  retailer: one(retailers, { fields: [favourites.retailerId], references: [retailers.id] }),
  product: one(products, { fields: [favourites.productId], references: [products.id] }),
}));
export const partnerRelations = relations(partners, ({ one, many }) => ({
  user: one(users, { fields: [partners.userId], references: [users.id] }),
  retailers: many(partnerRetailers),
  campaigns: many(campaigns),
}));
export const partnerRetailerRelations = relations(partnerRetailers, ({ one }) => ({
  partner: one(partners, { fields: [partnerRetailers.partnerId], references: [partners.id] }),
  retailer: one(retailers, { fields: [partnerRetailers.retailerId], references: [retailers.id] }),
}));
export const campaignRelations = relations(campaigns, ({ one }) => ({
  partner: one(partners, { fields: [campaigns.partnerId], references: [partners.id] }),
  retailer: one(retailers, { fields: [campaigns.retailerId], references: [retailers.id] }),
  product: one(products, { fields: [campaigns.productId], references: [products.id] }),
}));
export const conversionRelations = relations(conversions, ({ one }) => ({
  retailer: one(retailers, { fields: [conversions.retailerId], references: [retailers.id] }),
  partner: one(partners, { fields: [conversions.partnerId], references: [partners.id] }),
  campaign: one(campaigns, { fields: [conversions.campaignId], references: [campaigns.id] }),
}));
export const cartRelations = relations(carts, ({ one, many }) => ({
  items: many(cartItems),
  retailer: one(retailers, { fields: [carts.retailerId], references: [retailers.id] }),
  location: one(locations, { fields: [carts.locationId], references: [locations.id] }),
}));
export const cartItemRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));
export const orderRelations = relations(orders, ({ one, many }) => ({
  items: many(orderItems),
  events: many(orderEvents),
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  retailer: one(retailers, { fields: [orders.retailerId], references: [retailers.id] }),
  location: one(locations, { fields: [orders.locationId], references: [locations.id] }),
  partner: one(partners, { fields: [orders.partnerId], references: [partners.id] }),
}));
export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));
export const orderEventRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
  actor: one(users, { fields: [orderEvents.actorId], references: [users.id] }),
}));
export const auditRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorId], references: [users.id] }),
}));
export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
