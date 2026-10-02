"use client";
import { useState } from "react";
import { submitId } from "@/app/actions/account";
import { ActionForm, Submit } from "./form";

function Picker({ name, label, hint, capture, error }: { name: string; label: string; hint: string; capture: "user" | "environment"; error?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <label className={`pick ${preview ? "has" : ""}`}>
      <input type="file" name={name} accept={name === "selfie" ? "image/jpeg,image/png" : "image/jpeg,image/png,application/pdf"} capture={capture}
        onChange={(e) => { const f = e.target.files?.[0]; setPreview(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : f ? "pdf" : null); }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview && preview !== "pdf" ? <img src={preview} alt="" /> : <span className="pick-ph">{preview === "pdf" ? "PDF added" : "+"}</span>}
      <span className="strong">{label}</span>
      <span className="xs muted">{hint}</span>
      {error && <span className="err">{error}</span>}
    </label>
  );
}

export function VerifyForm({ next }: { next: string }) {
  return (
    <ActionForm action={submitId} className="form" >
      {(s) => (
        <>
          <input type="hidden" name="next" value={next} />
          <div className="picks">
            <Picker name="idDocument" label="Photo of your ID" hint="JPEG, PNG or PDF, up to 10 MB" capture="environment" error={s?.fields?.idDocument} />
            <Picker name="selfie" label="Selfie" hint="JPEG or PNG, face clearly visible" capture="user" error={s?.fields?.selfie} />
          </div>
          <label className="check"><input type="checkbox" name="consent" value="yes" /><span>This is my own government ID, and I agree to Cairn checking it to confirm my age.</span></label>
          {s?.fields?.consent && <p className="err">{s.fields.consent}</p>}
          <Submit className="btn signal block lg" pending="Uploading securely…">Submit for verification</Submit>
          <style>{`
            .picks { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .pick { position: relative; display: grid; gap: 4px; justify-items: center; text-align: center; padding: 20px; border: 1.5px dashed var(--rule); border-radius: var(--r-tile); background: var(--surface); cursor: pointer; }
            .pick:hover, .pick:focus-within { border-color: var(--ink); }
            .pick.has { border-style: solid; border-color: var(--pine); }
            .pick input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
            .pick img { width: 100%; max-height: 160px; object-fit: cover; border-radius: 10px; }
            .pick-ph { display: grid; place-items: center; width: 100%; height: 120px; border-radius: 10px; background: var(--bg); font-size: 2rem; color: var(--ink-2); }
            @media (max-width: 560px) { .picks { grid-template-columns: 1fr; } }
          `}</style>
        </>
      )}
    </ActionForm>
  );
}
