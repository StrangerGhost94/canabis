"use client";
import { changePassword, updateProfile } from "@/app/actions/account";
import { ActionForm, Field, Input, Submit } from "./form";

export function ProfileForm({ name, region, jurisdictions }: { name: string; region: string; jurisdictions: { code: string; name: string }[] }) {
  return (
    <ActionForm action={updateProfile}>
      {(s) => (
        <>
          <Field name="name" label="Name" state={s}><Input name="name" defaultValue={name} state={s} autoComplete="name" /></Field>
          <Field name="region" label="Province or territory" hint="Changes which stores you see and which rules apply." state={s}>
            <select id="region" name="region" className="select" defaultValue={region}>{jurisdictions.map((j) => <option key={j.code} value={j.code}>{j.name}</option>)}</select>
          </Field>
          <div><Submit pending="Saving…">Save changes</Submit></div>
        </>
      )}
    </ActionForm>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={changePassword} resetOnSuccess>
      {(s) => (
        <>
          <Field name="current" label="Current password" state={s}><Input name="current" type="password" autoComplete="current-password" state={s} /></Field>
          <Field name="next" label="New password" hint="At least 12 characters." state={s}><Input name="next" type="password" autoComplete="new-password" state={s} /></Field>
          <div><Submit pending="Changing…">Change password</Submit></div>
        </>
      )}
    </ActionForm>
  );
}
