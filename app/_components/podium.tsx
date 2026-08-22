import { CatIdentity } from "@/app/_components/cat-identity";
import { PlatePhoto } from "@/app/_components/plate-photo";
import { ReportButton } from "@/app/_components/report-button";
import { TakeSpotLink } from "@/app/_components/take-spot-link";
import type { BoardPageEntry } from "@/lib/board";
import { getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { formatCount, timeAgo } from "@/lib/time";
import { type Locale } from "@/lib/i18n/config";

interface PodiumProps {
  /** Idioma activo: los componentes de servidor no pueden usar contexto. */
  lang: Locale;
  entries: BoardPageEntry[];
  /** Precio para arrebatar cada puesto, indexado por puesto. */
  prices: Record<number, number>;
}

function Meta({ entry, lang }: { entry: BoardPageEntry; lang: Locale }) {
  const copy = getDictionary(lang);
  return (
    <p className="meta">
      {timeAgo(entry.lastBidAt, lang)} · {formatCount(entry.clicks, lang)}{" "}
      {copy.board.clicks}
    </p>
  );
}

function RowLink({ entry, lang }: { entry: BoardPageEntry; lang: Locale }) {
  return (
    <a
      href={`/go/${entry.id}?l=${lang}`}
      target="_blank"
      rel="nofollow sponsored noopener"
      className="absolute inset-0 z-10"
    >
      <span className="sr-only">Ir al enlace de {entry.name}</span>
    </a>
  );
}

/** Placa de portada: el #1 ocupa el ancho completo. La foto manda. */
function HeroPlate({
  entry,
  priceCents,
  lang,
}: {
  entry: BoardPageEntry;
  priceCents: number;
  lang: Locale;
}) {
  const copy = getDictionary(lang);

  return (
    <article className="relative rounded-[var(--radius-card)] border border-rule bg-paper p-4 pt-6 shadow-[var(--shadow-card)] sm:p-6 sm:pt-8">
      <RowLink entry={entry} lang={lang} />

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
        <PlatePhoto
          imageKey={entry.imageKey}
          name={entry.name}
          rank={entry.rank}
          size={520}
          priority
          className="w-full sm:w-56 md:w-72"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <CatIdentity lang={lang}
            name={entry.name}
            ownerHandle={entry.ownerHandle}
            country={entry.country}
            size="hero"
          />

          <div className="rule-double pt-4">
            <p className="label-cat">{copy.board.currentBid}</p>
            <p className="tnum font-display text-4xl leading-none text-ink sm:text-5xl">
              {formatMoney(entry.amountCents, lang)}
            </p>
            <div className="mt-2">
              <Meta entry={entry} lang={lang} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TakeSpotLink lang={lang}
              rank={entry.rank}
              priceCents={priceCents}
              variant="hero"
            />
            <ReportButton catId={entry.id} catName={entry.name} />
          </div>
        </div>
      </div>
    </article>
  );
}

/** Placas del #2 y el #3: mismo lenguaje, menos superficie. */
function RunnerUpPlate({
  entry,
  priceCents,
  lang,
}: {
  entry: BoardPageEntry;
  priceCents: number;
  lang: Locale;
}) {
  return (
    <article className="relative flex h-full flex-col gap-4 rounded-[var(--radius-card)] border border-rule bg-paper p-4 pt-6 shadow-[var(--shadow-card)]">
      <RowLink entry={entry} lang={lang} />

      <PlatePhoto
        imageKey={entry.imageKey}
        name={entry.name}
        rank={entry.rank}
        size={400}
        priority
        className="w-full"
      />

      <div className="min-w-0">
        <CatIdentity lang={lang}
          name={entry.name}
          ownerHandle={entry.ownerHandle}
          country={entry.country}
        />
        <p className="tnum mt-2 font-display text-3xl leading-none text-ink">
          {formatMoney(entry.amountCents, lang)}
        </p>
        <div className="mt-1.5">
          <Meta entry={entry} lang={lang} />
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <TakeSpotLink lang={lang} rank={entry.rank} priceCents={priceCents} />
        <ReportButton catId={entry.id} catName={entry.name} />
      </div>
    </article>
  );
}

export function Podium({
  lang,
 entries, prices }: PodiumProps) {
  const copy = getDictionary(lang);
  const [first, ...rest] = entries;
  if (!first) return null;

  return (
    <section aria-label={copy.board.podium} className="flex flex-col gap-4">
      <h2 className="label-cat">{copy.board.podium}</h2>

      <HeroPlate entry={first} priceCents={prices[first.rank] ?? 0} lang={lang} />

      {rest.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rest.map((entry) => (
            <RunnerUpPlate
              key={entry.id}
              entry={entry}
              priceCents={prices[entry.rank] ?? 0}
              lang={lang}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
