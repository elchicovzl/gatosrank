/**
 * Resuelve una imageKey a URL pública.
 *
 * OJO: esto corre en el servidor Y en el navegador —la previa en vivo de
 * /entrar es un componente cliente—, así que `R2_PUBLIC_URL` se inyecta al
 * bundle desde `next.config.ts`. Si esa entrada desaparece, en el cliente
 * queda undefined y toda foto subida se rompe... menos las del seed, que
 * llevan URL absoluta y salen por el primer return. El seed tapa el bug.
 *
 * - URL absoluta -> tal cual (los gatos del seed apuntan afuera).
 * - R2 configurado -> dominio público del bucket.
 * - Sin R2 -> se sirve desde el disco local por /api/uploads/[key].
 */
export function imageUrl(imageKey: string): string {
  if (/^https?:\/\//.test(imageKey)) return imageKey;

  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl) return `${publicUrl.replace(/\/+$/, "")}/${imageKey}`;

  return `/api/uploads/${imageKey}`;
}
