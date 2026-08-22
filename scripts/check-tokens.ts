/**
 * Guarda contra tokens de color muertos.
 *
 * Nace de un bug real: al reescribir la paleta desapareció `--color-seal`,
 * pero catorce archivos seguían usando `text-seal` y la regla del anillo de
 * foco usaba `var(--color-seal)`. Los mensajes de error perdieron el color
 * y el foco visible se apagó en TODO el sitio.
 *
 * Ni TypeScript ni ESLint ven eso: para ellos es una cadena de texto.
 *
 * Se verifica contra la única fuente de verdad que existe: el CSS que
 * Tailwind genera de verdad. Si una clase de color no aparece ahí, su token
 * no existe y la clase no pinta nada.
 *
 *   pnpm dev            # en otra terminal
 *   pnpm check:tokens
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const CSS_FILE = "app/globals.css";
const ROOTS = ["app", "lib"];
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const COLOR_UTILITIES = ["bg", "text", "border", "ring", "fill", "stroke", "outline", "divide"];

/** Valores que comparten prefijo con una utilidad de color pero no lo son. */
const NOT_COLORS = new Set([
  // text-
  "left", "right", "center", "justify", "start", "end", "wrap", "nowrap",
  "balance", "pretty", "clip", "ellipsis", "base", "xs", "sm", "md", "lg", "xl",
  // border- / outline- / divide-
  "solid", "dashed", "dotted", "double", "hidden", "none", "dashed", "collapse",
  "separate", "reverse",
  // bg-
  "cover", "contain", "fixed", "local", "scroll", "repeat", "auto", "bottom",
  "top", "origin", "clip", "blend", "gradient",
]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(tsx?|css)$/.test(path) ? [path] : [];
  });
}

/** Tailwind escapa los dos puntos de las variantes: hover:bg-x -> .hover\:bg-x */
function selectorFor(className: string): string {
  return "." + className.replace(/:/g, "\\:");
}

async function loadGeneratedCss(): Promise<string | null> {
  try {
    const html = await fetch(BASE, { signal: AbortSignal.timeout(15_000) }).then((r) => r.text());
    const hrefs = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((m) => m[1]);
    if (!hrefs.length) return null;
    const sheets = await Promise.all(
      hrefs.map((h) =>
        fetch(h.startsWith("http") ? h : BASE + h, { signal: AbortSignal.timeout(15_000) })
          .then((r) => r.text())
          .catch(() => ""),
      ),
    );
    return sheets.join("\n");
  } catch {
    return null;
  }
}

async function main() {
  const files = ROOTS.flatMap(walk);
  const globals = readFileSync(CSS_FILE, "utf8");
  const defined = new Set(
    [...globals.matchAll(/^\s*--color-([a-z0-9-]+):/gm)].map((m) => m[1]),
  );

  const problems: string[] = [];

  // 1 — var(--color-x) apuntando a un token inexistente. Estático.
  for (const file of files) {
    for (const m of readFileSync(file, "utf8").matchAll(/var\(--color-([a-z0-9-]+)\)/g)) {
      if (!defined.has(m[1])) {
        problems.push(`${file}: var(--color-${m[1]}) no está definido`);
      }
    }
  }

  // 2 — clases de color que Tailwind nunca generó.
  const generated = await loadGeneratedCss();

  if (!generated) {
    console.warn(
      `Aviso: no se pudo leer el CSS generado desde ${BASE}.\n` +
        "Arrancá `pnpm dev` para la comprobación completa. Por ahora solo se\n" +
        "verificaron las referencias var(--color-*).\n",
    );
  } else {
    const pattern = new RegExp(
      `\\b((?:[a-z-]+:)*)(${COLOR_UTILITIES.join("|")})-([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)\\b`,
      "g",
    );

    const seen = new Map<string, string>();
    for (const file of files.filter((f) => !f.endsWith(".css"))) {
      for (const m of readFileSync(file, "utf8").matchAll(pattern)) {
        const [full, , , value] = m;
        if (NOT_COLORS.has(value)) continue;
        if (!seen.has(full)) seen.set(full, file);
      }
    }

    for (const [className, file] of seen) {
      if (!generated.includes(selectorFor(className))) {
        const token = className.split("-").slice(1).join("-");
        problems.push(
          `${file}: ${className} no se generó` +
            (defined.has(token) ? "" : ` (token "${token}" no existe)`),
        );
      }
    }
  }

  const unique = [...new Set(problems)];
  if (unique.length) {
    console.error(`\n${unique.length} referencia(s) de color rotas:\n`);
    for (const p of unique) console.error("  " + p);
    process.exit(1);
  }

  console.log(
    `Tokens OK — ${defined.size} definidos` +
      (generated ? ", todas las clases de color se generan." : "."),
  );
}

void main();
