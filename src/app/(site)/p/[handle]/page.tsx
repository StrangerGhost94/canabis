import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { CairnMark } from "@/components/cairn";
import { getPolicy } from "@/lib/compliance";
import { listedRetailers } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  return { title: `@${(await params).handle}` };
}

export default async function PartnerProfile({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const partner = await db.query.partners.findFirst({ where: eq(schema.partners.handle, handle.toLowerCase()) });
  if (!partner || partner.status !== "VERIFIED") notFound();
  const policy = await getPolicy(partner.jurisdictionCode);
  if (!policy.allows("partner.profiles")) notFound();

  const ties = await db.query.partnerRetailers.findMany({
    where: and(eq(schema.partnerRetailers.partnerId, partner.id), eq(schema.partnerRetailers.status, "ACTIVE")),
  });
  const listed = await listedRetailers(partner.jurisdictionCode);
  const camps = await db.query.campaigns.findMany({ where: and(eq(schema.campaigns.partnerId, partner.id), eq(schema.campaigns.status, "ACTIVE")) });
  const stores = ties
    .map((t) => ({ t, r: listed.find((r) => r.id === t.retailerId), c: camps.find((c) => c.retailerId === t.retailerId && !c.productId) }))
    .filter((x) => x.r);
  const paid = policy.allows("partner.compensation") && stores.some((s) => s.t.commissionBps);
  const initials = partner.displayName.split(" ").map((w) => w[0]).join("").slice(0, 2);

  return (
    <div className="wrap section" style={{ maxWidth: 760 }}>
      <div className="row" style={{ ["--gap" as string]: "18px" }}>
        <span className="pp-avatar" aria-hidden>{initials}</span>
        <div>
          <div className="row" style={{ ["--gap" as string]: "8px" }}><h1 className="h1">{partner.displayName}</h1>{partner.isDemo && <span className="tag demo">Demo</span>}</div>
          <p className="small muted">@{partner.handle}, verified Cairn partner in {policy.name}</p>
        </div>
      </div>
      {partner.bio && <p className="lede mt-3">{partner.bio}</p>}
      <div className="callout small mt-3">
        {paid
          ? `${partner.displayName.split(" ")[0]} may earn a commission from some of these stores when you buy through these links. Prices are the same either way.`
          : `${partner.displayName.split(" ")[0]} isn't paid for these recommendations.`}{" "}
        Partners don't sell cannabis. You always buy from the licensed store.
      </div>
      <h2 className="h3 mt-4 mb-2">Stores {partner.displayName.split(" ")[0]} recommends</h2>
      {stores.length === 0 ? <p className="muted">No recommendations yet.</p> : (
        <ul className="list ruled">
          {stores.map(({ r, c }) => (
            <li key={r!.id}>
              <Link href={c ? `/r/${c.code}` : `/stores/${r!.slug}`} className="list-link row" style={{ padding: "16px 4px", ["--gap" as string]: "14px" }}>
                <CairnMark trust={r!.trust} size={24} />
                <span className="grow"><span className="h4">{r!.tradeName}</span><br /><span className="small muted">{r!.locations.map((l) => l.name).join(", ")}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <style>{`.pp-avatar { width: 64px; height: 64px; border-radius: var(--stone-r); background: var(--ink); color: var(--bg); display: grid; place-items: center; font-weight: 650; font-size: 1.3rem; flex: none; }`}</style>
    </div>
  );
}
