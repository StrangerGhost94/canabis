import { ConsoleHead } from "@/components/console/shell";
import { requirePartner } from "@/lib/auth/access";
import { getPolicy } from "@/lib/compliance";
import { RULES } from "@/lib/compliance/rules";
import { fmtDate } from "@/lib/verification/trust";

export const metadata = { title: "Terms and rules" };

export default async function Conduct() {
  const { partner } = await requirePartner();
  const policy = await getPolicy(partner.jurisdictionCode);
  const keys = ["partner.referrals", "partner.profiles", "partner.compensation"] as const;
  return (
    <>
      <ConsoleHead title="Terms and rules" sub={partner.attestedAt ? `You agreed to these terms on ${fmtDate(partner.attestedAt)}.` : undefined} />
      <div className="grid-2" style={{ alignItems: "start" }}>
        <ol className="prose stack" style={{ paddingLeft: "1.2em", ["--gap" as string]: "12px" }}>
          <li>You never sell, hold, reserve, deliver or take payment for cannabis. Every purchase happens with a licensed store.</li>
          <li>You share only with audiences of legal age in {policy.name} ({policy.legalAge}+), and never in ways that could appeal to young people.</li>
          <li>No health, therapeutic or effect claims, testimonials or endorsements of how products make people feel.</li>
          <li>No contests, giveaways or other inducements tied to purchases.</li>
          <li>Disclose when you may be paid. Cairn adds the disclosure to your profile automatically.</li>
          <li>Don't buy traffic, use bots or click your own links. Suspicious traffic isn't counted and is reviewed.</li>
        </ol>
        <div className="panel">
          <div className="panel-head"><h2 className="h4">Partner rules in {policy.name}</h2></div>
          <table><tbody>
            {keys.map((k) => <tr key={k}><td>{RULES[k].label}</td><td className="r"><span className={`status ${policy.allows(k) ? "ok" : "idle"}`}>{policy.allows(k) ? "On" : "Off"}</span></td></tr>)}
          </tbody></table>
        </div>
      </div>
    </>
  );
}
