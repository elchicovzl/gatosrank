"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { useCopy, useLocale } from "@/app/_components/copy-provider";
import type { LiveStats } from "@/lib/presence";
import { localePath } from "@/lib/i18n/config";
import { formatCount } from "@/lib/time";

interface LiveStatsPillProps {
  initial: LiveStats;
  className?: string;
}

/** Latido cada 30 s. La ventana de "en línea" del servidor es de 90 s. */
const BEAT_MS = 30_000;

/**
 * Píldora de actividad en vivo. Es la señal de que el tablero está pasando
 * AHORA — sin ella un ranking parece una foto vieja.
 *
 * Sin websockets: un POST cada 30 s que registra el latido y devuelve los
 * contadores. Se pausa cuando la pestaña no está visible.
 *
 * En pantallas chicas se muestra solo el contador de gente en línea. Es UN
 * solo componente con las partes extra ocultas por CSS, no dos instancias:
 * dos montarían dos latidos y contarían doble.
 */
export function LiveStatsPill({ initial, className }: LiveStatsPillProps) {
  const copy = useCopy();
  const locale = useLocale();
  const [stats, setStats] = useState(initial);

  useEffect(() => {
    let cancelled = false;

    async function beat() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/presencia", { method: "POST" });
        if (!res.ok) return;
        const data: LiveStats = await res.json();
        if (!cancelled) setStats(data);
      } catch {
        // Un latido perdido no rompe nada: se reintenta al próximo tick.
      }
    }

    void beat();
    const id = window.setInterval(beat, BEAT_MS);
    document.addEventListener("visibilitychange", beat);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border border-rule bg-paper px-3 py-1.5 text-sm whitespace-nowrap text-ink-soft sm:px-4 sm:py-2",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-medium text-online">
        <span
          aria-hidden
          className="dot-online size-2 shrink-0 rounded-full bg-online-dot"
        />
        <span className="tnum">
          {formatCount(stats.online, locale)} {copy.live.online}
        </span>
      </span>

      {/* `contents` deja pasar los hijos al flex del padre sin caja extra. */}
      <span className="hidden md:contents">
        {/*
          Separador dibujado, no un carácter "·". Como texto le aplicaba el
          mínimo de 4.5:1 y a ese contraste dejaba de parecer un separador;
          como gráfico decorativo le corresponde 3:1 y lo cumple.
        */}
        <span aria-hidden className="size-1 shrink-0 rounded-full bg-line" />

        <span className="tnum">
          {formatCount(stats.visitors, locale)} {copy.live.visitors}
        </span>

        <span aria-hidden className="size-1 shrink-0 rounded-full bg-line" />

        <Link
          href={localePath(locale, "/reglas")}
          className="font-medium text-amber-ink underline-offset-2 hover:underline"
        >
          {copy.live.seeRules}
        </Link>
      </span>
    </div>
  );
}
