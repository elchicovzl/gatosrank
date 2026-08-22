"use client";

import { CatalogRow } from "@/app/_components/catalog-row";
import type { Projection } from "@/lib/bidding";
import { cn } from "@/lib/cn";
import { useCopy, useLocale } from "@/app/_components/copy-provider";

interface LivePreviewProps {
  projection: Projection;
  amountCents: number;
  name: string;
  imageKey: string | null;
  ownerHandle: string | null;
  country: string | null;
  /** Escala reducida para la barra sticky de móvil. */
  dense?: boolean;
  className?: string;
}

/**
 * Tres filas del tablero: el de arriba, el suyo resaltado, y el de abajo.
 *
 * Usa el MISMO componente de fila que el tablero real. Esta previa es la
 * promesa visual de lo que se compra; si no coincide, es publicidad engañosa.
 */
export function LivePreview({
  projection,
  amountCents,
  name,
  imageKey,
  ownerHandle,
  country,
  dense = false,
  className,
}: LivePreviewProps) {
  const copy = useCopy();
  const locale = useLocale();
  const { rank, above, below } = projection;

  return (
    <div className={cn("border-y border-rule bg-paper", className)}>
      {above ? (
        <div className="border-b border-rule-soft px-2">
          <CatalogRow lang={locale}
            rank={rank - 1}
            name={above.name}
            imageKey={above.imageKey}
            ownerHandle={above.ownerHandle}
            country={above.country}
            amountCents={above.amountCents}
            dense={dense}
          />
        </div>
      ) : null}

      {/*
        `key` fuerza el remontaje al cambiar de puesto: es el único momento
        de animación del sitio. Con prefers-reduced-motion queda anulado.
      */}
      <div
        key={rank}
        className="animate-rank-shift border-b border-rule-soft px-2 last:border-b-0"
        style={
          {
            "--rank-shift-from": above ? "10px" : "-10px",
          } as React.CSSProperties
        }
      >
        <CatalogRow lang={locale}
          rank={rank}
          name={name.trim() || copy.enter.previewYouName}
          imageKey={imageKey}
          ownerHandle={ownerHandle?.trim() || null}
          country={country || null}
          amountCents={amountCents}
          meta={copy.enter.previewYou}
          highlight
          dense={dense}
        />
      </div>

      {below ? (
        <div className="px-2">
          <CatalogRow lang={locale}
            rank={rank + 1}
            name={below.name}
            imageKey={below.imageKey}
            ownerHandle={below.ownerHandle}
            country={below.country}
            amountCents={below.amountCents}
            dense={dense}
          />
        </div>
      ) : null}
    </div>
  );
}
