import "server-only";

/**
 * Licence verification integration points.
 *
 * Cairn does NOT have a connection to any government licensing system. The
 * only provider that produces a real determination today is the manual one:
 * a trained reviewer compares the submission with the regulator's public
 * registry and records the registry reference. Add an ExternalApiProvider
 * implementation once a regulator or licensed data source offers an API.
 */
export type LicenceSubmission = {
  number: string;
  holderName: string;
  jurisdictionCode: string;
  expiresAt: string;
};

export type VerificationResult =
  | { outcome: "match"; sourceReference: string; expiresAt?: string }
  | { outcome: "no_match"; reason: string }
  | { outcome: "needs_review"; reason: string };

export interface LicenceVerifier {
  readonly method: "MANUAL_REGISTRY_CHECK" | "EXTERNAL_API" | "DEMO_SIMULATED";
  readonly label: string;
  /** Whether this provider can act without a human reviewer. */
  readonly automatic: boolean;
  check(sub: LicenceSubmission): Promise<VerificationResult>;
}

/** Real: a human reviewer records the outcome. Automated check always defers. */
export const manualRegistryCheck: LicenceVerifier = {
  method: "MANUAL_REGISTRY_CHECK",
  label: "Reviewer check against the regulator's public registry",
  automatic: false,
  async check() {
    return { outcome: "needs_review", reason: "Compare with the provincial registry and record the reference." };
  },
};

/** Placeholder for a future regulator / data-provider integration. */
export const externalApi: LicenceVerifier = {
  method: "EXTERNAL_API",
  label: "Registry API (not connected)",
  automatic: true,
  async check() {
    throw new Error(
      "No registry API is connected. Implement ExternalApiProvider with a real, contracted data source.",
    );
  },
};

/**
 * Development only. Produces a SIMULATED result so the review flow can be
 * exercised. Records are stored with method DEMO_SIMULATED and are always
 * labelled "Simulated" in every interface. Disabled when DEMO_MODE is off.
 */
export const demoSimulated: LicenceVerifier = {
  method: "DEMO_SIMULATED",
  label: "Simulated check (demo data only)",
  automatic: true,
  async check(sub) {
    if (!sub.number.startsWith("DEMO-")) {
      return { outcome: "needs_review", reason: "Only DEMO- licence numbers can be simulated." };
    }
    return { outcome: "match", sourceReference: `simulated:${sub.number}` };
  },
};
