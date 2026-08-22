"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { useCopy, useLocale } from "@/app/_components/copy-provider";
import { cn } from "@/lib/cn";
import {
  countryName,
  flagEmoji,
  PRIORITY_COUNT,
  searchCountries,
} from "@/lib/countries";

interface CountryPickerProps {
  id: string;
  value: string;
  onChange: (code: string) => void;
}

/**
 * Selector de país con búsqueda.
 *
 * Un `<select>` nativo con 258 opciones es inusable: no se puede escribir
 * para filtrar, en móvil abre una rueda interminable y las banderas emoji
 * se dibujan distinto según el sistema.
 *
 * Se abre como `<dialog>` modal — igual que el de reportar — porque así
 * hereda trampa de foco, cierre con Esc y fondo inerte, y se comporta igual
 * en escritorio y en celular sin pelear con posicionamiento de popovers.
 */
export function CountryPicker({ id, value, onChange }: CountryPickerProps) {
  const copy = useCopy();
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const nombre = countryName(value, locale);

  return (
    <>
      <button
        type="button"
        id={id}
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-between gap-2 rounded-[var(--radius-control)] border border-line bg-paper px-3.5 text-left text-base text-ink transition-colors hover:border-ink"
      >
        <span className="flex min-w-0 items-center gap-2">
          {value ? (
            <span aria-hidden className="text-lg leading-none">
              {flagEmoji(value)}
            </span>
          ) : null}
          <span className={cn("truncate", !nombre && "text-ink-faint")}>
            {nombre ?? copy.enter.step2CountryNone}
          </span>
        </span>
        <svg viewBox="0 0 12 12" className="size-3 shrink-0 text-ink-faint" aria-hidden>
          <path
            d="M2 4.5 6 8.5 10 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Se monta solo al abrirlo: 258 filas ocultas no le sirven a nadie. */}
      {open ? (
        <CountryDialog
          value={value}
          onPick={(code) => {
            onChange(code);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

interface CountryDialogProps {
  value: string;
  onPick: (code: string) => void;
  onClose: () => void;
}

function CountryDialog({ value, onPick, onClose }: CountryDialogProps) {
  const copy = useCopy();
  const locale = useLocale();
  const ref = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const resultados = useMemo(
    () => searchCountries(locale, query),
    [locale, query],
  );

  /** La opción "sin país" va primera y siempre visible. */
  const opciones = useMemo(
    () => [{ code: "", name: copy.enter.step2CountryNone }, ...resultados],
    [resultados, copy],
  );

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  /** Mantiene visible la opción activa al moverse con el teclado. */
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, opciones.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const elegido = opciones[active];
      if (elegido) onPick(elegido.code);
    }
  }

  /** Sin búsqueda, un filete separa los cercanos del resto del mundo. */
  const corte = query ? -1 : PRIORITY_COUNT;

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-label={copy.enter.step2CountryLabel}
      className="m-auto flex max-h-[min(80dvh,36rem)] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[var(--radius-card)] border border-rule bg-paper p-0 text-ink shadow-[var(--shadow-card)] backdrop:bg-ink/45 backdrop:backdrop-blur-[2px]"
    >
      <div className="border-b border-rule p-3">
        <label htmlFor={`${baseId}-buscar`} className="sr-only">
          {copy.enter.step2CountrySearch}
        </label>
        <input
          id={`${baseId}-buscar`}
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            // El reset va acá y no en un efecto: cambiar estado dentro de
            // un efecto encadena renders sin necesidad.
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={copy.enter.step2CountrySearch}
          role="combobox"
          aria-expanded
          aria-controls={`${baseId}-lista`}
          aria-activedescendant={`${baseId}-op-${active}`}
          autoComplete="off"
          className="h-11 w-full rounded-[var(--radius-control)] border border-line bg-bone px-3 text-base text-ink outline-none placeholder:text-ink-faint focus:border-ink"
        />
      </div>

      {opciones.length === 1 ? (
        <p className="p-6 text-center text-sm text-ink-soft">
          {copy.enter.step2CountryEmpty}
        </p>
      ) : (
        <ul
          ref={listRef}
          id={`${baseId}-lista`}
          role="listbox"
          className="flex-1 overflow-y-auto overscroll-contain p-1.5"
        >
          {opciones.map((pais, index) => (
            <li
              key={pais.code || "none"}
              className={cn(
                index === corte + 1 && "mt-1.5 border-t border-rule pt-1.5",
              )}
            >
              <button
                type="button"
                id={`${baseId}-op-${index}`}
                role="option"
                aria-selected={pais.code === value}
                data-active={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => onPick(pais.code)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2.5 rounded-[var(--radius-control)] px-3 text-left text-[0.9375rem] transition-colors",
                  index === active ? "bg-bone-deep" : "hover:bg-bone-deep",
                  pais.code === value && "font-semibold",
                )}
              >
                <span aria-hidden className="w-6 text-lg leading-none">
                  {flagEmoji(pais.code)}
                </span>
                <span className="min-w-0 flex-1 truncate">{pais.name}</span>
                {/*
                  En tinta y no en ámbar: sobre la fila resaltada el ámbar
                  daba 4.25:1. La selección ya se comunica con la negrita y
                  con `aria-selected`, así que esto solo la refuerza.
                */}
                {pais.code === value ? (
                  <span aria-hidden className="text-ink">
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </dialog>
  );
}
