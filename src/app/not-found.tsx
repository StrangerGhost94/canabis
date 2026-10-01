import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap section stack" style={{ maxWidth: 560 }}>
      <span className="cairn expired" style={{ ["--cs" as string]: "44px" }} aria-hidden><i /><i /><i /></span>
      <h1 className="h1">Nothing is listed here</h1>
      <p className="muted">The page may have moved, or the store or product it pointed to is no longer listed. Stores leave Cairn when a licence lapses or a listing is suspended.</p>
      <div className="row"><Link href="/discover" className="btn primary">Discover stores</Link><Link href="/" className="btn">Home</Link></div>
    </main>
  );
}
