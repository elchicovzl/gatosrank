import { notFound, redirect } from "next/navigation";

import { Button } from "@/app/_components/button";
import { activeProviderId, PROVIDERS, siteUrl } from "@/lib/payments";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/db";
import { localePath, resolveLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

/**
 * Checkout simulado. Existe SOLO cuando PAYMENTS_PROVIDER=mock.
 *
 * No es una maqueta: al confirmar dispara el webhook real contra la ruta
 * real, así que ejercita idempotencia, bloqueo de fila y publicación.
 */
export default async function MockCheckoutPage({
  params,
  searchParams,
}: PageProps<"/[lang]/pago-simulado">) {
  if (activeProviderId() !== PROVIDERS.MOCK) notFound();

  const [{ lang }, query] = await Promise.all([params, searchParams]);
  const locale = resolveLocale(lang);

  const draft = String(query.draft ?? "");
  const amountCents = Number(query.monto ?? 0);
  const resultingCents = Number(query.total ?? 0);

  const cat = draft
    ? await prisma.cat.findUnique({
        where: { id: draft },
        select: { id: true, name: true },
      })
    : null;

  if (!cat || !Number.isInteger(amountCents) || amountCents <= 0) notFound();

  async function confirm() {
    "use server";

    const response = await fetch(`${siteUrl()}/api/webhooks/pagos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: `mock_evt_${draft}_${resultingCents}`,
        providerRef: `mock_txn_${draft}_${resultingCents}`,
        catDraftId: draft,
        amountCents,
        resultingCents,
      }),
    });

    if (!response.ok) throw new Error("El webhook simulado falló");

    redirect(`/listo?draft=${draft}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="rounded-[var(--radius-card)] border border-rule bg-paper p-6 shadow-[var(--shadow-card)]">
        <p className="label-cat">Checkout simulado</p>
        <h1 className="mt-2 font-display text-2xl text-ink">
          Pagar {formatMoney(amountCents, locale)} por {cat.name}
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          Esta pantalla reemplaza al proveedor de pagos mientras
          <code className="mx-1 bg-bone-deep px-1">PAYMENTS_PROVIDER=mock</code>
          . Confirmar dispara el webhook real.
        </p>

        <form action={confirm} className="mt-6">
          <Button type="submit" size="lg" className="w-full">
            Confirmar pago de {formatMoney(amountCents, locale)}
          </Button>
        </form>

        <a
          href={localePath(locale, "/entrar")}
          className="mt-3 block text-center text-sm text-ink-soft underline hover:text-ink"
        >
          Cancelar
        </a>
      </div>
    </div>
  );
}
