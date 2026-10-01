/** How much of the 30 g public-possession limit this order uses. */
export function LimitMeter({ grams, limit = 30 }: { grams: number; limit?: number }) {
  const pct = Math.min(100, (grams / limit) * 100);
  const over = grams > limit;
  return (
    <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.round(grams * 10) / 10} aria-label="Possession limit used">
      <div className="row between xs"><span>Possession limit</span><span className="num strong" style={{ color: over ? "var(--red)" : undefined }}>{Math.round(grams * 10) / 10} of {limit} g</span></div>
      <div className="meter-track"><span style={{ width: `${pct}%`, background: over ? "var(--red)" : pct > 80 ? "var(--rust)" : "var(--pine)" }} /></div>
    </div>
  );
}
