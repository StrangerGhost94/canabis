import { and, desc, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db, schema } from "@/db";
import { setCampaignStatus } from "@/app/actions/partner";
import { ConsoleHead } from "@/components/console/shell";
import { CopyLink, NewLinkForm } from "@/components/partner/forms";
import { requirePartner } from "@/lib/auth/access";
import { env } from "@/lib/env";
import { relTime } from "@/lib/format";

export const metadata = { title: "Links and QR codes" };

export default async function Links() {
  const { partner } = await requirePartner();
  const verified = partner.status === "VERIFIED";
  const ties = await db.query.partnerRetailers.findMany({ where: and(eq(schema.partnerRetailers.partnerId, partner.id), eq(schema.partnerRetailers.status, "ACTIVE")), with: { retailer: true } });
  const stores = await Promise.all(ties.map(async (t) => ({
    id: t.retailerId, name: t.retailer.tradeName,
    products: (await db.query.products.findMany({ where: and(eq(schema.products.retailerId, t.retailerId), eq(schema.products.status, "ACTIVE")), columns: { id: true, name: true }, orderBy: (p, { asc }) => asc(p.name) })),
  })));
  const camps = await db.query.campaigns.findMany({ where: eq(schema.campaigns.partnerId, partner.id), with: { retailer: true, product: true }, orderBy: desc(schema.campaigns.createdAt) });
  const withQr = await Promise.all(camps.map(async (c) => {
    const url = `${env.APP_URL}/r/${c.code}`;
    return { c, url, qr: await QRCode.toString(url, { type: "svg", margin: 0, color: { dark: "#17302a", light: "#00000000" }, errorCorrectionLevel: "M" }) };
  }));

  return (
    <>
      <ConsoleHead title="Links and QR codes" sub="Make a separate link for each place you share, so you can see what works. Links only count for stores that have accepted your partnership." />
      {!verified ? <p className="callout warn">Links are available once your account is verified.</p> : stores.length === 0 ? (
        <p className="callout">No store has accepted a partnership yet. <a href="/partner/stores">Request one</a>.</p>
      ) : (
        <section className="panel panel-pad mb-3"><h2 className="h4 mb-2">New link</h2><NewLinkForm stores={stores} /></section>
      )}
      <ul className="list ruled links">
        {withQr.map(({ c, url, qr }) => (
          <li key={c.id} className={`link-row ${c.status !== "ACTIVE" ? "dim" : ""}`}>
            <div className="qr" aria-label={`QR code for ${c.name}`} role="img" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="grow stack" style={{ ["--gap" as string]: "4px" }}>
              <p className="h4">{c.name}</p>
              <p className="small muted">{c.retailer.tradeName}{c.product ? `, ${c.product.name}` : ", store page"}. Created {relTime(c.createdAt)}.</p>
              <p className="code small" style={{ alignSelf: "start" }}>{url}</p>
              <div className="row mt-1" style={{ ["--gap" as string]: "8px" }}>
                <CopyLink url={url} />
                <a className="btn sm" download={`cairn-${c.code}.svg`} href={`data:image/svg+xml;utf8,${encodeURIComponent(qr)}`}>Download QR</a>
                <form action={setCampaignStatus}>
                  <input type="hidden" name="id" value={c.id} />
                  {c.status === "ACTIVE" ? <button name="status" value="PAUSED" className="btn ghost sm">Pause</button> : c.status === "PAUSED" ? <button name="status" value="ACTIVE" className="btn ghost sm">Resume</button> : null}
                  {c.status !== "ARCHIVED" && <button name="status" value="ARCHIVED" className="btn ghost sm">Archive</button>}
                </form>
              </div>
            </div>
            <span className={`status ${c.status === "ACTIVE" ? "ok" : "idle"}`}>{c.status === "ACTIVE" ? "Active" : c.status === "PAUSED" ? "Paused" : "Archived"}</span>
          </li>
        ))}
      </ul>
      <style>{`
        .link-row { display: flex; gap: 20px; align-items: flex-start; padding: 20px 0; }
        .link-row.dim { opacity: .6; }
        .qr { width: 96px; height: 96px; flex: none; padding: 8px; background: #fff; border: 1px solid var(--rule); border-radius: 6px; }
        .qr svg { width: 100%; height: 100%; }
        @media (max-width: 600px) { .link-row { flex-wrap: wrap; } .qr { width: 72px; height: 72px; } }
      `}</style>
    </>
  );
}
