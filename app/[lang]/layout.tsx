import type { Metadata, Viewport } from "next";
import { Fraunces, Newsreader } from "next/font/google";
import { notFound } from "next/navigation";

import { CopyProvider } from "@/app/_components/copy-provider";
import { Footer } from "@/app/_components/footer";
import { Masthead } from "@/app/_components/masthead";
import { getDictionary } from "@/lib/i18n";
import { getLiveStats } from "@/lib/presence";

import "../globals.css";
import { LOCALES, LOCALE_TAGS, isLocale, localePath, type Locale } from "@/lib/i18n/config";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Todo serif. Un catálogo impreso no usa sans para el cuerpo, y ese es
 * exactamente el aire que busca la dirección de "exposición felina".
 */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://topcats.lol";

/** Se generan las dos versiones en tiempo de compilación. */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "es";
  const copy = getDictionary(locale);

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${copy.site.domain} — ${copy.site.tagline}`,
      template: `%s · ${copy.site.domain}`,
    },
    description: copy.site.metaDescription,
    /*
      hreflang: le dice a Google que son la misma página en dos idiomas y no
      contenido duplicado. Sin esto indexa una sola y descarta la otra.
    */
    alternates: {
      canonical: localePath(locale, "/"),
      languages: Object.fromEntries(
        LOCALES.map((l) => [LOCALE_TAGS[l], localePath(l, "/")]),
      ),
    },
    openGraph: {
      type: "website",
      siteName: copy.site.domain,
      locale: LOCALE_TAGS[locale].replace("-", "_"),
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#faf7f0",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const locale: Locale = lang;
  const stats = await getLiveStats();

  return (
    <html
      lang={LOCALE_TAGS[locale]}
      className={`${fraunces.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bone text-ink">
        <CopyProvider locale={locale}>
          <Masthead lang={locale} stats={stats} />
          <main className="flex-1">{children}</main>
          <Footer lang={locale} />
        </CopyProvider>
      </body>
    </html>
  );
}
