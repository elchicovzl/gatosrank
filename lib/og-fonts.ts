import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Fuentes para la imagen OG.
 *
 * Viven en el repo en vez de bajarse de Google en cada render: la imagen OG
 * es la pieza de marketing del proyecto y no puede depender de que un CDN
 * ajeno responda.
 *
 * Son TTF estáticas, no variables: el renderizador de ImageResponse revienta
 * con fuentes variables ("Cannot read properties of undefined"). Se generaron
 * con `fonttools varLib.instancer` desde las variables originales — ver
 * `scripts/build-og-fonts.sh`.
 */
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

let cache: Promise<{ display: Buffer; text: Buffer }> | null = null;

export function ogFonts() {
  cache ??= Promise.all([
    readFile(path.join(FONT_DIR, "fraunces-700.ttf")),
    readFile(path.join(FONT_DIR, "newsreader-500.ttf")),
  ]).then(([display, text]) => ({ display, text }));

  return cache;
}
