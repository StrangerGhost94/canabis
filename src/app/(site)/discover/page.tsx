import { requireUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function Discover({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireUser("/shop");
  const sp = new URLSearchParams(await searchParams);
  redirect(sp.get("view") === "stores" ? "/stores" : `/shop${sp.size ? `?${sp}` : ""}`);
}
