import type { Trust } from "@/lib/verification/trust";

/** The verification mark. Bottom stone = listing fresh, middle = licence current, top = licence checked. */
export function CairnMark({ trust, size = 18, label = true }: { trust: Pick<Trust, "state" | "stones" | "headline">; size?: number; label?: boolean }) {
  const [licence, current, listing] = trust.stones;
  const on = [licence.ok, current.ok, listing.ok];
  return (
    <span
      className={`cairn ${trust.state}`}
      style={{ ["--cs" as string]: `${size}px` }}
      role={label ? "img" : undefined}
      aria-label={label ? trust.headline : undefined}
      aria-hidden={label ? undefined : true}
    >
      <i className={on[0] ? "on" : ""} />
      <i className={on[1] ? "on" : ""} />
      <i className={on[2] ? "on" : ""} />
    </span>
  );
}

/** The full record behind the mark. */
export function TrustRecord({ trust, retailerName, regulator, registryUrl }: {
  trust: Trust; retailerName: string; regulator: string; registryUrl?: string | null;
}) {
  return (
    <div className="stack" style={{ ["--gap" as string]: "16px" }}>
      <div className="row" style={{ ["--gap" as string]: "14px" }}>
        <CairnMark trust={trust} size={34} />
        <div>
          <p className="h4">{trust.headline}</p>
          {trust.licence && (
            <p className="small muted tabular">
              Licence {trust.licence.number} held by {retailerName}
            </p>
          )}
        </div>
      </div>
      <ol className="list ruled" aria-label="Verification record">
        {[...trust.stones].map((s) => (
          <li key={s.key} className="row top" style={{ padding: "12px 0", ["--gap" as string]: "12px" }}>
            <span className={`status ${s.ok ? "ok" : trust.state === "expired" && s.key === "current" ? "bad" : "idle"}`} aria-hidden />
            <div className="grow">
              <p className="strong small">{s.label}</p>
              <p className="small muted">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="xs muted">
        Licensing authority: {regulator}.{" "}
        {registryUrl ? <a href={registryUrl} target="_blank" rel="noreferrer">Check the public registry yourself</a> : "You can confirm any licence with the provincial regulator."}
      </p>
    </div>
  );
}
