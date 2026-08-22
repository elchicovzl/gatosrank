"use client";

import type { Projection } from "@/lib/bidding";
import { useCopy, useLocale } from "@/app/_components/copy-provider";
import {
  centsToDollars,
  dollarsToCents,
  formatMoney,
  MIN_ENTRY_CENTS,
  STEP_CENTS,
} from "@/lib/money";

interface AmountStepProps {
  amountCents: number;
  projection: Projection;
  onChange: (cents: number) => void;
}

const buttonClass =
  "flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-2xl leading-none text-ink transition-colors hover:border-ink hover:bg-bone-deep disabled:opacity-35 disabled:hover:border-line disabled:hover:bg-paper";

/**
 * Monto + la frase que dice exactamente qué se compra.
 * La frase se recalcula en cada cambio contra el estado real del tablero.
 */
export function AmountStep({
  amountCents,
  projection,
  onChange,
}: AmountStepProps) {
  const copy = useCopy();
  const locale = useLocale();
  const dollars = centsToDollars(amountCents);
  const displaced = projection.displaced;

  const outcome = displaced
    ? projection.rank === 1
      ? copy.enter.step5OutcomeTop(
          formatMoney(amountCents),
          displaced.name,
          formatMoney(displaced.amountCents),
        )
      : copy.enter.step5Outcome(
          projection.rank,
          formatMoney(amountCents),
          displaced.name,
          formatMoney(displaced.amountCents),
        )
    : projection.rank === 1
      ? copy.enter.step5OutcomeFirstEver(formatMoney(amountCents, locale))
      : copy.enter.step5OutcomeFree(projection.rank, formatMoney(amountCents, locale));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(MIN_ENTRY_CENTS, amountCents - STEP_CENTS))}
          disabled={amountCents <= MIN_ENTRY_CENTS}
          aria-label={copy.enter.step5Decrease}
          className={buttonClass}
        >
          −
        </button>

        <div className="relative flex-1">
          <label htmlFor="monto" className="sr-only">
            {copy.enter.step5AmountLabel}
          </label>
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-display text-3xl text-ink-faint"
          >
            $
          </span>
          <input
            id="monto"
            type="number"
            inputMode="numeric"
            min={centsToDollars(MIN_ENTRY_CENTS)}
            step={1}
            value={dollars}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              onChange(Math.max(MIN_ENTRY_CENTS, dollarsToCents(next)));
            }}
            className="tnum no-spinner h-12 w-full rounded-[var(--radius-control)] border border-line bg-paper pr-4 pl-10 font-display text-3xl text-ink outline-none focus:border-ink"
          />
        </div>

        <button
          type="button"
          onClick={() => onChange(amountCents + STEP_CENTS)}
          aria-label={copy.enter.step5Increase}
          className={buttonClass}
        >
          +
        </button>
      </div>

      <p aria-live="polite" className="text-base text-ink">
        {outcome}
      </p>

      {amountCents <= MIN_ENTRY_CENTS ? (
        <p className="label-cat normal-case tracking-normal">
          {copy.enter.step5Min(formatMoney(MIN_ENTRY_CENTS, locale))}
        </p>
      ) : null}
    </div>
  );
}
