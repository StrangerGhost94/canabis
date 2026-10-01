import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Sign in" };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/" } = await searchParams;
  if (await getSession()) redirect(next.startsWith("/") ? next : "/");
  return (
    <div className="wrap section auth-page">
      <div className="stack" style={{ maxWidth: 440 }}>
        <h1 className="h1">Sign in</h1>
        <SignInForm next={next} />
      </div>
    </div>
  );
}
