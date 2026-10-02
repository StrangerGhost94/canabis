import Link from "next/link";
import { IconCheck, IconShield } from "@/components/icons";
import { VerifyForm } from "@/components/verify-form";
import { requireUser } from "@/lib/auth/session";
import { getPolicy } from "@/lib/compliance";
import { relTime } from "@/lib/format";

export const metadata = { title: "Verify your ID" };

export default async function Verify({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const u = await requireUser("/account/verify");
  const { next } = await searchParams;
  const policy = await getPolicy(u.jurisdictionCode);
  const nextSafe = next && next.startsWith("/") && !next.startsWith("//") ? next : "";

  return (
    <div className="verify stack" style={{ ["--gap" as string]: "24px", maxWidth: 720 }}>
      <div>
        <span className="kicker">One-time check</span>
        <h1 className="h1">Verify your ID</h1>
        <p className="lede mt-1">Cannabis is for adults {policy.legalAge}+ in {policy.name}. Verify once and you can order anywhere Cairn delivers — even after you move.</p>
      </div>

      {u.idStatus === "VERIFIED" ? (
        <div className="v-state ok">
          <IconCheck aria-hidden />
          <div><p className="h4">You're verified</p><p className="small muted">Checked {u.idReviewedAt ? relTime(u.idReviewedAt) : ""}. You can order anywhere Cairn delivers in {policy.name}.</p>
            <div className="row mt-2"><Link href={nextSafe || "/shop"} className="btn signal">{nextSafe ? "Continue" : "Start shopping"}</Link></div></div>
        </div>
      ) : u.idStatus === "PENDING" ? (
        <div className="v-state">
          <IconShield aria-hidden />
          <div><p className="h4">We're checking your ID</p><p className="small muted">Submitted {u.idSubmittedAt ? relTime(u.idSubmittedAt) : "just now"}. A person on our team reviews every ID, usually within a few hours. We'll notify you the moment it's done. You can keep shopping and filling your cart meanwhile.</p>
            <div className="row mt-2"><Link href="/shop" className="btn">Keep shopping</Link></div></div>
        </div>
      ) : (
        <>
          {u.idStatus === "REJECTED" && (
            <div className="callout bad"><p className="strong">We couldn't verify your last submission</p><p className="small">{u.idReviewNotes ?? "Please try again with clearer photos."}</p></div>
          )}
          <ol className="v-steps">
            <li><b>Your ID</b><span>Driver's licence, passport, provincial photo card, or other government photo ID. All four corners visible, no glare.</span></li>
            <li><b>A selfie</b><span>Your face, clearly lit, so we can match you to the ID.</span></li>
            <li><b>We check it</b><span>A person confirms your name and that you're {policy.legalAge}+. Then both images are permanently deleted.</span></li>
          </ol>
          <VerifyForm next={nextSafe} />
        </>
      )}
      <p className="xs muted">Your images are stored privately on our servers, never shared with stores, seen only by our verification team, and deleted as soon as the review is done. The store will still check your ID at the door — that's the law.</p>
      <style>{`
        .v-state { display: flex; gap: 16px; padding: 24px; border-radius: var(--r-tile); background: var(--surface); border: 1px solid var(--rule); }
        .v-state.ok { border-color: var(--pine); }
        .v-state > svg { flex: none; width: 28px; height: 28px; color: var(--brass); }
        .v-state.ok > svg { color: var(--pine); }
        .v-steps { list-style: none; counter-reset: v; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .v-steps li { counter-increment: v; display: grid; gap: 4px; padding: 18px; border-radius: var(--r-panel); background: var(--surface); border: 1px solid var(--rule-soft); font-size: var(--t-sm); }
        .v-steps li::before { content: counter(v); width: 28px; height: 28px; border-radius: 99px; display: grid; place-items: center; background: var(--night); color: var(--brass-soft); font-family: var(--font-display); margin-bottom: 4px; }
        .v-steps span { color: var(--ink-2); }
        @media (max-width: 700px) { .v-steps { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
