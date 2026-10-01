import { desc } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { activateLocation } from "@/app/actions/admin";
import { StatusForm } from "@/components/admin/forms";
import { CairnMark } from "@/components/cairn";
import { ConsoleHead } from "@/components/console/shell";
import { lastInventoryUpdates } from "@/lib/queries";
import { fmtDate, trustFor } from "@/lib/verification/trust";

export const metadata = { title: "Retailers" };

export default async function Retailers() {
  const rs = await db.query.retailers.findMany({ with: { licences: true, locations: true }, orderBy: desc(schema.retailers.createdAt) });
  const upd = await lastInventoryUpdates(rs.map((r) => r.id));
  return (
    <>
      <ConsoleHead title="Retailers" sub="Status is computed from the licence record; suspending overrides it." />
      <div className="panel table-wrap">
        <table>
          <thead><tr><th>Store</th><th>Province</th><th>Licence</th><th>Customer-facing state</th><th>Locations</th><th style={{ minWidth: 280 }}>Enforcement</th></tr></thead>
          <tbody>
            {rs.map((r) => {
              const t = trustFor(r, r.licences, upd.get(r.id));
              return (
                <tr key={r.id}>
                  <td><Link href={`/stores/${r.slug}`} className="strong">{r.tradeName}</Link><br /><span className="muted">{r.legalName}</span></td>
                  <td>{r.jurisdictionCode}</td>
                  <td className="num">{t.licence?.number ?? "—"}<br /><span className="muted">{t.licence ? `exp. ${fmtDate(t.licence.expiresAt)}` : ""}</span></td>
                  <td><span className="row" style={{ ["--gap" as string]: "8px", flexWrap: "nowrap" }}><CairnMark trust={t} size={14} label={false} />{t.headline}</span></td>
                  <td>{r.locations.map((l) => (
                    <div key={l.id} className="row" style={{ ["--gap" as string]: "6px" }}>{l.name}{!l.active && <form action={activateLocation}><input type="hidden" name="id" value={l.id} /><button className="linkbtn small">Activate</button></form>}</div>
                  ))}</td>
                  <td>{r.status === "VERIFIED" || r.status === "SUSPENDED" ? <StatusForm kind="retailer" id={r.id} current={r.status} /> : <span className="muted small">Awaiting licence review</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
