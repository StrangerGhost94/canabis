/**
 * Seed Cairn (runs on every start, idempotent).
 *
 *   - provinces/territories and their rule rows (new rules start UNCONFIRMED)
 *   - removes any fictional data left over from the old demo environment
 *   - promotes ADMIN_EMAIL to administrator
 *
 * There is no demo data. Stores, products and partners come from real sign-ups.
 */
import { hash } from "@node-rs/argon2";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as s from "../src/db/schema";
import { RULE_KEYS } from "../src/lib/compliance/rules";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: s });

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


async function main() {
  console.log("Seeding jurisdictions and rules…");

  await db.insert(s.jurisdictions)
    .values(JURISDICTIONS.map((j) => ({ ...j, ageSource: AGE_SOURCE })))
    .onConflictDoNothing();
  for (const j of JURISDICTIONS) {
    await db.insert(s.jurisdictionRules)
      .values(RULE_KEYS.map((key) => ({ jurisdictionCode: j.code, key })))
      .onConflictDoNothing();
  }

  await purgeDemo();
  await bootstrapAdmin();
  console.log("Done.");
  await pool.end();
}

/**
 * Real mode: remove every fictional row and every simulated rule determination.
 * Idempotent, so it is safe to run on every deploy.
 */
async function purgeDemo() {
  const demoRetailers = sql`(select id from retailers where is_demo)`;
  const demoPartners = sql`(select id from partners where is_demo)`;
  const demoUsers = sql`(select id from users where is_demo)`;
  const r = await db.transaction(async (tx) => {
    await tx.execute(sql`delete from conversions where is_demo or retailer_id in ${demoRetailers} or partner_id in ${demoPartners}`);
    await tx.execute(sql`delete from referral_events where is_demo or retailer_id in ${demoRetailers} or partner_id in ${demoPartners}`);
    await tx.execute(sql`delete from orders where is_demo or user_id in ${demoUsers} or retailer_id in ${demoRetailers}`);
    await tx.execute(sql`delete from carts where user_id in ${demoUsers} or retailer_id in ${demoRetailers}`);
    await tx.execute(sql`delete from risk_flags where subject_id in ${demoPartners} or subject_id in ${demoRetailers}`);
    const rs = await tx.execute(sql`delete from retailers where is_demo`);
    await tx.execute(sql`delete from partners where is_demo`);
    const us = await tx.execute(sql`delete from users where is_demo`);
    const rules = await tx.execute(sql`update jurisdiction_rules set status = 'UNCONFIRMED', source = null, notes = null, is_demo = false, reviewed_by_id = null, reviewed_at = null where is_demo`);
    return { stores: rs.rowCount ?? 0, users: us.rowCount ?? 0, rules: rules.rowCount ?? 0 };
  });
  if (r.stores || r.users || r.rules) console.log(`Removed old demo data: ${r.stores} stores, ${r.users} accounts, ${r.rules} simulated rule settings reset.`);
}

/** Creates (or promotes) the first administrator from ADMIN_EMAIL / ADMIN_PASSWORD. Never uses a default password. */
async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email) return console.log("No ADMIN_EMAIL set; skipping admin bootstrap.");
  const existing = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, email) });
  if (existing) {
    if (!existing.roles.includes("ADMIN")) {
      await db.update(s.users).set({ roles: [...existing.roles, "ADMIN"] }).where(sql`${s.users.id} = ${existing.id}`);
      console.log(`Granted admin to ${email}.`);
    }
    return;
  }
  if (!password || password.length < 12) return console.log(`No account for ${email} yet. Sign up with that email to become the administrator.`);
  await db.insert(s.users).values({
    email, name: process.env.ADMIN_NAME?.trim() || "Administrator",
    passwordHash: await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
    birthDate: "1970-01-01", jurisdictionCode: process.env.ADMIN_REGION?.trim().toUpperCase() || "ON", roles: ["CUSTOMER", "ADMIN"],
  });
  console.log(`Created administrator ${email}.`);
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
