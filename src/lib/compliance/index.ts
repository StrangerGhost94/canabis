import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/db";
import { RULE_KEYS, RULES, type RuleKey, type RuleState } from "./rules";

export type Policy = {
  code: string;
  name: string;
  legalAge: number;
  regulator: string;
  registryUrl: string | null;
  retailModel: string;
  /** true only for an ALLOWED determination */
  allows: (key: RuleKey) => boolean;
  state: (key: RuleKey) => RuleState;
  offMessage: (key: RuleKey) => string;
};

export const getJurisdictions = cache(async () =>
  db.query.jurisdictions.findMany({ orderBy: (j, { asc }) => asc(j.name) }),
);

/** Resolve the effective policy for a jurisdiction, failing closed. */
export const getPolicy = cache(async (code: string): Promise<Policy> => {
  const jur = await db.query.jurisdictions.findFirst({
    where: eq(schema.jurisdictions.code, code),
    with: { rules: true },
  });
  if (!jur) throw new Error(`Unknown jurisdiction ${code}`);
  const byKey = new Map(jur.rules.map((r) => [r.key, r]));
  const state = (k: RuleKey): RuleState => (byKey.get(k)?.status as RuleState) ?? "UNCONFIRMED";
  return {
    code: jur.code,
    name: jur.name,
    legalAge: jur.legalAge,
    regulator: jur.regulator,
    registryUrl: jur.registryUrl,
    retailModel: jur.retailModel,
    allows: (k) => state(k) === "ALLOWED",
    state,
    offMessage: (k) => RULES[k].off,
  };
});

export async function ensureRuleRows(code: string) {
  await db
    .insert(schema.jurisdictionRules)
    .values(RULE_KEYS.map((key) => ({ jurisdictionCode: code, key })))
    .onConflictDoNothing();
}

export const RESTRICTED_CATEGORY_RULE: Partial<Record<string, RuleKey>> = {
  VAPE: "product.vapes",
  EDIBLE: "product.edibles",
  BEVERAGE: "product.edibles",
};

/** Categories a visitor in this jurisdiction may see listed. */
export function allowedCategories(policy: Policy, all: readonly string[]) {
  return all.filter((c) => {
    const rule = RESTRICTED_CATEGORY_RULE[c];
    return !rule || policy.allows(rule);
  });
}

export function ageFrom(birthDate: string, now = new Date()) {
  const b = new Date(birthDate + "T00:00:00Z");
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

export { TIMEZONES } from "../geo";
