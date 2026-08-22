import type { Metadata } from "next";
import { ButtonLink } from "@/app/_components/button";
import { notFound } from "next/navigation";

import { CatIdentity } from "@/app/_components/cat-identity";
import { PlatePhoto } from "@/app/_components/plate-photo";
import { ReportButton } from "@/app/_components/report-button";
import { RaiseForm } from "@/app/[lang]/gato/[slug]/_components/raise-form";
import { getBoardSnapshot } from "@/lib/board";
import { getCat } from "@/lib/cat";
import { getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { formatCount, timeAgo } from "@/lib/time";
import { localeAlternates, localePath, resolveLocale } from "@/lib/i18n/config";

export const revalidate = 10;

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/gato/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale = resolveLocale(lang);
  const copy = getDictionary(locale);
  const cat = await getCat(slug);

  if (!cat) return { title: copy.cat.notFoundTitle };

  const position = cat.rank ? copy.cat.rankOf(cat.rank, cat.total) : null;

  return {
    title: position ? `${cat.name} — ${position}` : cat.name,
    description: position
      ? `${cat.name} · ${position} · ${formatMoney(cat.amountCents, locale)}`
      : copy.cat.heldBody,
    alternates: localeAlternates(resolveLocale(lang), `/gato/${slug}`),
    // Un ejemplar no publicado no debe indexarse.
    robots: cat.status === "LIVE" ? undefined : { index: false, follow: false },
  };
}

export default async function CatPage({
  params,
}: PageProps<"/[lang]/gato/[slug]">) {
  const { lang, slug } = await params;
  const locale = resolveLocale(lang);
  const copy = getDictionary(locale);
  const cat = await getCat(slug);
  if (!cat) notFound();

  const isLive = cat.status === "LIVE" && cat.rank !== null;
  const board = isLive ? await getBoardSnapshot() : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <article className="flex flex-col gap-6 rounded-[var(--radius-card)] border border-rule bg-paper p-4 pt-6 shadow-[var(--shadow-card)] sm:p-6 sm:pt-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          <PlatePhoto
            imageKey={cat.imageKey}
            name={cat.name}
            rank={cat.rank ?? 0}
            size={640}
            priority
            className="w-full sm:w-72"
          />

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <CatIdentity lang={locale}
              name={cat.name}
              ownerHandle={cat.ownerHandle}
              country={cat.country}
              size="hero"
            />

            {isLive ? (
              <div className="rule-double pt-4">
                <p className="label-cat">{copy.board.currentBid}</p>
                <p className="tnum font-display text-4xl leading-none text-ink">
                  {formatMoney(cat.amountCents, locale)}
                </p>
                <p className="tnum meta mt-2">
                  {copy.cat.rankOf(cat.rank!, cat.total)} ·{" "}
                  {formatCount(cat.clicks, locale)} {copy.board.clicks}
                  {cat.firstBidAt
                    ? ` · ${copy.board.seniority} ${timeAgo(cat.firstBidAt, locale)}`
                    : ""}
                </p>
              </div>
            ) : (
              <div className="rule-double pt-4">
                <p className="font-display text-xl text-ink">
                  {copy.cat.heldTitle}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {copy.cat.heldBody}
                </p>
              </div>
            )}

            <p className="text-sm text-ink-soft">
              {cat.linkUrl ? (
                <>
                  {copy.cat.linkGoesTo}{" "}
                  <a
                    href={`/go/${cat.id}?l=${locale}`}
                    target="_blank"
                    rel="nofollow sponsored noopener"
                    className="break-all underline hover:text-amber-ink"
                  >
                    {cat.linkUrl}
                  </a>
                </>
              ) : (
                copy.cat.linkGoesHere
              )}
            </p>

            <div className="flex items-center gap-2">
              <ButtonLink href={localePath(locale, "/")} variant="secondary">
                {copy.cat.backToBoard}
              </ButtonLink>
              <ReportButton catId={cat.id} catName={cat.name} />
            </div>
          </div>
        </div>
      </article>

      {isLive ? (
        <RaiseForm
          catId={cat.id}
          board={board}
          currentCents={cat.amountCents}
        />
      ) : null}

      {cat.bids.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="label-cat">{copy.cat.historyHeading}</h2>
          <ul className="divide-y divide-rule-soft border-y border-rule">
            {cat.bids.map((bid) => (
              <li
                key={bid.id}
                className="flex items-baseline justify-between gap-3 py-3 text-sm"
              >
                <span className="tnum text-ink">
                  {copy.cat.historyEntry(
                    formatMoney(bid.amountCents),
                    formatMoney(bid.resultingCents),
                  )}
                </span>
                <span className="label-cat shrink-0 normal-case tracking-normal">
                  {timeAgo(bid.createdAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
