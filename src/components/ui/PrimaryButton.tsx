import type { ButtonHTMLAttributes, ReactNode } from "react";

type Tone = "rose" | "sage";

export function PrimaryButton({
  children,
  tone = "sage",
  className = "",
  showArrow = true,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: Tone;
  showArrow?: boolean;
}) {
  const tones: Record<Tone, string> = {
    rose: "bg-terracotta text-paper hover:bg-terracotta-dark",
    sage: "bg-sage-deep text-paper hover:bg-sage",
  };

  return (
    <button
      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[15px] font-medium transition disabled:opacity-50 ${tones[tone]} ${className}`}
      type="button"
      {...props}
    >
      <span>{children}</span>
      {showArrow ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 12h14M13 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}
