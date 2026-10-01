import { ConsoleHead } from "@/components/console/shell";
import { StoreProfileForm } from "@/components/retailer/forms";
import { requireRetailer } from "@/lib/auth/access";
import { getPolicy } from "@/lib/compliance";

export const metadata = { title: "Store profile" };

export default async function Settings() {
  const { retailer, memberRole } = await requireRetailer();
  const policy = await getPolicy(retailer.jurisdictionCode);
  return (
    <>
      <ConsoleHead title="Store profile" sub={`Legal entity: ${retailer.legalName}. To change the legal entity, submit a new licence.`} />
      {memberRole === "OWNER" ? <StoreProfileForm r={retailer} handoffAllowed={policy.allows("retail.onlineHandoff")} /> : <p className="muted">Only the account owner can edit the store profile.</p>}
    </>
  );
}
