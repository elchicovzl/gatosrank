import { NextResponse, after } from "next/server";

import { prisma } from "@/lib/db";
import { stripTracking } from "@/lib/links";
import { localePath, resolveLocale } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/payments-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Salida de clics. Redirige al enlace del ejemplar y cuenta el clic.
 *
 * El contador se incrementa DESPUÉS de responder (`after`): el usuario no
 * espera una escritura en base para llegar a su destino.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/go/[id]">,
) {
  const { id } = await params;

  /*
    Esta ruta vive fuera de /[lang] porque redirige a un sitio externo. El
    idioma llega por query solo para el caso en que haya que volver al
    sitio: sin eso mandaríamos a un lector en inglés a la versión española.
  */
  const locale = resolveLocale(
    new URL(request.url).searchParams.get("l") ?? "",
  );

  const cat = await prisma.cat.findUnique({
    where: { id },
    select: { id: true, slug: true, linkUrl: true, status: true },
  });

  if (!cat) {
    return NextResponse.redirect(`${siteUrl()}${localePath(locale, "/")}`, 302);
  }

  /**
   * Un ejemplar que no está publicado no manda tráfico a ningún lado:
   * si no pasó moderación, su enlace tampoco.
   */
  const destination =
    cat.status === "LIVE" && cat.linkUrl
      ? stripTracking(cat.linkUrl)
      : `${siteUrl()}${localePath(locale, `/gato/${cat.slug}`)}`;

  after(async () => {
    await prisma.cat
      .update({ where: { id: cat.id }, data: { clicks: { increment: 1 } } })
      .catch(() => {
        // Un clic perdido no vale romper el redirect.
      });
  });

  return NextResponse.redirect(destination, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
