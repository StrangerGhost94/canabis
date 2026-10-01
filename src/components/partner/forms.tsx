"use client";
import { useState } from "react";
import { applyPartner, createCampaign, updatePartnerProfile } from "@/app/actions/partner";
import { ActionForm, Field, Input, Submit } from "../form";
import { IconCopy } from "../icons";

export function ApplyForm({ name }: { name: string }) {
  return (
    <ActionForm action={applyPartner}>
      {(s) => (
        <>
          <div className="form-row">
            <Field name="displayName" label="Name you publish under" state={s}><Input name="displayName" defaultValue={name} state={s} /></Field>
            <Field name="handle" label="Handle" hint="Your profile lives at /p/handle" state={s}><Input name="handle" state={s} autoCapitalize="none" /></Field>
          </div>
          <Field name="bio" label="What you cover" hint="Shown on your profile. Factual and specific works best." state={s}><textarea id="bio" name="bio" className="textarea" maxLength={400} defaultValue={s?.values?.bio} /></Field>
          <Field name="channels" label="Where you publish" hint="Comma-separated, e.g. Newsletter, Personal website" state={s}><Input name="channels" state={s} /></Field>
          <Field name="audience" label="Your audience" hint="Roughly how many people, and how you make sure they're of legal age. Reviewers read this closely." state={s}><textarea id="audience" name="audience" className="textarea" maxLength={600} defaultValue={s?.values?.audience} /></Field>
          <label className="check"><input type="checkbox" name="conduct" value="yes" /><span>I agree to the partner terms: I won't sell, hold, reserve or deliver cannabis; I'll only share with adults and never in ways that appeal to young people; I won't make health claims; and I'll disclose paid recommendations.</span></label>
          {s?.fields?.conduct && <p className="err">{s.fields.conduct}</p>}
          <div><Submit pending="Submitting…">Submit application</Submit></div>
        </>
      )}
    </ActionForm>
  );
}

export function ProfileForm({ p }: { p: { displayName: string; bio: string | null } }) {
  return (
    <ActionForm action={updatePartnerProfile}>
      {(s) => (
        <>
          <Field name="displayName" label="Display name" state={s}><Input name="displayName" defaultValue={p.displayName} state={s} /></Field>
          <Field name="bio" label="Bio" state={s}><textarea id="bio" name="bio" className="textarea" maxLength={400} defaultValue={s?.values?.bio ?? p.bio ?? ""} /></Field>
          <div><Submit pending="Saving…">Save profile</Submit></div>
        </>
      )}
    </ActionForm>
  );
}

export function NewLinkForm({ stores }: { stores: { id: string; name: string; products: { id: string; name: string }[] }[] }) {
  const [store, setStore] = useState(stores[0]?.id ?? "");
  const products = stores.find((s) => s.id === store)?.products ?? [];
  return (
    <ActionForm action={createCampaign} resetOnSuccess className="form" >
      {(s) => (
        <>
          <div className="form-row">
            <Field name="name" label="Where you'll share it" hint="e.g. November newsletter" state={s}><Input name="name" state={s} /></Field>
            <Field name="retailerId" label="Store" state={s}>
              <select id="retailerId" name="retailerId" className="select" value={store} onChange={(e) => setStore(e.target.value)}>
                {stores.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </Field>
            <Field name="productId" label="Link to" state={s}>
              <select id="productId" name="productId" className="select" defaultValue="">
                <option value="">The store page</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          </div>
          <div><Submit pending="Creating…">Create link</Submit></div>
        </>
      )}
    </ActionForm>
  );
}

export function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn sm" onClick={() => { navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 1600); }} aria-live="polite">
      <IconCopy width={16} />{done ? "Copied" : "Copy link"}
    </button>
  );
}
