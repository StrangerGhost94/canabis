"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/actions/result";

export function Submit({ children, pending, className = "btn primary", ...rest }: { children: ReactNode; pending?: string; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending: isPending } = useFormStatus();
  return (
    <button {...rest} className={className} disabled={isPending || rest.disabled} aria-busy={isPending}>
      {isPending ? pending ?? "Working…" : children}
    </button>
  );
}

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

/**
 * A form bound to a server action, with inline errors and a status line that
 * screen readers announce. Field errors are exposed through FieldError.
 */
export function ActionForm({ action, children, className = "form", resetOnSuccess = false, id }: {
  action: Action; children: (state: ActionState) => ReactNode; className?: string; resetOnSuccess?: boolean; id?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && resetOnSuccess) ref.current?.reset(); }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className} noValidate id={id}>
      {children(state)}
      <div role="status" aria-live="polite">
        {state?.error && <p className="flash error">{state.error}</p>}
        {state?.ok && state.message && <p className="flash">{state.message}</p>}
      </div>
    </form>
  );
}

export function Field({ name, label, hint, state, children }: {
  name: string; label: string; hint?: ReactNode; state: ActionState; children?: ReactNode;
}) {
  const err = state?.fields?.[name];
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {children}
      {hint && !err && <p className="hint" id={`${name}-hint`}>{hint}</p>}
      {err && <p className="err" id={`${name}-err`}>{err}</p>}
    </div>
  );
}

/** Input wired to the field's error state. */
export function Input({ name, state, defaultValue, ...rest }: { name: string; state: ActionState } & React.InputHTMLAttributes<HTMLInputElement>) {
  const err = state?.fields?.[name];
  return (
    <input
      id={name} name={name} className="input"
      defaultValue={state?.values?.[name] ?? defaultValue}
      aria-invalid={err ? true : undefined}
      aria-describedby={err ? `${name}-err` : `${name}-hint`}
      {...rest}
    />
  );
}
