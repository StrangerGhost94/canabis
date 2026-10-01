export const money = (cents: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);

export const CATEGORY_LABEL: Record<string, string> = {
  FLOWER: "Dried flower", PRE_ROLL: "Pre-rolls", VAPE: "Vapes", EXTRACT: "Extracts",
  EDIBLE: "Edibles", BEVERAGE: "Beverages", TOPICAL: "Topicals", CAPSULE: "Capsules",
  SEED: "Seeds", ACCESSORY: "Accessories",
};
export const CATEGORIES = Object.keys(CATEGORY_LABEL);

const range = (min: number | null, max: number | null, unit: string) => {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${trim(min)}–${trim(max)} ${unit}`;
  return `${trim((max ?? min)!)} ${unit}`;
};
const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function potency(p: {
  potencyUnit: string; thcMin: number | null; thcMax: number | null; cbdMin: number | null; cbdMax: number | null;
}) {
  const unit = p.potencyUnit === "mg" ? "mg" : "%";
  return { thc: range(p.thcMin, p.thcMax, unit), cbd: range(p.cbdMin, p.cbdMax, unit) };
}

/** THC:CBD balance, used for the ratio filter. */
export function profile(p: { thcMax: number | null; cbdMax: number | null }) {
  const t = p.thcMax ?? 0;
  const c = p.cbdMax ?? 0;
  if (t === 0 && c === 0) return "none";
  if (c === 0 || t / Math.max(c, 0.01) >= 5) return "thc";
  if (t === 0 || c / Math.max(t, 0.01) >= 5) return "cbd";
  return "balanced";
}

export const relTime = (d: Date | string) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return new Date(d).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
};

export const n = (x: number) => new Intl.NumberFormat("en-CA").format(x);
