import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/auth/session";
import { readDocument } from "@/lib/uploads";

/** Verification documents are only ever served to admins and the store that uploaded them. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return new NextResponse("Not found", { status: 404 });
  const doc = await db.query.documents.findFirst({ where: eq(schema.documents.id, (await params).id), with: { licence: true } });
  if (!doc) return new NextResponse("Not found", { status: 404 });
  const isAdmin = s.user.roles.includes("ADMIN");
  const isOwner = !!doc.licence && !!(await db.query.retailerMembers.findFirst({ where: (m, { and, eq }) => and(eq(m.userId, s.user.id), eq(m.retailerId, doc.licence!.retailerId)) }));
  if (!isAdmin && !isOwner) return new NextResponse("Not found", { status: 404 });
  const buf = await readDocument(doc.storageKey);
  await audit({ actorId: s.user.id, action: "document.view", targetType: "document", targetId: doc.id });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.originalName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
