import type { Metadata } from "next";

import { EnterForm } from "@/app/[lang]/entrar/_components/enter-form";
import { getBoardSnapshot } from "@/lib/board";
import { getDictionary } from "@/lib/i18n";
import { MIN_ENTRY_CENTS } from "@/lib/money";
import { localeAlternates, resolveLocale } from "@/lib/i18n/config";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const copy = getDictionary(resolveLocale(lang));
  return { title: copy.enter.title, description: copy.enter.lede,
    alternates: localeAlternates(resolveLocale(lang), "/entrar"),
  };
}

export default async function EnterPage({ searchParams }: PageProps<"/[lang]/entrar">) {
  const params = await searchParams;
  const raw = Array.isArray(params.puesto) ? params.puesto[0] : params.puesto;
  const parsed = Number(raw);
  const preselectedRank =
    Number.isInteger(parsed) && parsed > 0 && parsed <= 5000 ? parsed : null;

  const rawAmount = Array.isArray(params.monto) ? params.monto[0] : params.monto;
  const amount = Number(rawAmount);
  const preselectedAmountCents =
    Number.isInteger(amount) && amount >= MIN_ENTRY_CENTS && amount % 100 === 0
      ? amount
      : null;

  const board = await getBoardSnapshot();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <EnterForm
        board={board}
        preselectedRank={preselectedRank}
        preselectedAmountCents={preselectedAmountCents}
      />
    </div>
  );
}
