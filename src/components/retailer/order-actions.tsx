"use client";
import { orderAction } from "@/app/actions/retailer";
import { ActionForm, Submit } from "../form";

type O = { id: string; status: string; fulfilment: "PICKUP" | "DELIVERY"; lead: number };

/** The next step for an order, plus the way out (decline or cancel) where it applies. */
export function OrderActions({ o }: { o: O }) {
  if (["COMPLETED", "CANCELLED", "REJECTED"].includes(o.status)) return null;
  return (
    <div className="stack" style={{ ["--gap" as string]: "16px" }}>
      <ActionForm action={orderAction} className="stack">
        {(s) => (
          <>
            <input type="hidden" name="orderId" value={o.id} />
            {o.status === "PLACED" && (
              <>
                <label className="field"><span className="label">Ready in</span>
                  <select name="readyMinutes" className="select" defaultValue={String(o.lead)} style={{ maxWidth: 220 }}>
                    {[15, 20, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}
                  </select>
                </label>
                <Submit name="to" value="ACCEPTED" className="btn signal" pending="Accepting…">Accept order</Submit>
              </>
            )}
            {o.status === "ACCEPTED" && (o.fulfilment === "PICKUP"
              ? <Submit name="to" value="READY" className="btn signal" pending="Saving…">Mark ready for pickup</Submit>
              : <Submit name="to" value="OUT_FOR_DELIVERY" className="btn signal" pending="Saving…">Mark out for delivery</Submit>)}
            {(o.status === "READY" || o.status === "OUT_FOR_DELIVERY") && (
              <>
                <label className="check"><input type="checkbox" name="idChecked" value="yes" /><span>I checked valid government ID and the customer is of legal age. Payment was taken.</span></label>
                <Submit name="to" value="COMPLETED" className="btn primary" pending="Completing…">Complete handover</Submit>
              </>
            )}
            {s?.error && null}
          </>
        )}
      </ActionForm>
      <details className="decline">
        <summary className="small">{o.status === "PLACED" ? "Decline this order" : "Cancel this order"}</summary>
        <ActionForm action={orderAction} className="stack mt-1">
          {() => (
            <>
              <input type="hidden" name="orderId" value={o.id} />
              <input type="hidden" name="to" value={o.status === "PLACED" ? "REJECTED" : "CANCELLED"} />
              <select name="note" className="select" defaultValue="">
                <option value="" disabled>Reason the customer will see</option>
                <option>An item sold out before we could prepare it.</option>
                <option>We can't deliver to this address.</option>
                <option>We're closing before the order can be ready.</option>
                <option>The customer couldn't show valid ID.</option>
                <option>The customer didn't arrive before closing.</option>
              </select>
              <Submit className="btn danger sm" pending="Saving…">{o.status === "PLACED" ? "Decline order" : "Cancel order"}</Submit>
            </>
          )}
        </ActionForm>
      </details>
    </div>
  );
}
