"use client";

import {
  ArrowLeft,
  Droplets,
  Zap,
  ScanLine,
  SlidersHorizontal,
  ListChecks,
  BarChart3,
} from "lucide-react";
import { Button, Chip, EstimateNote } from "@/components/ui/Primitives";
import { Wordmark } from "@/components/layout/Logo";
import { formatSar, formatNumber, units } from "@/lib/formatting";
import { currentScenario, planScenario } from "@/lib/simulation";
import { electricityBill, waterBill } from "@/data/mock-bill";
import { household } from "@/data/mock-household";

const PILLARS = [
  {
    icon: Zap,
    title: "الكهرباء",
    body: "توزيع تقديري يوضح أين تذهب كل ريال من فاتورتك.",
  },
  {
    icon: Droplets,
    title: "المياه",
    body: "متابعة الاستهلاك الشهري ورصد الارتفاع غير المعتاد.",
  },
  {
    icon: ListChecks,
    title: "خطة ترشيد",
    body: "خطوات عملية مرتبة حسب أثرها على فاتورتك بالريال.",
  },
  {
    icon: SlidersHorizontal,
    title: "محاكاة «ماذا لو؟»",
    body: "غيّر عاداتك وشاهد أثرها على الفاتورة قبل أن تطبّقها.",
  },
];

const STEPS = [
  { icon: ScanLine, title: "ارفع فاتورتك", body: "كهرباء أو مياه، صورة أو PDF." },
  { icon: BarChart3, title: "افهم استهلاكك", body: "توزيع تقديري مربوط بطقس مدينتك." },
  { icon: ListChecks, title: "استلم خطتك", body: "توصيات مرتبة بقيمتها بالريال." },
  { icon: SlidersHorizontal, title: "جرّب قبل أن تقرر", body: "حرّك الإعدادات وشاهد الفاتورة تتغير." },
];

export function Landing({
  onStart,
  onDemo,
}: {
  onStart: () => void;
  onDemo: () => void;
}) {
  const saving = currentScenario.billSar - planScenario.billSar;
  const savingPercent = (saving / currentScenario.billSar) * 100;

  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-ink-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Wordmark subtitle="مدربك الذكي لاستهلاك المنزل" />
          <Chip className="hidden sm:inline-flex">نموذج تجريبي</Chip>
        </div>
      </header>

      {/* ——— الواجهة الرئيسية ——— */}
      <section className="border-b border-ink-100 bg-brand-50/40">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="rs-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-800">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
              للمنازل السعودية
            </span>

            <h1 className="mt-6 text-5xl font-bold leading-[1.15] tracking-tight text-ink-900 sm:text-6xl">
              رشيد
            </h1>
            <p className="mt-3 text-xl font-medium text-brand-800 sm:text-2xl">
              مدربك الذكي لاستهلاك المنزل
            </p>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-600 sm:text-lg">
              افهم استهلاك منزلك، اكتشف أين تذهب فاتورتك، وشاهد كم يمكنك توفيره
              قبل أن تغيّر أي شيء.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={onStart}>
                حلّل فاتورتك
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="secondary" onClick={onDemo}>
                جرّب نموذجًا تجريبيًا
              </Button>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-8 gap-y-3 border-t border-ink-200/70 pt-6 text-sm">
              <div>
                <span className="tnum text-lg font-semibold text-ink-900">
                  {formatNumber(electricityBill.consumptionKwh)}
                </span>{" "}
                <span className="text-ink-500">{units.kwh} تُحلَّل</span>
              </div>
              <div>
                <span className="tnum text-lg font-semibold text-ink-900">
                  {formatNumber(waterBill.consumptionM3)}
                </span>{" "}
                <span className="text-ink-500">{units.m3} مياه</span>
              </div>
              <div>
                <span className="tnum text-lg font-semibold text-brand-700">
                  {formatSar(saving)}
                </span>{" "}
                <span className="text-ink-500">{units.sar} توفير محتمل</span>
              </div>
            </div>
          </div>

          {/* بطاقة "من الفاتورة إلى التوفير" */}
          <div className="rs-rise [animation-delay:120ms]">
            <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-[0_1px_2px_rgb(19_24_22/0.04),0_12px_32px_-12px_rgb(19_24_22/0.12)] sm:p-8">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-500">
                  فاتورة {household.city} · {household.houseType}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-800">
                  <Zap className="h-3 w-3" />
                  كهرباء
                </span>
              </div>

              <div className="mt-6">
                <p className="text-sm text-ink-500">فاتورتك الحالية</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="tnum text-5xl font-bold tracking-tight text-ink-900">
                    {formatSar(currentScenario.billSar)}
                  </span>
                  <span className="text-lg text-ink-500">{units.sar}</span>
                </p>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink-100">
                  <div className="rs-grow h-full rounded-full bg-ink-300" />
                </div>
              </div>

              <div className="mt-6 border-t border-dashed border-ink-200 pt-6">
                <p className="text-sm text-ink-500">مع خطة رشيد</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="tnum text-5xl font-bold tracking-tight text-brand-700">
                    {formatSar(planScenario.billSar)}
                  </span>
                  <span className="text-lg text-ink-500">{units.sar}</span>
                </p>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="rs-grow h-full rounded-full bg-brand-600 [animation-delay:220ms]"
                    style={{
                      width: `${
                        (planScenario.billSar / currentScenario.billSar) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between rounded-xl bg-brand-700 px-5 py-4 text-white">
                <span className="text-sm">توفير محتمل</span>
                <span className="flex items-baseline gap-1.5">
                  <span className="text-sm opacity-80">≈</span>
                  <span className="tnum text-2xl font-bold">
                    {formatSar(saving)}
                  </span>
                  <span className="text-sm opacity-80">
                    {units.sar} · {Math.round(savingPercent)}٪
                  </span>
                </span>
              </div>

              <EstimateNote className="mt-4">
                أرقام تقديرية لمنزل نموذجي في {household.city} ({household.residents}{" "}
                أفراد، {household.acUnits} مكيفات) — لأغراض العرض.
              </EstimateNote>
            </div>
          </div>
        </div>
      </section>

      {/* ——— الركائز ——— */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-ink-200 bg-ink-200 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-white p-6">
              <Icon className="h-5 w-5 text-brand-700" strokeWidth={1.75} />
              <h3 className="mt-4 text-base font-semibold text-ink-900">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ——— كيف يعمل ——— */}
      <section className="border-t border-ink-100 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-900">
            كيف يعمل رشيد؟
          </h2>
          <p className="mt-2 max-w-2xl text-ink-500">
            أربع خطوات من الفاتورة إلى قرار واضح — دون أن تغيّر شيئًا في منزلك
            قبل أن ترى أثره.
          </p>

          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="border-t-2 border-brand-600 pt-5">
                <div className="flex items-center gap-3">
                  <span className="tnum text-sm font-semibold text-brand-700">
                    0{index + 1}
                  </span>
                  <Icon className="h-4 w-4 text-ink-400" strokeWidth={1.75} />
                </div>
                <h3 className="mt-3 font-semibold text-ink-900">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">
                  {body}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-12">
            <Button size="lg" onClick={onStart}>
              ابدأ الآن
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-100">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <EstimateNote>
            رشيد نموذج أولي (Experience Prototype). جميع الأرقام والتحليلات
            تقديرية وتعتمد على بيانات تجريبية، وليست قراءة فعلية من عدّاد ذكي أو
            جهة فوترة رسمية.
          </EstimateNote>
        </div>
      </footer>
    </div>
  );
}
