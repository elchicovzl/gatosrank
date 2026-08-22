/** Nombre -> slug para /gato/[slug]. Sin acentos, sin sorpresas. */
export function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base || "gato";
}

/** Sufijo corto para desambiguar slugs repetidos. */
export function slugSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}
