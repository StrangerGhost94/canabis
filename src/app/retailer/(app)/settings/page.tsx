import { ConsoleHead } from "@/components/console/shell";
import { OrderingForm, StoreProfileForm } from "@/components/retailer/forms";
import { requireRetailer } from "@/lib/auth/access";
import { getPolicy } from "@/lib/compliance";

export const metadata = { title: "Store settings" };

export default async function Settings() {
  const { retailer, memberRole } = await requireRetailer();
  const policy = await getPolicy(retailer.jurisdictionCode);
  if (memberRole !== "OWNER") return <><ConsoleHead title="Store settings" /><p className="muted">Only the account owner can change store settings.</p></>;
  return (
    <>
      <ConsoleHead title="Store settings" sub={`Legal entity: ${retailer.legalName}. To change the legal entity, submit a new licence.`} />
      <div className="stack" style={{ ["--gap" as string]: "28px", maxWidth: 640 }}>
        <section className="panel panel-pad"><h2 className="h4 mb-2">Ordering</h2>
          <OrderingForm r={retailer} allowed={policy.allows("orders.online") ? null : policy.offMessage("orders.online")} pickup={policy.allows("retail.pickup")} delivery={policy.allows("retail.delivery")} />
        </section>
        <section className="panel panel-pad"><h2 className="h4 mb-2">Store profile</h2><StoreProfileForm r={retailer} /></section>
      </div>
    </>
  );
}
