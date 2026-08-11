"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { analysisSteps } from "@/data/mock-analysis";
import { LogoMark } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Primitives";
import { cn } from "@/lib/formatting";
import { extractInvoiceFromFile } from "@/lib/invoice-extraction-client";
import type { ExtractedInvoice } from "@/types/extracted-invoice";

const STEP_MS = 780;

export type AnalysisOutcome =
  | { mode: "demo" }
  | { mode: "extracted"; data: ExtractedInvoice }
  | { mode: "error"; error: string; retryable: boolean };

export function AnalyzingScreen({
  file,
  demo,
  onDone,
  onRetry,
  onBack,
}: {
  file: File | null;
  demo: boolean;
  onDone: (outcome: AnalysisOutcome) => void;
  onRetry: () => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [extractionDone, setExtractionDone] = useState(demo);
  const [extractedData, setExtractedData] = useState<ExtractedInvoice | null>(
    null,
  );
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    setExtractedData(null);
    setExtractionDone(demo);
    setStep(0);
    setError(null);
    setRetryable(false);
  }, [file, demo]);

  useEffect(() => {
    if (demo || !file) return;

    const controller = new AbortController();

    extractInvoiceFromFile(file, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) {
        setExtractedData(result.data);
        setExtractionDone(true);
        return;
      }
      setError(result.error);
      setRetryable(result.retryable ?? false);
    });

    return () => controller.abort();
  }, [demo, file]);

  useEffect(() => {
    if (error) return;

    const animationDone = step >= analysisSteps.length;

    if (!animationDone) {
      const timeout = setTimeout(() => setStep((s) => s + 1), STEP_MS);
      return () => clearTimeout(timeout);
    }

    if (!extractionDone) return;

    const timeout = setTimeout(() => {
      if (doneRef.current) return;
      doneRef.current = true;

      if (demo) {
        onDone({ mode: "demo" });
        return;
      }

      if (extractedData) {
        onDone({ mode: "extracted", data: extractedData });
        return;
      }

      setError("تعذّر قراءة الفاتورة. حاول مرة أخرى أو استخدم الفاتورة التجريبية.");
      setRetryable(true);
    }, 420);

    return () => clearTimeout(timeout);
  }, [step, onDone, demo, error, extractionDone, extractedData]);

  const progress = Math.min(step / analysisSteps.length, 1);

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg-main px-5 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-alert-soft">
            <AlertCircle className="h-8 w-8 text-alert" strokeWidth={1.75} />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-text-main">
            تعذّر تحليل الفاتورة
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">{error}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {retryable ? (
              <Button size="lg" onClick={onRetry}>
                إعادة المحاولة
              </Button>
            ) : null}
            <Button size="lg" variant="secondary" onClick={onBack}>
              العودة للرفع
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-main px-5 py-12">
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

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-text-main">
            جاري تحليل فاتورتك...
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {demo
              ? "نعرض تجربة كاملة ببيانات منزل تجريبية."
              : "نقرأ بيانات الفاتورة عبر Gemini Vision ونربطها بخطة ترشيد مناسبة."}
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
                    !done && !active && "border-border text-ink-300"
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
                    active && "font-medium text-text-main",
                    !done && !active && "text-text-muted"
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
