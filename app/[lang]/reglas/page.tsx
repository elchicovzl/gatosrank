import type { Metadata } from "next";
import { ButtonLink } from "@/app/_components/button";

import { getDictionary } from "@/lib/i18n";
import { localeAlternates, localePath, resolveLocale } from "@/lib/i18n/config";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const copy = getDictionary(resolveLocale(lang));
  return { title: copy.rules.title, description: copy.rules.lede,
    alternates: localeAlternates(resolveLocale(lang), "/reglas"),
  };
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-2xl leading-tight text-ink sm:text-3xl">
      {children}
    </h2>
  );
}

export default async function RulesPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const copy = getDictionary(locale);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
          {copy.rules.title}
        </h1>
        <p className="text-lg text-ink-soft">{copy.rules.lede}</p>
      </header>

      <section className="flex flex-col gap-4">
        <Heading>{copy.rules.biddingHeading}</Heading>
        <ol className="flex flex-col gap-3">
          {copy.rules.bidding.map((rule, index) => (
            <li key={rule} className="flex gap-3">
              <span className="tnum shrink-0 font-display text-lg text-ink-faint">
                {index + 1}.
              </span>
              <span className="text-ink">{rule}</span>
            </li>
          ))}
        </ol>
      </section>

      {/*
        La política de no reembolso tiene que ser imposible de no ver.
        Sin esto, los contracargos tumban la cuenta con el proveedor de pagos.
      */}
      <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border-2 border-amber-ink/40 bg-amber-tint p-5">
        <Heading>{copy.rules.refundHeading}</Heading>
        <p className="text-ink">{copy.rules.refundBody}</p>
      </section>

      <section className="flex flex-col gap-4">
        <Heading>{copy.rules.contentHeading}</Heading>
        <ul className="flex flex-col gap-2">
          {copy.rules.content.map((item) => (
            <li key={item} className="flex gap-3 text-ink">
              <span aria-hidden className="text-ink-faint">
                —
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <Heading>{copy.rules.moderationHeading}</Heading>
        <p className="text-ink">{copy.rules.moderationBody}</p>
      </section>

      <section className="flex flex-col gap-3">
        <Heading>{copy.rules.clicksHeading}</Heading>
        <p className="text-ink">{copy.rules.clicksBody}</p>
      </section>

      <section className="flex flex-col gap-3">
        <Heading>{copy.rules.contactHeading}</Heading>
        <p className="text-ink">{copy.rules.contactBody}</p>
      </section>

      <ButtonLink href={localePath(locale, "/entrar")} size="lg" className="self-start">
        {copy.nav.enter}
      </ButtonLink>
    </div>
  );
}
