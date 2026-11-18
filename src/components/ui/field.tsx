import type { InputHTMLAttributes } from "react";

export function Field({ label, hint, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; id: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...props}
        className="min-h-11 w-full rounded-control border border-control bg-surface px-3 text-base text-ink placeholder:text-ink-2"
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormMessage({ error, info }: { error?: string; info?: string }) {
  if (!error && !info) return null;
  return (
    <p role={error ? "alert" : "status"} className={`rounded-control border px-3 py-2 text-sm ${error ? "border-danger text-danger" : "border-success text-success"}`}>
      {error ?? info}
    </p>
  );
}
