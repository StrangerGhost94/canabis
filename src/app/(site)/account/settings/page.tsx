import { signOutEverywhere } from "@/app/actions/account";
import { AddressForm, ProfileForm, PasswordForm } from "@/components/account-forms";
import { requireUser } from "@/lib/auth/session";
import { getJurisdictions } from "@/lib/compliance";

export const metadata = { title: "Settings" };

export default async function Settings() {
  const u = await requireUser("/account/settings");
  const js = (await getJurisdictions()).map(({ code, name }) => ({ code, name }));
  return (
    <div className="stack" style={{ ["--gap" as string]: "40px", maxWidth: 560 }}>
      <section id="address" style={{ scrollMarginTop: 140 }}>
        <h2 className="h3">Delivery address</h2>
        <p className="small muted mb-2">Moved? Update it here. Your next order goes to the nearest licensed store that delivers to your new address — no need to verify again.</p>
        <AddressForm address={u.address ?? null} />
      </section>
      <section className="rule-top" style={{ paddingTop: 32 }}><h2 className="h3 mb-2">Profile</h2><ProfileForm name={u.name} region={u.jurisdictionCode} jurisdictions={js} /></section>
      <section className="rule-top" style={{ paddingTop: 32 }}><h2 className="h3 mb-2">Password</h2><PasswordForm /></section>
      <section className="rule-top stack" style={{ paddingTop: 32 }}>
        <h2 className="h3">Sessions</h2>
        <p className="small muted">Sign out of Cairn on every device, including this one.</p>
        <form action={signOutEverywhere}><button className="btn danger">Sign out everywhere</button></form>
      </section>
    </div>
  );
}
