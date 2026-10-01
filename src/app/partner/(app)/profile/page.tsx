import Link from "next/link";
import { ConsoleHead } from "@/components/console/shell";
import { ProfileForm } from "@/components/partner/forms";
import { requirePartner } from "@/lib/auth/access";

export const metadata = { title: "Profile" };

export default async function Profile() {
  const { partner } = await requirePartner();
  return (
    <>
      <ConsoleHead title="Profile" sub={<>Your public page is <Link href={`/p/${partner.handle}`}>/p/{partner.handle}</Link>{partner.status !== "VERIFIED" ? ", published once you're verified" : ""}. Bios are screened for health claims and youth-appealing language.</>} />
      <ProfileForm p={partner} />
    </>
  );
}
