"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { addToCartAction } from "@/app/actions/cart";

type Props = { productId: string; name: string; disabled?: string | null; locationId?: string; variant?: "icon" | "full" };

/** Adds to the one-store cart. If the cart holds another store's items, asks before replacing them. */
export function AddToCart({ productId, name, disabled, locationId, variant = "icon" }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [conflict, setConflict] = useState<{ current: string; next: string } | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);

  const run = (replace = false) => start(async () => {
    const r = await addToCartAction(productId, variant === "full" ? qty : 1, replace, locationId);
    if (r.ok) { setMsg({ tone: "ok", text: "Added to cart" }); dlg.current?.close(); router.refresh(); setTimeout(() => setMsg(null), 2600); }
    else if ("conflict" in r) { setConflict(r.conflict); dlg.current?.showModal(); }
    else setMsg({ tone: "err", text: r.error });
  });

  if (disabled) return variant === "full" ? <p className="small muted">{disabled}</p> : null;

  return (
    <div className={`atc ${variant}`}>
      {variant === "full" ? (
        <div className="row" style={{ ["--gap" as string]: "10px", flexWrap: "nowrap" }}>
          <div className="qty" role="group" aria-label="Quantity">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
            <span aria-live="polite" className="num">{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase quantity">+</button>
          </div>
          <button className="btn signal grow" onClick={() => run()} disabled={pending} aria-busy={pending}>{pending ? "Adding…" : "Add to cart"}</button>
        </div>
      ) : (
        <button className="add-btn" onClick={(e) => { e.preventDefault(); run(); }} disabled={pending} aria-label={`Add ${name} to cart`} title="Add to cart">
          {pending ? "…" : "+"}
        </button>
      )}
      <div role="status" aria-live="polite" className={msg ? `atc-msg ${msg.tone}` : "sr-only"}>
        {msg?.text}{msg?.tone === "ok" && variant === "full" && <> <Link href="/cart">View cart</Link></>}
      </div>
      <dialog ref={dlg} aria-labelledby={`swap-${productId}`} style={{ width: 440 }}>
        <div className="dialog-body stack">
          <p id={`swap-${productId}`} className="h4">Start a new cart?</p>
          <p className="small muted">Each order comes from one store, so it can be prepared and handed over with an ID check in one go. Your cart has items from {conflict?.current}.</p>
        </div>
        <div className="dialog-foot">
          <button className="btn ghost" onClick={() => dlg.current?.close()}>Keep my cart</button>
          <button className="btn primary" onClick={() => run(true)} disabled={pending}>Start a cart at {conflict?.next}</button>
        </div>
      </dialog>
    </div>
  );
}
