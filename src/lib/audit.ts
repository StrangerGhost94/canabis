import "server-only";
import { db, schema } from "@/db";
import { clientIpHash } from "./request";

/** Append-only record of every consequential action. */
export async function audit(entry: {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  let ipHash: string | null = null;
  try {
    ipHash = await clientIpHash();
  } catch {
    /* outside a request (seed, jobs) */
  }
  await db.insert(schema.auditLogs).values({
    actorId: entry.actorId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId ?? null,
    metadata: entry.metadata ?? {},
    ipHash,
  });
}
