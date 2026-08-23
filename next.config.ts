import type { NextConfig } from "next";

/**
 * Los gatos del seed viven en un host externo; los reales, en R2.
 * El dominio de R2 se lee del entorno para no hardcodear nada.
 */
function remoteImageHosts() {
  const hosts: { protocol: "https"; hostname: string }[] = [
    { protocol: "https", hostname: "cataas.com" },
  ];

  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl) {
    try {
      hosts.push({ protocol: "https", hostname: new URL(publicUrl).hostname });
    } catch {
      // URL mal formada en el entorno: se ignora en vez de tumbar el arranque.
    }
  }

  return hosts;
}

const nextConfig: NextConfig = {
  /*
    `lib/images.ts` resuelve la URL pública de una foto y corre en LOS DOS
    lados: el tablero se arma en el servidor, pero la previa en vivo de
    /entrar es un componente cliente. Sin esto, en el navegador
    `process.env.R2_PUBLIC_URL` vale undefined —no lleva el prefijo
    NEXT_PUBLIC_— y la foto recién subida cae al respaldo de disco local,
    que con R2 configurado responde 404: imagen rota justo en el paso
    donde la persona decide si paga.

    Va acá y no como una segunda variable NEXT_PUBLIC_ para que no haya
    dos fuentes de verdad que puedan quedar apuntando a lugares distintos.
    Es un dominio público de un bucket público: no hay nada que ocultar.

    Según la documentación de Next: "environment variables specified in
    this way will always be included in the JavaScript bundle".
  */
  env: {
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL ?? "",
  },
  /*
    Las fuentes de la imagen OG se leen con `readFile` y una ruta armada en
    runtime, así que el empaquetador no las detecta y no las sube. Sin esto,
    la imagen OG falla en producción con "no such file" — y es justo la
    pieza que se comparte.
  */
  outputFileTracingIncludes: {
    "/[lang]/gato/[slug]/opengraph-image": ["./assets/fonts/**"],
  },
  images: {
    remotePatterns: remoteImageHosts(),
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
