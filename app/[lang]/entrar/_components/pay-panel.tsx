"use client";

import { Button } from "@/app/_components/button";
import type { Projection } from "@/lib/bidding";
import { cn } from "@/lib/cn";
import { useCopy } from "@/app/_components/copy-provider";
import { formatMoney } from "@/lib/money";

interface PayPanelProps {
  projection: Projection;
  ready: boolean;
  busy: boolean;
  error: string | null;
  onPay: () => void;
  /** La barra de móvil muestra la letra chica plegada. */
  compact?: boolean;
  className?: string;
}

export function PayPanel({
  projection,
  ready,
  busy,
  error,
  onPay,
  compact = false,
  className,
}: PayPanelProps) {
  const copy = useCopy();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        onClick={onPay}
        disabled={!ready || busy}
        size={compact ? "md" : "lg"}
        className="w-full"
      >
        {busy
          ? copy.enter.payWorking
          : ready
            ? copy.enter.payCta(
                projection.rank,
                formatMoney(projection.chargeCents),
              )
            : copy.enter.payCtaIncomplete}
      </Button>

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      {/*
        En la barra sticky de móvil la letra chica se reduce a la línea que
        de verdad importa antes de pagar: la de los reembolsos. Las tres
        líneas completas quedan en la previa del flujo, más arriba.
      */}
      {compact ? (
        <p className="text-[0.6875rem] leading-snug text-ink">
          {copy.enter.payFine3}
        </p>
      ) : (
        <ul className="flex flex-col gap-1 text-xs text-ink-soft">
          <li>{copy.enter.payFine1}</li>
          <li>{copy.enter.payFine2}</li>
          <li className="font-medium text-ink">{copy.enter.payFine3}</li>
        </ul>
      )}
    </div>
  );
}
