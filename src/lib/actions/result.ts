import { ZodError } from "zod";
import { RateLimitError } from "../rate-limit";

export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
} | null;

export const ok = (message?: string): ActionState => ({ ok: true, message });

/** Turn thrown errors into a form-friendly state without leaking internals. */
export function fail(e: unknown, form?: FormData): ActionState {
  const values = form ? Object.fromEntries([...form.entries()].filter(([k, v]) => typeof v === "string" && !/password|token/i.test(k) && !k.startsWith("$")) as [string, string][]) : undefined;
  if (e instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of e.issues) fields[String(issue.path[0])] ??= issue.message;
    return { error: "Check the highlighted fields.", fields, values };
  }
  if (e instanceof RateLimitError) return { error: e.message, values };
  if (e && typeof e === "object" && "digest" in e && String((e as { digest: string }).digest).startsWith("NEXT_")) throw e; // redirects
  if (e instanceof Error && e.name === "UserFacingError") return { error: e.message, values };
  console.error(e);
  return { error: "That didn't go through. Try again, and contact support if it keeps happening.", values };
}

export class UserFacingError extends Error {
  name = "UserFacingError";
}
