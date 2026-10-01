"use client";
import { useTransition } from "react";
import { updateCartLine } from "@/app/actions/cart";

export function QtyStepper({ productId, quantity, name }: { productId: string; quantity: number; name: string }) {
  const [pending, start] = useTransition();
  const set = (q: number) => start(async () => { const f = new FormData(); f.set("productId", productId); f.set("quantity", String(q)); await updateCartLine(f); });
  return (
    <div className="row" style={{ ["--gap" as string]: "10px", flexWrap: "nowrap" }} aria-busy={pending}>
      <div className="qty" role="group" aria-label={`Quantity of ${name}`}>
        <button type="button" onClick={() => set(quantity - 1)} aria-label="Decrease quantity" disabled={pending}>−</button>
        <span className="num">{quantity}</span>
        <button type="button" onClick={() => set(quantity + 1)} aria-label="Increase quantity" disabled={pending || quantity >= 10}>+</button>
      </div>
      <button type="button" className="linkbtn small" onClick={() => set(0)} disabled={pending}>Remove</button>
    </div>
  );
}
