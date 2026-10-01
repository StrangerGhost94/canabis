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

export type Place = { lat: number; lng: number; label: string; jur: string | null; key: string };

/**
 * City centroids for instant lookups without a network call. Anything else
 * (full postal codes, addresses, smaller towns) goes through `geocode`.
 */
const CITY: Record<string, { lat: number; lng: number; label: string; jur: string }> = {
  toronto: { lat: 43.6532, lng: -79.3832, label: "Toronto", jur: "ON" },
  ottawa: { lat: 45.4215, lng: -75.6972, label: "Ottawa", jur: "ON" },
  mississauga: { lat: 43.589, lng: -79.6441, label: "Mississauga", jur: "ON" },
  hamilton: { lat: 43.2557, lng: -79.8711, label: "Hamilton", jur: "ON" },
  london: { lat: 42.9849, lng: -81.2453, label: "London, ON", jur: "ON" },
  kingston: { lat: 44.2312, lng: -76.486, label: "Kingston", jur: "ON" },
  waterloo: { lat: 43.4643, lng: -80.5204, label: "Waterloo", jur: "ON" },
  kitchener: { lat: 43.4516, lng: -80.4925, label: "Kitchener", jur: "ON" },
  guelph: { lat: 43.5448, lng: -80.2482, label: "Guelph", jur: "ON" },
  windsor: { lat: 42.3149, lng: -83.0364, label: "Windsor", jur: "ON" },
  sudbury: { lat: 46.4917, lng: -80.993, label: "Sudbury", jur: "ON" },
  "thunder bay": { lat: 48.3809, lng: -89.2477, label: "Thunder Bay", jur: "ON" },
  "st. catharines": { lat: 43.1594, lng: -79.2469, label: "St. Catharines", jur: "ON" },
  barrie: { lat: 44.3894, lng: -79.6903, label: "Barrie", jur: "ON" },
  oshawa: { lat: 43.8971, lng: -78.8658, label: "Oshawa", jur: "ON" },
  peterborough: { lat: 44.3091, lng: -78.3197, label: "Peterborough", jur: "ON" },
  montreal: { lat: 45.5019, lng: -73.5674, label: "Montréal", jur: "QC" },
  "montréal": { lat: 45.5019, lng: -73.5674, label: "Montréal", jur: "QC" },
  "quebec city": { lat: 46.8139, lng: -71.208, label: "Québec City", jur: "QC" },
  sherbrooke: { lat: 45.4042, lng: -71.8929, label: "Sherbrooke", jur: "QC" },
  gatineau: { lat: 45.4765, lng: -75.7013, label: "Gatineau", jur: "QC" },
  vancouver: { lat: 49.2827, lng: -123.1207, label: "Vancouver", jur: "BC" },
  victoria: { lat: 48.4284, lng: -123.3656, label: "Victoria", jur: "BC" },
  kelowna: { lat: 49.888, lng: -119.496, label: "Kelowna", jur: "BC" },
  burnaby: { lat: 49.2488, lng: -122.9805, label: "Burnaby", jur: "BC" },
  surrey: { lat: 49.1913, lng: -122.849, label: "Surrey", jur: "BC" },
  kamloops: { lat: 50.6745, lng: -120.3273, label: "Kamloops", jur: "BC" },
  nanaimo: { lat: 49.1659, lng: -123.9401, label: "Nanaimo", jur: "BC" },
  "prince george": { lat: 53.9171, lng: -122.7497, label: "Prince George", jur: "BC" },
  calgary: { lat: 51.0447, lng: -114.0719, label: "Calgary", jur: "AB" },
  edmonton: { lat: 53.5461, lng: -113.4938, label: "Edmonton", jur: "AB" },
  lethbridge: { lat: 49.6956, lng: -112.8451, label: "Lethbridge", jur: "AB" },
  "red deer": { lat: 52.2681, lng: -113.8112, label: "Red Deer", jur: "AB" },
  saskatoon: { lat: 52.1332, lng: -106.67, label: "Saskatoon", jur: "SK" },
  regina: { lat: 50.4452, lng: -104.6189, label: "Regina", jur: "SK" },
  winnipeg: { lat: 49.8951, lng: -97.1384, label: "Winnipeg", jur: "MB" },
  brandon: { lat: 49.8485, lng: -99.95, label: "Brandon", jur: "MB" },
  halifax: { lat: 44.6488, lng: -63.5752, label: "Halifax", jur: "NS" },
  antigonish: { lat: 45.6169, lng: -61.9986, label: "Antigonish", jur: "NS" },
  wolfville: { lat: 45.0918, lng: -64.3598, label: "Wolfville", jur: "NS" },
  fredericton: { lat: 45.9636, lng: -66.6431, label: "Fredericton", jur: "NB" },
  moncton: { lat: 46.0878, lng: -64.7782, label: "Moncton", jur: "NB" },
  "saint john": { lat: 45.2733, lng: -66.0633, label: "Saint John", jur: "NB" },
  "st. john's": { lat: 47.5615, lng: -52.7126, label: "St. John's", jur: "NL" },
  "st johns": { lat: 47.5615, lng: -52.7126, label: "St. John's", jur: "NL" },
  charlottetown: { lat: 46.2382, lng: -63.1311, label: "Charlottetown", jur: "PE" },
  whitehorse: { lat: 60.7212, lng: -135.0568, label: "Whitehorse", jur: "YT" },
  yellowknife: { lat: 62.454, lng: -114.3718, label: "Yellowknife", jur: "NT" },
  iqaluit: { lat: 63.7467, lng: -68.517, label: "Iqaluit", jur: "NU" },
};

/** First letter of a Canadian postal code → province/territory. */
const POSTAL_PREFIX: Record<string, string> = {
  A: "NL", B: "NS", C: "PE", E: "NB", G: "QC", H: "QC", J: "QC", K: "ON", L: "ON", M: "ON", N: "ON", P: "ON",
  R: "MB", S: "SK", T: "AB", V: "BC", Y: "YT",
};
export const POSTAL_RE = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;

export function provinceForPostal(postal: string) {
  const p = postal.trim().toUpperCase();
  if (p.startsWith("X")) return p.startsWith("X0A") || p.startsWith("X0B") || p.startsWith("X0C") ? "NU" : "NT";
  return POSTAL_PREFIX[p[0]] ?? null;
}

/** Encodes a resolved place into a short cookie value: `lat,lng|jur|label`. */
const encode = (p: Omit<Place, "key">) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}|${p.jur ?? ""}|${p.label.slice(0, 48)}`;

/**
 * Synchronous: decodes a stored place, or matches a known city. Used on every
 * request, so it never touches the network.
 */
export function resolvePlace(query: string): Place | null {
  const raw = query.trim();
  const m = raw.match(/^(-?\d+\.\d+),(-?\d+\.\d+)\|([A-Z]{2})?\|(.*)$/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]), jur: m[3] ?? null, label: m[4] || "Your location", key: raw };
  const c = CITY[raw.toLowerCase().replace(/,.*$/, "").trim()];
  if (c) return { ...c, key: encode(c) };
  return null;
}

const ISO_TO_CODE = (iso?: string) => (iso && iso.startsWith("CA-") ? iso.slice(3) : null);

type Nominatim = { lat: string; lon: string; display_name: string; address?: Record<string, string> };

async function nominatim(path: string): Promise<Nominatim | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/${path}`, {
      headers: { "User-Agent": `Cairn marketplace (${process.env.APP_URL ?? "cairn"})`, "Accept-Language": "en-CA" },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) return null;
    const j = await res.json();
    return Array.isArray(j) ? j[0] ?? null : j?.lat ? j : null;
  } catch {
    return null;
  }
}

const shortLabel = (a: Record<string, string> = {}, fallback: string) =>
  a.neighbourhood || a.suburb || a.quarter
    ? `${a.neighbourhood || a.suburb || a.quarter}, ${a.city || a.town || a.village || ""}`.replace(/, $/, "")
    : a.city || a.town || a.village || a.municipality || fallback;

/**
 * Any Canadian postal code, address or place name → coordinates and province.
 * Known cities resolve instantly; everything else uses OpenStreetMap's
 * Nominatim (low volume, cached 30 days). Swap for a commercial geocoder at scale.
 */
export async function geocode(query: string): Promise<Place | null> {
  const q = query.trim().slice(0, 120);
  if (!q) return null;
  const known = resolvePlace(q);
  if (known) return known;
  const hit = await nominatim(`search?format=jsonv2&addressdetails=1&limit=1&countrycodes=ca&q=${encodeURIComponent(q)}`);
  if (!hit) return null;
  const jur = ISO_TO_CODE(hit.address?.["ISO3166-2-lvl4"]) ?? (POSTAL_RE.test(q) ? provinceForPostal(q) : null);
  const place = { lat: Number(hit.lat), lng: Number(hit.lon), jur, label: POSTAL_RE.test(q) ? q.toUpperCase() : shortLabel(hit.address, q) };
  return { ...place, key: encode(place) };
}

/** Coordinates from the browser → a labelled place with its province. */
export async function reverseGeocode(lat: number, lng: number): Promise<Place> {
  const hit = await nominatim(`reverse?format=jsonv2&addressdetails=1&zoom=14&lat=${lat}&lon=${lng}`);
  const place = { lat, lng, jur: ISO_TO_CODE(hit?.address?.["ISO3166-2-lvl4"]), label: hit ? shortLabel(hit.address, "Your location") : "Your location" };
  return { ...place, key: encode(place) };
}

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
