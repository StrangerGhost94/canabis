import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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
  owner: { uploadedById: string; licenceId?: string; partnerId?: string },
) {
  if (!file || file.size === 0) throw new UploadError("Choose a file to upload.");
  if (file.size > MAX_BYTES) throw new UploadError("Files must be 10 MB or smaller.");
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) throw new UploadError("Upload a PDF, JPEG or PNG.");
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
