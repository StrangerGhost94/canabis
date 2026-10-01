import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ConsoleHead } from "@/components/console/shell";
import { LocationForm } from "@/components/retailer/forms";
import { requireRetailer } from "@/lib/auth/access";
import { getPolicy } from "@/lib/compliance";

export const metadata = { title: "Locations and hours" };

export default async function Locations() {
  const { retailer, memberRole } = await requireRetailer();
  const policy = await getPolicy(retailer.jurisdictionCode);
  const locs = await db.query.locations.findMany({ where: eq(schema.locations.retailerId, retailer.id), orderBy: (l, { asc }) => asc(l.createdAt) });
  const owner = memberRole === "OWNER";
  const allow = { pickupAllowed: policy.allows("retail.pickup"), deliveryAllowed: policy.allows("retail.delivery") };
  return (
    <>
      <ConsoleHead title="Locations and hours" sub="Hours are shown in the store's local time. New locations go live once Cairn confirms they're covered by a licence." />
      <div className="stack" style={{ ["--gap" as string]: "16px" }}>
        {locs.map((l) => (
          <details key={l.id} className="panel">
            <summary className="panel-head" style={{ cursor: "pointer", borderBottom: 0 }}>
              <span><span className="strong">{l.name}</span> <span className="muted small">{l.street}, {l.city}</span></span>
              <span className={`status ${l.active ? "ok" : "warn"}`}>{l.active ? "Live" : "Awaiting review"}</span>
            </summary>
            <div className="panel-pad" style={{ borderTop: "1px solid var(--rule)" }}>
              {owner ? <LocationForm loc={l} {...allow} /> : <p className="muted small">Only the account owner can edit locations.</p>}
            </div>
          </details>
        ))}
        {owner && (
          <details className="panel">
            <summary className="panel-head" style={{ cursor: "pointer", borderBottom: 0 }}><span className="strong">Add a location</span></summary>
            <div className="panel-pad" style={{ borderTop: "1px solid var(--rule)" }}><LocationForm {...allow} /></div>
          </details>
        )}
      </div>
    </>
  );
}
