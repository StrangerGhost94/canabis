/**
 * The homepage's one memorable moment: the verification model drawn as a cairn.
 * Each stone sits beside the check it stands for. Stones settle once on load.
 */
export function HeroCairn() {
  const stones = [
    { w: 44, label: "Licence checked", detail: "Compared with the provincial regulator's public registry before a store is listed.", r: "52% 48% 46% 54% / 62% 60% 40% 38%" },
    { w: 70, label: "Licence current", detail: "Listings pause automatically the day a licence expires.", r: "44% 56% 52% 48% / 58% 62% 38% 42%" },
    { w: 100, label: "Availability fresh", detail: "Stores keep stock up to date. Stale menus are marked as such.", r: "48% 52% 50% 50% / 60% 56% 44% 40%" },
  ];
  return (
    <figure className="hero-cairn" aria-label="How Cairn verifies a store">
      {stones.map((s, i) => (
        <div key={s.label} className="hc-row">
          <div className="hc-cell" aria-hidden>
            <span className={`hc-stone s${i}`} style={{ width: `${s.w}%`, borderRadius: s.r }} />
          </div>
          <p className="hc-note">
            <span className="strong">{s.label}</span>
            <span className="small muted">{s.detail}</span>
          </p>
        </div>
      ))}
      <style>{`
        .hero-cairn { margin: 0; display: grid; }
        .hc-row { display: grid; grid-template-columns: minmax(130px, 0.85fr) 1.15fr; gap: 28px; align-items: end; }
        .hc-cell { display: flex; justify-content: center; align-items: flex-end; height: clamp(58px, 7vw, 84px); }
        .hc-row:last-child .hc-cell { border-bottom: 2px solid var(--ink); }
        .hc-stone { display: block; height: 100%; background: var(--ink); margin-bottom: -2px; animation: settle .55s var(--ease) both; }
        .hc-stone.s0 { background: var(--accent); height: 86%; animation-delay: .52s; }
        .hc-stone.s1 { height: 94%; animation-delay: .3s; }
        .hc-stone.s2 { animation-delay: .08s; margin-bottom: 0; }
        @keyframes settle { from { transform: translateY(-40px); opacity: 0; } 72% { transform: translateY(2px); opacity: 1; } }
        .hc-note { display: grid; gap: 2px; padding: 10px 0; border-bottom: 1px solid var(--rule); align-self: stretch; align-content: end; }
        .hc-row:first-child .hc-note { border-top: 2px solid var(--accent); }
        @media (max-width: 620px) { .hc-row { grid-template-columns: 84px 1fr; gap: 16px; align-items: center; } .hc-cell { height: 30px; align-items: center; } .hc-row:last-child .hc-cell { border-bottom: 0; } .hc-stone, .hc-stone.s0, .hc-stone.s1 { height: 100%; margin: 0; } }
      `}</style>
    </figure>
  );
}
