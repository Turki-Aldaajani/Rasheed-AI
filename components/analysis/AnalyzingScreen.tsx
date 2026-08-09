"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { analysisSteps } from "@/data/mock-analysis";
import { LogoMark } from "@/components/layout/Logo";
import { cn } from "@/lib/formatting";

const STEP_MS = 780;

export function AnalyzingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= analysisSteps.length) {
      const timeout = setTimeout(onDone, 420);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(timeout);
  }, [step, onDone]);

  const progress = Math.min(step / analysisSteps.length, 1);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-white px-5 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <svg
              viewBox="0 0 80 80"
              className="absolute inset-0 -rotate-90"
              aria-hidden
            >
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="var(--color-ink-100)"
                strokeWidth="4"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="var(--color-brand-600)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 36}
                strokeDashoffset={(1 - progress) * 2 * Math.PI * 36}
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <LogoMark className="h-8 w-8 text-brand-700" />
          </div>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink-900">
            جاري تحليل فاتورتك...
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            نقرأ بيانات الفاتورة ونربطها بطقس مدينتك لإعداد خطة مناسبة لمنزلك.
          </p>
        </div>

        <ol className="mt-10 space-y-1" aria-live="polite">
          {analysisSteps.map((label, index) => {
            const done = index < step;
            const active = index === step;
            return (
              <li
                key={label}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-300",
                  active && "bg-brand-50"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                    done && "border-brand-600 bg-brand-600 text-white",
                    active && "border-brand-500 text-brand-700",
                    !done && !active && "border-ink-200 text-ink-300"
                  )}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : active ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm transition-colors duration-300",
                    done && "text-ink-700",
                    active && "font-medium text-ink-900",
                    !done && !active && "text-ink-400"
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
