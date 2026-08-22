import Image from "next/image";

import { cn } from "@/lib/cn";
import { imageUrl } from "@/lib/images";

interface CatPhotoProps {
  imageKey: string;
  name: string;
  /** Ancho renderizado en px, para pedirle a next/image el tamaño justo. */
  size: number;
  priority?: boolean;
  className?: string;
}

/**
 * La foto del gato, siempre cuadrada y siempre enmarcada.
 * Es el elemento protagonista de toda pantalla: nunca se subordina al texto.
 */
export function CatPhoto({
  imageKey,
  name,
  size,
  priority = false,
  className,
}: CatPhotoProps) {
  return (
    <span
      className={cn(
        "frame-photo relative block shrink-0 overflow-hidden p-1",
        className,
      )}
    >
      <Image
        src={imageUrl(imageKey)}
        alt={`Foto de ${name}`}
        width={size}
        height={size}
        priority={priority}
        sizes={`${size}px`}
        className="aspect-square size-full object-cover"
      />
    </span>
  );
}
