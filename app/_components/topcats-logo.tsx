"use client";

import { motion, useReducedMotion, type Transition } from "motion/react";

import { cn } from "@/lib/cn";
import {
  CAT_PATH,
  CROWN_ORIGIN,
  CROWN_PATH,
  MARK_CAT_BASE_Y,
  MARK_H,
  MARK_VIEWBOX,
  MARK_W,
  STAR_CENTER_PATH,
  STAR_LEFT_PATH,
  STAR_ORIGINS,
  STAR_RIGHT_PATH,
  WORDMARK_BASELINE_Y,
  WORDMARK_CAP_HEIGHT,
  WORDMARK_H,
  WORDMARK_PATH,
  WORDMARK_VIEWBOX,
  WORDMARK_W,
} from "@/lib/logo-paths";

/**
 * El logo de topcats, animado.
 *
 * Es el ÚNICO momento de animación de marca del sitio y pasa una sola vez:
 * la cabecera se monta con el layout, así que no se repite al navegar.
 * Secuencia (~1,3 s):
 *
 *   1. El gato se dibuja solo — se traza el contorno con `pathLength`
 *      y recién después se rellena.
 *   2. La corona cae y se asienta con rebote.
 *   3. Las tres estrellas aparecen escalonadas, girando a su lugar.
 *
 * Con `prefers-reduced-motion` no se anima nada: se pinta el estado final.
 */

/**
 * Con `vectorEffect="non-scaling-stroke"` el grosor se mide en píxeles de
 * pantalla y no en unidades del viewBox. Sin eso, un trazo de 3 unidades
 * sobre un viewBox de 881 renderizado a 56 px da 0,19 px: invisible.
 */
const STROKE_WIDTH = 1.6;

const CAT_DRAW: Transition = { duration: 0.95, ease: [0.35, 0, 0.2, 1] };
const CROWN_DROP: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 16,
  delay: 0.62,
};

function starTransition(index: number): Transition {
  return {
    type: "spring",
    stiffness: 420,
    damping: 14,
    delay: 0.86 + index * 0.09,
  };
}

const STARS = [
  { path: STAR_CENTER_PATH, origin: STAR_ORIGINS.center, key: "centro" },
  { path: STAR_LEFT_PATH, origin: STAR_ORIGINS.left, key: "izq" },
  { path: STAR_RIGHT_PATH, origin: STAR_ORIGINS.right, key: "der" },
];

/* --- Geometría del lockup horizontal --------------------------------------
   El texto se APOYA sobre la base del gato. La caja de la marca incluye la
   corona y las estrellas, que van arriba, así que centrar verticalmente el
   wordmark contra esa caja lo dejaba flotando alto.
-------------------------------------------------------------------------- */

/** Alto de mayúscula del texto respecto al alto total de la marca. */
const CAP_RATIO = 0.38;
const GAP_RATIO = 0.13;

const WORDMARK_SCALE = (CAP_RATIO * MARK_H) / WORDMARK_CAP_HEIGHT;
const WORDMARK_X = MARK_W + GAP_RATIO * MARK_H;
/** Coloca la línea base del texto exactamente sobre la base del gato. */
const WORDMARK_Y = MARK_CAT_BASE_Y - WORDMARK_BASELINE_Y * WORDMARK_SCALE;

const LOCKUP_W = WORDMARK_X + WORDMARK_W * WORDMARK_SCALE;
/** La 'p' baja por debajo de la base del gato: la caja tiene que contenerla. */
const LOCKUP_H = Math.max(MARK_H, WORDMARK_Y + WORDMARK_H * WORDMARK_SCALE);

interface LogoProps {
  className?: string;
  /** Desactiva la animación donde el logo es solo un adorno estático. */
  animate?: boolean;
}

/** Corona, estrellas y gato. Se comparte entre la marca sola y el lockup. */
function MarkPaths({ still }: { still: boolean }) {
  return (
    <>
      {/* El gato: primero el trazo que se dibuja, después el relleno. */}
      {!still ? (
        <motion.path
          d={CAT_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE_WIDTH}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
          /*
            `pathLength` no se serializa en el render del servidor: sin esto
            el HTML llega con el gato ya trazado y al hidratar se borra para
            volver a dibujarse. El parpadeo se ve. Arrancarlo oculto lo evita.
          */
          style={{ strokeDasharray: "0px 1px" }}
          initial={{ pathLength: 0, opacity: 1 }}
          animate={{ pathLength: 1, opacity: [1, 1, 0] }}
          transition={{
            pathLength: CAT_DRAW,
            opacity: { duration: 1.15, times: [0, 0.78, 1] },
          }}
        />
      ) : null}

      <motion.path
        d={CAT_PATH}
        fill="currentColor"
        className="topcats-cat-fill"
        initial={still ? false : { opacity: 0 }}
        animate={still ? undefined : { opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.78 }}
      />

      {/* La corona cae sobre el gato ya dibujado. */}
      <motion.path
        d={CROWN_PATH}
        fill="var(--color-gold)"
        style={{ transformOrigin: `${CROWN_ORIGIN.x}px ${CROWN_ORIGIN.y}px` }}
        initial={still ? false : { y: -70, opacity: 0 }}
        animate={still ? undefined : { y: 0, opacity: 1 }}
        transition={CROWN_DROP}
        variants={still ? undefined : { hover: { y: -6 } }}
      />

      {STARS.map((star, index) => (
        <motion.path
          key={star.key}
          d={star.path}
          fill="var(--color-gold)"
          style={{ transformOrigin: `${star.origin.x}px ${star.origin.y}px` }}
          initial={still ? false : { scale: 0, rotate: -35, opacity: 0 }}
          animate={still ? undefined : { scale: 1, rotate: 0, opacity: 1 }}
          transition={starTransition(index)}
          variants={
            still
              ? undefined
              : {
                  hover: {
                    scale: [1, 1.28, 1],
                    transition: { duration: 0.5, delay: index * 0.06 },
                  },
                }
          }
        />
      ))}
    </>
  );
}

/**
 * Sin JavaScript, `motion` deja los estados `initial` como estilo INLINE,
 * así que la marca llegaría oculta. Estas reglas la reponen — y por eso
 * llevan `!important`: es lo único que le gana a un estilo inline.
 */
function NoScriptFallback() {
  return (
    <noscript>
      <style>
        {".topcats-mark path{opacity:1!important;transform:none!important}" +
          ".topcats-mark path[stroke]{display:none}"}
      </style>
    </noscript>
  );
}

/** Solo el gato coronado, sin texto. */
export function TopcatsMark({ className, animate = true }: LogoProps) {
  const reduced = useReducedMotion();
  const still = reduced || !animate;

  return (
    <>
      <NoScriptFallback />
      <motion.svg
        viewBox={MARK_VIEWBOX}
        role="img"
        aria-label="topcats"
        className={cn(
          "topcats-mark block h-full w-auto overflow-visible",
          className,
        )}
        initial={false}
        whileHover={still ? undefined : "hover"}
      >
        <MarkPaths still={still} />
      </motion.svg>
    </>
  );
}

/**
 * Marca y texto juntos, en un solo SVG.
 *
 * Va en una sola pieza a propósito: con dos SVG en un flex la alineación
 * depende de la caja de cada uno y el texto queda flotando. Acá la línea
 * base se apoya sobre la base del gato por construcción.
 */
export function TopcatsLockup({ className, animate = true }: LogoProps) {
  const reduced = useReducedMotion();
  const still = reduced || !animate;

  return (
    <>
      <NoScriptFallback />
      <motion.svg
        viewBox={`0 0 ${LOCKUP_W.toFixed(1)} ${LOCKUP_H.toFixed(1)}`}
        role="img"
        aria-label="topcats"
        className={cn(
          "topcats-mark block h-full w-auto overflow-visible",
          className,
        )}
        initial={false}
        whileHover={still ? undefined : "hover"}
      >
        <MarkPaths still={still} />

        <motion.g
          transform={`translate(${WORDMARK_X.toFixed(1)} ${WORDMARK_Y.toFixed(1)}) scale(${WORDMARK_SCALE.toFixed(4)})`}
          initial={still ? false : { opacity: 0 }}
          animate={still ? undefined : { opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.3 }}
        >
          <path d={WORDMARK_PATH} fill="currentColor" />
        </motion.g>
      </motion.svg>
    </>
  );
}

interface WordmarkProps {
  className?: string;
}

export function TopcatsWordmark({ className }: WordmarkProps) {
  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      aria-hidden
      className={cn("block h-full w-auto", className)}
    >
      <path d={WORDMARK_PATH} fill="currentColor" />
    </svg>
  );
}
