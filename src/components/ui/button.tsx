import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:brightness-110 disabled:opacity-60",
  secondary: "border border-control bg-surface text-ink hover:bg-canvas disabled:opacity-60",
  ghost: "text-ink hover:bg-canvas disabled:opacity-60",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center rounded-control px-4 text-sm font-semibold transition ${styles[variant]} ${className}`}
    />
  );
}
