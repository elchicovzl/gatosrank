"use client";

import { useState } from "react";

import { ReportDialog } from "@/app/_components/report-dialog";
import { cn } from "@/lib/cn";
import { useCopy } from "@/app/_components/copy-provider";

interface ReportButtonProps {
  catId: string;
  catName: string;
  className?: string;
}

export function ReportButton({ catId, catName, className }: ReportButtonProps) {
  const copy = useCopy();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={done}
        title={done ? copy.board.reported : copy.board.report}
        className={cn(
          "relative z-20 flex size-11 shrink-0 items-center justify-center text-ink-faint transition-colors",
          "hover:text-danger disabled:cursor-default disabled:text-ink-faint/50",
          className,
        )}
      >
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
          <path
            d="M3 1v14M3 2h9l-2 3 2 3H3"
            fill={done ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
        <span className="sr-only">
          {done ? copy.board.reported : copy.board.report}
        </span>
      </button>

      {/*
        El diálogo se monta solo al abrirlo. En el tablero hay hasta 50
        botones de reportar por página: montar 50 diálogos ocultos sería
        tirar trabajo a la basura.
      */}
      {open ? (
        <ReportDialog
          catId={catId}
          catName={catName}
          onClose={() => setOpen(false)}
          onSent={() => setDone(true)}
        />
      ) : null}
    </>
  );
}
