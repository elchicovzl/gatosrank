import { cn } from "@/lib/cn";

/**
 * Escarapela de puesto. Es la pieza que le da el aire de concurso oficial:
 * los tres primeros llevan medalla con cintas, el resto un número seco.
 */

const MEDAL = {
  1: { tone: "text-gold", label: "Primer puesto" },
  2: { tone: "text-silver", label: "Segundo puesto" },
  3: { tone: "text-bronze", label: "Tercer puesto" },
} as const;

type MedalRank = keyof typeof MEDAL;

function isMedalRank(rank: number): rank is MedalRank {
  return rank === 1 || rank === 2 || rank === 3;
}

/** Contorno festoneado, como el borde troquelado de una escarapela. */
function scallopPath(points: number, outer: number, inner: number): string {
  const step = Math.PI / points;
  const commands: string[] = [];

  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = i * step - Math.PI / 2;
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    commands.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return `${commands.join(" ")} Z`;
}

const SCALLOP = scallopPath(20, 48, 43);

interface RosetteProps {
  rank: number;
  /** `pin` se prende sobre la foto; `inline` va en la fila del catálogo. */
  variant?: "pin" | "inline";
  className?: string;
}

export function Rosette({ rank, variant = "inline", className }: RosetteProps) {
  const medal = isMedalRank(rank) ? MEDAL[rank] : null;
  const isPin = variant === "pin";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        isPin ? "size-16 sm:size-20" : "size-11",
        medal?.tone ?? "text-rule",
        className,
      )}
    >
      {/* Las cintas cuelgan por detrás del disco, hacia abajo. */}
      {medal ? (
        <span
          aria-hidden
          className="absolute top-[58%] left-1/2 h-12 w-8 -translate-x-1/2 sm:h-14 sm:w-9"
          style={{
            background: "currentColor",
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 72%, 0 100%)",
          }}
        />
      ) : null}

      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        {medal ? (
          <>
            <path d={SCALLOP} fill="currentColor" />
            <circle cx="50" cy="50" r="37" fill="var(--color-paper)" />
            <circle
              cx="50"
              cy="50"
              r="37"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </>
        ) : (
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="var(--color-paper)"
            stroke="currentColor"
            strokeWidth="2"
          />
        )}
      </svg>

      <span
        className={cn(
          "tnum relative font-display leading-none text-ink",
          isPin ? "text-2xl sm:text-3xl" : "text-base",
        )}
      >
        {rank}
      </span>
      <span className="sr-only">{medal?.label ?? `Puesto ${rank}`}</span>
    </span>
  );
}
