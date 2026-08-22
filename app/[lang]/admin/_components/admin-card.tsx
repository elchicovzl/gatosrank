import Link from "next/link";
import type { ReactNode } from "react";

import { CatPhoto } from "@/app/_components/cat-photo";
import { getDictionary, type Dictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/time";
import { resolveLocale, type Locale } from "@/lib/i18n/config";

export interface CatReport {
  id: string;
  reason: string | null;
  createdAt: number;
}

export interface AdminCat {
  id: string;
  slug: string;
  name: string;
  imageKey: string;
  ownerHandle: string | null;
  linkUrl: string | null;
  amountCents: number;
  createdAt: number;
  moderation: "OK" | "REVIEW" | "REJECT" | null;
  reportCount: number;
  /** Los motivos más recientes. Sin esto, el texto que escribe la gente
   *  se guarda en la base y no lo lee nadie nunca. */
  reports: CatReport[];
}

/** Depende del diccionario: se resuelve dentro del componente. */
function moderationLabel(copy: Dictionary, value: AdminCat["moderation"]) {
  if (value === "OK") return copy.admin.moderationOk;
  if (value === "REVIEW") return copy.admin.moderationReview;
  if (value === "REJECT") return copy.admin.moderationReject;
  return copy.admin.moderationNone;
}

interface AdminCardProps {
  /** Idioma activo: los componentes de servidor no pueden usar contexto. */
  lang: Locale;
  cat: AdminCat;
  /** Qué está esperando este ejemplar, en una frase. */
  waiting?: string;
  children: ReactNode;
}

/**
 * Ficha del panel. Botones grandes y una sola columna: esto se usa desde
 * el celular, a una mano, probablemente apurado.
 */
export function AdminCard({
  lang,
 cat, waiting, children }: AdminCardProps) {
  const locale = resolveLocale(lang);
  const copy = getDictionary(locale);
  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-rule bg-paper p-3">
      <div className="flex items-start gap-3">
        {cat.imageKey ? (
          <CatPhoto
            imageKey={cat.imageKey}
            name={cat.name}
            size={160}
            className="size-20 shrink-0"
          />
        ) : (
          <span
            aria-hidden
            className="frame-photo block size-20 shrink-0 bg-bone-deep"
          />
        )}

        <div className="min-w-0 flex-1">
          <Link
            href={`/gato/${cat.slug}`}
            className="font-display text-lg text-ink hover:text-amber-ink"
          >
            {cat.name}
          </Link>
          {cat.ownerHandle ? (
            <p className="truncate text-sm text-ink-soft">@{cat.ownerHandle}</p>
          ) : null}

          <p className="meta mt-1">
            {cat.amountCents > 0
              ? `${copy.admin.paid} ${formatMoney(cat.amountCents, locale)}`
              : copy.admin.unpaid}
            {" · "}
            {moderationLabel(copy, cat.moderation)}
            {" · "}
            {timeAgo(cat.createdAt, locale)}
            {cat.reportCount > 0
              ? ` · ${copy.admin.reportCount(cat.reportCount)}`
              : ""}
          </p>

          {cat.linkUrl ? (
            <p className="mt-1 truncate text-xs text-ink-faint">
              {cat.linkUrl}
            </p>
          ) : null}
        </div>
      </div>

      {/*
        El estado en una frase. "sin pago · auto: pasó" son datos: obligan a
        deducir por qué el ejemplar está trabado. Esto lo dice.
      */}
      {waiting ? (
        <p className="rounded-[var(--radius-control)] bg-bone-deep px-3 py-2 text-sm text-ink">
          {waiting}
        </p>
      ) : null}

      {cat.reports.length > 0 ? (
        <div className="rounded-[var(--radius-control)] border border-danger/25 bg-danger/5 px-3 py-2">
          <p className="label-cat text-danger">{copy.admin.reportsWhy}</p>
          <ul className="mt-1 flex flex-col gap-1">
            {cat.reports.map((report) => (
              <li key={report.id} className="meta flex gap-2 text-ink">
                <span aria-hidden className="shrink-0 text-ink-faint">
                  —
                </span>
                <span className="min-w-0 flex-1 break-words">
                  {report.reason ? (
                    `"${report.reason}"`
                  ) : (
                    <em className="text-ink-faint">
                      {copy.admin.reportNoReason}
                    </em>
                  )}
                </span>
                <span className="shrink-0 text-ink-faint">
                  {timeAgo(report.createdAt, locale)}
                </span>
              </li>
            ))}
            {cat.reportCount > cat.reports.length ? (
              <li className="meta text-ink-faint">
                {copy.admin.reportMore(cat.reportCount - cat.reports.length)}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">{children}</div>
    </li>
  );
}
