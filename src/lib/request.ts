import "server-only";
import { headers } from "next/headers";
import { pseudonymise } from "./crypto";

/** Client IP as seen by the platform's proxy. Only ever stored pseudonymised. */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "0.0.0.0";
}

export async function clientIpHash() {
  return pseudonymise(await clientIp());
}

export async function userAgent() {
  return (await headers()).get("user-agent")?.slice(0, 300) ?? null;
}
