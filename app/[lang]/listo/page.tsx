import { ButtonLink } from "@/app/_components/button";
import { notFound } from "next/navigation";

import { CatPhoto } from "@/app/_components/cat-photo";
import { AwaitConfirmation } from "@/app/[lang]/listo/_components/await-confirmation";
import { rankFor } from "@/lib/bidding";
import { getBoardSnapshot } from "@/lib/board";
import { getDictionary } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { localePath, resolveLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";



export default async function DonePage({
  params,
  searchParams,
}: PageProps<"/[lang]/listo">) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);
  const locale = resolveLocale(lang);
  const copy = getDictionary(locale);

  const draft = String(query.draft ?? "");
  if (!draft) notFound();

  const cat = await prisma.cat.findUnique({
    where: { id: draft },
    select: {
      id: true,
      slug: true,
      name: true,
      imageKey: true,
      amountCents: true,
      firstBidAt: true,
      status: true,
      moderation: true,
    },
  });

  if (!cat) notFound();

  const paid = cat.amountCents > 0;
  const live = cat.status === "LIVE";

  const rank =
    live && cat.firstBidAt
      ? rankFor(
          await getBoardSnapshot(),
          cat.amountCents,
          cat.firstBidAt.getTime(),
          cat.id,
        )
      : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-6 rounded-[var(--radius-card)] border border-rule bg-paper p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="flex items-center gap-4">
          <CatPhoto
            imageKey={cat.imageKey}
            name={cat.name}
            size={160}
            className="size-20 sm:size-24"
          />
          <div className="min-w-0">
            <h1 className="font-display text-2xl leading-tight text-ink sm:text-3xl">
              {live && rank
                ? copy.success.live(rank)
                : paid
                  ? copy.success.heldTitle
                  : copy.success.title}
            </h1>
            <p className="tnum mt-1 font-display text-xl text-ink-soft">
              {cat.name} · {formatMoney(cat.amountCents, locale)}
            </p>
          </div>
        </div>

        <p className="text-ink-soft">
          {live ? copy.cat.linkGoesHere : paid ? copy.success.heldBody : copy.success.body}
        </p>

        {!live ? <AwaitConfirmation /> : null}

        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/gato/${cat.slug}`}>
            {copy.success.viewCat}
          </ButtonLink>
          <ButtonLink href={localePath(locale, "/")} variant="secondary">
            {copy.success.viewBoard}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
