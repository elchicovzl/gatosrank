"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { ActivityItem } from "@/lib/board";
import { useCopy, useLocale } from "@/app/_components/copy-provider";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/time";

interface ActivityFeedProps {
  initial: ActivityItem[];
}

const POLL_MS = 10_000;

/**
 * Movimientos recientes. Polling cada 10s, sin websockets a propósito:
 * el proyecto es de vida corta y esto sale gratis.
 * Se pausa cuando la pestaña no está visible.
 */
export function ActivityFeed({ initial }: ActivityFeedProps) {
  const copy = useCopy();
  const locale = useLocale();
  const [items, setItems] = useState(initial);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/activity", { cache: "no-store" });
        if (!res.ok) return;
        const data: ActivityItem[] = await res.json();
        if (!cancelled) setItems(data);
      } catch {
        // Un fallo de red no rompe la página: se reintenta al próximo tick.
      }
    }

    const id = window.setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", poll);
    };
  }, []);

  return (
    <section aria-label={copy.board.activityHeading} className="flex flex-col gap-3">
      <h2 className="label-cat">{copy.board.activityHeading}</h2>

      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">{copy.board.activityEmpty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-rule-soft border-y border-rule">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/gato/${item.slug}`}
                className="flex min-h-10 items-center justify-between gap-3 py-2 text-sm hover:text-amber-ink"
              >
                {/* El monto nunca se corta: si falta espacio, cede el nombre. */}
                <span className="flex min-w-0 items-baseline gap-1 text-ink">
                  <span className="truncate font-display">{item.name}</span>
                  <span className="shrink-0 text-ink-soft">
                    {item.isEntry
                      ? copy.board.activityEntered
                      : copy.board.activityClimbed}
                  </span>
                  <span className="tnum shrink-0">
                    {formatMoney(item.resultingCents, locale)}
                  </span>
                </span>
                <span className="meta shrink-0">
                  {timeAgo(item.createdAt, locale)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
