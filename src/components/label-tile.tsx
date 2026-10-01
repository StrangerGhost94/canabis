import { CATEGORY_LABEL, potency } from "@/lib/format";

/**
 * A product's identity drawn from its regulated label: format, then THC and CBD.
 * Echoes Canadian packaging's standardised potency panel instead of lifestyle imagery.
 */
export function LabelTile({ p, size = "md" }: {
  p: { category: string; potencyUnit: string; thcMin: number | null; thcMax: number | null; cbdMin: number | null; cbdMax: number | null };
  size?: "md" | "lg";
}) {
  const { thc, cbd } = potency(p);
  return (
    <div className={`label-tile ${size}`} aria-hidden>
      <span className="lt-cat">{CATEGORY_LABEL[p.category]}</span>
      <span className="lt-row"><span className="lt-k">THC</span><span className="lt-v">{thc ?? "—"}</span></span>
      <span className="lt-row"><span className="lt-k">CBD</span><span className="lt-v">{cbd ?? "—"}</span></span>
    </div>
  );
}
