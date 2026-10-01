"use client";
import { useState } from "react";
import { checkout } from "@/app/actions/cart";
import { ActionForm, Field, Input, Submit } from "../form";

type Opt = { value: "PICKUP" | "DELIVERY"; title: string; detail: string };

export function CheckoutForm({ options, name, store }: { options: Opt[]; name: string; store: string }) {
  const [mode, setMode] = useState<Opt["value"]>(options[0]?.value ?? "PICKUP");
  return (
    <ActionForm action={checkout} className="form" >
      {(s) => (
        <>
          <fieldset>
            <legend className="h4">How do you want it?</legend>
            <div className="fulfil">
              {options.map((o) => (
                <label key={o.value} className={`fulfil-opt ${mode === o.value ? "on" : ""}`}>
                  <input type="radio" name="fulfilment" value={o.value} checked={mode === o.value} onChange={() => setMode(o.value)} />
                  <span className="strong">{o.title}</span>
                  <span className="small muted">{o.detail}</span>
                </label>
              ))}
            </div>
            {s?.fields?.fulfilment && <p className="err">{s.fields.fulfilment}</p>}
          </fieldset>
          {mode === "DELIVERY" && (
            <fieldset className="stack" style={{ ["--gap" as string]: "14px" }}>
              <legend className="h4">Delivery address</legend>
              <div className="form-row">
                <Field name="street" label="Street address" state={s}><Input name="street" autoComplete="address-line1" state={s} /></Field>
                <Field name="unit" label="Unit (optional)" state={s}><Input name="unit" autoComplete="address-line2" state={s} /></Field>
              </div>
              <div className="form-row">
                <Field name="city" label="City" state={s}><Input name="city" autoComplete="address-level2" state={s} /></Field>
                <Field name="postalCode" label="Postal code" state={s}><Input name="postalCode" autoComplete="postal-code" state={s} /></Field>
              </div>
              <p className="hint">Someone of legal age must receive it in person and show ID. It can't be left at the door.</p>
            </fieldset>
          )}
          <fieldset className="stack" style={{ ["--gap" as string]: "14px" }}>
            <legend className="h4">Contact</legend>
            <div className="form-row">
              <Field name="contactName" label="Name on your ID" state={s}><Input name="contactName" defaultValue={name} autoComplete="name" state={s} /></Field>
              <Field name="contactPhone" label="Phone" hint="The store will call if anything changes." state={s}><Input name="contactPhone" type="tel" autoComplete="tel" state={s} /></Field>
            </div>
            <Field name="notes" label="Note for the store (optional)" state={s}><Input name="notes" maxLength={300} state={s} /></Field>
          </fieldset>
          <label className="check"><input type="checkbox" name="ageId" value="yes" /><span>I'll show valid government ID to {store} when I {mode === "PICKUP" ? "pick up" : "receive"} this order.</span></label>
          {s?.fields?.ageId && <p className="err">{s.fields.ageId}</p>}
          <Submit className="btn signal block" pending="Placing order…">Place order with {store}</Submit>
          <p className="xs muted">Placing an order doesn't charge you. {store} confirms it, then takes payment when it's handed over.</p>
        </>
      )}
    </ActionForm>
  );
}
