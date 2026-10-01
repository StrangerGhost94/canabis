import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { DemoRibbon } from "@/components/demo-ribbon";
import { OnboardingForm } from "@/components/retailer/forms";
import { requireRole } from "@/lib/auth/session";
import { getPolicy } from "@/lib/compliance";

export const metadata = { title: "List your store" };

export default async function Onboarding() {
  const user = await requireRole("RETAILER", "/retailer/onboarding");
  if (await db.query.retailerMembers.findFirst({ where: eq(schema.retailerMembers.userId, user.id) })) redirect("/retailer");
  const policy = await getPolicy(user.jurisdictionCode);
  return (
    <>
      <DemoRibbon />
      <div className="wrap section" style={{ maxWidth: 760 }}>
        <Link href="/" className="brand mb-3"><span className="cairn" aria-hidden><i /><i /><i /></span>Cairn</Link>
        <h1 className="h1 mt-3">List your store</h1>
        <p className="lede mt-1">Tell us about your store and licence. A reviewer checks the licence against {policy.regulator}'s public registry before anything is shown to customers.</p>
        {!policy.allows("retail.directory") && (
          <p className="callout warn small mt-2">Cairn isn't listing stores in {policy.name} yet. You can still submit, and we'll review your licence when listings open.</p>
        )}
        <div className="mt-4"><OnboardingForm province={policy.name} legalAge={policy.legalAge} /></div>
      </div>
    </>
  );
}
