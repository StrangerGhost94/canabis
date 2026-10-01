"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";
import { IconFilter, IconX } from "../icons";

type Props = { categories: { value: string; label: string }[]; showPrice: boolean; activeCount: number };

/** GET form: works without JS; with JS it applies on change and keeps the URL shareable. */
export function Filters({ categories, showPrice, activeCount }: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const [pending, start] = useTransition();
  const sheet = useRef<HTMLDialogElement>(null);

  const apply = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (v) params.set(k, String(v));
    start(() => router.replace(`/shop?${params.toString()}`, { scroll: false }));
  };

  const body = (idp: string) => (
    <form
      action="/shop"
      className="stack filters"
      style={{ ["--gap" as string]: "22px" }}
      onChange={(e) => apply(e.currentTarget)}
      onSubmit={(e) => { e.preventDefault(); apply(e.currentTarget); sheet.current?.close(); }}
      aria-busy={pending}
    >
      {["q", "sort"].map((k) => sp.get(k) && <input key={k} type="hidden" name={k} value={sp.get(k)!} />)}
      <fieldset>
        <legend>Format</legend>
        <div className="seg">
          <span><input type="radio" id={`${idp}cat-all`} name="category" value="" defaultChecked={!sp.get("category")} /><label htmlFor={`${idp}cat-all`}>All</label></span>
          {categories.map((c) => (
            <span key={c.value}><input type="radio" id={`${idp}cat-${c.value}`} name="category" value={c.value} defaultChecked={sp.get("category") === c.value} /><label htmlFor={`${idp}cat-${c.value}`}>{c.label}</label></span>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>THC and CBD balance</legend>
        <div className="seg">
          {[["", "Any"], ["thc", "Mostly THC"], ["balanced", "Balanced"], ["cbd", "Mostly CBD"]].map(([v, l]) => (
            <span key={v}><input type="radio" id={`${idp}r-${v || "any"}`} name="ratio" value={v} defaultChecked={(sp.get("ratio") ?? "") === v} /><label htmlFor={`${idp}r-${v || "any"}`}>{l}</label></span>
          ))}
        </div>
        <p className="hint mt-1">Based on the label values the store publishes.</p>
      </fieldset>
      {showPrice && (
        <div className="field">
          <label htmlFor={`${idp}max`}>Price up to</label>
          <select id={`${idp}max`} name="max" className="select" defaultValue={sp.get("max") ?? ""}>
            <option value="">Any price</option>
            {[10, 25, 40, 60].map((m) => <option key={m} value={m}>${m}</option>)}
          </select>
        </div>
      )}
      <fieldset className="stack" style={{ ["--gap" as string]: "10px" }}>
        <legend>Availability</legend>
        <label className="check"><input type="checkbox" name="stock" value="1" defaultChecked={sp.get("stock") === "1"} />In stock at a nearby location</label>
        <label className="check"><input type="checkbox" name="open" value="1" defaultChecked={sp.get("open") === "1"} />Open now</label>
      </fieldset>
      <a href="/shop" className="small">Clear filters</a>
      <button className="btn primary show-sm">Show results</button>
    </form>
  );

  return (
    <>
      <aside className="filter-rail hide-sm" aria-label="Filters">{body("d-")}</aside>
      <button type="button" className="btn sm show-sm" onClick={() => sheet.current?.showModal()}>
        <IconFilter /> Filters{activeCount ? ` (${activeCount})` : ""}
      </button>
      <dialog ref={sheet} className="sheet" aria-label="Filters" style={{ width: 520 }}>
        <div className="dialog-head"><p className="h4">Filters</p><button className="btn ghost sm" onClick={() => sheet.current?.close()} aria-label="Close"><IconX /></button></div>
        <div className="dialog-body">{body("m-")}</div>
      </dialog>
    </>
  );
}
