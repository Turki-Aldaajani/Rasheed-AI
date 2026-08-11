"use client";

import { cn } from "@/lib/formatting";

/**
 * مؤشر انزلاقي مبني على <input type="range"> الأصلي حتى نحافظ على
 * دعم لوحة المفاتيح واللمس. المتصفح يعكس الاتجاه تلقائيًا في RTL،
 * لذلك يُرسم التعبئة من اليمين إلى اليسار.
 */
export function Slider({
  label,
  icon,
  value,
  min,
  max,
  step = 1,
  unit,
  baseline,
  onChange,
  hint,
}: {
  label: string;
  icon?: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  /** القيمة الحالية للمنزل — تظهر كعلامة مرجعية */
  baseline?: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  const percent = ((value - min) / (max - min)) * 100;
  const baselinePercent =
    baseline === undefined ? null : ((baseline - min) / (max - min)) * 100;
  const changed = baseline !== undefined && value !== baseline;

  return (
    <div className="py-1">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-ink-700">
          {icon ? (
            <span className="text-text-muted" aria-hidden>
              {icon}
            </span>
          ) : null}
          {label}
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="tnum text-2xl font-semibold text-text-main">
            {value}
          </span>
          <span className="text-xs text-text-muted">{unit}</span>
        </span>
      </div>

      <div className="relative">
        <input
          type="range"
          className="rs-slider relative z-10"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          aria-valuetext={`${value} ${unit}`}
          style={{
            background: `linear-gradient(to left, var(--color-brand-600) ${percent}%, var(--color-ink-200) ${percent}%)`,
          }}
        />
        {baselinePercent !== null ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 z-0 h-3.5 w-px -translate-y-1/2 bg-ink-300"
            style={{ right: `${baselinePercent}%` }}
          />
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted">
        <span className="tnum">
          {min} {unit}
        </span>
        <span
          className={cn(
            "transition-colors",
            changed ? "font-medium text-brand-700" : "text-text-muted"
          )}
        >
          {changed
            ? `تم التغيير من ${baseline}`
            : hint ?? "الوضع الحالي لمنزلك"}
        </span>
        <span className="tnum">
          {max} {unit}
        </span>
      </div>
    </div>
  );
}
