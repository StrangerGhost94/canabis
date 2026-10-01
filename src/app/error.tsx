"use client";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const userFacing = error.name === "UserFacingError" || /^(Only|This|That|You)/.test(error.message);
  return (
    <main className="wrap section stack" style={{ maxWidth: 560 }} role="alert">
      <span className="cairn suspended" style={{ ["--cs" as string]: "44px" }} aria-hidden><i /><i /><i /></span>
      <h1 className="h1">That didn't work</h1>
      <p className="muted">{userFacing ? error.message : "Something failed on our side. Nothing was changed. Try again, and if it keeps happening, contact support with the reference below."}</p>
      {error.digest && <p className="xs muted">Reference: <span className="code">{error.digest}</span></p>}
      <div className="row"><button className="btn primary" onClick={reset}>Try again</button><Link href="/" className="btn">Home</Link></div>
    </main>
  );
}
