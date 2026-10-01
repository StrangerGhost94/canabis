export default function Loading() {
  return (
    <div className="wrap" style={{ paddingTop: 24 }} aria-busy="true" aria-label="Loading results">
      <div className="skeleton" style={{ height: 48, maxWidth: 640 }} />
      <div className="stack mt-4" style={{ ["--gap" as string]: "1px" }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="row" style={{ padding: "16px 0", borderTop: "1px solid var(--rule)", ["--gap" as string]: "18px" }}>
            <div className="skeleton" style={{ width: 108, height: 76 }} />
            <div className="grow stack" style={{ ["--gap" as string]: "8px" }}>
              <div className="skeleton" style={{ height: 18, width: "40%" }} />
              <div className="skeleton" style={{ height: 14, width: "25%" }} />
              <div className="skeleton" style={{ height: 14, width: "55%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
