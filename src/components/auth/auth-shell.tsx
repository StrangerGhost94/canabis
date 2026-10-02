/** Two-panel layout for sign-in and sign-up: the form, and what you get. */
export function AuthShell({ title, sub, children, aside }: { title: string; sub: string; children: React.ReactNode; aside: { heading: string; points: string[] } }) {
  return (
    <div className="wrap auth">
      <div className="auth-card">
        <div className="auth-form">
          <div>
            <h1 className="h1 auth-title">{title}</h1>
            <p className="muted mt-1">{sub}</p>
          </div>
          {children}
        </div>
        <aside className="auth-aside night" aria-label="Why Cairn">
          <p className="auth-aside-h">{aside.heading}</p>
          <ul>{aside.points.map((p) => <li key={p}>{p}</li>)}</ul>
          <p className="auth-aside-foot">Licensed stores only · You pay the store · Your ID photos are deleted after review</p>
        </aside>
      </div>
      <style>{`
        .auth { padding-block: clamp(16px, 3vw, 40px) clamp(48px, 6vw, 80px); }
        .auth-card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, .9fr); min-height: min(760px, 86vh); border-radius: 32px; overflow: hidden; background: var(--surface); box-shadow: 0 1px 2px rgba(15,23,20,.04), 0 30px 60px -36px rgba(15,23,20,.35); }
        .auth-form { display: grid; align-content: center; gap: 28px; padding: clamp(28px, 5vw, 72px); max-width: 560px; width: 100%; justify-self: center; }
        .auth-brand { font-size: 1.4rem; }
        .auth-title { font-size: clamp(2.2rem, 3.6vw, 3rem); }
        .auth-form .form { max-width: none; }
        .auth-form .input, .auth-form .select { min-height: 52px; border-radius: 14px; }
        .auth-form .btn.block { min-height: 54px; font-size: var(--t-md); }
        .auth-aside { display: grid; align-content: end; gap: 22px; padding: clamp(32px, 5vw, 64px); }
        .auth-aside-h { font-family: var(--font-display); font-weight: 650; font-size: clamp(2rem, 3.4vw, 3rem); line-height: 1; letter-spacing: -0.04em; color: #fff; max-width: 12ch; }
        .auth-aside ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
        .auth-aside li { display: flex; gap: 12px; align-items: flex-start; color: var(--night-ink); }
        .auth-aside li::before { content: ""; flex: none; margin-top: 2px; width: 20px; height: 20px; border-radius: 99px; background: var(--lilac) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 8.2l2.3 2.3 4.7-5' fill='none' stroke='%230f1714' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/18px no-repeat; }
        .auth-aside-foot { font-size: var(--t-xs); color: var(--night-mute); }
        @media (max-width: 900px) { .auth-card { grid-template-columns: 1fr; min-height: 0; } .auth-aside { order: 2; } }
      `}</style>
    </div>
  );
}
