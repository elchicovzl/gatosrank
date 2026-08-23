"use server";

import { project } from "@/lib/bidding";
import { getBoardSnapshot } from "@/lib/board";
import { isCountryCode } from "@/lib/countries";
import { prisma } from "@/lib/db";
import { normalizeLink } from "@/lib/links";
import { isReservedHandle, isValidHandleFormat } from "@/lib/reserved-handles";
import { moderateImage, VERDICTS } from "@/lib/moderation";
import { isValidAmount } from "@/lib/money";
import { payments } from "@/lib/payments";
import { slugify, slugSuffix } from "@/lib/slug";
import type { Locale } from "@/lib/i18n/config";

export interface DraftInput {
  /** Idioma desde el que se inscribe: el checkout tiene que volver ahí. */
  locale: Locale;
  imageKey: string;
  name: string;
  ownerHandle: string;
  country: string;
  linkUrl: string;
  amountCents: number;
}

export type CheckoutResponse =
  | { ok: true; url: string }
  | { ok: false; error: string };

const NAME_MAX = 24;
const IMAGE_KEY_PATTERN = /^[a-f0-9-]{36}\.webp$/i;

const MODERATION_TO_ENUM = {
  [VERDICTS.OK]: "OK",
  [VERDICTS.REVIEW]: "REVIEW",
  [VERDICTS.REJECT]: "REJECT",
} as const;

/** Slug libre. El nombre se repite mucho ("Michi"): se desambigua con sufijo. */
async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${slugSuffix()}`;
    const taken = await prisma.cat.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Guarda el borrador y abre el checkout.
 *
 * El borrador se crea SIEMPRE antes de mandar al pago, con estado PENDING.
 * Si el pago nunca llega, el borrador queda ahí y no molesta a nadie: no
 * aparece en el tablero y no tiene puja.
 *
 * El puesto NO se otorga acá. Se otorga solo en el webhook confirmado.
 */
export async function startCheckout(
  input: DraftInput,
): Promise<CheckoutResponse> {
  const name = input.name.trim();
  if (!name || name.length > NAME_MAX) {
    return { ok: false, error: "name" };
  }

  if (!IMAGE_KEY_PATTERN.test(input.imageKey)) {
    return { ok: false, error: "image" };
  }

  const handle = input.ownerHandle.trim().replace(/^@+/, "");
  if (!isValidHandleFormat(handle)) {
    return { ok: false, error: "handle" };
  }
  /*
    El @usuario NO es único a propósito (varios gatos del mismo dueño lo
    comparten). Lo que se bloquea es hacerse pasar por el sitio o su equipo.
  */
  if (isReservedHandle(handle)) {
    return { ok: false, error: "handle_reserved" };
  }

  const country = input.country.trim().toUpperCase();
  if (country && !isCountryCode(country)) {
    return { ok: false, error: "country" };
  }

  if (!isValidAmount(input.amountCents)) {
    return { ok: false, error: "amount" };
  }

  const link = await normalizeLink(input.linkUrl);
  if ("error" in link) {
    return { ok: false, error: `link_${link.error}` };
  }

  /**
   * El servidor recalcula contra el tablero fresco. La previa del cliente
   * es informativa; lo que se cobra sale de acá.
   */
  const board = await getBoardSnapshot();
  const projection = project(board, input.amountCents);

  const slug = await uniqueSlug(name);
  const verdict = await moderateImage(input.imageKey);

  const draft = await prisma.cat.create({
    data: {
      slug,
      name,
      imageKey: input.imageKey,
      ownerHandle: handle || null,
      country: country || null,
      linkUrl: link.url,
      amountCents: 0,
      status: "PENDING",
      moderation: MODERATION_TO_ENUM[verdict],
    },
    select: { id: true },
  });

  /*
    Un REJECT no se publica ni pagando: `applyPayment` lo deja en PENDING.
    Así que mandarlo al checkout sería cobrarle por algo que nunca va a
    recibir, y las reglas dicen que la puja no se devuelve. Eso no es sólo
    injusto: genera disputas y contracargos, que es exactamente lo que
    pone en riesgo la cuenta del proveedor de pagos — el mismo riesgo que
    la regla del REJECT intenta evitar.

    El borrador sí queda creado, con su veredicto: /admin lo muestra en
    "Bloqueados por el control" y deja ver qué se intentó subir.
  */
  if (verdict === VERDICTS.REJECT) {
    return { ok: false, error: "image_rejected" };
  }

  try {
    const checkout = await payments().createCheckout({
      catDraftId: draft.id,
      amountCents: projection.chargeCents,
      resultingCents: projection.resultingCents,
      locale: input.locale,
    });
    return { ok: true, url: checkout.url };
  } catch {
    return { ok: false, error: "checkout" };
  }
}
