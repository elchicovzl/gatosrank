/**
 * Resuelve una imageKey a URL pública.
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
