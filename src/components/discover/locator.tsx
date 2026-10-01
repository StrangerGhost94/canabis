/**
 * A schematic locator, not a street map: stores plotted around you on
 * distance rings. Readable at a glance, needs no third-party tiles.
 */
export function Locator({ near, points }: {
  near: { lat: number; lng: number; label: string };
  points: { id: string; lat: number; lng: number; label: string; open: boolean; href: string }[];
}) {
  const size = 320, c = size / 2;
  const rings = [1, 2, 5, 10];
  const maxKm = Math.max(2, ...points.map((p) => dist(near, p))) * 1.08;
  const ringKm = rings.filter((r) => r <= maxKm * 1.05).slice(-3);
  const scale = (c - 18) / maxKm;
  const project = (p: { lat: number; lng: number }) => {
    const dx = (p.lng - near.lng) * 111.32 * Math.cos((near.lat * Math.PI) / 180);
    const dy = (p.lat - near.lat) * 110.57;
    return { x: c + dx * scale, y: c - dy * scale };
  };
  return (
    <figure className="locator" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Stores plotted by distance from ${near.label}`}>
        {ringKm.map((r) => (
          <g key={r}>
            <circle cx={c} cy={c} r={r * scale} fill="none" stroke="var(--rule)" strokeDasharray="2 4" />
            <text x={c + 4} y={c - r * scale - 4} fontSize="10" fill="var(--ink-2)">{r} km</text>
          </g>
        ))}
        <line x1={c} y1={8} x2={c} y2={22} stroke="var(--ink-2)" />
        <text x={c + 4} y={18} fontSize="10" fill="var(--ink-2)">N</text>
        <circle cx={c} cy={c} r={6} fill="var(--ink)" />
        <circle cx={c} cy={c} r={11} fill="none" stroke="var(--ink)" />
        {points.map((p) => {
          const { x, y } = project(p);
          return (
            <a key={p.id} href={p.href} aria-label={p.label}>
              <rect x={x - 7} y={y - 5} width={14} height={10} rx={5} fill={p.open ? "var(--accent)" : "var(--surface)"} stroke="var(--ink)" strokeWidth={1.5} />
              <title>{p.label}</title>
            </a>
          );
        })}
      </svg>
      <figcaption className="legend mt-1">
        <span style={{ ["--c" as string]: "var(--ink)" }}>{near.label}</span>
        <span style={{ ["--c" as string]: "var(--accent)" }}>Open now</span>
        <span style={{ ["--c" as string]: "var(--stone)" }}>Closed</span>
      </figcaption>
    </figure>
  );
}

function dist(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dx = (b.lng - a.lng) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  const dy = (b.lat - a.lat) * 110.57;
  return Math.hypot(dx, dy);
}
