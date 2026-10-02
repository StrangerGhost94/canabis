"use client";
import { checkout } from "@/app/actions/cart";
import { ActionForm, Field, Input, Submit } from "../form";

type Addr = { street: string; unit?: string; city: string; postalCode: string } | null;

export function CheckoutForm({ fulfilment, name, address, parts }: { fulfilment: "PICKUP" | "DELIVERY"; name: string; address: Addr; parts: number }) {
  const delivery = fulfilment === "DELIVERY";
  return (
    <ActionForm action={checkout} className="form">
      {(s) => (
        <>
          <input type="hidden" name="fulfilment" value={fulfilment} />
          {delivery && (
            <fieldset className="stack" style={{ ["--gap" as string]: "14px" }}>
              <legend className="h4">Delivery address</legend>
              <div className="form-row">
                <Field name="street" label="Street address" state={s}><Input name="street" autoComplete="address-line1" defaultValue={address?.street} state={s} /></Field>
                <Field name="unit" label="Unit (optional)" state={s}><Input name="unit" autoComplete="address-line2" defaultValue={address?.unit} state={s} /></Field>
              </div>
              <div className="form-row">
                <Field name="city" label="City" state={s}><Input name="city" autoComplete="address-level2" defaultValue={address?.city} state={s} /></Field>
                <Field name="postalCode" label="Postal code" state={s}><Input name="postalCode" autoComplete="postal-code" defaultValue={address?.postalCode} state={s} /></Field>
              </div>
              <p className="hint">We'll save this for next time. Moved? Just enter your new address — your order goes to the nearest store there. Someone of legal age must receive it in person and show ID.</p>
            </fieldset>
          )}
          <fieldset className="stack" style={{ ["--gap" as string]: "14px" }}>
            <legend className="h4">Contact</legend>
            <div className="form-row">
              <Field name="contactName" label="Name on your ID" state={s}><Input name="contactName" defaultValue={name} autoComplete="name" state={s} /></Field>
              <Field name="contactPhone" label="Phone" hint="The store calls if anything changes." state={s}><Input name="contactPhone" type="tel" autoComplete="tel" state={s} /></Field>
            </div>
            <Field name="notes" label="Note for the store (optional)" state={s}><Input name="notes" maxLength={300} state={s} /></Field>
          </fieldset>
          <label className="check"><input type="checkbox" name="ageId" value="yes" /><span>I'll show valid government photo ID when I {delivery ? "receive" : "pick up"} this order.</span></label>
          {s?.fields?.ageId && <p className="err">{s.fields.ageId}</p>}
          <Submit className="btn signal block lg" pending="Placing order…">Place order{parts > 1 ? ` (${parts} parts)` : ""}</Submit>
          <p className="xs muted">Nothing is charged now. The licensed store confirms your order, then takes payment when it's handed over.</p>
        </>
      )}
    </ActionForm>
  );
}
