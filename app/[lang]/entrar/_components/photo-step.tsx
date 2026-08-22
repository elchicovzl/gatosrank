"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { Button } from "@/app/_components/button";
import { cn } from "@/lib/cn";
import { useCopy } from "@/app/_components/copy-provider";
import type { Dictionary } from "@/lib/i18n";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

interface PhotoStepProps {
  previewUrl: string | null;
  onUploaded: (key: string, previewUrl: string) => void;
}

/** Depende del diccionario: se arma con él, no a nivel de módulo. */
function errorByCode(copy: Dictionary): Record<string, string> {
  return {
    too_large: copy.enter.step1ErrorSize,
    not_an_image: copy.enter.step1ErrorType,
    rate_limited: copy.errors.rateLimited,
  };
}

export function PhotoStep({ previewUrl, onUploaded }: PhotoStepProps) {
  const copy = useCopy();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  /** Se sube apenas se elige el archivo, no al enviar el formulario. */
  async function upload(file: File) {
    setError(null);

    if (file.size > MAX_BYTES) {
      setError(copy.enter.step1ErrorSize);
      return;
    }

    setBusy(true);
    const localPreview = URL.createObjectURL(file);

    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as {
        key?: string;
        error?: string;
      };

      if (!res.ok || !data.key) {
        URL.revokeObjectURL(localPreview);
        setError(
          (data.error && errorByCode(copy)[data.error]) ??
            copy.enter.step1ErrorFailed,
        );
        return;
      }

      onUploaded(data.key, localPreview);
    } catch {
      URL.revokeObjectURL(localPreview);
      setError(copy.enter.step1ErrorFailed);
    } finally {
      setBusy(false);
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void upload(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-dashed p-5 text-center transition-colors sm:flex-row sm:text-left",
          dragging ? "border-amber-ink bg-amber-tint" : "border-rule bg-paper",
        )}
      >
        {previewUrl ? (
          <span className="frame-photo block size-28 shrink-0 overflow-hidden p-1 sm:size-32">
            <Image
              src={previewUrl}
              alt={copy.cat.photoAlt}
              width={256}
              height={256}
              unoptimized
              className="aspect-square size-full object-cover"
            />
          </span>
        ) : (
          <span
            aria-hidden
            className="frame-photo flex size-28 shrink-0 items-center justify-center bg-bone-deep sm:size-32"
          >
            <svg viewBox="0 0 24 24" className="size-8 text-ink-faint" aria-hidden>
              <path
                d="M3 17l5-6 4 5 3-3 6 7H3z M15.5 7.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"
                fill="currentColor"
              />
            </svg>
          </span>
        )}

        <div className="flex flex-col items-center gap-2 sm:items-start">
          <p className="font-display text-lg text-ink">
            {busy ? copy.enter.step1Uploading : copy.enter.step1Drop}
          </p>
          <Button
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {previewUrl ? copy.enter.step1Replace : copy.enter.step1Browse}
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleChange}
          className="sr-only"
          tabIndex={-1}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
