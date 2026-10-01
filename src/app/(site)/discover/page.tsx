import { redirect } from "next/navigation";

export default async function Discover({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = new URLSearchParams(await searchParams);
  redirect(sp.get("view") === "stores" ? "/stores" : `/shop${sp.size ? `?${sp}` : ""}`);
}
