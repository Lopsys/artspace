import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "gold" | "ghost" | "line" | "danger";
};

export function Button({
  className,
  variant = "gold",
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "gold" &&
          "bg-gold text-ink hover:bg-gold-bright",
        variant === "ghost" &&
          "text-cream/80 hover:bg-ink-raised hover:text-cream",
        variant === "line" &&
          "border border-line text-cream hover:border-gold/60",
        variant === "danger" &&
          "border border-danger/40 text-danger hover:bg-danger/10",
        className,
      )}
      {...props}
    />
  );
}
