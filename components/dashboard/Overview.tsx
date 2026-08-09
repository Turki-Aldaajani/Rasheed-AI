"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  Users,
  Building2,
  CalendarDays,
  MapPin,
  Thermometer,
  Wind,
  Droplets,
} from "lucide-react";
import { Card, Button, EstimateNote, Chip } from "@/components/ui/Primitives";
import type { SectionId } from "@/components/layout/DashboardShell";
import { electricityBill, electricityHistory, waterBill } from "@/data/mock-bill";
import { household, weather } from "@/data/mock-household";
import { consumptionBreakdown } from "@/data/mock-analysis";
import { currentScenario, planScenario } from "@/lib/simulation";
import {
  changePercent,
  formatNumber,
  formatSar,
  formatPercent,
  units,
} from "@/lib/formatting";

export function Overview({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const billChange = changePercent(
    electricityBill.amountSar,
    electricityBill.previousAmountSar
  );
  const kwhChange = changePercent(
    electricityBill.consumptionKwh,
    electricityBill.previousConsumptionKwh
  );
  const saving = currentScenario.billSar - planScenario.billSar;
  const savingPercent = (saving / currentScenario.billSar) * 100;
  const topCategory = consumptionBreakdown[0];
  const maxHistory = Math.max(...electricityHistory.map((h) => h.kwh));

  const context = [
    { icon: MapPin, value: household.city },
    { icon: Users, value: `${household.residents} أفراد` },
    { icon: Building2, value: household.houseType },
    { icon: CalendarDays, value: `${household.billingDays} يوم` },
  ];

  return (
    <div className="space-y-8">
      {/* ——— الفاتورة الحالية ——— */}
      <section className="rs-rise">
        <Card className="overflow-hidden">
          <div className="grid gap-px bg-ink-200 lg:grid-cols-[1.15fr_1fr]">
            <div className="bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink-500">
                  فاتورة الكهرباء الحالية
                </span>
                <span className="text-xs text-ink-400">
                  · {electricityBill.periodLabel}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
                <p className="flex items-baseline gap-2.5">
                  <span className="tnum text-6xl font-bold leading-none tracking-tight text-ink-900 sm:text-7xl">
                    {formatSar(electricityBill.amountSar)}
                  </span>
                  <span className="text-xl text-ink-500">{units.sar}</span>
                </p>
                <span className="inline-flex items-center gap-1 rounded-lg bg-alert-soft px-2.5 py-1.5 text-sm font-semibold text-alert">
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="tnum">{formatPercent(billChange)}٪</span>
                </span>
              </div>

              <p className="mt-3 flex items-baseline gap-2 text-lg text-ink-600">
                <span className="tnum font-semibold text-ink-800">
                  {formatNumber(electricityBill.consumptionKwh)}
                </span>
                <span className="text-sm text-ink-500">{units.kwh}</span>
                <span className="text-sm text-ink-400">
                  · مقارنة بالفترة السابقة
                </span>
              </p>

              {/* مقارنة بالفترة السابقة */}
              <div className="mt-7 space-y-3">
                <ComparisonBar
                  label="الفترة السابقة"
                  amount={electricityBill.previousAmountSar}
                  kwh={electricityBill.previousConsumptionKwh}
                  width={
                    (electricityBill.previousAmountSar /
                      electricityBill.amountSar) *
                    100
                  }
                  tone="muted"
                />
                <ComparisonBar
                  label="الفترة الحالية"
                  amount={electricityBill.amountSar}
                  kwh={electricityBill.consumptionKwh}
                  width={100}
                  tone="alert"
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {context.map(({ icon: Icon, value }) => (
                  <Chip key={value}>
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {value}
                  </Chip>
                ))}
              </div>
            </div>

            {/* الطقس + أكبر مصدر */}
            <div className="bg-white p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-ink-500">
                    الطقس في {household.city}
                  </p>
                  <p className="mt-2 flex items-baseline gap-1.5">
                    <span className="tnum text-4xl font-bold text-ink-900">
                      {formatNumber(weather.temperatureC)}
                    </span>
                    <span className="text-lg text-ink-500">
                      {units.celsiusShort}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-ink-500">
                    {weather.condition} · رطوبة {weather.humidity}٪
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                  <Thermometer
                    className="h-5 w-5 text-brand-700"
                    strokeWidth={1.75}
                  />
                </div>
              </div>

              <div className="mt-7 rounded-xl border border-ink-200 p-5">
                <p className="text-xs font-medium text-ink-500">
                  أكبر مصدر محتمل للاستهلاك
                </p>
                <div className="mt-2.5 flex items-center gap-3">
                  <Wind className="h-5 w-5 text-brand-700" strokeWidth={1.75} />
                  <span className="text-lg font-semibold text-ink-900">
                    {topCategory.label}
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="rs-grow h-full rounded-full bg-brand-600"
                    style={{ width: `${topCategory.share}%` }}
                  />
                </div>
                <p className="mt-2.5 text-sm text-ink-600">
                  <span className="tnum font-semibold text-ink-900">
                    {topCategory.share}٪
                  </span>{" "}
                  من الاستهلاك المقدّر — {household.acUnits} وحدات تكييف في جو{" "}
                  {weather.condition}.
                </p>
              </div>

              {/* الاتجاه خلال 6 أشهر */}
              <div className="mt-6">
                <p className="text-xs font-medium text-ink-500">
                  الاستهلاك خلال 6 أشهر ({units.kwh})
                </p>
                <div className="mt-3 flex items-end justify-between gap-1.5 sm:gap-2">
                  {electricityHistory.map((item, index) => {
                    const isLast = index === electricityHistory.length - 1;
                    return (
                      <div
                        key={item.month}
                        className="flex flex-1 flex-col items-center gap-2"
                      >
                        <div
                          className={
                            isLast
                              ? "w-full rounded-t bg-brand-600"
                              : "w-full rounded-t bg-ink-200"
                          }
                          style={{ height: (item.kwh / maxHistory) * 76 }}
                          title={`${item.month}: ${formatNumber(item.kwh)}`}
                        />
                        <span className="text-[10px] text-ink-400">
                          {item.month.slice(0, 3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* ——— فرصة التوفير ——— */}
      <section className="rs-rise [animation-delay:100ms]">
        <Card className="overflow-hidden border-brand-200">
          <div className="grid gap-px bg-brand-100 md:grid-cols-[1fr_auto]">
            <div className="bg-white p-6 sm:p-8">
              <h2 className="text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">
                فرصة التوفير
              </h2>
              <p className="mt-1.5 text-sm text-ink-500">
                هذا ما قد تصبح عليه فاتورتك إذا طبّقت خطة رشيد.
              </p>

              <div className="mt-7 space-y-4">
                <SavingRow
                  label="فاتورتك الحالية"
                  amount={currentScenario.billSar}
                  width={100}
                  tone="muted"
                />
                <SavingRow
                  label="الفاتورة المتوقعة مع خطة رشيد"
                  amount={planScenario.billSar}
                  width={(planScenario.billSar / currentScenario.billSar) * 100}
                  tone="brand"
                  approximate
                />
              </div>

              <EstimateNote className="mt-6">
                تقديرات مبنية على نموذج محاكاة محلي وبيانات تجريبية — القيم
                الفعلية قد تختلف حسب طبيعة الاستخدام.
              </EstimateNote>
            </div>

            <div className="flex flex-col justify-center bg-brand-700 p-6 text-white sm:p-8 md:min-w-[260px]">
              <p className="text-sm text-brand-100">التوفير المحتمل</p>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="text-xl text-brand-200">≈</span>
                <span className="tnum text-5xl font-bold tracking-tight">
                  {formatSar(saving)}
                </span>
              </p>
              <p className="mt-1 text-sm text-brand-100">
                {units.sar} / شهر · {Math.round(savingPercent)}٪ من فاتورتك
              </p>
              <Button
                variant="inverse"
                className="mt-6"
                onClick={() => onNavigate("whatIf")}
              >
                جرّب «ماذا لو؟»
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* ——— روابط سريعة ——— */}
      <section className="rs-rise grid gap-4 sm:grid-cols-3 [animation-delay:180ms]">
        <QuickCard
          title="أين يذهب استهلاكك؟"
          body={`${topCategory.share}٪ من فاتورتك قد تكون في ${topCategory.label}.`}
          cta="افتح التحليل"
          onClick={() => onNavigate("analysis")}
        />
        <QuickCard
          title="خطة رشيد"
          body={`3 خطوات عملية بقيمة ≈ ${formatSar(saving)} ${units.sar} شهريًا.`}
          cta="اعرض الخطة"
          onClick={() => onNavigate("plan")}
        />
        <QuickCard
          title="فاتورة المياه"
          body={`${formatNumber(waterBill.consumptionM3)} ${units.m3} بقيمة ${formatSar(
            waterBill.amountSar
          )} ${units.sar} هذا الشهر.`}
          cta="اعرض المياه"
          icon={<Droplets className="h-4 w-4" strokeWidth={1.75} />}
          onClick={() => onNavigate("water")}
        />
      </section>
    </div>
  );
}

function ComparisonBar({
  label,
  amount,
  kwh,
  width,
  tone,
}: {
  label: string;
  amount: number;
  kwh: number;
  width: number;
  tone: "muted" | "alert";
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-ink-500">{label}</span>
        <span className="text-ink-700">
          <span className="tnum font-semibold">{formatSar(amount)}</span>{" "}
          <span className="text-xs text-ink-400">
            {units.sar} · {formatNumber(kwh)} {units.kwh}
          </span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
        <div
          className={
            tone === "alert"
              ? "rs-grow h-full rounded-full bg-alert"
              : "rs-grow h-full rounded-full bg-ink-300"
          }
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function SavingRow({
  label,
  amount,
  width,
  tone,
  approximate,
}: {
  label: string;
  amount: number;
  width: number;
  tone: "muted" | "brand";
  approximate?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm text-ink-600">{label}</span>
        <span className="flex items-baseline gap-1.5">
          {approximate ? <span className="text-ink-400">≈</span> : null}
          <span
            className={
              tone === "brand"
                ? "tnum text-3xl font-bold text-brand-700"
                : "tnum text-3xl font-bold text-ink-900"
            }
          >
            {formatSar(amount)}
          </span>
          <span className="text-sm text-ink-500">{units.sar}</span>
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-ink-100">
        <div
          className={
            tone === "brand"
              ? "rs-grow h-full rounded-full bg-brand-600 [animation-delay:200ms]"
              : "rs-grow h-full rounded-full bg-ink-300"
          }
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function QuickCard({
  title,
  body,
  cta,
  icon,
  onClick,
}: {
  title: string;
  body: string;
  cta: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-5 text-right transition-colors hover:border-brand-300 hover:bg-brand-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      <span className="flex items-center gap-2 font-semibold text-ink-900">
        {icon ? <span className="text-brand-700">{icon}</span> : null}
        {title}
      </span>
      <span className="mt-2 flex-1 text-sm leading-relaxed text-ink-500">
        {body}
      </span>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700">
        {cta}
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
      </span>
    </button>
  );
}
