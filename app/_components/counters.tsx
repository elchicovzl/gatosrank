import type { BoardStats } from "@/lib/board";
import { getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { type Locale } from "@/lib/i18n/config";
import { formatCount } from "@/lib/time";

interface CountersProps {
  /** Idioma activo: los componentes de servidor no pueden usar contexto. */
  lang: Locale;
  stats: BoardStats;
}

function Counter({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="tnum font-display text-xl leading-none text-ink sm:text-2xl">
        {value}
      </span>
      <span className="meta">{label}</span>
    </div>
  );
}

export function Counters({
  lang,
 stats }: CountersProps) {
  const copy = getDictionary(lang);
  return (
    <div className="grid grid-cols-3 gap-4 rounded-[var(--radius-card)] border border-rule bg-paper px-4 py-3 sm:gap-8 sm:px-5">
      <Counter
        value={formatCount(stats.liveCount, lang)}
        label={copy.board.countCats}
      />
      <Counter
        value={formatMoney(stats.todayCents, lang)}
        label={copy.board.countToday}
      />
      <Counter
        value={formatCount(stats.totalClicks, lang)}
        label={copy.board.countClicks}
      />
    </div>
  );
}
