import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface StepProps {
  label: string;
  title: string;
  help?: string;
  /** Un paso bloqueado se ve, pero no se puede tocar. */
  locked?: boolean;
  children: ReactNode;
}

/**
 * Paso numerado del embudo. Todos se ven desde el arranque: el usuario
 * tiene que entender de una que son cinco cosas y que ninguna es larga.
 *
 * El bloqueo usa `fieldset disabled` y no un `aria-disabled` decorativo:
 * así los controles quedan realmente fuera del orden de tabulación y los
 * lectores de pantalla los anuncian deshabilitados.
 */
export function Step({
  label,
  title,
  help,
  locked = false,
  children,
}: StepProps) {
  return (
    <section className="border-t border-rule pt-6">
      <p className="label-cat">{label}</p>
      <h2 className="mt-1 font-display text-2xl leading-tight text-ink sm:text-3xl">
        {title}
      </h2>
      {help ? (
        <p className="mt-2 max-w-prose text-sm text-ink-soft">{help}</p>
      ) : null}

      <fieldset
        disabled={locked}
        className={cn(
          "mt-4 min-w-0 transition-opacity",
          locked && "opacity-35 select-none",
        )}
      >
        {children}
      </fieldset>
    </section>
  );
}
