import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requestPartnership } from "@/app/actions/partner";
import { CairnMark } from "@/components/cairn";
import { ConsoleHead } from "@/components/console/shell";
import { requirePartner } from "@/lib/auth/access";
import { getPolicy } from "@/lib/compliance";
import { listedRetailers } from "@/lib/queries";

export const metadata = { title: "Stores" };
const ST: Record<string, [string, string]> = { REQUESTED: ["warn", "Waiting on the store"], ACTIVE: ["ok", "Partnered"], DECLINED: ["idle", "Declined"], ENDED: ["idle", "Ended"] };

export default async function Stores() {
  const { partner } = await requirePartner();
  const policy = await getPolicy(partner.jurisdictionCode);
  const listed = await listedRetailers(partner.jurisdictionCode);
  const ties = new Map((await db.query.partnerRetailers.findMany({ where: eq(schema.partnerRetailers.partnerId, partner.id) })).map((t) => [t.retailerId, t]));
  const canRequest = partner.status === "VERIFIED" && policy.allows("partner.referrals");
  return (
    <>
      <ConsoleHead title="Stores" sub={`Listed stores in ${policy.name}. Each store decides whether to work with you.`} />
      {!canRequest && <p className="callout warn small mb-3">{partner.status !== "VERIFIED" ? "You can request partnerships once you're verified." : policy.offMessage("partner.referrals")}</p>}
      <ul className="list ruled">
        {listed.map((r) => {
          const t = ties.get(r.id);
          return (
            <li key={r.id} className="row" style={{ padding: "16px 0", ["--gap" as string]: "14px" }}>
              <CairnMark trust={r.trust} size={22} />
              <div className="grow"><p className="strong">{r.tradeName}</p><p className="small muted">{r.locations.map((l) => `${l.name}, ${l.city}`).join("; ")}</p></div>
              {t && <span className={`status ${ST[t.status][0]}`}>{ST[t.status][1]}</span>}
              {canRequest && (!t || t.status === "DECLINED" || t.status === "ENDED") && (
                <form action={requestPartnership}><input type="hidden" name="retailerId" value={r.id} /><button className="btn sm">Request partnership</button></form>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
