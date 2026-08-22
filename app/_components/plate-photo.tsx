import { CatPhoto } from "@/app/_components/cat-photo";
import { Rosette } from "@/app/_components/rosette";
import { cn } from "@/lib/cn";

interface PlatePhotoProps {
  imageKey: string;
  name: string;
  rank: number;
  size: number;
  priority?: boolean;
  className?: string;
}

/**
 * Foto enmarcada con la escarapela prendida en la esquina, como una
 * placa de exposición. La escarapela nunca le roba ancho al nombre.
 */
export function PlatePhoto({
  imageKey,
  name,
  rank,
  size,
  priority,
  className,
}: PlatePhotoProps) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <CatPhoto
        imageKey={imageKey}
        name={name}
        size={size}
        priority={priority}
        className="w-full"
      />
      <Rosette
        rank={rank}
        variant="pin"
        className="absolute -top-3 -left-3 drop-shadow-[0_2px_6px_rgba(28,24,18,0.25)]"
      />
    </div>
  );
}
