import type { InputHTMLAttributes, ReactNode } from "react";

export function FieldInput({
  label,
  hint,
  suffix,
  icon,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  suffix?: string;
  icon?: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-charcoal">{label}</span>
      <div className="relative">
        <input
          {...props}
          className="w-full rounded-xl border border-mist bg-paper px-4 py-3.5 text-charcoal outline-none placeholder:text-muted/60 focus:border-sage focus:ring-2 focus:ring-sage/20"
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">
            {suffix}
          </span>
        ) : null}
        {icon ? (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </span>
        ) : null}
      </div>
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
