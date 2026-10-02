import { requireUser } from "@/lib/auth/session";
import { Locator } from "@/components/discover/locator";
import { NearControl } from "@/components/discover/near-form";
import { StoreCard } from "@/components/store-card";
import { discover } from "@/lib/queries";
import { getVisitor } from "@/lib/visitor";

export const metadata = { title: "Stores" };

export default async function Stores() {
  await requireUser("/stores");
  const v = await getVisitor();
  if (!v.policy) return <div className="wrap section"><p className="muted">Choose your province or territory to start.</p></div>;
  const { stores, blocked } = await discover(v.policy, v.near, { view: "stores" });
  return (
    <div className="wrap shop" style={{ paddingBlock: "24px 64px" }}>
      <div className="row between mb-3" style={{ alignItems: "flex-end" }}>
        <div><h1 className="h1">Licensed stores</h1><p className="small muted mt-1">{stores.length} in {v.policy.name}, each with a reviewed, current licence.</p></div>
        <NearControl label={v.near?.label ?? null} next="/stores" />
      </div>
      {blocked ? <p className="callout">{v.policy.offMessage("retail.directory")}</p> : (
        <div className="stores-layout">
          <div className="store-list">{stores.map((r) => <StoreCard key={r.id} r={r} policy={v.policy!} />)}</div>
          {v.near && (
            <div className="locator-wrap hide-sm">
              <Locator near={v.near} points={stores.flatMap((r) => r.locs.filter((l) => !l.geoApproximate).map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, open: l.hoursState.open, label: `${r.tradeName} ${l.name}`, href: `/stores/${r.slug}` })))} />
            </div>
          )}
        </div>
      )}
      <style>{`
        .stores-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: var(--s6); align-items: start; }
        .store-list { display: grid; gap: 12px; }
        .locator-wrap { position: sticky; top: 130px; padding: var(--s4); background: var(--surface); border-radius: var(--r-panel); }
        @media (max-width: 1000px) { .stores-layout { grid-template-columns: 1fr; } .locator-wrap { display: none; } }
      `}</style>
    </div>
  );
}
