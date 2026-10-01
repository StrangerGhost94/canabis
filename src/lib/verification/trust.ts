/**
 * The cairn: three stones that describe why a store is (or isn't) shown.
 * Pure functions — shared by server and client components.
 */
export type LicenceLike = {
  status: string;
  expiresAt: string;
  method: string | null;
  number: string;
  verifiedAt: Date | string | null;
  sourceReference?: string | null;
  isDemo?: boolean;
};

export type Stone = { key: "licence" | "current" | "listing"; ok: boolean; label: string; detail: string };

export type Trust = {
  state: "verified" | "simulated" | "pending" | "expired" | "suspended" | "unlisted";
  stones: Stone[];
  headline: string;
  licence: LicenceLike | null;
  listed: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);

export function pickLicence(licences: LicenceLike[]) {
  const ranked = [...licences].sort((a, b) => {
    const rank = (l: LicenceLike) => (l.status === "VERIFIED" ? 0 : l.status === "PENDING" ? 1 : 2);
    return rank(a) - rank(b) || b.expiresAt.localeCompare(a.expiresAt);
  });
  return ranked[0] ?? null;
}

export function fmtDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d.length === 10 ? d + "T12:00:00Z" : d) : d;
  return date.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function trustFor(
  retailer: { status: string },
  licences: LicenceLike[],
  lastInventoryUpdate?: Date | null,
): Trust {
  const licence = pickLicence(licences);
  const verified = licence?.status === "VERIFIED";
  const simulated = verified && licence?.method === "DEMO_SIMULATED";
  const current = !!licence && licence.expiresAt >= today() && licence.status !== "EXPIRED";
  const fresh = !!lastInventoryUpdate && Date.now() - new Date(lastInventoryUpdate).getTime() < 14 * 86400e3;

  const stones: Stone[] = [
    {
      key: "licence",
      ok: verified,
      label: verified ? (simulated ? "Licence check simulated" : "Licence checked") : "Licence not yet checked",
      detail: verified
        ? simulated
          ? "Demo data. This record was not checked against any real registry."
          : `Compared with the regulator's public registry on ${fmtDate(licence!.verifiedAt!)}.`
        : "Cairn reviews every licence before a store is listed.",
    },
    {
      key: "current",
      ok: current,
      label: current ? "Licence current" : licence ? "Licence expired" : "No licence on file",
      detail: licence ? `${current ? "Valid until" : "Expired"} ${fmtDate(licence.expiresAt)}.` : "—",
    },
    {
      key: "listing",
      ok: fresh && retailer.status === "VERIFIED",
      label: fresh ? "Availability updated recently" : "Availability may be out of date",
      detail: lastInventoryUpdate
        ? `The store last updated what's in stock on ${fmtDate(new Date(lastInventoryUpdate))}.`
        : "The store hasn't published availability yet.",
    },
  ];

  let state: Trust["state"];
  if (retailer.status === "SUSPENDED") state = "suspended";
  else if (licence && !current) state = "expired";
  else if (!verified || retailer.status !== "VERIFIED") state = "pending";
  else state = simulated ? "simulated" : "verified";

  const headline = {
    verified: "Licensed retailer, checked by Cairn",
    simulated: "Demo listing — licence check simulated",
    pending: "Not yet verified — not listed",
    expired: "Licence expired — listing paused",
    suspended: "Listing suspended",
    unlisted: "Not listed",
  }[state];

  return { state, stones, headline, licence, listed: state === "verified" || state === "simulated" };
}
