"use client";
import { useRef, useState } from "react";
import { clearNear, setNear } from "@/app/actions/visitor";
import { ActionForm, Submit } from "../form";
import { IconPin } from "../icons";

/** Set "near me": device location in one tap, or any postal code / city. */
export function NearControl({ label, next, compact = false }: { label: string | null; next: string; compact?: boolean }) {
  const [editing, setEditing] = useState(!label);
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const useDevice = () => {
    if (!("geolocation" in navigator)) return setGeoErr("Your browser can't share location. Enter a postal code instead.");
    setLocating(true); setGeoErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const f = formRef.current;
        if (!f) return;
        (f.elements.namedItem("lat") as HTMLInputElement).value = String(pos.coords.latitude);
        (f.elements.namedItem("lng") as HTMLInputElement).value = String(pos.coords.longitude);
        f.requestSubmit();
        setTimeout(() => setLocating(false), 6000);
      },
      () => { setLocating(false); setGeoErr("Location is blocked. Enter a postal code instead."); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  };

  if (!editing && label) {
    return (
      <div className="near-set">
        <IconPin width={16} height={16} aria-hidden />
        <span>Near <span className="strong">{label}</span></span>
        <button className="linkbtn" onClick={() => setEditing(true)}>Change</button>
        <form action={clearNear}><button className="linkbtn muted">Clear</button></form>
      </div>
    );
  }
  return (
    <div className={`near ${compact ? "compact" : ""}`}>
      <ActionForm action={setNear} className="near-form">
        {(s) => (
          <>
            <input type="hidden" name="next" value={next} />
            <input type="hidden" name="lat" defaultValue="" />
            <input type="hidden" name="lng" defaultValue="" />
            <span ref={(el) => { formRef.current = el?.closest("form") ?? null; }} hidden />
            <label htmlFor="near" className="sr-only">Postal code or city</label>
            <div className="near-row">
              <IconPin width={18} height={18} aria-hidden />
              <input id="near" name="near" placeholder="Postal code or city" defaultValue={s?.values?.near} autoComplete="postal-code" />
              <Submit className="btn sm" pending="Finding…">Set</Submit>
            </div>
          </>
        )}
      </ActionForm>
      <button type="button" className="linkbtn small near-device" onClick={useDevice} disabled={locating}>
        {locating ? "Finding you…" : "Use my current location"}
      </button>
      {geoErr && <p className="err">{geoErr}</p>}
    </div>
  );
}
