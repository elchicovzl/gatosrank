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
  images: {
    remotePatterns: remoteImageHosts(),
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
