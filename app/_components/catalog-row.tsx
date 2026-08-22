import type { ReactNode } from "react";

import { CatIdentity } from "@/app/_components/cat-identity";
import { CatPhoto } from "@/app/_components/cat-photo";
import { Rosette } from "@/app/_components/rosette";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import type { Locale } from "@/lib/i18n/config";

interface CatalogRowProps {
  /** Idioma activo: los componentes de servidor no usan contexto. */
  lang: Locale;
  rank: number;
  name: string;
  imageKey: string | null;
  ownerHandle: string | null;
  country: string | null;
  amountCents: number;
  /** Segunda línea: tiempo, clics, o lo que corresponda. */
  meta?: ReactNode;
  /** Botones al final de la fila. */
  action?: ReactNode;
  /** Resalta la fila del que está comprando en la previa. */
  highlight?: boolean;
  /** Escala reducida para la previa sticky de móvil. */
  dense?: boolean;
  className?: string;
}

/**
 * La fila del catálogo.
 *
 * La usan el tablero real Y la previa en vivo de /entrar. Es el mismo
 * componente a propósito: la previa es la promesa visual de lo que se
 * compra, así que no puede ser "parecida", tiene que ser la misma.
 */
export function CatalogRow({
  lang,
  rank,
  name,
  imageKey,
  ownerHandle,
  country,
  amountCents,
  meta,
  action,
  highlight = false,
  dense = false,
  className,
}: CatalogRowProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 sm:flex-nowrap sm:gap-x-4",
        dense ? "py-1" : "py-3",
        highlight && "rounded-xl bg-amber-tint px-2",
        className,
      )}
    >
      <Rosette
        rank={rank}
        className={dense ? "size-7" : "size-9 sm:size-11"}
      />

      {imageKey ? (
        <CatPhoto
          imageKey={imageKey}
          name={name}
          size={80}
          className={dense ? "size-8" : "size-12 sm:size-16"}
        />
      ) : (
        <span
          className={cn(
            "frame-photo block shrink-0 bg-bone-deep",
            dense ? "size-8" : "size-12 sm:size-16",
          )}
          aria-hidden
        />
      )}

      <div className="min-w-0 flex-1">
        <CatIdentity lang={lang}
          name={name}
          ownerHandle={ownerHandle}
          country={country}
          size={dense ? "dense" : "row"}
        />
        {meta ? (
          <p
            className={cn(
              "meta truncate",
              dense ? "text-[0.6875rem]" : "mt-0.5",
            )}
          >
            {meta}
          </p>
        ) : null}
      </div>

      <p
        className={cn(
          "tnum shrink-0 font-display text-ink",
          dense ? "text-base" : "text-xl sm:text-2xl",
        )}
      >
        {formatMoney(amountCents, lang)}
      </p>

      {action}
    </div>
  );
}
