"use client";
import { useState } from "react";
import { clearNear, setNear } from "@/app/actions/visitor";
import { ActionForm, Submit } from "../form";
import { IconPin } from "../icons";

export function NearControl({ label, next }: { label: string | null; next: string }) {
  const [editing, setEditing] = useState(!label);
  if (!editing && label) {
    return (
      <div className="row small" style={{ ["--gap" as string]: "8px" }}>
        <IconPin width={16} height={16} /> Near <span className="strong">{label}</span>
        <button className="linkbtn" onClick={() => setEditing(true)}>Change</button>
        <form action={clearNear}><button className="linkbtn">Clear</button></form>
      </div>
    );
  }
  return (
    <ActionForm action={setNear} className="near-form">
      {(s) => (
        <>
          <input type="hidden" name="next" value={next} />
          <label htmlFor="near" className="sr-only">Postal code or city</label>
          <div className="row" style={{ ["--gap" as string]: "8px", flexWrap: "nowrap" }}>
            <input id="near" name="near" className="input" placeholder="Postal code or city, for distances" defaultValue={s?.values?.near} style={{ minHeight: 40 }} autoComplete="postal-code" />
            <Submit className="btn sm" pending="…">Set</Submit>
          </div>
        </>
      )}
    </ActionForm>
  );
}
