import Link from "next/link";
import { getVisitor } from "@/lib/visitor";

export async function SiteFooter() {
  const v = await getVisitor();
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div className="stack" style={{ ["--gap" as string]: "10px", maxWidth: 420 }}>
          <span className="brand" style={{ fontSize: "1.1rem" }}>
            <span className="cairn" aria-hidden><i /><i /><i /></span>Cairn
          </span>
          <p>
            Cairn is a marketplace for licensed cannabis stores. Every order is fulfilled and paid for at a licensed store, under the rules of your province or territory. Cairn never holds product or takes payment.
          </p>
          {v.policy && (
            <p>
              In {v.policy.name}, cannabis retail is licensed by {v.policy.regulator}.
            </p>
          )}
        </div>
        <div>
          <p className="strong" style={{ color: "var(--ink)" }}>Explore</p>
          <ul><li><Link href="/shop">Shop</Link></li><li><Link href="/brands">Brands</Link></li><li><Link href="/stores">Stores</Link></li><li><Link href="/how-it-works">How verification works</Link></li></ul>
        </div>
        <div>
          <p className="strong" style={{ color: "var(--ink)" }}>Work with Cairn</p>
          <ul><li><Link href="/for-stores">List your store</Link></li><li><Link href="/partners">Become a partner</Link></li></ul>
        </div>
        <div>
          <p className="strong" style={{ color: "var(--ink)" }}>Policies</p>
          <ul><li><Link href="/how-it-works#rules">Provincial rules</Link></li><li><Link href="/how-it-works#report">Report a concern</Link></li></ul>
        </div>
      </div>
    </footer>
  );
}
