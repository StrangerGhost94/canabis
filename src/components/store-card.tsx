import Link from "next/link";
import type { Policy } from "@/lib/compliance";
import { fmtKm, openState } from "@/lib/geo";
import type { Trust } from "@/lib/verification/trust";

type Loc = { id: string; name: string; street: string; city: string; jurisdictionCode: string; hours: { d: number; open: string; close: string }[]; offersPickup: boolean; offersDelivery: boolean; distance?: number | null };

export function StoreCard({ r, policy }: {
  r: { id: string; slug: string; tradeName: string; isDemo: boolean; logoKey?: string | null; coverKey?: string | null; acceptsOrders: boolean; trust: Trust; locations: Loc[]; locs?: Loc[]; matches?: number };
  policy: Policy;
}) {
  const locs = r.locs ?? r.locations;
  const first = locs[0];
  const o = first ? openState(first.hours, first.jurisdictionCode) : null;
  const ordering = policy.allows("orders.online") && r.acceptsOrders;
  const pickup = ordering && policy.allows("retail.pickup") && locs.some((l) => l.offersPickup);
  const delivery = ordering && policy.allows("retail.delivery") && locs.some((l) => l.offersDelivery);
  return (
    <Link href={`/stores/${r.slug}`} className="scard">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <span className="scard-mark" aria-hidden>{r.logoKey ? <img src={`/media/${r.logoKey}`} alt="" /> : r.tradeName.slice(0, 1)}</span>
      <span className="scard-body">
        <span className="row" style={{ ["--gap" as string]: "8px" }}>
          <span className="scard-name">{r.tradeName}</span>
          {r.isDemo && <span className="tag demo">Demo</span>}
        </span>
        <span className="xs row" style={{ ["--gap" as string]: "6px" }}>
          <span className="seal">{r.trust.state === "simulated" ? "Licensed (demo check)" : "Licensed store"}</span>
        </span>
        {first && <span className="small muted">{first.name}, {first.city}{locs.length > 1 ? ` and ${locs.length - 1} more` : ""}{first.distance != null ? `, ${fmtKm(first.distance)}` : ""}</span>}
        <span className="row xs" style={{ ["--gap" as string]: "6px", marginTop: 6 }}>
          {o && <span className={`status ${o.open ? "ok" : "idle"}`}>{o.label}</span>}
          {pickup && <span className="tag">Pickup</span>}
          {delivery && <span className="tag">Delivery</span>}
          {!ordering && <span className="tag">In store only</span>}
        </span>
      </span>
    </Link>
  );
}
