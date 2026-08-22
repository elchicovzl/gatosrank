import type { Metadata } from "next";

import { Button } from "@/app/_components/button";
import { ActionButton } from "@/app/[lang]/admin/_components/action-button";
import { AdminCard, type AdminCat } from "@/app/[lang]/admin/_components/admin-card";
import {
  approve,
  dismissReports,
  login,
  logout,
  purgePhoto,
  reject,
  remove,
  restore,
} from "@/app/[lang]/admin/actions";
import { isAdmin } from "@/lib/admin";
import { hasAutomaticModeration } from "@/lib/moderation";
import { getDictionary, type Dictionary } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { resolveLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const copy = getDictionary(resolveLocale(lang));
  return { title: copy.admin.title, robots: { index: false, follow: false } };
}

const SELECT = {
  id: true,
  slug: true,
  name: true,
  imageKey: true,
  ownerHandle: true,
  linkUrl: true,
  amountCents: true,
  createdAt: true,
  moderation: true,
  _count: { select: { reports: true } },
  /* Los motivos, no solo el conteo: alguien se tomó el trabajo de escribirlos. */
  reports: {
    orderBy: { createdAt: "desc" },
    take: 4,
    select: { id: true, reason: true, createdAt: true },
  },
} as const;

type Row = {
  id: string;
  slug: string;
  name: string;
  imageKey: string;
  ownerHandle: string | null;
  linkUrl: string | null;
  amountCents: number;
  createdAt: Date;
  moderation: "OK" | "REVIEW" | "REJECT" | null;
  _count: { reports: number };
  reports: { id: string; reason: string | null; createdAt: Date }[];
};

function toAdminCat(row: Row): AdminCat {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    imageKey: row.imageKey,
    ownerHandle: row.ownerHandle,
    linkUrl: row.linkUrl,
    amountCents: row.amountCents,
    createdAt: row.createdAt.getTime(),
    moderation: row.moderation,
    reportCount: row._count.reports,
    reports: row.reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      createdAt: r.createdAt.getTime(),
    })),
  };
}

function Section({
  title,
  count,
  empty,
  note,
  children,
}: {
  title: string;
  count: number;
  empty?: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="label-cat">
          {title} ({count})
        </h2>
        {note ? <p className="meta mt-1 max-w-prose">{note}</p> : null}
      </div>
      {count === 0 && empty ? (
        <p className="text-sm text-ink-soft">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">{children}</ul>
      )}
    </section>
  );
}

function LoginForm({ copy }: { copy: Dictionary }) {
  return (
    <form
      action={login}
      className="mx-auto flex max-w-sm flex-col gap-3 rounded-[var(--radius-card)] border border-rule bg-paper p-5 shadow-[var(--shadow-card)]"
    >
      <label htmlFor="token" className="label-cat">
        {copy.admin.tokenPrompt}
      </label>
      <input
        id="token"
        name="token"
        type="password"
        autoComplete="off"
        className="h-12 w-full rounded-[var(--radius-control)] border border-line bg-bone px-3.5 text-base text-ink outline-none focus:border-ink"
      />
      <Button type="submit">{copy.admin.tokenCta}</Button>
    </form>
  );
}

export default async function AdminPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const copy = getDictionary(locale);
  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="mb-6 text-center font-display text-3xl text-ink">
          {copy.admin.title}
        </h1>
        <LoginForm copy={copy} />
      </div>
    );
  }

  const [blocked, unreviewed, drafts, reported, live, removed] = await Promise.all([
    /*
      Pagaron pero el control automático los rechazó. Hay plata adentro y el
      ejemplar no está publicado: es lo más urgente del panel.
    */
    prisma.cat.findMany({
      where: { status: "PENDING", amountCents: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: SELECT,
    }),
    /*
      Ya están en el tablero pero el control no los pudo confirmar.
      Moderación posterior: se publican y se revisan después.
    */
    prisma.cat.findMany({
      where: { status: "LIVE", moderation: { not: "OK" } },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: SELECT,
    }),
    /* Abrieron el checkout y nunca pagaron. Carritos abandonados. */
    prisma.cat.findMany({
      where: { status: "PENDING", amountCents: 0 },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: SELECT,
    }),
    /* Por cantidad de reportes: uno con cuarenta no puede quedar debajo
       de uno con uno solo porque se inscribió después. */
    prisma.cat.findMany({
      where: { reports: { some: {} } },
      orderBy: [{ reports: { _count: "desc" } }, { createdAt: "desc" }],
      take: 40,
      select: SELECT,
    }),
    prisma.cat.findMany({
      where: { status: "LIVE" },
      orderBy: [{ amountCents: "desc" }, { firstBidAt: "asc" }],
      take: 40,
      select: SELECT,
    }),
    prisma.cat.findMany({
      where: { status: "REMOVED" },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: SELECT,
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-9 px-4 py-6 sm:px-6 sm:py-8">
      {/*
        Desde que se publica al pagar, no tener control automático significa
        que cualquier foto entra al tablero. El aviso va acá porque es quien
        puede arreglarlo el que lo tiene que ver.
      */}
      {!hasAutomaticModeration() ? (
        <div className="rounded-[var(--radius-card)] border-2 border-danger bg-danger/5 p-4">
          <p className="font-display text-lg text-danger">
            {copy.admin.noModerationTitle}
          </p>
          <p className="mt-1 text-sm text-ink">{copy.admin.noModerationBody}</p>
        </div>
      ) : null}

      <header className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-ink">{copy.admin.title}</h1>
        <form action={logout}>
          <Button type="submit" variant="quiet" size="sm">
            Salir
          </Button>
        </form>
      </header>

      <Section
        title={copy.admin.blockedHeading}
        count={blocked.length}
        empty={copy.admin.blockedEmpty}
        note={blocked.length > 0 ? copy.admin.blockedNote : undefined}
      >
        {blocked.map((row) => {
          const cat = toAdminCat(row);
          return (
            <AdminCard lang={locale} key={cat.id} cat={cat} waiting={copy.admin.waitingBlocked}>
              <ActionButton
                action={approve.bind(null, cat.id)}
                label={copy.admin.approve}
                tone="primary"
              />
              <ActionButton
                action={reject.bind(null, cat.id)}
                label={copy.admin.reject}
                tone="danger"
              />
            </AdminCard>
          );
        })}
      </Section>

      {/*
        Moderación posterior: ya están publicados. Aprobar acá no publica —
        confirma que la foto está bien y los saca de esta cola.
      */}
      <Section
        title={copy.admin.unreviewedHeading}
        count={unreviewed.length}
        empty={copy.admin.unreviewedEmpty}
        note={unreviewed.length > 0 ? copy.admin.unreviewedNote : undefined}
      >
        {unreviewed.map((row) => {
          const cat = toAdminCat(row);
          return (
            <AdminCard lang={locale}
              key={cat.id}
              cat={cat}
              waiting={copy.admin.waitingUnreviewed}
            >
              <ActionButton
                action={approve.bind(null, cat.id)}
                label={copy.admin.approve}
                tone="primary"
              />
              <ActionButton
                action={remove.bind(null, cat.id)}
                label={copy.admin.remove}
                tone="danger"
              />
            </AdminCard>
          );
        })}
      </Section>

      {/*
        Los borradores sin pago van aparte y SIN botón de aprobar: aprobarlos
        no los publica (el puesto se otorga solo en el webhook), así que el
        botón corría y no pasaba nada. Un botón que no hace nada es peor que
        no tener botón.
      */}
      <Section
        title={copy.admin.draftsHeading}
        count={drafts.length}
        empty={copy.admin.draftsEmpty}
        note={drafts.length > 0 ? copy.admin.draftsNote : undefined}
      >
        {drafts.map((row) => {
          const cat = toAdminCat(row);
          return (
            <AdminCard lang={locale}
              key={cat.id}
              cat={cat}
              waiting={
                cat.moderation === "OK"
                  ? copy.admin.waitingPaymentApproved
                  : copy.admin.waitingPayment
              }
            >
              <ActionButton
                action={reject.bind(null, cat.id)}
                label={copy.admin.reject}
                tone="danger"
              />
              <ActionButton
                action={purgePhoto.bind(null, cat.id)}
                label={copy.admin.purgePhoto}
                tone="danger"
              />
            </AdminCard>
          );
        })}
      </Section>

      <Section title={copy.admin.reportsHeading} count={reported.length} empty="—">
        {reported.map((row) => {
          const cat = toAdminCat(row);
          return (
            <AdminCard lang={locale} key={cat.id} cat={cat}>
              <ActionButton
                action={dismissReports.bind(null, cat.id)}
                label={copy.admin.dismissReports}
              />
              <ActionButton
                action={remove.bind(null, cat.id)}
                label={copy.admin.remove}
                tone="danger"
              />
            </AdminCard>
          );
        })}
      </Section>

      <Section title={copy.admin.liveHeading} count={live.length} empty="—">
        {live.map((row) => {
          const cat = toAdminCat(row);
          return (
            <AdminCard lang={locale} key={cat.id} cat={cat}>
              <ActionButton
                action={remove.bind(null, cat.id)}
                label={copy.admin.remove}
                tone="danger"
              />
            </AdminCard>
          );
        })}
      </Section>

      <Section title="Dados de baja" count={removed.length} empty="—">
        {removed.map((row) => {
          const cat = toAdminCat(row);
          return (
            <AdminCard lang={locale} key={cat.id} cat={cat}>
              <ActionButton
                action={restore.bind(null, cat.id)}
                label={copy.admin.restore}
              />
              <ActionButton
                action={purgePhoto.bind(null, cat.id)}
                label={copy.admin.purgePhoto}
                tone="danger"
              />
            </AdminCard>
          );
        })}
      </Section>
    </div>
  );
}
