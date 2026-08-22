import { ButtonLink } from "@/app/_components/button";
import { cn } from "@/lib/cn";
import { getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { type Locale } from "@/lib/i18n/config";

interface TakeSpotLinkProps {
  /** Idioma activo: los componentes de servidor no pueden usar contexto. */
  lang: Locale;
  rank: number;
  priceCents: number;
  variant?: "row" | "hero";
  className?: string;
}

/**
 * Atajo del tablero a /entrar con el puesto ya preseleccionado.
 * El texto dice el precio: nunca "continuar".
 */
export function TakeSpotLink({
  lang,
  rank,
  priceCents,
  variant = "row",
  className,
}: TakeSpotLinkProps) {
  const copy = getDictionary(lang);
  const price = formatMoney(priceCents, lang);

  return (
    <ButtonLink
      href={`/entrar?puesto=${rank}`}
      variant="secondary"
      size={variant === "hero" ? "md" : "sm"}
      className={cn("relative z-20", className)}
    >
      <span className="hidden sm:inline">{copy.board.takeThisSpot(price)}</span>
      <span className="tnum sm:hidden">
        {copy.board.takeThisSpotShort(price)}
      </span>
    </ButtonLink>
  );
}
