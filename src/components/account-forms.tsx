"use client";
import { changePassword, saveAddress, updateProfile } from "@/app/actions/account";
import { ActionForm, Field, Input, Submit } from "./form";

export function ProfileForm({ name, region, jurisdictions }: { name: string; region: string; jurisdictions: { code: string; name: string }[] }) {
  return (
    <ActionForm action={updateProfile}>
      {(s) => (
        <>
          <Field name="name" label="Name" state={s}><Input name="name" defaultValue={name} state={s} autoComplete="name" /></Field>
          <Field name="region" label="Province or territory" hint="Moving to another province? Change it here — the legal age and rules there apply, and you'll re-enter your address." state={s}>
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

export function AddressForm({ address }: { address: { street: string; unit?: string; city: string; postalCode: string } | null }) {
  return (
    <ActionForm action={saveAddress}>
      {(s) => (
        <>
          <div className="form-row">
            <Field name="street" label="Street address" state={s}><Input name="street" defaultValue={address?.street} autoComplete="address-line1" state={s} /></Field>
            <Field name="unit" label="Unit (optional)" state={s}><Input name="unit" defaultValue={address?.unit} autoComplete="address-line2" state={s} /></Field>
          </div>
          <div className="form-row">
            <Field name="city" label="City" state={s}><Input name="city" defaultValue={address?.city} autoComplete="address-level2" state={s} /></Field>
            <Field name="postalCode" label="Postal code" state={s}><Input name="postalCode" defaultValue={address?.postalCode} autoComplete="postal-code" state={s} /></Field>
          </div>
          <div><Submit pending="Finding it…">Save address</Submit></div>
        </>
      )}
    </ActionForm>
  );
}
