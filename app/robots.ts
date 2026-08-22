import type { MetadataRoute } from "next";

import { LOCALES } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/payments-core";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // El panel y las salidas de clic no tienen nada que indexar.
      // Un disallow por idioma: /admin ya no existe sin prefijo.
      disallow: LOCALES.flatMap((l) => [
        `/${l}/admin`,
        `/${l}/listo`,
        `/${l}/pago-simulado`,
      ]).concat("/go/"),
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
