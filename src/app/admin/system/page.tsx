import { SweepForm } from "@/components/admin/forms";
import { ConsoleHead } from "@/components/console/shell";
import { env } from "@/lib/env";
import { externalApi, manualRegistryCheck } from "@/lib/verification/providers";

export const metadata = { title: "System" };

export default function System() {
  const providers = [
    { p: manualRegistryCheck, state: "Active", tone: "ok", note: "Produces real determinations. Requires a registry reference." },
    { p: externalApi, state: "Not connected", tone: "idle", note: "Integration point for a regulator or contracted data provider. Implement in lib/verification/providers.ts." },
  ];
  return (
    <>
      <ConsoleHead title="System" />
      <div className="stack" style={{ ["--gap" as string]: "24px", maxWidth: 860 }}>
        <section className="panel">
          <div className="panel-head"><h2 className="h4">Licence verification providers</h2></div>
          <table><tbody>
            {providers.map(({ p, state, tone, note }) => <tr key={p.method}><td><span className="strong">{p.label}</span><br /><span className="muted">{note}</span></td><td className="r nowrap"><span className={`status ${tone}`}>{state}</span></td></tr>)}
          </tbody></table>
        </section>
        <section className="panel panel-pad stack">
          <h2 className="h4">Licence expiry check</h2>
          <p className="small muted">Runs daily via <span className="code">POST /api/cron/licences</span> with the <span className="code">x-cron-secret</span> header. Expires lapsed licences, pauses listings and sends 30- and 7-day reminders.</p>
          <SweepForm />
        </section>
        <section className="panel">
          <div className="panel-head"><h2 className="h4">Environment</h2></div>
          <table><tbody>
            <tr><td>Public URL</td><td className="r code">{env.APP_URL}</td></tr>
            <tr><td>Document storage</td><td className="r">Private disk, served only through authorised route</td></tr>
            <tr><td>Cron secret configured</td><td className="r">{process.env.CRON_SECRET ? "Yes" : <span className="status warn">No</span>}</td></tr>
          </tbody></table>
        </section>
      </div>
    </>
  );
}
