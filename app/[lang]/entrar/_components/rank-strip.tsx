"use client";

import { CatPhoto } from "@/app/_components/cat-photo";
import {
  occupantOfRank,
  priceToTakeRank,
  SHOWCASE_RANKS,
  type BoardEntry,
} from "@/lib/bidding";
import { cn } from "@/lib/cn";
import { useCopy, useLocale } from "@/app/_components/copy-provider";
import { formatMoney } from "@/lib/money";

interface RankStripProps {
  board: readonly BoardEntry[];
  /** Monto elegido, para marcar qué puesto queda seleccionado. */
  selectedRank: number | null;
  onPick: (rank: number, priceCents: number) => void;
}

/**
 * El gancho del embudo: puestos concretos con cara y precio.
 * Tocar uno ajusta el monto del paso 5.
 */
export function RankStrip({ board, selectedRank, onPick }: RankStripProps) {
  const copy = useCopy();
  const locale = useLocale();
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible sm:px-0">
      {SHOWCASE_RANKS.map((rank) => {
        const occupant = occupantOfRank(board, rank);
        const price = priceToTakeRank(board, rank);
        const selected = selectedRank === rank;

        return (
          <li key={rank} className="w-32 shrink-0 snap-start sm:w-auto">
            <button
              type="button"
              onClick={() => onPick(rank, price)}
              aria-pressed={selected}
              className={cn(
                "flex size-full flex-col items-center gap-2 border p-3 text-center transition-colors",
                selected
                  ? "border-amber-ink bg-amber-tint"
                  : "border-rule bg-paper hover:border-ink",
              )}
            >
              <span className="tnum font-display text-xl leading-none text-ink">
                {copy.enter.step4RankLabel(rank)}
              </span>

              {occupant ? (
                <CatPhoto
                  imageKey={occupant.imageKey}
                  name={occupant.name}
                  size={80}
                  className="size-12"
                />
              ) : (
                <span
                  aria-hidden
                  className="frame-photo block size-12 bg-bone-deep"
                />
              )}

              <span className="w-full truncate text-sm text-ink-soft">
                {occupant ? occupant.name : copy.enter.step4Free}
              </span>

              <span className="tnum font-display text-base text-amber-ink">
                {formatMoney(price, locale)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
