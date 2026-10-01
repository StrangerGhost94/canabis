import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/** URL-safe random token. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** Lookup hash for secrets we store (session tokens, API keys). */
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Keyed hash for personal data we only need to compare (IPs, visitor ids). */
export const pseudonymise = (value: string) =>
  createHmac("sha256", env.HASH_SALT).update(value).digest("hex").slice(0, 32);

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Short human-friendly code, no ambiguous characters. */
export function shortCode(length = 7) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
