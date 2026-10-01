"use client";
import { useEffect, useRef, useState } from "react";
import { confirmRegion } from "@/app/actions/visitor";
import { ActionForm, Submit } from "./form";

type J = { code: string; name: string; legalAge: number };

export function RegionGate({ jurisdictions, current, next, dismissible = false, open: initiallyOpen = true }: {
  jurisdictions: J[]; current: string | null; next: string; dismissible?: boolean; open?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState(current ?? "");
  const j = jurisdictions.find((x) => x.code === code);

  useEffect(() => {
    const d = ref.current;
    if (d && initiallyOpen && !d.open) d.showModal();
    const block = (e: Event) => { if (!dismissible) e.preventDefault(); };
    d?.addEventListener("cancel", block);
    return () => d?.removeEventListener("cancel", block);
  }, [dismissible, initiallyOpen]);

  return (
    <dialog ref={ref} id="region-gate" aria-labelledby="gate-title" className="sheet" style={{ width: 480 }}>
      <ActionForm action={confirmRegion} className="">
        {(state) => (
          <>
            <div className="dialog-body stack" style={{ ["--gap" as string]: "20px" }}>
              <div className="stack" style={{ ["--gap" as string]: "8px" }}>
                <span className="cairn verified" style={{ ["--cs" as string]: "28px" }} aria-hidden><i className="on" /><i className="on" /><i className="on" /></span>
                <h2 id="gate-title" className="h2">Where are you?</h2>
                <p className="muted">
                  Cairn lists licensed cannabis stores for adults in Canada. The rules — including the legal age — depend on your province or territory.
                </p>
              </div>
              <input type="hidden" name="next" value={next} />
              <div className="field">
                <label htmlFor="gate-region">Province or territory</label>
                <select id="gate-region" name="region" className="select" value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={state?.fields?.region ? true : undefined}>
                  <option value="" disabled>Choose…</option>
                  {jurisdictions.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
                </select>
                {state?.fields?.region && <p className="err">{state.fields.region}</p>}
              </div>
              <label className="check">
                <input type="checkbox" name="adult" value="yes" disabled={!j} />
                <span>{j ? <>I am {j.legalAge} or older, the legal age in {j.name}.</> : "I meet the legal age where I live."}</span>
              </label>
              {state?.fields?.adult && <p className="err">{state.fields.adult}</p>}
            </div>
            <div className="dialog-foot" style={{ justifyContent: "space-between" }}>
              {dismissible
                ? <button type="button" className="btn ghost" onClick={() => ref.current?.close()}>Cancel</button>
                : <a className="btn ghost" href="https://www.canada.ca/en/health-canada/services/drugs-medication/cannabis.html" rel="noreferrer">Leave</a>}
              <Submit className="btn primary" pending="Saving…">Continue</Submit>
            </div>
          </>
        )}
      </ActionForm>
    </dialog>
  );
}

export function ChangeRegionButton({ label, className = "region-pill" }: { label: string; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => (document.getElementById("region-gate") as HTMLDialogElement | null)?.showModal()}>
      {label}
    </button>
  );
}
