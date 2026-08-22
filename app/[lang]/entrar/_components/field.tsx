import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export const inputClass =
  "h-12 w-full rounded-[var(--radius-control)] border border-line bg-paper px-3.5 text-base text-ink outline-none placeholder:text-ink-faint focus:border-ink";

interface FieldProps {
  id: string;
  label: string;
  help?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}

export function Field({
  id,
  label,
  help,
  error,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="label-cat">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : help ? (
        <p className="text-sm text-ink-soft">{help}</p>
      ) : null}
    </div>
  );
}
