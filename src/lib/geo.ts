export const TIMEZONES: Record<string, string> = {
  AB: "America/Edmonton", BC: "America/Vancouver", MB: "America/Winnipeg", NB: "America/Moncton",
  NL: "America/St_Johns", NS: "America/Halifax", NT: "America/Yellowknife", NU: "America/Iqaluit",
  ON: "America/Toronto", PE: "America/Halifax", QC: "America/Toronto", SK: "America/Regina",
  YT: "America/Whitehorse",
};


export const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

export const fmtKm = (d: number) => (d < 1 ? `${Math.round(d * 1000 / 50) * 50} m` : `${d < 10 ? d.toFixed(1) : Math.round(d)} km`);

/**
 * Approximate centroids for a handful of postal-code areas (FSAs) used by the
 * demo. Production should replace this with a licensed geocoding service via
 * the same `resolvePlace` signature.
 */
const FSA: Record<string, { lat: number; lng: number; label: string; jur: string }> = {
  M5V: { lat: 43.6426, lng: -79.3966, label: "Downtown Toronto", jur: "ON" },
  M6J: { lat: 43.6475, lng: -79.4195, label: "Trinity–Bellwoods, Toronto", jur: "ON" },
  M4M: { lat: 43.6595, lng: -79.3446, label: "Leslieville, Toronto", jur: "ON" },
  M6G: { lat: 43.6669, lng: -79.4205, label: "Christie Pits, Toronto", jur: "ON" },
  K1N: { lat: 45.4292, lng: -75.6897, label: "ByWard Market, Ottawa", jur: "ON" },
  V6B: { lat: 49.2797, lng: -123.1124, label: "Downtown Vancouver", jur: "BC" },
  V5T: { lat: 49.2634, lng: -123.0964, label: "Mount Pleasant, Vancouver", jur: "BC" },
  V6K: { lat: 49.2667, lng: -123.1569, label: "Kitsilano, Vancouver", jur: "BC" },
  T2R: { lat: 51.0379, lng: -114.0816, label: "Beltline, Calgary", jur: "AB" },
  T2P: { lat: 51.0486, lng: -114.0708, label: "Downtown Calgary", jur: "AB" },
  H2X: { lat: 45.5104, lng: -73.5681, label: "Quartier des spectacles, Montréal", jur: "QC" },
  B3J: { lat: 44.6488, lng: -63.5752, label: "Downtown Halifax", jur: "NS" },
};

const CITIES: Record<string, keyof typeof FSA> = {
  toronto: "M5V", ottawa: "K1N", vancouver: "V6B", calgary: "T2P", montreal: "H2X", montréal: "H2X", halifax: "B3J",
};

export function resolvePlace(query: string) {
  const q = query.trim().toLowerCase();
  const fsa = q.replace(/\s+/g, "").slice(0, 3).toUpperCase();
  if (FSA[fsa]) return { ...FSA[fsa], key: fsa };
  const city = CITIES[q];
  if (city) return { ...FSA[city], key: city };
  return null;
}

export const PLACES = FSA;

/** Opening status in the store's own time zone. */
export function openState(hours: { d: number; open: string; close: string }[], jur: string, now = new Date()) {
  const tz = TIMEZONES[jur] ?? "America/Toronto";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find((p) => p.type === "weekday")!.value);
  const hm = `${parts.find((p) => p.type === "hour")!.value}:${parts.find((p) => p.type === "minute")!.value}`;
  const today = hours.find((h) => h.d === wd);
  if (today && hm >= today.open && hm < today.close) {
    return { open: true, label: `Open until ${fmtTime(today.close)}` };
  }
  for (let i = 0; i < 7; i++) {
    const day = (wd + i) % 7;
    const h = hours.find((x) => x.d === day);
    if (!h) continue;
    if (i === 0 && hm < h.open) return { open: false, label: `Opens ${fmtTime(h.open)}` };
    if (i > 0) return { open: false, label: `Opens ${i === 1 ? "tomorrow" : DAYS[day]} ${fmtTime(h.open)}` };
  }
  return { open: false, label: "Hours not listed" };
}

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}
