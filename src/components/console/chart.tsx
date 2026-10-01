/** Daily series as paired bars. Hand-drawn SVG: no chart library, crisp at any size. */
export function DailyBars({ days, series, height = 160, label }: {
  days: string[]; // ISO dates
  series: { name: string; values: number[]; alt?: boolean }[];
  height?: number;
  label: string;
}) {
  const w = 720, h = height, padB = 22, padT = 8;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const nice = niceMax(max);
  const slot = w / days.length;
  const bw = Math.max(2, (slot - 3) / series.length);
  const y = (v: number) => padT + (h - padB - padT) * (1 - v / nice);
  const total = series.map((s) => s.values.reduce((a, b) => a + b, 0));
  return (
    <figure style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${label}. ${series.map((s, i) => `${s.name}: ${total[i]} over ${days.length} days`).join(". ")}`}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line className="axis" x1={0} x2={w} y1={y(nice * f)} y2={y(nice * f)} strokeDasharray={f ? "2 4" : undefined} />
            {f > 0 && <text x={0} y={y(nice * f) - 3}>{Math.round(nice * f)}</text>}
          </g>
        ))}
        {days.map((d, i) =>
          series.map((s, j) => {
            const v = s.values[i];
            return v > 0 ? <rect key={`${i}-${j}`} className={`bar ${s.alt ? "alt" : ""}`} x={i * slot + 1 + j * bw} y={y(v)} width={bw - 1} height={h - padB - y(v)} rx={1}><title>{`${d}: ${v} ${s.name.toLowerCase()}`}</title></rect> : null;
          }),
        )}
        {days.map((d, i) => (i % 7 === 0 || (i === days.length - 1 && i % 7 > 3)) && (
          <text key={d} x={i * slot + slot / 2} y={h - 6} textAnchor="middle">{new Date(d + "T12:00:00Z").toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" })}</text>
        ))}
      </svg>
      <figcaption className="legend mt-1">
        {series.map((s) => <span key={s.name} style={{ ["--c" as string]: s.alt ? "var(--accent)" : "var(--ink)" }}>{s.name}</span>)}
      </figcaption>
    </figure>
  );
}

function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export function lastNDays(n: number) {
  return Array.from({ length: n }, (_, i) => new Date(Date.now() - (n - 1 - i) * 86400e3).toISOString().slice(0, 10));
}
