"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/app/_components/button";
import { startRaise } from "@/app/[lang]/gato/actions";
import { minTargetFor, project, type BoardEntry } from "@/lib/bidding";
import { useCopy, useLocale } from "@/app/_components/copy-provider";
import {
  centsToDollars,
  dollarsToCents,
  formatMoney,
  STEP_CENTS,
} from "@/lib/money";

interface RaiseFormProps {
  catId: string;
  board: BoardEntry[];
  currentCents: number;
}

const stepButton =
  "flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-2xl leading-none text-ink transition-colors hover:border-ink hover:bg-bone-deep disabled:opacity-35";

export function RaiseForm({ catId, board, currentCents }: RaiseFormProps) {
  const copy = useCopy();
  const locale = useLocale();
  const minTarget = minTargetFor(currentCents);
  const [target, setTarget] = useState(minTarget);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const projection = useMemo(
    () => project(board, target, catId),
    [board, target, catId],
  );

  function handleRaise() {
    setError(null);
    startTransition(async () => {
      const result = await startRaise(catId, target, locale);
      if (result.ok) {
        window.location.href = result.url;
        return;
      }
      setError(copy.errors.generic);
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-rule bg-paper p-4 shadow-[var(--shadow-card)] sm:p-6">
      <div>
        <h2 className="font-display text-2xl text-ink">
          {copy.cat.raiseHeading}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {copy.cat.raiseHelp(
            formatMoney(currentCents),
            formatMoney(minTarget),
          )}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setTarget(Math.max(minTarget, target - STEP_CENTS))}
          disabled={target <= minTarget}
          aria-label={copy.enter.step5Decrease}
          className={stepButton}
        >
          −
        </button>

        <div className="relative flex-1">
          <label htmlFor="objetivo" className="sr-only">
            {copy.enter.step5AmountLabel}
          </label>
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-display text-3xl text-ink-faint"
          >
            $
          </span>
          <input
            id="objetivo"
            type="number"
            inputMode="numeric"
            min={centsToDollars(minTarget)}
            step={1}
            value={centsToDollars(target)}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              setTarget(Math.max(minTarget, dollarsToCents(next)));
            }}
            className="tnum no-spinner h-12 w-full rounded-[var(--radius-control)] border border-line bg-paper pr-4 pl-10 font-display text-3xl text-ink outline-none focus:border-ink"
          />
        </div>

        <button
          type="button"
          onClick={() => setTarget(target + STEP_CENTS)}
          aria-label={copy.enter.step5Increase}
          className={stepButton}
        >
          +
        </button>
      </div>

      <p aria-live="polite" className="text-base text-ink">
        {!projection.improves
          ? copy.enter.raiseOutcomeSame(projection.rank, formatMoney(target, locale))
          : projection.displaced
            ? copy.enter.raiseOutcome(
                projection.rank,
                formatMoney(target),
                projection.displaced.name,
                formatMoney(projection.displaced.amountCents),
              )
            : copy.enter.raiseOutcomeFree(
                projection.rank,
                formatMoney(target),
              )}
      </p>

      <Button onClick={handleRaise} disabled={busy} size="lg" className="w-full">
        {busy
          ? copy.enter.payWorking
          : copy.cat.raiseCta(
              projection.rank,
              formatMoney(projection.chargeCents),
            )}
      </Button>

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <p className="text-xs font-medium text-ink">{copy.enter.payFine3}</p>
    </section>
  );
}
