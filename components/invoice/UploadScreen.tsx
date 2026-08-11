"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button, EstimateNote } from "@/components/ui/Primitives";
import { Wordmark } from "@/components/layout/Logo";
import { cn } from "@/lib/formatting";
import { validateInvoiceFile } from "@/lib/invoice-extraction-client";

type Selected = {
  file: File;
  name: string;
  sizeLabel: string;
  previewUrl: string | null;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
}

export function UploadScreen({
  onAnalyze,
  onDemo,
  onBack,
}: {
  onAnalyze: (file: File) => void;
  onDemo: () => void;
  onBack: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const accept = useCallback((file: File) => {
    const validationError = validateInvoiceFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const previewUrl = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : null;
    previewRef.current = previewUrl;
    setError(null);
    setSelected({
      file,
      name: file.name,
      sizeLabel: formatSize(file.size),
      previewUrl,
    });
  }, []);

  const clear = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setSelected(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-ink-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Wordmark />
          <Button variant="ghost" onClick={onBack}>
            <ArrowRight className="h-4 w-4" />
            رجوع
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="rs-rise">
          <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            حلّل فاتورتك
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-600">
            ارفع فاتورة الكهرباء أو المياه وسيساعدك رشيد على فهم استهلاك منزلك.
          </p>
        </div>

        {!selected ? (
          <div
            className={cn(
              "rs-rise mt-8 rounded-2xl border-2 border-dashed p-10 text-center transition-colors sm:p-14",
              dragging
                ? "border-brand-500 bg-brand-50"
                : "border-ink-300 bg-ink-50/50 hover:border-ink-400"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) accept(file);
            }}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-200 bg-white">
              <UploadCloud
                className="h-6 w-6 text-brand-700"
                strokeWidth={1.75}
              />
            </div>
            <p className="mt-5 text-lg font-semibold text-ink-900">
              اسحب الفاتورة هنا
            </p>
            <p className="mt-1 text-sm text-ink-500">أو اختر ملفًا من جهازك</p>

            <Button
              variant="secondary"
              className="mt-6"
              onClick={() => inputRef.current?.click()}
            >
              اختيار ملف
            </Button>

            <p className="mt-6 text-xs tracking-wide text-ink-400">
              PDF / JPG / PNG · حتى 15 ميجابايت
            </p>

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) accept(file);
              }}
            />
          </div>
        ) : (
          <div className="rs-rise mt-8 overflow-hidden rounded-2xl border border-ink-200">
            <div className="flex items-center gap-4 border-b border-ink-100 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                <FileText className="h-5 w-5 text-brand-700" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink-900">
                  {selected.name}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {selected.sizeLabel} · جاهز للتحليل
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={clear}
                aria-label="إزالة الملف"
                className="shrink-0 px-3"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">إزالة</span>
              </Button>
            </div>

            <div className="flex items-center justify-center bg-ink-50 p-6">
              {selected.previewUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selected.previewUrl}
                  alt="معاينة الفاتورة"
                  className="max-h-72 w-auto rounded-lg border border-ink-200 bg-white object-contain shadow-sm"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <FileText className="h-9 w-9 text-ink-300" strokeWidth={1.5} />
                  <p className="text-sm text-ink-500">
                    ملف PDF — ستُقرأ بياناته أثناء التحليل
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-alert-soft px-4 py-3 text-sm text-alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            disabled={!selected}
            onClick={() => selected && onAnalyze(selected.file)}
          >
            حلّل الفاتورة
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="secondary" onClick={onDemo}>
            <Sparkles className="h-4 w-4" />
            استخدم فاتورة تجريبية
          </Button>
        </div>

        <EstimateNote className="mt-8">
          عند تحليل فاتورة حقيقية، تُرسَل الصورة إلى خادم رشيد لقراءتها عبر Gemini
          Vision ثم تُستخدم البيانات المستخرجة في لوحة النتائج. لا تُخزَّن
          الفاتورة بعد المعالجة في هذا الإصدار.
        </EstimateNote>
      </main>
    </div>
  );
}
