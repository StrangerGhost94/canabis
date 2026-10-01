"use client";
import { useState } from "react";
import { createApiKey, createStore, reportConversion, saveLocation, saveStoreProfile, submitLicence } from "@/app/actions/retailer";
import { DAYS } from "@/lib/geo";
import { ActionForm, Field, Input, Submit } from "../form";
import { IconCopy } from "../icons";

type Loc = { id: string; name: string; street: string; city: string; postalCode: string; phone: string | null; hours: { d: number; open: string; close: string }[]; offersPickup: boolean; offersDelivery: boolean };

export function LocationForm({ loc, pickupAllowed, deliveryAllowed }: { loc?: Loc; pickupAllowed: boolean; deliveryAllowed: boolean }) {
  return (
    <ActionForm action={saveLocation} className="form" resetOnSuccess={!loc}>
      {(s) => (
        <>
          {loc && <input type="hidden" name="id" value={loc.id} />}
          <div className="form-row">
            <Field name="name" label="Location name" state={s}><Input name="name" defaultValue={loc?.name} state={s} /></Field>
            <Field name="phone" label="Phone" state={s}><Input name="phone" type="tel" defaultValue={loc?.phone ?? ""} state={s} /></Field>
          </div>
          <Field name="street" label="Street address" state={s}><Input name="street" defaultValue={loc?.street} state={s} /></Field>
          <div className="form-row">
            <Field name="city" label="City" state={s}><Input name="city" defaultValue={loc?.city} state={s} /></Field>
            <Field name="postalCode" label="Postal code" state={s}><Input name="postalCode" defaultValue={loc?.postalCode} state={s} autoComplete="postal-code" /></Field>
          </div>
          <fieldset>
            <legend>Hours</legend>
            <div className="hours-grid">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const h = loc?.hours.find((x) => x.d === d);
                return (
                  <div key={d} className="row" style={{ ["--gap" as string]: "8px", flexWrap: "nowrap" }}>
                    <span className="small" style={{ width: 40 }}>{DAYS[d].slice(0, 3)}</span>
                    <input type="time" name={`open-${d}`} defaultValue={h?.open ?? "10:00"} className="input" style={{ minHeight: 38, padding: "4px 8px" }} aria-label={`${DAYS[d]} opening`} />
                    <input type="time" name={`close-${d}`} defaultValue={h?.close ?? "22:00"} className="input" style={{ minHeight: 38, padding: "4px 8px" }} aria-label={`${DAYS[d]} closing`} />
                    <label className="check small" style={{ alignItems: "center" }}><input type="checkbox" name={`closed-${d}`} defaultChecked={!!loc && !h} />Closed</label>
                  </div>
                );
              })}
            </div>
          </fieldset>
          <div className="stack" style={{ ["--gap" as string]: "8px" }}>
            <label className="check"><input type="checkbox" name="offersPickup" defaultChecked={loc?.offersPickup} />Offers in-store pickup{!pickupAllowed && <span className="muted small"> (not shown to customers in your province yet)</span>}</label>
            <label className="check"><input type="checkbox" name="offersDelivery" defaultChecked={loc?.offersDelivery} />Delivers under its own licence{!deliveryAllowed && <span className="muted small"> (not shown to customers in your province yet)</span>}</label>
          </div>
          <div><Submit pending="Saving…">{loc ? "Save location" : "Add location"}</Submit></div>
        </>
      )}
    </ActionForm>
  );
}

export function StoreProfileForm({ r, handoffAllowed }: { r: { tradeName: string; about: string | null; website: string | null; orderingUrl: string | null }; handoffAllowed: boolean }) {
  return (
    <ActionForm action={saveStoreProfile}>
      {(s) => (
        <>
          <Field name="tradeName" label="Store name" state={s}><Input name="tradeName" defaultValue={r.tradeName} state={s} /></Field>
          <Field name="about" label="About" hint="A sentence or two. Factual: what you stock, accessibility, languages spoken." state={s}>
            <textarea id="about" name="about" className="textarea" maxLength={400} defaultValue={s?.values?.about ?? r.about ?? ""} />
          </Field>
          <Field name="website" label="Website" state={s}><Input name="website" type="url" defaultValue={r.website ?? ""} placeholder="https://" state={s} /></Field>
          <Field name="orderingUrl" label="Online ordering page" hint={handoffAllowed ? "Your own licensed ordering page. Cairn links customers here and logs the hand-off." : "Saved, but Cairn won't link to it until online ordering links are enabled for your province."} state={s}>
            <Input name="orderingUrl" type="url" defaultValue={r.orderingUrl ?? ""} placeholder="https://" state={s} />
          </Field>
          <div><Submit pending="Saving…">Save profile</Submit></div>
        </>
      )}
    </ActionForm>
  );
}

export function LicenceForm() {
  return (
    <ActionForm action={submitLicence} resetOnSuccess>
      {(s) => (
        <>
          <div className="form-row">
            <Field name="number" label="Licence number" state={s}><Input name="number" state={s} /></Field>
            <Field name="expiresAt" label="Expiry date" state={s}><Input name="expiresAt" type="date" state={s} /></Field>
          </div>
          <Field name="document" label="Licence document" hint="PDF, JPEG or PNG, up to 10 MB. Only Cairn reviewers can see it." state={s}>
            <input id="document" name="document" type="file" accept="application/pdf,image/jpeg,image/png" className="input" />
          </Field>
          <div><Submit pending="Uploading…">Submit for review</Submit></div>
        </>
      )}
    </ActionForm>
  );
}

export function ReportConversionForm() {
  return (
    <ActionForm action={reportConversion} resetOnSuccess className="form">
      {(s) => (
        <>
          <div className="form-row">
            <Field name="campaignCode" label="Partner link code" hint="The part after /r/ in the link" state={s}><Input name="campaignCode" state={s} /></Field>
            <Field name="externalRef" label="Your order reference" state={s}><Input name="externalRef" state={s} /></Field>
            <Field name="order" label="Order total (CAD)" state={s}><Input name="order" inputMode="decimal" state={s} /></Field>
          </div>
          <div><Submit pending="Recording…">Record purchase</Submit></div>
        </>
      )}
    </ActionForm>
  );
}

export function ApiKeyForm() {
  const [copied, setCopied] = useState(false);
  return (
    <ActionForm action={createApiKey} resetOnSuccess className="form">
      {(s) => (
        <>
          {s?.ok && s.message ? (
            <div className="callout signal stack" style={{ ["--gap" as string]: "8px" }}>
              <p className="strong">Copy this key now. It won't be shown again.</p>
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <code className="code grow">{s.message}</code>
                <button type="button" className="btn sm" onClick={() => { navigator.clipboard.writeText(s.message!); setCopied(true); }}><IconCopy width={16} />{copied ? "Copied" : "Copy"}</button>
              </div>
            </div>
          ) : null}
          <div className="row top" style={{ flexWrap: "nowrap" }}>
            <Field name="name" label="New key name" state={s}><Input name="name" placeholder="e.g. POS integration" state={s} /></Field>
            <div style={{ paddingTop: 26 }}><Submit className="btn" pending="Creating…">Create key</Submit></div>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function OnboardingForm({ province, legalAge }: { province: string; legalAge: number }) {
  return (
    <ActionForm action={createStore}>
      {(s) => (
        <>
          <fieldset className="stack" style={{ ["--gap" as string]: "16px" }}>
            <legend className="h3">Your store</legend>
            <div className="form-row">
              <Field name="tradeName" label="Store name" hint="What customers see." state={s}><Input name="tradeName" state={s} /></Field>
              <Field name="legalName" label="Licensed legal entity" hint="Exactly as on the licence." state={s}><Input name="legalName" state={s} /></Field>
            </div>
            <Field name="about" label="About (optional)" state={s}><textarea id="about" name="about" className="textarea" maxLength={400} defaultValue={s?.values?.about} /></Field>
          </fieldset>
          <fieldset className="stack" style={{ ["--gap" as string]: "16px" }}>
            <legend className="h3">First location</legend>
            <div className="form-row">
              <Field name="locName" label="Location name" hint="e.g. the neighbourhood" state={s}><Input name="locName" state={s} /></Field>
              <Field name="street" label="Street address" state={s}><Input name="street" state={s} /></Field>
            </div>
            <div className="form-row">
              <Field name="city" label="City" state={s}><Input name="city" state={s} /></Field>
              <Field name="postalCode" label="Postal code" state={s}><Input name="postalCode" state={s} /></Field>
            </div>
            <div className="form-row">
              <Field name="open" label="Usually opens" state={s}><Input name="open" type="time" defaultValue="10:00" state={s} /></Field>
              <Field name="close" label="Usually closes" state={s}><Input name="close" type="time" defaultValue="22:00" state={s} /></Field>
            </div>
            <p className="hint">You can set hours for each day later. Province: {province}. Customers must be {legalAge}+.</p>
          </fieldset>
          <fieldset className="stack" style={{ ["--gap" as string]: "16px" }}>
            <legend className="h3">Retail licence</legend>
            <div className="form-row">
              <Field name="licenceNumber" label="Licence number" state={s}><Input name="licenceNumber" state={s} /></Field>
              <Field name="expiresAt" label="Expiry date" state={s}><Input name="expiresAt" type="date" state={s} /></Field>
            </div>
            <Field name="document" label="Copy of your licence" hint="PDF, JPEG or PNG, up to 10 MB. Only Cairn reviewers see it." state={s}>
              <input id="document" name="document" type="file" accept="application/pdf,image/jpeg,image/png" className="input" />
            </Field>
            <label className="check"><input type="checkbox" name="attest" value="yes" /><span>I confirm this licence is issued to the entity above, is in good standing, and that I'm authorised to list this store.</span></label>
            {s?.fields?.attest && <p className="err">{s.fields.attest}</p>}
          </fieldset>
          <div><Submit pending="Submitting…">Submit for review</Submit></div>
        </>
      )}
    </ActionForm>
  );
}
