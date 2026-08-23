/**
 * Diagnóstico del entorno.
 *
 * Dice QUÉ falta y qué resolvió la app, **nunca** el valor de nada. Los
 * secretos se reportan como presente/ausente y su largo: alcanza para saber
 * si están y si alguien pegó una cadena vacía o con comillas de más.
 *
 *   pnpm check:env
 */
import "dotenv/config";

type Nivel = "obligatoria" | "produccion" | "opcional";

interface Variable {
  nombre: string;
  nivel: Nivel;
  /** Se muestra el valor: solo para las que no son secretas. */
  publica?: boolean;
  nota?: string;
}

const VARIABLES: Variable[] = [
  { nombre: "DATABASE_URL", nivel: "obligatoria" },
  { nombre: "DIRECT_URL", nivel: "opcional", nota: "solo si DATABASE_URL usa un pooler" },
  { nombre: "NEXT_PUBLIC_SITE_URL", nivel: "obligatoria", publica: true },
  { nombre: "ADMIN_TOKEN", nivel: "obligatoria" },
  { nombre: "PAYMENTS_PROVIDER", nivel: "obligatoria", publica: true },
  { nombre: "POLAR_SERVER", nivel: "opcional", publica: true },
  { nombre: "POLAR_ACCESS_TOKEN", nivel: "produccion" },
  { nombre: "POLAR_PRODUCT_ID", nivel: "produccion" },
  { nombre: "POLAR_WEBHOOK_SECRET", nivel: "produccion" },
  { nombre: "PAYPAL_CLIENT_ID", nivel: "opcional" },
  { nombre: "PAYPAL_SECRET", nivel: "opcional" },
  { nombre: "PAYPAL_WEBHOOK_ID", nivel: "opcional" },
  { nombre: "PAYPAL_ENV", nivel: "opcional", publica: true },
  { nombre: "R2_ACCOUNT_ID", nivel: "produccion" },
  { nombre: "R2_ACCESS_KEY_ID", nivel: "produccion" },
  { nombre: "R2_SECRET_ACCESS_KEY", nivel: "produccion" },
  { nombre: "R2_BUCKET", nivel: "produccion" },
  { nombre: "R2_PUBLIC_URL", nivel: "produccion", publica: true },
  { nombre: "CLOUDFLARE_ZONE_ID", nivel: "produccion" },
  { nombre: "CLOUDFLARE_API_TOKEN", nivel: "produccion" },
  { nombre: "MODERATION_PROVIDER", nivel: "obligatoria", publica: true },
  { nombre: "SIGHTENGINE_USER", nivel: "produccion" },
  { nombre: "SIGHTENGINE_SECRET", nivel: "produccion" },
];

const problemas: string[] = [];

console.log("Variables\n");
for (const v of VARIABLES) {
  const raw = process.env[v.nombre];
  const valor = raw?.trim() ?? "";

  let estado: string;
  if (!valor) {
    estado = v.nivel === "obligatoria" ? "FALTA" : "vacía";
    if (v.nivel === "obligatoria") problemas.push(`${v.nombre} es obligatoria`);
  } else if (v.publica) {
    estado = valor;
  } else {
    estado = `definida (${valor.length} caracteres)`;
  }

  // Comillas pegadas: dotenv ya las saca, si quedan es que hay dobles.
  if (valor.startsWith('"') || valor.startsWith("'")) {
    problemas.push(`${v.nombre} arranca con comillas: sobran`);
  }

  const marca = !valor && v.nivel === "obligatoria" ? "✗" : valor ? "✓" : "·";
  console.log(`  ${marca} ${v.nombre.padEnd(24)} ${estado}`);
}

console.log("\nQué resolvió la app\n");

const proveedor = process.env.PAYMENTS_PROVIDER === "polar" ? "polar" : "mock";
console.log(`  Pagos:      ${proveedor}`);
if (proveedor === "mock") {
  console.log("              ⚠ Los pagos son SIMULADOS. Nadie cobra nada.");
  if (process.env.POLAR_ACCESS_TOKEN?.trim()) {
    problemas.push(
      'Hay credenciales de Polar pero PAYMENTS_PROVIDER no es "polar"',
    );
  }
} else {
  for (const v of ["POLAR_ACCESS_TOKEN", "POLAR_PRODUCT_ID"]) {
    if (!process.env[v]?.trim()) problemas.push(`${v} hace falta con Polar`);
  }
  if (!process.env.POLAR_WEBHOOK_SECRET?.trim()) {
    console.log(
      "              ⚠ Sin POLAR_WEBHOOK_SECRET el webhook rechaza todo:",
    );
    console.log("                el pago se cobra y el puesto no se otorga.");
  }
}

const moderacion = process.env.MODERATION_PROVIDER ?? "review";
const conControl =
  moderacion === "sightengine" &&
  Boolean(process.env.SIGHTENGINE_USER && process.env.SIGHTENGINE_SECRET);
console.log(`  Moderación: ${moderacion}${conControl ? "" : " (sin control real)"}`);
if (!conControl) {
  console.log("              ⚠ Todo lo que se paga se publica sin revisar.");
}

const almacen =
  process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET ? "R2" : "disco local";
console.log(`  Imágenes:   ${almacen}`);
if (almacen === "disco local") {
  console.log("              ⚠ En Vercel el disco es efímero: se pierden.");
}

/*
  Un pooler (pgBouncer) no sirve para migrar: las migraciones usan locks de
  sesión. Si DATABASE_URL apunta al pooler hace falta DIRECT_URL.
*/
const url = process.env.DATABASE_URL ?? "";
const esPooler = /:6543|pooler|pgbouncer=true/.test(url);
if (esPooler && !process.env.DIRECT_URL?.trim()) {
  problemas.push(
    "DATABASE_URL parece un pooler y falta DIRECT_URL: las migraciones van a fallar",
  );
}

/*
  Con dominio propio, el CDN de Cloudflare queda delante del bucket y guarda
  copias por un año (subimos con `immutable`). Sin credenciales de purga,
  borrar la foto la saca del bucket y el borde la sigue sirviendo: la baja
  de contenido indebido y la promesa de privacidad quedan sin efecto.
  El dominio de desarrollo *.r2.dev va directo al bucket y no necesita esto.
*/
const publicUrl = process.env.R2_PUBLIC_URL?.trim();
if (publicUrl) {
  const conCdn = !/\.r2\.dev$/i.test(new URL(publicUrl).hostname);
  const puedePurgar = Boolean(
    process.env.CLOUDFLARE_ZONE_ID && process.env.CLOUDFLARE_API_TOKEN,
  );
  if (conCdn && !puedePurgar) {
    problemas.push(
      "R2_PUBLIC_URL usa un dominio con CDN y faltan CLOUDFLARE_ZONE_ID/" +
        "CLOUDFLARE_API_TOKEN: borrar una foto no la saca del caché de borde",
    );
  }
}

/*
  Con PayPal el puesto lo otorga PAYMENT.CAPTURE.COMPLETED, y la firma se
  verifica contra el id del webhook: sin PAYPAL_WEBHOOK_ID la verificación
  no puede correr y se rechaza TODO, incluidos los pagos legítimos.
*/
if (process.env.PAYMENTS_PROVIDER === "paypal") {
  for (const n of ["PAYPAL_CLIENT_ID", "PAYPAL_SECRET", "PAYPAL_WEBHOOK_ID"]) {
    if (!process.env[n]?.trim()) {
      problemas.push(`PAYMENTS_PROVIDER es "paypal" y falta ${n}`);
    }
  }
}

/*
  Tener las credenciales cargadas no activa nada: el proveedor lo elige
  MODERATION_PROVIDER. Con "permissive" ni se llama a Sightengine y todo lo
  pagado se publica sin mirar, aunque las claves estén ahí.
*/
if (
  process.env.SIGHTENGINE_USER?.trim() &&
  process.env.SIGHTENGINE_SECRET?.trim() &&
  process.env.MODERATION_PROVIDER !== "sightengine"
) {
  problemas.push(
    `hay credenciales de Sightengine pero MODERATION_PROVIDER es "${moderacion}": ` +
      "el control automático no corre",
  );
}

if (process.env.ADMIN_TOKEN?.trim() === "dev-token-cambiame") {
  problemas.push("ADMIN_TOKEN sigue siendo el de ejemplo");
}

console.log();
if (problemas.length) {
  console.error(`${problemas.length} problema(s):\n`);
  for (const p of problemas) console.error(`  · ${p}`);
  process.exit(1);
}
console.log("Entorno consistente.");
