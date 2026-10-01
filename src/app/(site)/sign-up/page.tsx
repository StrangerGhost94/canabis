import { SignUpForm } from "@/components/auth/sign-up-form";
import { getJurisdictions } from "@/lib/compliance";
import { getVisitor } from "@/lib/visitor";

export const metadata = { title: "Create an account" };

export default async function SignUp({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const { next = "/", as = "CUSTOMER" } = await searchParams;
  const v = await getVisitor();
  const js = (await getJurisdictions()).map(({ code, name, legalAge }) => ({ code, name, legalAge }));
  return (
    <div className="wrap section">
      <div className="stack" style={{ maxWidth: 560 }}>
        <h1 className="h1">Create an account</h1>
        <p className="muted">Save stores and products, and get notified when a store you follow changes. Stores and partners start here too.</p>
        <SignUpForm next={next} jurisdictions={js} region={v.region} intent={as.toUpperCase()} />
      </div>
    </div>
  );
}
