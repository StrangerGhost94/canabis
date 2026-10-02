import { headers } from "next/headers";
import { BottomNav } from "@/components/bottom-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/auth/session";
import { cartCount } from "@/lib/cart";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "/";
  const session = await getSession();
  return (
    <div className={session ? "site has-nav" : "site"}>
      <SiteHeader path={path} />
      <main id="main">{children}</main>
      <SiteFooter />
      {session && <BottomNav signedIn cartItems={await cartCount()} />}
    </div>
  );
}

