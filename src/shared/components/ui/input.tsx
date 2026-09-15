import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Field({ label, className, id, ...props }: Props) {
  const fieldId = id ?? props.name;
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <input
        id={fieldId}
        className={cn(
          "h-11 rounded-xl border border-line bg-ink px-3 text-cream outline-none transition placeholder:text-muted/50 focus:border-gold/70",
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function SelectField({
  label,
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <select
        className={cn(
          "h-11 rounded-xl border border-line bg-ink px-3 text-cream outline-none focus:border-gold/70",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
