"use client";

import { useMemo, useState } from "react";

import { ButtonLink } from "@/app/_components/button";
import { priceToTakeRank, project, type BoardEntry } from "@/lib/bidding";
import { useCopy, useLocale } from "@/app/_components/copy-provider";
import { formatMoney, MIN_ENTRY_CENTS, STEP_CENTS } from "@/lib/money";

interface HeroProps {
  board: BoardEntry[];
}

const stepButton =
  "flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-2xl leading-none text-ink transition-colors hover:border-ink hover:bg-bone-deep disabled:opacity-35 disabled:hover:border-line disabled:hover:bg-paper sm:size-12";

/**
 * El gancho de la portada: el precio del #1 con el stepper adentro del
 * titular. Tocar −/+ recalcula en vivo qué puesto compra ese monto, contra
 * el tablero real, y el botón se lleva el monto elegido a /entrar.
 */
export function Hero({ board }: HeroProps) {
  const copy = useCopy();
  const locale = useLocale();
  const topPrice = useMemo(() => priceToTakeRank(board, 1), [board]);
  const [amountCents, setAmountCents] = useState(topPrice);

  const projection = useMemo(
    () => project(board, amountCents),
    [board, amountCents],
  );

  const headline =
    projection.rank === 1
      ? copy.hero.takeTop
      : projection.displaced
        ? copy.hero.takeRank(projection.rank)
        : copy.hero.takeFree(projection.rank);

  /*
    Sin píldora de stats: se mudó a la cabecera. Así el titular arranca más
    arriba y la foto del #1 entra en pantalla sin scrollear.
  */
  return (
    <section className="flex flex-col items-center gap-5 pt-4 pb-2 text-center sm:gap-6 sm:pt-6 sm:pb-4">
      <h1 className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 font-display text-4xl leading-[1.05] text-ink sm:text-6xl">
        <span>{headline}</span>

        <span className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() =>
              setAmountCents((v) => Math.max(MIN_ENTRY_CENTS, v - STEP_CENTS))
            }
            disabled={amountCents <= MIN_ENTRY_CENTS}
            aria-label={copy.hero.less}
            className={stepButton}
          >
            −
          </button>

          <span
            aria-live="polite"
            className="tnum min-w-[3.5ch] rounded-2xl bg-amber px-3 py-1 text-ink sm:px-4"
          >
            {formatMoney(amountCents, locale)}
          </span>

          <button
            type="button"
            onClick={() => setAmountCents((v) => v + STEP_CENTS)}
            aria-label={copy.hero.more}
            className={stepButton}
          >
            +
          </button>
        </span>
      </h1>

      {/*
        En móvil se muestra solo a quién le sacás el puesto. La explicación
        de las reglas sumaba cuatro renglones y empujaba la foto del #1
        fuera de la primera pantalla; vive igual en /reglas.
      */}
      <p className="max-w-xl text-lg text-ink-soft">
        {projection.displaced
          ? copy.hero.displaces(
              projection.displaced.name,
              formatMoney(projection.displaced.amountCents),
            )
          : copy.hero.displacesNobody}
        <span className="hidden sm:inline"> {copy.hero.lede}</span>
      </p>

      <ButtonLink href={`/entrar?monto=${amountCents}`} size="lg">
        {board.length === 0 ? copy.hero.ctaEmpty : copy.hero.cta}
        <span aria-hidden>→</span>
      </ButtonLink>
    </section>
  );
}
