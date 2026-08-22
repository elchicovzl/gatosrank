import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Botones del sitio.
 *
 * Las esquinas rectas y las versalitas diminutas eran lo que más hacía ver
 * la interfaz anticuada. Acá todo va redondeado, con texto de tamaño real
 * y elevación suave en la acción principal.
 *
 * El primario lleva texto TINTA sobre ámbar, no blanco: 9.32:1 de contraste
 * contra los ~3:1 típicos de blanco-sobre-naranja.
 */

const VARIANTS = {
  primary:
    "bg-amber text-ink hover:bg-amber-deep hover:-translate-y-px active:translate-y-0",
  secondary:
    "bg-paper text-ink border border-line hover:border-ink hover:bg-bone-deep",
  quiet: "bg-transparent text-ink-soft hover:bg-bone-deep hover:text-ink",
  danger:
    "bg-paper text-danger border border-danger/40 hover:bg-danger hover:text-paper",
} as const;

const SIZES = {
  sm: "min-h-9 px-3.5 text-sm gap-1.5",
  md: "min-h-11 px-5 text-[0.9375rem] gap-2",
  lg: "min-h-14 px-7 text-lg gap-2.5",
} as const;

/**
 * La elevación se reserva para la acción principal en tamaño grande.
 * En los botones chicos el halo ámbar se derrama sobre el borde de la
 * cabecera y parece una mancha.
 */
const LIFT = {
  sm: "",
  md: "",
  lg: "shadow-[var(--shadow-lift)]",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-medium",
    "transition-all duration-150 select-none",
    "disabled:pointer-events-none disabled:border disabled:border-line disabled:bg-bone-deep disabled:text-ink-faint disabled:shadow-none",
    VARIANTS[variant],
    SIZES[size],
    variant === "primary" ? LIFT[size] : "",
    className,
  );
}

interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={buttonClass(variant, size, className)}
    >
      {children}
    </button>
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link {...props} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
