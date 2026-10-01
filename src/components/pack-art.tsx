/**
 * Pack art: every product drawn as its package, coloured by brand, on its
 * format's shelf tint. Gives a marketplace its visual rhythm without lifestyle
 * imagery, and works for any product a store adds. Stores can upload a real
 * pack shot to replace it.
 */
const BRAND_INKS = ["#1f2148", "#1c7a4f", "#b8461b", "#2a53c4", "#6d2a63", "#0f6e6a", "#8a5a00", "#3d3f73"];

export function brandInk(brand: string) {
  let h = 0;
  for (const c of brand) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return BRAND_INKS[h % BRAND_INKS.length];
}

export function PackArt({ p, size = 200 }: { p: { category: string; brand: string; name: string; imageKey?: string | null }; size?: number }) {
  if (p.imageKey) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/media/${p.imageKey}`} alt="" width={size} height={size} style={{ width: "100%", height: "100%", objectFit: "contain" }} loading="lazy" />;
  }
  const ink = brandInk(p.brand);
  const label = (x: number, y: number, w: number, h: number, small = false) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill="#fff" />
      <rect x={x} y={y} width={w} height={small ? 4 : 6} fill={ink} />
      <text x={x + w / 2} y={y + h / 2 + (small ? 4 : 6)} textAnchor="middle" fontSize={small ? 8.5 : 11} fontWeight={700} fill={ink} fontFamily="var(--font)" style={{ fontStretch: "80%" }}>
        {p.brand.length > 12 ? p.brand.split(" ")[0] : p.brand}
      </text>
    </g>
  );
  const stroke = { stroke: "#1f2148", strokeWidth: 2.5, strokeLinejoin: "round" as const };
  let art: React.ReactNode;
  switch (p.category) {
    case "FLOWER":
      art = (<>
        <rect x="58" y="72" width="84" height="100" rx="16" fill="#fff" fillOpacity=".55" {...stroke} />
        <rect x="54" y="54" width="92" height="24" rx="7" fill={ink} {...stroke} />
        {label(66, 104, 68, 40)}
      </>);
      break;
    case "PRE_ROLL":
      art = (<>
        <rect x="64" y="40" width="30" height="132" rx="15" fill="#fff" {...stroke} transform="rotate(-6 79 106)" />
        <rect x="102" y="34" width="30" height="138" rx="15" fill="#fff" {...stroke} transform="rotate(5 117 103)" />
        <rect x="64" y="40" width="30" height="26" rx="13" fill={ink} {...stroke} transform="rotate(-6 79 106)" />
        <rect x="102" y="34" width="30" height="26" rx="13" fill={ink} {...stroke} transform="rotate(5 117 103)" />
        {label(56, 118, 88, 32, true)}
      </>);
      break;
    case "VAPE":
      art = (<>
        <rect x="88" y="26" width="24" height="26" rx="6" fill={ink} {...stroke} />
        <rect x="82" y="50" width="36" height="104" rx="8" fill="#fff" {...stroke} />
        <rect x="90" y="62" width="20" height="54" rx="4" fill="#f2b400" fillOpacity=".75" />
        <rect x="86" y="152" width="28" height="22" rx="4" fill="#9aa0b8" {...stroke} />
        {label(66, 120, 68, 26, true)}
      </>);
      break;
    case "EXTRACT":
      art = (<>
        <rect x="46" y="98" width="108" height="56" rx="10" fill="#fff" {...stroke} />
        <ellipse cx="100" cy="98" rx="54" ry="16" fill={ink} {...stroke} />
        {label(66, 116, 68, 28, true)}
      </>);
      break;
    case "EDIBLE":
      art = (<>
        <rect x="38" y="62" width="124" height="96" rx="10" fill="#fff" {...stroke} />
        <rect x="38" y="62" width="124" height="28" rx="10" fill={ink} {...stroke} />
        <circle cx="74" cy="132" r="9" fill={ink} fillOpacity=".25" />
        <circle cx="100" cy="132" r="9" fill={ink} fillOpacity=".25" />
        <circle cx="126" cy="132" r="9" fill={ink} fillOpacity=".25" />
        {label(64, 96, 72, 24, true)}
      </>);
      break;
    case "BEVERAGE":
      art = (<>
        <rect x="70" y="38" width="60" height="136" rx="12" fill={ink} {...stroke} />
        <rect x="76" y="32" width="48" height="12" rx="4" fill="#c7cbd9" {...stroke} />
        {label(74, 90, 52, 44, true)}
      </>);
      break;
    case "TOPICAL":
      art = (<>
        <path d="M72 46 h56 l-8 108 h-40 z" fill="#fff" {...stroke} />
        <rect x="84" y="152" width="32" height="24" rx="5" fill={ink} {...stroke} />
        <path d="M72 46 h56" stroke={ink} strokeWidth="8" />
        {label(78, 86, 44, 34, true)}
      </>);
      break;
    case "CAPSULE":
      art = (<>
        <rect x="60" y="66" width="70" height="104" rx="14" fill="#fff" {...stroke} />
        <rect x="66" y="46" width="58" height="24" rx="6" fill={ink} {...stroke} />
        {label(66, 100, 58, 36, true)}
        <rect x="136" y="140" width="34" height="16" rx="8" fill="#fff" {...stroke} />
        <rect x="136" y="140" width="17" height="16" rx="8" fill={ink} />
      </>);
      break;
    case "SEED":
      art = (<>
        <path d="M54 52 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 v124 h-92 z" fill="#fff" {...stroke} />
        <rect x="54" y="62" width="92" height="20" fill={ink} />
        {label(64, 100, 72, 34, true)}
      </>);
      break;
    default:
      art = (<>
        <rect x="50" y="60" width="100" height="100" rx="12" fill="#fff" {...stroke} />
        {label(62, 96, 76, 30, true)}
      </>);
  }
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden style={{ width: "100%", height: "100%" }}>
      <ellipse cx="100" cy="182" rx="62" ry="7" fill="#1f2148" opacity=".1" />
      {art}
    </svg>
  );
}
