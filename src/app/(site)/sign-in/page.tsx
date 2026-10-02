import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Sign in" };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/" } = await searchParams;
  if (await getSession()) redirect(next.startsWith("/") ? next : "/");
  return (
    <AuthShell title="Welcome back" sub="Sign in to order, track deliveries and see your saved products."
      aside={{ heading: "Your next order is a few taps away.", points: ["Every licensed store near you, in one place", "We route your order to the closest store with it in stock", "Delivered to your door — pay when it arrives"] }}>
      <SignInForm next={next} />
    </AuthShell>
  );
}
