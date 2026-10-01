import "server-only";
import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended argon2id parameters.
const opts = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export const hashPassword = (pw: string) => hash(pw, opts);

export async function verifyPassword(hashed: string, pw: string) {
  try {
    return await verify(hashed, pw);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | null = null;
/** Burn equivalent time when the account doesn't exist, so login can't enumerate emails. */
export async function verifyAgainstDummy(pw: string) {
  dummy ??= hashPassword("not-a-real-password");
  await verifyPassword(await dummy, pw);
  return false;
}
