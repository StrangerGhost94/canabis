"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

export async function toggleFavourite(form: FormData) {
  const s = await getSession();
  const back = String(form.get("back") ?? "/discover");
  if (!s) redirect(`/sign-in?next=${encodeURIComponent(back)}`);
  await rateLimit(`fav:${s.user.id}`, 120, 60);
  const { kind, id } = z.object({ kind: z.enum(["product", "retailer"]), id: z.string().min(1).max(64) })
    .parse({ kind: form.get("kind"), id: form.get("id") });
  const col = kind === "product" ? schema.favourites.productId : schema.favourites.retailerId;
  const existing = await db.query.favourites.findFirst({ where: and(eq(schema.favourites.userId, s.user.id), eq(col, id)) });
  if (existing) await db.delete(schema.favourites).where(eq(schema.favourites.id, existing.id));
  else await db.insert(schema.favourites).values({ userId: s.user.id, [kind === "product" ? "productId" : "retailerId"]: id }).onConflictDoNothing();
  revalidatePath(back.split("?")[0]);
}
