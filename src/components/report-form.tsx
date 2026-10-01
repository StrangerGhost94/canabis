"use client";
import { reportConcern } from "@/app/actions/report";
import { ActionForm, Field, Input, Submit } from "./form";

export function ReportForm() {
  return (
    <ActionForm action={reportConcern} resetOnSuccess>
      {(s) => (
        <>
          <Field name="about" label="Store, partner or page" state={s}><Input name="about" state={s} placeholder="e.g. Harbourline, or a link" /></Field>
          <Field name="kind" label="What's the concern?" state={s}>
            <select id="kind" name="kind" className="select" defaultValue={s?.values?.kind ?? "licence"}>
              <option value="licence">Licence looks wrong or expired</option>
              <option value="minor">Possible sale or marketing to minors</option>
              <option value="advertising">Misleading claims or advertising</option>
              <option value="conduct">Partner or store conduct</option>
              <option value="other">Something else</option>
            </select>
          </Field>
          <Field name="details" label="Details" state={s}><textarea id="details" name="details" className="textarea" defaultValue={s?.values?.details} /></Field>
          <div><Submit pending="Sending…">Send report</Submit></div>
        </>
      )}
    </ActionForm>
  );
}
