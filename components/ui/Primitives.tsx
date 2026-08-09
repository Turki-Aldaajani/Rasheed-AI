import { cn } from "@/lib/formatting";

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-200 bg-white",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-ink-900 sm:text-2xl">
          {title}
        </h2>
        {hint ? (
          <p className="mt-1 text-sm text-ink-500">{hint}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** inverse: للاستخدام فوق خلفية العلامة الداكنة */
  variant?: "primary" | "secondary" | "ghost" | "inverse";
  size?: "md" | "lg";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        "disabled:cursor-not-allowed disabled:opacity-45",
        size === "lg" ? "px-7 py-3.5 text-base" : "px-5 py-2.5 text-sm",
        variant === "primary" &&
          "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900",
        variant === "secondary" &&
          "border border-ink-300 bg-white text-ink-800 hover:border-ink-400 hover:bg-ink-50",
        variant === "ghost" && "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
        variant === "inverse" &&
          "bg-white text-brand-800 hover:bg-brand-50 active:bg-brand-100 focus-visible:outline-white",
        className
      )}
      {...rest}
    />
  );
}

export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg bg-ink-50 px-2.5 py-1.5 text-xs font-medium text-ink-600",
        className
      )}
    >
      {children}
    </span>
  );
}

/** ملاحظة "هذه تقديرات" — تتكرر عمدًا في كل مكان يعرض تقديرًا */
export function EstimateNote({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-xs leading-relaxed text-ink-400",
        className
      )}
    >
      <span
        aria-hidden
        className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-300"
      />
      <span>{children}</span>
    </p>
  );
}
