import "server-only";
import { db, schema } from "@/db";

export async function notify(userIds: string[], n: { title: string; body: string; href?: string }) {
  if (!userIds.length) return;
  await db.insert(schema.notifications).values(userIds.map((userId) => ({ userId, ...n })));
}
