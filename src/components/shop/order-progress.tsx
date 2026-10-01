import { relTime } from "@/lib/format";

type Status = "PLACED" | "ACCEPTED" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELLED" | "REJECTED";

/** Order progress as a track of steps, with when each happened. */
export function OrderProgress({ fulfilment, status, events }: { fulfilment: "PICKUP" | "DELIVERY"; status: Status; events: { status: Status; createdAt: Date; note: string | null }[] }) {
  const steps: { s: Status; label: string }[] = [
    { s: "PLACED", label: "Placed" },
    { s: "ACCEPTED", label: "Accepted" },
    fulfilment === "PICKUP" ? { s: "READY", label: "Ready for pickup" } : { s: "OUT_FOR_DELIVERY", label: "Out for delivery" },
    { s: "COMPLETED", label: fulfilment === "PICKUP" ? "Picked up" : "Delivered" },
  ];
  const ended = status === "CANCELLED" || status === "REJECTED";
  const at = (s: Status) => events.find((e) => e.status === s)?.createdAt;
  const reached = steps.findIndex((x) => x.s === status);
  const end = events.find((e) => e.status === status);
  return (
    <div>
      <ol className="progress" aria-label="Order progress">
        {steps.map((x, i) => {
          const done = !!at(x.s) && !ended ? true : !!at(x.s);
          const current = !ended && i === reached;
          return (
            <li key={x.s} className={`${done ? "done" : ""} ${current ? "current" : ""}`} aria-current={current ? "step" : undefined}>
              <span className="dotm" aria-hidden />
              <span className="small strong">{x.label}</span>
              <span className="xs muted">{at(x.s) ? relTime(at(x.s)!) : ""}</span>
            </li>
          );
        })}
      </ol>
      {ended && <p className="callout bad small mt-2"><span className="strong">{status === "REJECTED" ? "Declined by the store" : "Cancelled"}</span>{end?.note ? `: ${end.note}` : ""}</p>}
    </div>
  );
}
