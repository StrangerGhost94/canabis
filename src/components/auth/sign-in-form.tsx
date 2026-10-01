"use client";
import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { ActionForm, Field, Input, Submit } from "../form";

export function SignInForm({ next }: { next: string }) {
  return (
    <ActionForm action={signIn}>
      {(s) => (
        <>
          <input type="hidden" name="next" value={next} />
          <Field name="email" label="Email" state={s}><Input name="email" type="email" autoComplete="email" required state={s} /></Field>
          <Field name="password" label="Password" state={s}><Input name="password" type="password" autoComplete="current-password" required state={s} /></Field>
          <Submit type="submit" className="btn primary block" pending="Signing in…">Sign in</Submit>
          <p className="small muted">New to Cairn? <Link href={`/sign-up?next=${encodeURIComponent(next)}`}>Create an account</Link></p>
        </>
      )}
    </ActionForm>
  );
}
