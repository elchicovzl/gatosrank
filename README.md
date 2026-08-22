# topcats.lol

Ranking público de gatos donde el puesto se compra. El orden lo decide el
monto pagado. Sin jurado, sin algoritmo, sin votos ponderados.

Proyecto viral de vida corta: la prioridad es velocidad de lanzamiento y
capacidad de compartir, no arquitectura escalable.

---

## Arrancar en local

```bash
cp env.example .env

# Base de datos dedicada y desechable
docker run -d --name topcats-db \
  -e POSTGRES_USER=topcats -e POSTGRES_PASSWORD=topcats -e POSTGRES_DB=topcats \
  -p 5434:5432 postgres:16-alpine

pnpm install
pnpm db:migrate      # crea el esquema
pnpm db:seed         # 120 ejemplares LIVE + 2 en espera + 1 dado de baja
pnpm dev
```

Con los valores de `env.example` el proyecto arranca **sin cuentas de nada**:
pagos simulados, imágenes en disco local, moderación permisiva.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo |
| `pnpm typecheck` | TypeScript sin emitir |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` / `db:seed` / `db:reset` / `db:studio` | Base de datos |
| `pnpm check:bids` | Verifica las 6 reglas de puja contra el tablero real |
| `pnpm check:webhook` | Verifica idempotencia y pagos simultáneos |
| `pnpm check:tokens` | Detecta clases de color que apuntan a tokens borrados |
| `scripts/build-og-fonts.sh` | Regenera las fuentes estáticas de la imagen OG |
| `pnpm lint` / `pnpm typecheck` | ESLint y TypeScript, ambos limpios |

`check:bids`, `check:webhook` y `check:tokens` no son tests unitarios: son
verificaciones contra la base, el servidor y el CSS reales. `check:webhook` y
`check:tokens` necesitan `pnpm dev` corriendo.

**`check:tokens` existe por un bug real.** Al reescribir la paleta desapareció
`--color-seal`, pero catorce archivos seguían usando `text-seal` y la regla del
anillo de foco usaba `var(--color-seal)`. Los mensajes de error perdieron el
color y el foco visible se apagó en todo el sitio. Ni TypeScript ni ESLint ven
eso: para ellos es una cadena de texto. La comprobación se hace contra el CSS
que Tailwind genera de verdad, que es la única fuente de verdad que existe.

---

## El seed

`pnpm db:seed` deja **120 ejemplares LIVE**, 2 en espera de moderación y 1 dado
de baja. Son dos capas:

- **20 curados a mano** — nombres, handles, países, enlaces e historial de
  pujas escritos uno por uno. Ocupan la punta del tablero e incluyen empates
  de monto a propósito, para ejercitar el desempate por antigüedad.
- **100 de relleno** (`prisma/seed-names.ts`) — nombres de gato de verdad, no
  "Prueba 34": el tablero de desarrollo se mira mucho y una lista numerada no
  deja evaluar cómo se ve una fila real. Los montos siguen una curva de cola
  larga (pocos caros, muchos baratos), que además genera empates naturales.

```bash
SEED_EXTRA=0 pnpm db:seed     # solo los 20 curados (una sola página)
SEED_EXTRA=300 pnpm db:seed   # tope: la cantidad de nombres disponibles
```

Las fotos son ids de cataas.com **verificados con una petición real** uno por
uno (`prisma/seed-photos.ts`): de 160 candidatos, 8 devolvían error. Si alguno
se cae con el tiempo se ve una foto rota — se reemplaza y listo, es data de
prueba.

El relleno se inserta con `createMany` y una sola puja por ejemplar. Crearlos
de a uno con historial completo son cientos de round-trips y el seed pasa de
un segundo a casi un minuto.

## Cómo funciona

### La mesa de honor no se pagina

El paginador mueve **solo el catálogo general** (del #4 para abajo). Los tres
primeros se ven en todas las páginas: son el gancho del tablero y perderlos al
pasar de página no tiene sentido.

- `getPodium()` — los tres primeros, siempre
- `getCatalogPage(page)` — del #4 en adelante, de 50 en 50

El pie del catálogo **siempre muestra el rango** (`Del #4 al #21 de 21
ejemplares`), incluso con una sola página. Si se oculta entero cuando no hay
a dónde navegar, no hay forma de saber si el catálogo termina ahí o si el
paginador se rompió. Los botones aparecen solo cuando hay más de una página.

> Con `PAGE_SIZE = 50` hacen falta 54 ejemplares para ver la segunda página.
> Por eso el seed genera 120: son tres páginas y el paginador se puede probar.

Los enlaces del paginador apuntan al ancla `#catalogo`; sin eso, cambiar de
página te deja arriba de todo y hay que scrollear el hero y el podio otra vez.
El desfase entre índice de catálogo y puesto del tablero se deriva de
`PODIUM_SIZE` en el componente, **no** se escribe a mano en `copy.ts`: ahí se
rompería en silencio si el podio dejara de ser de tres.

### El puesto no se guarda

No existe columna `rank`. El tablero se deriva siempre así:

```sql
ORDER BY "amountCents" DESC, "firstBidAt" ASC   -- sobre status = 'LIVE'
```

Toda la matemática vive en `lib/bidding.ts`, un módulo puro sin dependencias
que consumen tres lugares que **deben** coincidir: la previa en vivo de
`/entrar` (cliente), el precio de cada fila del tablero (servidor) y el
webhook de pago (servidor).

### El puesto se otorga SOLO en el webhook

Nunca en el redirect de éxito, que cualquiera puede fabricar. `lib/apply-payment.ts`
da tres garantías:

1. **Idempotencia** por `eventId` contra `ProcessedWebhook`, dentro de la
   misma transacción que aplica el pago.
2. **Bloqueo de fila** (`SELECT … FOR UPDATE`) sobre el ejemplar.
3. **El monto nunca baja**: si el gato subió su puja mientras el pago volaba,
   se queda con el mayor de los dos.

El borrador del ejemplar se guarda como `PENDING` **antes** de mandar al
checkout. Si el pago nunca llega, el borrador se queda ahí y no molesta.

### Los reportes se leen, no solo se cuentan

El botón de reportar abre un diálogo (`ReportDialog`) con motivos frecuentes en
un clic y un detalle opcional. Usa el **`<dialog>` nativo con `showModal()`**:
trae trampa de foco, cierre con Esc y fondo inerte sin escribir una línea, y se
dibuja en el *top layer*, así que no pelea con el z-index del enlace que cubre
toda la fila. El diálogo se monta solo al abrirlo — en el tablero hay hasta 50
botones por página y montar 50 diálogos ocultos sería tirar trabajo.

Guarda un `Report` con el motivo que elige y escribe la persona. Se revisan en **`/admin` → Reportados**, y ahí se muestra:

- el **texto** de los motivos más recientes, no solo cuántos hay
- ordenados por **cantidad de reportes**, no por fecha de alta: uno con
  cuarenta no puede quedar debajo de uno con uno solo
- dos acciones: **Marcar revisado** (cierra la cola sin bajar el ejemplar) y
  **Dar de baja**

Sin "Marcar revisado", un gato reportado una vez por error queda marcado para
siempre y la cola deja de ser una cola.

### El panel separa las colas por urgencia

`/admin` distingue lo que exige una decisión de lo que solo espera plata:

- **Bloqueados por el control** — pagaron y el control marcó la foto como no
  apta. Acá **Aprobar publica**. Es lo más urgente: hay plata adentro.
- **Publicados sin confirmar** — ya están en el tablero, pero el control no
  los pudo confirmar. Aprobar acá **no publica**: los saca de la cola.
- **Borradores sin pago** — abrieron el checkout y nunca pagaron. **No tienen
  botón de Aprobar**: el puesto se otorga solo en el webhook, así que aprobar
  un borrador sin pago corría y no cambiaba nada. Un botón que no hace nada es
  peor que no tener botón.

Cada ficha dice en una frase qué está esperando. `sin pago · auto: pasó` son
datos y obligan a deducir; `"Aprobado, pero falta el pago"` lo explica.

### Moderación posterior: quien paga se publica

**Cambio de política respecto del plan original.** El plan decía que ninguna
foto se publicaba sin aprobación previa; hoy es al revés: el control corre al
subir la imagen y quien paga entra al tablero enseguida. Esperar aprobación
manual mataba la conversión y no escala.

Toda subida se valida por **magic bytes** (no por extensión ni por el
content-type del navegador) y se re-codifica con sharp a webp cuadrado de
1000 px — lo que **elimina EXIF, ICC y geolocalización**. Después pasa por
`moderateImage()`, y el veredicto decide:

| Veredicto | Al confirmarse el pago |
| --- | --- |
| `ok` | Se publica. |
| `review` (o el proveedor falló) | **Se publica**, y aparece en *Publicados sin confirmar* para mirarlo después. |
| `reject` | **No se publica.** Queda en *Bloqueados por el control* hasta que una persona decida. |

Un `reject` no es "dudoso": es el control diciendo que está mal. Publicarlo y
esperar a que alguien lo reporte es exactamente el riesgo que tumba la cuenta
con el proveedor de pagos.

> **Sin control automático real, todo lo que se paga se publica sin revisar.**
> Con `MODERATION_PROVIDER` en `permissive` o `review` no hay filtro alguno.
> Configurar Sightengine pasó de opcional a **obligatorio antes de lanzar** —
> `/admin` muestra un aviso rojo mientras no lo esté.

### Piezas intercambiables

| Interfaz | Archivo | Implementaciones |
| --- | --- | --- |
| Pagos | `lib/payments-core.ts` | `mock`, `polar` |
| Moderación | `lib/moderation.ts` | `permissive`, `review`, `sightengine` |
| Almacenamiento | `lib/storage.ts` | R2, disco local |

Nada fuera de esas carpetas sabe qué proveedor está activo.

---

## Producción

### Pagos — Polar

El proyecto opera desde Colombia y **Stripe no acepta entidades colombianas**.
Por eso el proveedor es un merchant of record.

1. Crear un producto con precio **"pay what you want"**, mínimo **$3**.
   El monto real de cada puja se manda por `amount` en cada checkout.
2. Crear un webhook apuntando a `https://topcats.lol/api/webhooks/pagos`,
   suscripto al evento **`order.paid`**.
3. Completar `POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID`, `POLAR_WEBHOOK_SECRET`
   y `PAYMENTS_PROVIDER=polar`.

### Imágenes — Cloudflare R2

En Vercel el filesystem es efímero: **R2 es obligatorio**. Sin credenciales de
R2 las fotos se escriben en `.uploads/` y se pierden en cada deploy.
El bucket necesita un dominio público en `R2_PUBLIC_URL`.

### Moderación

`MODERATION_PROVIDER=review` es el default seguro: nada se publica sin ojo
humano. Con `sightengine` (más `SIGHTENGINE_USER` y `SIGHTENGINE_SECRET`) la
revisión es automática, y cualquier fallo del proveedor cae a revisión manual
en vez de publicar.

> La moderación automática necesita que la imagen sea alcanzable desde
> internet. Sin R2 configurado, todo cae a revisión manual.

### Panel

`/admin`, protegido por `ADMIN_TOKEN`. Generalo con `openssl rand -hex 32`.

---

## Idiomas

El sitio está en **español e inglés**, con prefijo en la URL en ambos:
`/es/gato/michi` y `/en/gato/michi`. La raíz `/` detecta el idioma del
navegador y redirige.

**Por qué prefijo y no una cookie**: este proyecto vive de que la gente
comparta links. Con prefijo, un link compartido llega en el idioma en que se
compartió, Google indexa las dos versiones con `hreflang`, y la imagen OG
sale traducida. Con cookie, nada de eso.

| Pieza | Dónde |
| --- | --- |
| Idiomas y helpers de ruta | `lib/i18n/config.ts` |
| Textos en español (**fuente**) | `lib/i18n/es.ts` |
| Textos en inglés | `lib/i18n/en.ts` |
| Selector de diccionario | `lib/i18n/index.ts` |
| Detección y redirección | `middleware.ts` |

**El español define la forma del diccionario.** `en.ts` está tipado como
`Dictionary = typeof es`: si se agrega una clave en español y falta en
inglés, **no compila**. Es lo único que evita que la traducción quede a
medias sin que nadie lo note hasta que un usuario ve un texto vacío.

### Cómo llega el diccionario a cada componente

- **Servidor**: reciben `lang` por props y llaman a `getDictionary(lang)`.
- **Cliente**: `useCopy()` desde `CopyProvider`.

El proveedor recibe el **código** de idioma, no el diccionario: el objeto
tiene funciones (`takeRank(rank)`, `showingRange(a, b, c)`) y las funciones
no cruzan la frontera servidor→cliente.

### El selector de países

242 países (ISO-3166-1 alpha-2), buscables, con bandera. Los **nombres no
están escritos a mano**: los da `Intl.DisplayNames`, que ya los tiene en los
dos idiomas. Mantener 242 nombres × 2 sería duplicar algo que el runtime ya
sabe, y quedaría desfasado.

Se excluyen a propósito los códigos de **ISO 3166-3** — países que dejaron de
existir. `Intl` sigue resolviendo `DD` (la RDA), `SU` (la URSS), `YU`, `ZR`…
así que sin filtrarlos **"Alemania" aparecía dos veces** y se podía elegir la
que no era. También se excluye `UK`, que no es ISO: el código del Reino Unido
es `GB`.

Un `<select>` nativo con 242 opciones es inusable, así que es un diálogo con
búsqueda (`CountryPicker`). La búsqueda ignora acentos — "mexico" encuentra
"México" — y también acepta el código: "CI" encuentra Côte d'Ivoire.

### Lo que también se traduce

No alcanza con las cadenas. También cambian con el idioma:

- **El tiempo relativo** (`lib/time.ts`) — con `Intl.RelativeTimeFormat`, que
  ya sabe pluralizar en cada idioma.
- **El separador de miles** — `$2.105` en español, `$2,105` en inglés. Se usan
  etiquetas **regionales** (`es-CO`, `en-US`): con `"es"` a secas, `Intl` no
  agrupa los millares de cuatro cifras.
- **La imagen OG** — se genera por idioma, incluido el "de 120" / "of 120".
- **`hreflang` y `canonical`** — por página, no heredados de la portada: decir
  que `/en/gato/michi` equivale a `/es` es mentirle a Google.

> `/pago-simulado` sigue en español: es la pantalla del proveedor simulado y
> hace `notFound()` en producción. Es herramienta de desarrollo.

## Identidad visual

La paleta **sale del logo**, muestreada del PNG original — no estimada a ojo:

| Token | Valor | De dónde sale |
| --- | --- | --- |
| `ink` | `#101820` | el negro frío del logo |
| `gold` | `#b89159` | el oro de la corona y las escarapelas |
| `amber` | `#f5ae0a` | ese mismo oro, saturado, para los CTA |
| `bone` / `paper` | `#faf7f0` / `#fffdf9` | papel de catálogo |
| `danger` | `#c02617` | errores y acciones destructivas |

Tinta fría sobre papel cálido es la combinación de imprenta clásica.

**El acento corrió de matiz 35° a 42° a propósito.** El oro del logo está en
35°, que ya es naranja: saturado tal cual quedábamos indistinguibles de
outbid y creatorbid. A 42° se lee dorado y es nuestro.

**Los botones llevan texto tinta sobre ámbar, no blanco.** Da 9.32:1 en vez
de los ~3:1 de blanco-sobre-naranja que usa la competencia, y pega más fuerte.

**Contraste**: los 341 textos renderizados de las cinco pantallas pasan WCAG AA,
medidos sobre el DOM real. Dos tokens existen solo por eso:

- `ink-faint` se calculó contra `bone-deep`, el fondo **más oscuro** donde
  aparece, no contra el papel. Si no, falla en el botón deshabilitado y en la
  fila resaltada de la previa.
- `line` es el borde de los **controles** (3:1, exigencia de WCAG 1.4.11) y
  está separado de `rule`, que son filetes decorativos y no delimitan nada.

**Tipografía**: todo serif. Fraunces para títulos, Newsreader para el cuerpo y
las etiquetas. Un catálogo impreso no usa sans para el cuerpo, y ese es el aire
que busca la dirección.

**Forma**: esquinas redondeadas (`--radius-card`, `--radius-control`), botones
píldora y elevación suave. Las esquinas rectas y las versalitas diminutas en
cada dato de fila eran lo que hacía ver la interfaz anticuada; las versalitas
quedaron solo para encabezados de sección (`.label-cat`) y los datos pasaron a
`.meta`, sin caja alta ni interletrado.

## Contadores en vivo

La píldora de `online · visitas` vive **centrada en la cabecera**, no en el
hero: ahí ocupaba una fila entera y empujaba la foto del #1 fuera de la
primera pantalla.

Es la señal de que el tablero está pasando ahora. Sin websockets, como manda
el plan: `LiveStatsPill` manda un POST a `/api/presencia` cada 30 s y el
servidor cuenta quiénes latieron en los últimos 90 s (`ONLINE_WINDOW_MS`).
Es una cookie anónima por navegador — ni IP, ni user-agent, ni nada
identificable. El latido se pausa cuando la pestaña no está visible.

En pantallas chicas se muestra solo el contador de gente en línea. Es **un
solo componente** con las partes extra ocultas por CSS (`md:contents`), no
dos instancias: dos montarían dos latidos y contarían doble.

## El lockup del logo

`TopcatsLockup` es **un solo SVG** con la marca y el texto, no dos elementos
en un flex. La razón es geométrica: la caja de la marca incluye la corona y
las estrellas, que van **arriba** del gato, así que centrar verticalmente el
wordmark contra esa caja lo dejaba flotando alto.

La alineación correcta apoya la **línea base del texto** sobre la **base del
gato**. Las dos coordenadas salen del trazado y viven en `lib/logo-paths.ts`:

| Constante | Valor | Qué es |
| --- | --- | --- |
| `MARK_CAT_BASE_Y` | 875 de 881 | base del gato (99,3 % del alto de la marca) |
| `WORDMARK_BASELINE_Y` | 144,2 de 181,5 | línea base del texto (79,4 %) |
| `WORDMARK_CAP_HEIGHT` | 138,2 | fija el tamaño del texto contra la marca |

El componente calcula escala y desplazamiento a partir de eso, así que la
alineación es exacta por construcción y no depende de ajustar píxeles a ojo.

## La animación del logo

`app/_components/topcats-logo.tsx`. Es el **único** momento de animación de
marca y pasa una sola vez: la cabecera se monta con el layout, así que no se
repite al navegar. Secuencia de ~1,3 s:

1. El gato se dibuja solo — se traza el contorno con `pathLength` de `motion`
   y recién después se rellena.
2. La corona cae y se asienta con rebote.
3. Las tres estrellas aparecen escalonadas, girando a su lugar.

Al pasar el mouse la corona se levanta y las estrellas titilan.

El trazado vectorial vive en `lib/logo-paths.ts`, generado con `potrace` desde
el PNG y separado por color y por forma. Los contornos interiores viajan dentro
del path de su forma padre: si se separan, los huecos se rellenan y el gato
queda macizo.

Tres detalles que solo aparecen ejecutándolo:

- `pathLength` **no se serializa en el render del servidor**. Sin arrancar el
  trazo oculto con `strokeDasharray`, el HTML llega con el gato ya dibujado y
  al hidratar se borra para volver a dibujarse. El parpadeo se ve.
- `vectorEffect="non-scaling-stroke"` es obligatorio: un trazo de 3 unidades
  sobre un viewBox de 881 renderizado a 56 px da 0,19 px. Invisible.
- Sin JavaScript, `motion` deja los estados `initial` como estilo **inline**,
  así que la marca no aparecería. El bloque `<noscript>` la repone, y por eso
  usa `!important`: es lo único que le gana a un estilo inline.

Todo respeta `prefers-reduced-motion`: se pinta el estado final, sin animar.

---

## El @usuario no es único, a propósito

`ownerHandle` **no tiene restricción de unicidad**, y es una decisión, no un
olvido:

- Una persona con tres gatos los inscribe a los tres con el mismo handle. Ese
  es el caso normal, no el borde. Con unicidad tendría que inventar
  `@michicat2` y `@michicat3`.
- El handle no se verifica contra ninguna plataforma. Con unicidad, el primero
  que escriba `@cristiano` se lo queda **para siempre**, incluido alguien que
  no es él. Eso es peor que no tenerla.
- Sin cuentas no hay forma de probar propiedad. Es una etiqueta de display,
  no una identidad — y por eso se muestra como texto plano, sin enlazar a
  ningún lado.

Lo que sí se bloquea (`lib/reserved-handles.ts`) es **hacerse pasar por el
sitio o su equipo**: `topcats`, `admin`, `soporte`, `pagos`, `oficial`, los
nombres de ruta y unos cuantos más.

La comparación normaliza: sin `@`, sin puntos ni guiones bajos y en minúscula,
así que `Top.Cats`, `top_cats` y `TOPCATS` caen todos. No persigue
sustituciones de dígitos (`t0pcats`): es una carrera sin final y el botón de
reportar cubre lo que se escape.

El módulo **no** es `server-only` a propósito: el formulario avisa al tipear
para que nadie se entere recién al volver del checkout. El servidor valida
igual — el cliente avisa, el servidor decide.

## Decisiones que conviene conocer

- **Los enlaces del tablero son pagados** y salen con `rel="nofollow sponsored"`.
  Sin eso, Google penaliza el dominio por venta de enlaces.
- **"Limpiar query params del destino"** se implementó como limpiar
  parámetros de *tracking* (`utm_*`, `fbclid`, `gclid`…), no todos: borrarlos
  todos rompería `youtube.com/watch?v=…`. Ver `lib/links.ts`.
- **`firstBidAt` es nullable.** Se sella con el primer pago confirmado, no al
  crear el borrador: si no, el desempate premiaría al que abrió el checkout
  primero en vez de al que pagó primero.
- **La previa de `/entrar` usa el mismo componente** que el tablero real
  (`CatalogRow`). Es la promesa visual de lo que se compra; si fueran dos
  componentes parecidos, se desincronizan.
- **El snapshot del tablero viaja al cliente** (hasta 2000 ejemplares) para
  que la previa recalcule sin ida y vuelta al servidor. El servidor recalcula
  igual antes de cobrar: la previa es informativa, la autoridad es el servidor.
- **Las fuentes de la imagen OG son TTF estáticas** en `assets/fonts/`.
  El renderizador no soporta fuentes variables ni woff2, y la imagen OG no
  puede depender de que un CDN ajeno responda. Se regeneran con
  `scripts/build-og-fonts.sh`.
- **La imagen OG repite los colores en literal** porque satori no lee CSS.
  Si cambiás un token en `globals.css`, hay que replicarlo en
  `app/gato/[slug]/opengraph-image.tsx`.
- **Los gatos del seed apuntan a URLs externas** (cataas.com). `lib/images.ts`
  devuelve la URL tal cual si ya es absoluta.

## Qué NO tiene, a propósito

Cuentas, login, categorías, filtros, búsqueda, comentarios, likes,
notificaciones, panel de analítica, tests unitarios, i18n completo, modo
oscuro, animaciones de scroll.

Los textos están centralizados en `lib/i18n/`.
