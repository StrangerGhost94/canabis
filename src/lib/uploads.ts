import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { randomToken } from "./crypto";
import { env } from "./env";
import { UserFacingError } from "./actions/result";

const MAX_BYTES = 10 * 1024 * 1024;

/** Accept by content, not by the name or type the browser claims. */
function sniff(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.subarray(0, 5).toString() === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: "image/png", ext: "png" };
  return null;
}

export class UploadError extends UserFacingError {}

/**
 * Store a verification document outside the web root. Files are only ever
 * served through an authorised route, never directly.
 */
export async function storeDocument(
  file: File,
  owner: { uploadedById: string; licenceId?: string; partnerId?: string; subjectUserId?: string },
  opts: { imagesOnly?: boolean } = {},
) {
  if (!file || file.size === 0) throw new UploadError("Choose a file to upload.");
  if (file.size > MAX_BYTES) throw new UploadError("Files must be 10 MB or smaller.");
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) throw new UploadError("Upload a PDF, JPEG or PNG.");
  if (opts.imagesOnly && kind.mime === "application/pdf") throw new UploadError("Upload a photo (JPEG or PNG).");
  const storageKey = `${new Date().toISOString().slice(0, 7)}/${randomToken(18)}.${kind.ext}`;
  const full = path.resolve(env.UPLOAD_DIR, storageKey);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buf, { mode: 0o600 });
  const [doc] = await db
    .insert(schema.documents)
    .values({
      storageKey,
      originalName: file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120),
      mimeType: kind.mime,
      sizeBytes: buf.length,
      sha256: createHash("sha256").update(buf).digest("hex"),
      ...owner,
    })
    .returning();
  return doc;
}

export async function readDocument(storageKey: string) {
  const root = path.resolve(env.UPLOAD_DIR);
  const full = path.resolve(root, storageKey);
  if (!full.startsWith(root + path.sep)) throw new UploadError("Invalid path.");
  return readFile(full);
}

/** Public product images. Stored privately on disk, served through /media/[key]. */
export async function storeMedia(file: File) {
  if (!file || file.size === 0) throw new UploadError("Choose an image.");
  if (file.size > 4 * 1024 * 1024) throw new UploadError("Images must be 4 MB or smaller.");
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind || kind.mime === "application/pdf") throw new UploadError("Upload a JPEG or PNG image.");
  const key = `${randomToken(16)}.${kind.ext}`;
  const full = path.resolve(env.UPLOAD_DIR, "media", key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buf, { mode: 0o600 });
  return key;
}

export async function readMedia(key: string) {
  if (!/^[\w-]+\.(jpg|png)$/.test(key)) throw new UploadError("Invalid image.");
  return { buf: await readFile(path.resolve(env.UPLOAD_DIR, "media", key)), mime: key.endsWith(".png") ? "image/png" : "image/jpeg" };
}

/** Permanently remove a stored document and its record. */
export async function deleteDocument(doc: { id: string; storageKey: string }) {
  const root = path.resolve(env.UPLOAD_DIR);
  const full = path.resolve(root, doc.storageKey);
  if (full.startsWith(root + path.sep)) await unlink(full).catch(() => undefined);
  await db.delete(schema.documents).where(eq(schema.documents.id, doc.id));
}
