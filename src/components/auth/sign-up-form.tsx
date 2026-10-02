"use client";
import Link from "next/link";
import { useState } from "react";
import { signUp } from "@/app/actions/auth";
import { ActionForm, Field, Input, Submit } from "../form";

type J = { code: string; name: string; legalAge: number };

export function SignUpForm({ next, jurisdictions, region, intent }: { next: string; jurisdictions: J[]; region: string | null; intent: string }) {
  const [code, setCode] = useState(region ?? "");
  const j = jurisdictions.find((x) => x.code === code);
  return (
    <ActionForm action={signUp}>
      {(s) => (
        <>
          <input type="hidden" name="next" value={next} />
          <fieldset>
            <legend className="sr-only">Account type</legend>
            <div className="seg acct-type">
              {[["CUSTOMER", "I want to shop"], ["RETAILER", "I run a store"], ["PARTNER", "Partner"]].map(([v, l]) => (
                <span key={v}><input type="radio" id={`intent-${v}`} name="intent" value={v} defaultChecked={(s?.values?.intent ?? intent) === v} /><label htmlFor={`intent-${v}`}>{l}</label></span>
              ))}
            </div>
          </fieldset>
          <Field name="name" label="Full name" state={s}><Input name="name" autoComplete="name" state={s} /></Field>
          <Field name="email" label="Email" state={s}><Input name="email" type="email" autoComplete="email" state={s} /></Field>
          <Field name="password" label="Password" hint="At least 12 characters." state={s}><Input name="password" type="password" autoComplete="new-password" state={s} /></Field>
          <div className="form-row">
            <Field name="region" label="Province or territory" state={s}>
              <select id="region" name="region" className="select" value={code} onChange={(e) => setCode(e.target.value)}>
                <option value="" disabled>Choose…</option>
                {jurisdictions.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
              </select>
            </Field>
            <Field name="birthDate" label="Date of birth" hint={j ? `You must be ${j.legalAge} or older in ${j.name}.` : undefined} state={s}>
              <Input name="birthDate" type="date" autoComplete="bday" state={s} max={new Date().toISOString().slice(0, 10)} />
            </Field>
          </div>
          <label className="check small">
            <input type="checkbox" name="terms" value="yes" />
            <span>I accept the terms of use and privacy notice. Cairn stores my date of birth only to confirm I meet the legal age.</span>
          </label>
          {s?.fields?.terms && <p className="err">{s.fields.terms}</p>}
          <Submit type="submit" className="btn primary block" pending="Creating account…">Create account</Submit>
          <p className="small muted">Already have an account? <Link href={`/sign-in?next=${encodeURIComponent(next)}`}>Sign in</Link></p>
        </>
      )}
    </ActionForm>
  );
}
