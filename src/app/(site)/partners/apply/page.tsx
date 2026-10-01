import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { ApplyForm } from "@/components/partner/forms";
import { requireUser } from "@/lib/auth/session";
import { getPolicy } from "@/lib/compliance";

export const metadata = { title: "Apply to be a partner" };

export default async function Apply() {
  const user = await requireUser("/partners/apply");
  if (await db.query.partners.findFirst({ where: eq(schema.partners.userId, user.id) })) redirect("/partner");
  const policy = await getPolicy(user.jurisdictionCode);
  return (
    <div className="wrap section" style={{ maxWidth: 720 }}>
      <h1 className="h1">Apply to be a partner</h1>
      <p className="lede mt-1">A reviewer reads every application. Tell us who you are and who you reach.</p>
      {!policy.allows("partner.referrals") && <p className="callout warn small mt-2">{policy.offMessage("partner.referrals")} You can still apply and set up your profile.</p>}
      <div className="mt-4"><ApplyForm name={user.name} /></div>
    </div>
  );
}
