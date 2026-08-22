"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

import { Button } from "@/app/_components/button";
import { reportCat } from "@/app/actions";
import { useCopy } from "@/app/_components/copy-provider";

interface ReportDialogProps {
  catId: string;
  catName: string;
  onClose: () => void;
  onSent: () => void;
}

/**
 * Diálogo de reporte.
 *
 * Usa el `<dialog>` nativo con `showModal()`: trae trampa de foco, cierre
 * con Esc y fondo inerte sin escribir una línea, y se dibuja en el *top
 * layer* — así no pelea con el z-index del enlace que cubre toda la fila.
 *
 * Reemplaza a un `window.prompt`, que además de desentonar con el sitio
 * abre un modal del sistema operativo en el celular.
 */
export function ReportDialog({
  catId,
  catName,
  onClose,
  onSent,
}: ReportDialogProps) {
  const copy = useCopy();
  /** La última opción no dice nada por sí sola: pide detalle. */
  const other = copy.reportDialog.reasons.length - 1;
  const ref = useRef<HTMLDialogElement>(null);
  const groupId = useId();
  const [reason, setReason] = useState<number | null>(null);
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function handleSubmit() {
    if (reason === null) {
      setError(copy.reportDialog.reasonRequired);
      return;
    }
    // "Otra cosa" sin explicación no le sirve a quien modera.
    if (reason === other && detail.trim().length === 0) {
      setError(copy.reportDialog.detailRequired);
      return;
    }

    setError(null);
    const label = copy.reportDialog.reasons[reason];
    const text = detail.trim() ? `${label} — ${detail.trim()}` : label;

    startTransition(async () => {
      await reportCat(catId, text.slice(0, 280));
      setDone(true);
      onSent();
    });
  }

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clic en el fondo: el target es el propio <dialog>, no su contenido.
        if (event.target === ref.current) onClose();
      }}
      className="m-auto max-h-[min(90dvh,44rem)] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-[var(--radius-card)] border border-rule bg-paper p-0 text-ink shadow-[var(--shadow-card)] backdrop:bg-ink/45 backdrop:backdrop-blur-[2px]"
      aria-labelledby={`${groupId}-titulo`}
    >
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        {done ? (
          <>
            <h2
              id={`${groupId}-titulo`}
              className="font-display text-2xl text-ink"
            >
              {copy.reportDialog.doneTitle}
            </h2>
            <p className="text-ink-soft">{copy.reportDialog.doneBody}</p>
            <Button onClick={onClose} className="self-end">
              {copy.reportDialog.close}
            </Button>
          </>
        ) : (
          <>
            <div>
              <h2
                id={`${groupId}-titulo`}
                className="font-display text-2xl leading-tight text-ink"
              >
                {copy.reportDialog.title(catName)}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                {copy.reportDialog.lede}
              </p>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="label-cat mb-2">
                {copy.reportDialog.reasonLabel}
              </legend>
              {copy.reportDialog.reasons.map((label, index) => (
                <label
                  key={label}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border border-line px-3 transition-colors has-checked:border-ink has-checked:bg-bone-deep"
                >
                  <input
                    type="radio"
                    name={`${groupId}-motivo`}
                    checked={reason === index}
                    onChange={() => {
                      setReason(index);
                      setError(null);
                    }}
                    className="size-4 accent-amber-ink"
                  />
                  <span className="text-[0.9375rem]">{label}</span>
                </label>
              ))}
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`${groupId}-detalle`}
                className="label-cat"
              >
                {copy.reportDialog.detailLabel}
              </label>
              <textarea
                id={`${groupId}-detalle`}
                value={detail}
                onChange={(event) => {
                  setDetail(event.target.value);
                  setError(null);
                }}
                rows={3}
                maxLength={240}
                placeholder={copy.reportDialog.detailPlaceholder}
                className="w-full resize-none rounded-[var(--radius-control)] border border-line bg-bone px-3 py-2 text-base text-ink outline-none placeholder:text-ink-faint focus:border-ink"
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button variant="quiet" onClick={onClose} disabled={busy}>
                {copy.reportDialog.cancel}
              </Button>
              <Button onClick={handleSubmit} disabled={busy}>
                {busy ? copy.reportDialog.sending : copy.reportDialog.send}
              </Button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
