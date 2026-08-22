import { Button, type ButtonVariant } from "@/app/_components/button";

const TONES = {
  primary: "primary",
  neutral: "secondary",
  danger: "danger",
} as const;

type Tone = keyof typeof TONES;

interface ActionButtonProps {
  action: () => Promise<void>;
  label: string;
  tone?: Tone;
}

/** Botón de acción del panel. Se usa desde el celular, a una mano. */
export function ActionButton({
  action,
  label,
  tone = "neutral",
}: ActionButtonProps) {
  return (
    <form action={action} className="flex-1 sm:flex-none">
      <Button
        type="submit"
        variant={TONES[tone] as ButtonVariant}
        className="w-full sm:w-auto"
      >
        {label}
      </Button>
    </form>
  );
}
