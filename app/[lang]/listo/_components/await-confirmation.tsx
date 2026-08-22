"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useCopy } from "@/app/_components/copy-provider";

const POLL_MS = 2500;
const MAX_TRIES = 24;

/**
 * El puesto se otorga en el webhook, no en el redirect. Así que al volver
 * del proveedor puede que todavía no haya llegado: se refresca hasta que sí.
 */
export function AwaitConfirmation() {
  const copy = useCopy();
  const router = useRouter();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (tries >= MAX_TRIES) return;

    const id = window.setTimeout(() => {
      setTries((n) => n + 1);
      router.refresh();
    }, POLL_MS);

    return () => window.clearTimeout(id);
  }, [tries, router]);

  return (
    <p aria-live="polite" className="text-sm text-ink-soft">
      {tries >= MAX_TRIES ? copy.success.stillWaiting : copy.success.checking}
    </p>
  );
}
