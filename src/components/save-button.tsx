"use client";
import { useOptimistic, useTransition } from "react";
import { toggleFavourite } from "@/app/actions/favourites";
import { IconHeart } from "./icons";

export function SaveButton({ kind, id, saved, back, label }: { kind: "product" | "retailer"; id: string; saved: boolean; back: string; label: string }) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, start] = useTransition();
  return (
    <form action={(fd) => start(async () => { setOptimistic(!optimistic); await toggleFavourite(fd); })}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="back" value={back} />
      <button className="btn ghost sm" aria-pressed={optimistic} aria-label={`${optimistic ? "Remove" : "Save"} ${label}`} style={{ color: optimistic ? "var(--accent)" : undefined }}>
        <IconHeart filled={optimistic} />
      </button>
    </form>
  );
}
