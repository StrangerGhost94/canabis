"use client";
import { useRef, type ReactNode } from "react";
import { IconX } from "./icons";

/** Opens the verification record from any cairn. */
export function TrustButton({ children, trigger, title }: { children: ReactNode; trigger: ReactNode; title: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className="trust-trigger" onClick={() => ref.current?.showModal()} aria-haspopup="dialog">
        {trigger}
      </button>
      <dialog ref={ref} className="sheet" aria-label={title} style={{ width: 520 }} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
        <div className="dialog-head"><p className="h4">{title}</p><button className="btn ghost sm" onClick={() => ref.current?.close()} aria-label="Close"><IconX /></button></div>
        <div className="dialog-body">{children}</div>
      </dialog>
    </>
  );
}
