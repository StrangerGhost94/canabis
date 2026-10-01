import { NextResponse, type NextRequest } from "next/server";
import { readMedia } from "@/lib/uploads";

export async function GET(_: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { buf, mime } = await readMedia((await params).key);
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
