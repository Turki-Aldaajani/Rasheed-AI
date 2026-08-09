import { cn } from "@/lib/formatting";

/**
 * علامة رشيد: قوس منزل يحتضن عمودَي طاقة/ماء.
 * مرسومة بالكامل كـ SVG — بلا صور خارجية.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("h-8 w-8", className)}
      aria-hidden
    >
      <path
        d="M16 3.5 4.5 12v15.5A1 1 0 0 0 5.5 28.5h21a1 1 0 0 0 1-1V12L16 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 23V17.5M16 23v-9M20.5 23v-4"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({
  className,
  subtitle,
}: {
  className?: string;
  subtitle?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-8 w-8 text-brand-700" />
      <div className="leading-tight">
        <div className="text-lg font-bold tracking-tight text-ink-900">رشيد</div>
        {subtitle ? (
          <div className="text-[11px] text-ink-500">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
