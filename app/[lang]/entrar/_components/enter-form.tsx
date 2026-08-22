"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Field, inputClass } from "@/app/[lang]/entrar/_components/field";
import { AmountStep } from "@/app/[lang]/entrar/_components/amount-step";
import { LivePreview } from "@/app/[lang]/entrar/_components/live-preview";
import { PayPanel } from "@/app/[lang]/entrar/_components/pay-panel";
import { PhotoStep } from "@/app/[lang]/entrar/_components/photo-step";
import { RankStrip } from "@/app/[lang]/entrar/_components/rank-strip";
import { Step } from "@/app/[lang]/entrar/_components/step";
import { startCheckout } from "@/app/[lang]/entrar/actions";
import { priceToTakeRank, project, type BoardEntry } from "@/lib/bidding";
import { CountryPicker } from "@/app/_components/country-picker";
import { isReservedHandle, isValidHandleFormat } from "@/lib/reserved-handles";
import { useCopy, useLocale } from "@/app/_components/copy-provider";
import type { Dictionary } from "@/lib/i18n";
import { MIN_ENTRY_CENTS } from "@/lib/money";

interface EnterFormProps {
  board: BoardEntry[];
  /** Puesto preseleccionado desde el tablero (?puesto=N). */
  preselectedRank: number | null;
  /** Monto que viene del hero de la portada (?monto=N en centavos). */
  preselectedAmountCents: number | null;
}

const NAME_MAX = 24;

/** Depende del diccionario, así que se arma con él y no a nivel de módulo. */
function errorMessages(copy: Dictionary): Record<string, string> {
  return {
    name: copy.enter.step2NameRequired,
    image: copy.enter.step1ErrorFailed,
    handle: copy.enter.step2HandleInvalid,
    handle_reserved: copy.enter.step2HandleReserved,
    link_invalid: copy.enter.step3UrlInvalid,
    link_shortener: copy.enter.step3UrlShortener,
    checkout: copy.enter.payError,
  };
}

export function EnterForm({
  board,
  preselectedRank,
  preselectedAmountCents,
}: EnterFormProps) {
  const copy = useCopy();
  const locale = useLocale();
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [country, setCountry] = useState("");
  const [link, setLink] = useState("");
  const [amountCents, setAmountCents] = useState(() => {
    if (preselectedAmountCents) return preselectedAmountCents;
    if (preselectedRank) return priceToTakeRank(board, preselectedRank);
    return MIN_ENTRY_CENTS;
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  /**
   * La barra sticky de móvil tapa el final del formulario. Reservar un
   * padding fijo es adivinar: la altura cambia con el nombre, el idioma y
   * el tamaño de fuente del sistema. Se mide y se reserva exactamente eso.
   */
  const stickyRef = useRef<HTMLDivElement>(null);
  const [stickyHeight, setStickyHeight] = useState(0);

  useEffect(() => {
    const node = stickyRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      const height = entry.contentRect.height;
      setStickyHeight(height);
      /*
       * Reservar padding al final de la columna solo salva el final de la
       * página. Cuando el navegador hace scroll a un input enfocado en el
       * medio, lo deja detrás de la barra. `scroll-padding-bottom` es lo
       * que hace que ese scroll automático respete la barra.
       */
      document.documentElement.style.scrollPaddingBottom = `${height + 16}px`;
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      document.documentElement.style.scrollPaddingBottom = "";
    };
  }, []);

  const projection = useMemo(
    () => project(board, amountCents),
    [board, amountCents],
  );

  /*
    Se avisa al tipear, no después de pagar: el servidor valida igual, pero
    enterarte de que el @usuario no sirve al volver del checkout es cruel.
  */
  const handleError = !isValidHandleFormat(handle)
    ? copy.enter.step2HandleInvalid
    : isReservedHandle(handle)
      ? copy.enter.step2HandleReserved
      : null;

  const hasPhoto = Boolean(imageKey);
  const hasName = name.trim().length > 0;
  const ready =
    hasPhoto && hasName && !handleError && amountCents >= MIN_ENTRY_CENTS;

  function handlePay() {
    if (!imageKey) return;
    setError(null);

    startTransition(async () => {
      const result = await startCheckout({
        imageKey,
        name,
        ownerHandle: handle,
        country,
        linkUrl: link,
        amountCents,
        locale,
      });

      if (result.ok) {
        window.location.href = result.url;
        return;
      }

      setError(errorMessages(copy)[result.error] ?? copy.errors.generic);
    });
  }

  const preview = (dense: boolean) => (
    <LivePreview
      projection={projection}
      amountCents={amountCents}
      name={name}
      imageKey={imageKey}
      ownerHandle={handle}
      country={country}
      dense={dense}
    />
  );

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      {/* Columna de pasos ------------------------------------------------ */}
      <div
        className="flex min-w-0 flex-1 flex-col gap-8"
        style={{ paddingBottom: stickyHeight + 24 }}
      >
        <header>
          <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
            {copy.enter.title}
          </h1>
          <p className="mt-2 max-w-prose text-ink-soft">{copy.enter.lede}</p>
        </header>

        <Step
          label={copy.enter.step1Label}
          title={copy.enter.step1Title}
          help={copy.enter.step1Help}
        >
          <PhotoStep
            previewUrl={previewUrl}
            onUploaded={(key, url) => {
              setImageKey(key);
              setPreviewUrl(url);
            }}
          />
        </Step>

        <Step
          label={copy.enter.step2Label}
          title={copy.enter.step2Title}
          locked={!hasPhoto}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="nombre"
              label={copy.enter.step2NameLabel}
              help={copy.enter.step2NameHelp}
              error={
                name.length > NAME_MAX ? copy.enter.step2NameTooLong : null
              }
              className="sm:col-span-2"
            >
              <input
                id="nombre"
                value={name}
                maxLength={NAME_MAX}
                onChange={(e) => setName(e.target.value)}
                placeholder={copy.enter.step2NamePlaceholder}
                className={inputClass}
                autoComplete="off"
              />
            </Field>

            <Field
              id="handle"
              label={copy.enter.step2HandleLabel}
              help={copy.enter.step2HandleHelp}
              error={handleError}
            >
              <input
                id="handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/^@+/, ""))}
                placeholder={copy.enter.step2HandlePlaceholder}
                className={inputClass}
                autoComplete="off"
              />
            </Field>

            <Field
              id="pais"
              label={copy.enter.step2CountryLabel}
              help={copy.enter.step2CountryHelp}
            >
              <CountryPicker id="pais" value={country} onChange={setCountry} />
            </Field>
          </div>
        </Step>

        <Step
          label={copy.enter.step3Label}
          title={copy.enter.step3Title}
          locked={!hasName}
        >
          <Field
            id="enlace"
            label={copy.enter.step3UrlLabel}
            help={copy.enter.step3UrlHelp}
          >
            <input
              id="enlace"
              type="url"
              inputMode="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={copy.enter.step3UrlPlaceholder}
              className={inputClass}
              autoComplete="off"
            />
          </Field>
        </Step>

        <Step
          label={copy.enter.step4Label}
          title={copy.enter.step4Title}
          help={copy.enter.step4Help}
          locked={!hasName}
        >
          <RankStrip
            board={board}
            selectedRank={projection.rank}
            onPick={(_rank, price) => setAmountCents(price)}
          />
        </Step>

        <Step
          label={copy.enter.step5Label}
          title={copy.enter.step5Title}
          locked={!hasName}
        >
          <AmountStep
            amountCents={amountCents}
            projection={projection}
            onChange={setAmountCents}
          />
        </Step>

        {/* La previa completa vive en el flujo en móvil; en desktop, al costado. */}
        <section className="flex flex-col gap-3 lg:hidden">
          <h2 className="label-cat">{copy.enter.previewHeading}</h2>
          {preview(false)}
        </section>
      </div>

      {/* Panel fijo de desktop ------------------------------------------- */}
      <aside className="hidden w-full shrink-0 lg:sticky lg:top-6 lg:block lg:w-96">
        <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-rule bg-paper p-4 shadow-[var(--shadow-card)]">
          <h2 className="label-cat">{copy.enter.previewHeading}</h2>
          {preview(false)}
          <PayPanel
            projection={projection}
            ready={ready}
            busy={busy}
            error={error}
            onPay={handlePay}
          />
        </div>
      </aside>

      {/* Barra sticky de móvil ------------------------------------------- */}
      <div
        ref={stickyRef}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-bone/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-4 py-2">
          {preview(true)}
          <PayPanel
            projection={projection}
            ready={ready}
            busy={busy}
            error={error}
            onPay={handlePay}
            compact
          />
        </div>
      </div>
    </div>
  );
}
