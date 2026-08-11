"use client";

import { useId } from "react";
import type { ConsumptionCategory } from "@/data/mock-analysis";
import { formatNumber } from "@/lib/formatting";

/** تدرّج أحادي اللون — يبقي المخطط ضمن لون العلامة الواحد */
export const TONE_COLORS = [
  "#17513b",
  "#357f5f",
  "#5b9c7e",
  "#8dbda5",
  "#dcebe3",
];

const SIZE = 232;
const RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 1.4; // فجوة بصرية بين الشرائح (بالنسبة المئوية)

export function DonutChart({
  categories,
  activeId,
  onSelect,
}: {
  categories: ConsumptionCategory[];
  activeId: string;
  onSelect: (id: ConsumptionCategory["id"]) => void;
}) {
  const titleId = useId();
  const active = categories.find((c) => c.id === activeId) ?? categories[0];

  let cumulative = 0;
  const segments = categories.map((category) => {
    const offset = cumulative;
    cumulative += category.share;
    return { category, offset };
  });

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-labelledby={titleId}
        className="-rotate-90"
      >
        <title id={titleId}>التوزيع التقديري لاستهلاك المنزل</title>
        {segments.map(({ category, offset }) => {
          const isActive = category.id === active.id;
          const length = Math.max(
            (category.share / 100) * CIRCUMFERENCE - GAP,
            2
          );
          return (
            <circle
              key={category.id}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={TONE_COLORS[category.tone]}
              strokeWidth={isActive ? 30 : 22}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={-(offset / 100) * CIRCUMFERENCE}
              strokeLinecap="butt"
              className="cursor-pointer transition-[stroke-width,opacity] duration-200 focus:outline-none"
              opacity={isActive ? 1 : 0.82}
              tabIndex={0}
              role="button"
              aria-label={`${category.label} ${category.share} بالمئة`}
              onMouseEnter={() => onSelect(category.id)}
              onFocus={() => onSelect(category.id)}
              onClick={() => onSelect(category.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(category.id);
                }
              }}
            />
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          key={active.id}
          className="rs-fade tnum text-4xl font-semibold text-text-main"
        >
          {formatNumber(active.share)}
          <span className="text-xl text-text-muted">٪</span>
        </span>
        <span
          key={`${active.id}-label`}
          className="rs-fade mt-1 max-w-[120px] text-xs leading-snug text-text-muted"
        >
          {active.label}
        </span>
      </div>
    </div>
  );
}
