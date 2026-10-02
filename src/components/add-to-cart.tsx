"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addToCartAction } from "@/app/actions/cart";

type Props = { productId: string; name: string; disabled?: string | null; variant?: "icon" | "full" };

/** Adds a product to the cart. Which licensed store fills it is decided at checkout. */
export function AddToCart({ productId, name, disabled, variant = "icon" }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const run = () => start(async () => {
    const r = await addToCartAction(productId, variant === "full" ? qty : 1);
    if (r.ok) { setMsg({ tone: "ok", text: "Added to cart" }); router.refresh(); setTimeout(() => setMsg(null), 2600); }
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
          <button className="btn signal grow" onClick={run} disabled={pending} aria-busy={pending}>{pending ? "Adding…" : "Add to cart"}</button>
        </div>
      ) : (
        <button className="add-btn" onClick={(e) => { e.preventDefault(); run(); }} disabled={pending} aria-label={`Add ${name} to cart`} title="Add to cart">
          {pending ? "…" : "+"}
        </button>
      )}
      <div role="status" aria-live="polite" className={msg ? `atc-msg ${msg.tone}` : "sr-only"}>
        {msg?.text}{msg?.tone === "ok" && variant === "full" && <> <Link href="/cart">View cart</Link></>}
      </div>
    </div>
  );
}
