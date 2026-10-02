import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getJurisdictions } from "@/lib/compliance";
import { getVisitor } from "@/lib/visitor";

export const metadata = { title: "Create an account" };

export default async function SignUp({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const { next = "/", as = "CUSTOMER" } = await searchParams;
  const v = await getVisitor();
  const js = (await getJurisdictions()).map(({ code, name, legalAge }) => ({ code, name, legalAge }));
  return (
    <AuthShell title="Create your account" sub="Takes a minute. Next, a one-time ID check — then you can order."
      aside={{ heading: "Verify once. Order anywhere.", points: ["One account for every licensed store in your province", "Your ID is checked once by a person, then the photos are deleted", "Move house? Your orders follow you to the nearest store"] }}>
      <SignUpForm next={next} jurisdictions={js} region={v.region} intent={as.toUpperCase()} />
    </AuthShell>
  );
}
