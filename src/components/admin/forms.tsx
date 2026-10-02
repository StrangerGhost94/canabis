"use client";
import { resolveRisk, reviewBuyer, reviewLicence, reviewPartner, runLicenceSweep, setPartnerStatus, setRetailerStatus, updateRule } from "@/app/actions/admin";
import { ActionForm, Field, Input, Submit } from "../form";

export function LicenceReviewForm({ licenceId }: { licenceId: string }) {
  return (
    <ActionForm action={reviewLicence} className="form" >
      {(s) => (
        <>
          <input type="hidden" name="licenceId" value={licenceId} />
          <Field name="method" label="How did you check it?" state={s}>
            <select id="method" name="method" className="select" defaultValue={s?.values?.method ?? "MANUAL_REGISTRY_CHECK"}>
              <option value="MANUAL_REGISTRY_CHECK">I compared it with the regulator's public registry</option>
            </select>
          </Field>
          <Field name="sourceReference" label="Registry reference" hint="URL or record ID of the registry entry you checked. Required to verify manually." state={s}><Input name="sourceReference" state={s} /></Field>
          <Field name="notes" label="Notes" hint="Required when rejecting. The store sees this." state={s}><textarea id="notes" name="notes" className="textarea" style={{ minHeight: 70 }} defaultValue={s?.values?.notes} /></Field>
          <div className="row">
            <Submit name="decision" value="VERIFIED" className="btn primary" pending="Saving…">Verify licence</Submit>
            <Submit name="decision" value="REJECTED" className="btn danger" pending="Saving…">Reject</Submit>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function PartnerReviewForm({ partnerId }: { partnerId: string }) {
  return (
    <ActionForm action={reviewPartner} className="form">
      {(s) => (
        <>
          <input type="hidden" name="partnerId" value={partnerId} />
          <Field name="notes" label="Notes to applicant" hint="Required when declining." state={s}><textarea id="notes" name="notes" className="textarea" style={{ minHeight: 70 }} /></Field>
          <div className="row">
            <Submit name="decision" value="VERIFIED" className="btn primary" pending="Saving…">Verify partner</Submit>
            <Submit name="decision" value="REJECTED" className="btn danger" pending="Saving…">Decline</Submit>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function StatusForm({ kind, id, current }: { kind: "retailer" | "partner"; id: string; current: string }) {
  const suspend = current !== "SUSPENDED";
  return (
    <ActionForm action={kind === "retailer" ? setRetailerStatus : setPartnerStatus} className="row top" >
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={suspend ? "SUSPENDED" : "VERIFIED"} />
          <div className="grow" style={{ minWidth: 200 }}><Input name="reason" placeholder={suspend ? "Reason for suspending" : "Reason for reinstating"} state={s} style={{ minHeight: 34 }} aria-label="Reason" />{s?.fields?.reason && <p className="err">{s.fields.reason}</p>}</div>
          <Submit className={`btn sm ${suspend ? "danger" : ""}`} pending="…">{suspend ? "Suspend" : "Reinstate"}</Submit>
        </>
      )}
    </ActionForm>
  );
}

export function RiskForm({ id }: { id: string }) {
  return (
    <ActionForm action={resolveRisk} className="stack">
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          <Input name="resolution" placeholder="What you decided and why" state={s} aria-label="Resolution" />
          {s?.fields?.resolution && <p className="err">{s.fields.resolution}</p>}
          <div className="row">
            <Submit name="status" value="ACTIONED" className="btn sm primary" pending="…">Action taken</Submit>
            <Submit name="status" value="DISMISSED" className="btn sm" pending="…">Dismiss</Submit>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function RuleForm({ code, ruleKey, status, source, notes }: { code: string; ruleKey: string; status: string; source: string | null; notes: string | null }) {
  return (
    <ActionForm action={updateRule} className="form">
      {(s) => (
        <>
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="key" value={ruleKey} />
          <fieldset>
            <legend className="small">Determination</legend>
            <div className="seg">
              {[["UNCONFIRMED", "Not yet reviewed"], ["ALLOWED", "Permitted"], ["PROHIBITED", "Not permitted"]].map(([v, l]) => (
                <span key={v}><input type="radio" id={`${ruleKey}-${v}`} name="status" value={v} defaultChecked={(s?.values?.status ?? status) === v} /><label htmlFor={`${ruleKey}-${v}`}>{l}</label></span>
              ))}
            </div>
          </fieldset>
          <Field name="source" label="Legal basis" hint="Statute, regulation, regulator guidance or counsel memo. Required for any determination." state={s}><Input name="source" defaultValue={source ?? ""} state={s} /></Field>
          <Field name="notes" label="Notes" state={s}><Input name="notes" defaultValue={notes ?? ""} state={s} /></Field>
          <label className="check small"><input type="checkbox" name="confirm" value="yes" /><span>This has been reviewed for this jurisdiction by someone qualified to do so.</span></label>
          {s?.fields?.confirm && <p className="err">{s.fields.confirm}</p>}
          <div><Submit className="btn sm primary" pending="Saving…">Save rule</Submit></div>
        </>
      )}
    </ActionForm>
  );
}

export function SweepForm() {
  return (
    <ActionForm action={runLicenceSweep} className="stack">
      {() => <div><Submit className="btn" pending="Checking…">Run licence check now</Submit></div>}
    </ActionForm>
  );
}

export function BuyerReviewForm({ userId, legalAge }: { userId: string; legalAge: number }) {
  return (
    <ActionForm action={reviewBuyer} className="form">
      {(s) => (
        <>
          <input type="hidden" name="userId" value={userId} />
          <label className="check"><input type="checkbox" name="matches" value="yes" /><span>The photo ID is genuine, the selfie matches it, the name matches the account, and the date of birth shows {legalAge}+.</span></label>
          {s?.fields?.matches && <p className="err">{s.fields.matches}</p>}
          <Field name="notes" label="Note to buyer" hint="Required when rejecting, e.g. 'Photo too blurry — retake in good light.'" state={s}><textarea id="notes" name="notes" className="textarea" style={{ minHeight: 70 }} /></Field>
          <div className="row">
            <Submit name="decision" value="VERIFIED" className="btn primary" pending="Saving…">Verify buyer</Submit>
            <Submit name="decision" value="REJECTED" className="btn danger" pending="Saving…">Reject</Submit>
          </div>
          <p className="xs muted">Either way, both images are deleted immediately after you decide.</p>
        </>
      )}
    </ActionForm>
  );
}
