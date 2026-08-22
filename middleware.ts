import { NextResponse, type NextRequest } from "next/server";

import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALES,
  type Locale,
} from "@/lib/i18n/config";

/** Recuerda el idioma elegido para las próximas visitas. */
const COOKIE = "topcats_lang";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Cabecera con el idioma resuelto: la lee el 404, que no recibe params. */
const LOCALE_HEADER = "x-topcats-locale";

/**
 * Elige idioma con el `Accept-Language` del navegador.
 *
 * Implementación propia y corta a propósito: negociar dos idiomas no
 * justifica sumar una dependencia.
 */
function negotiate(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;

  const preferidos = header
    .split(",")
    .map((parte) => {
      const [tag, ...params] = parte.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return {
        base: tag.trim().toLowerCase().split("-")[0],
        q: q ? Number(q.split("=")[1]) || 0 : 1,
      };
    })
    .sort((a, b) => b.q - a.q);

  for (const { base } of preferidos) {
    if (base && isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Si ya viene con idioma, solo se pasa el dato hacia adelante.
  const actual = LOCALES.find(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );

  if (actual) {
    const response = NextResponse.next();
    response.headers.set(LOCALE_HEADER, actual);
    if (request.cookies.get(COOKIE)?.value !== actual) {
      response.cookies.set(COOKIE, actual, {
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
        path: "/",
      });
    }
    return response;
  }

  /*
    Sin idioma en la URL: manda lo que el visitante ya eligió antes y, si
    es su primera vez, lo que dice su navegador.
  */
  const guardado = request.cookies.get(COOKIE)?.value;
  const locale =
    guardado && isLocale(guardado)
      ? guardado
      : negotiate(request.headers.get("accept-language"));

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  /*
    Fuera del middleware: las rutas de API, la salida de clics (que redirige
    a un sitio externo), los archivos de Next y los assets con extensión.
  */
  matcher: [
    "/((?!api|go|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
