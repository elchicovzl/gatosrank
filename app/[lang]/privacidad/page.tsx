import type { Metadata } from "next";

import { getDictionary } from "@/lib/i18n";
import { localeAlternates, resolveLocale } from "@/lib/i18n/config";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const copy = getDictionary(resolveLocale(lang));
  return { title: copy.privacy.title, description: copy.privacy.lede,
    alternates: localeAlternates(resolveLocale(lang), "/privacidad"),
  };
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const copy = getDictionary(locale);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
          {copy.privacy.title}
        </h1>
        <p className="text-lg text-ink-soft">{copy.privacy.lede}</p>
      </header>

      {copy.privacy.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2 className="font-display text-2xl leading-tight text-ink">
            {section.heading}
          </h2>
          <p className="text-ink">{section.body}</p>
        </section>
      ))}
    </div>
  );
}
