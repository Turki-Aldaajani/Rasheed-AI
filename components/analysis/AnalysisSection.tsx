"use client";

import { useState } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { Card, SectionTitle, Button, EstimateNote } from "@/components/ui/Primitives";
import { DonutChart, TONE_COLORS } from "@/components/analysis/DonutChart";
import type { SectionId } from "@/components/layout/DashboardShell";
import { consumptionBreakdown } from "@/data/mock-analysis";
import type { ConsumptionCategory } from "@/data/mock-analysis";
import { electricityBill } from "@/data/mock-bill";
import { household, weather } from "@/data/mock-household";
import { formatNumber, formatSar, units, cn } from "@/lib/formatting";
import { energyCostSar } from "@/lib/simulation";

export function AnalysisSection({
  onNavigate,
}: {
  onNavigate: (id: SectionId) => void;
}) {
  const [activeId, setActiveId] =
    useState<ConsumptionCategory["id"]>("cooling");
  const active =
    consumptionBreakdown.find((c) => c.id === activeId) ??
    consumptionBreakdown[0];

  const categoryKwh = (share: number) =>
    (electricityBill.consumptionKwh * share) / 100;

  return (
    <div className="space-y-8">
      <section className="rs-rise">
        <SectionTitle
          title="أين يذهب استهلاك منزلك؟"
          hint="اختر أي بند لمعرفة العوامل المؤثرة فيه."
        />

        <Card className="overflow-hidden">
          <div className="grid gap-px bg-ink-200 lg:grid-cols-[auto_1fr]">
            {/* المخطط + القائمة */}
            <div className="bg-white p-6 sm:p-8 lg:min-w-[420px]">
              <DonutChart
                categories={consumptionBreakdown}
                activeId={activeId}
                onSelect={setActiveId}
              />

              <ul className="mt-8 space-y-1">
                {consumptionBreakdown.map((category) => {
                  const isActive = category.id === activeId;
                  return (
                    <li key={category.id}>
                      <button
                        onClick={() => setActiveId(category.id)}
                        onMouseEnter={() => setActiveId(category.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right transition-colors",
                          isActive ? "bg-ink-50" : "hover:bg-ink-50/60"
                        )}
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-sm"
                          style={{
                            backgroundColor: TONE_COLORS[category.tone],
                          }}
                          aria-hidden
                        />
                        <span
                          className={cn(
                            "flex-1 text-sm",
                            isActive
                              ? "font-semibold text-ink-900"
                              : "text-ink-600"
                          )}
                        >
                          {category.label}
                        </span>
                        <span className="tnum text-xs text-ink-400">
                          {formatNumber(categoryKwh(category.share))}{" "}
                          {units.kwh}
                        </span>
                        <span className="tnum w-11 text-left text-sm font-semibold text-ink-900">
                          {category.share}٪
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* تفاصيل البند المختار */}
            <div key={active.id} className="rs-fade bg-white p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <span
                  className="mt-1.5 h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: TONE_COLORS[active.tone] }}
                  aria-hidden
                />
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight text-ink-900">
                    {active.label}
                  </h3>
                  <p className="mt-1 text-sm text-ink-500">{active.headline}</p>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Metric
                  label="من الاستهلاك المقدّر"
                  value={`${active.share}٪`}
                />
                <Metric
                  label={`الاستهلاك (${units.kwh})`}
                  value={formatNumber(categoryKwh(active.share))}
                />
                <Metric
                  label={`القيمة التقديرية (${units.sar})`}
                  value={`≈ ${formatSar(
                    energyCostSar(categoryKwh(active.share))
                  )}`}
                />
              </div>

              <dl className="mt-7 divide-y divide-ink-100 border-y border-ink-100">
                {active.facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="flex items-baseline justify-between gap-4 py-3"
                  >
                    <dt className="text-sm text-ink-500">{fact.label}</dt>
                    <dd className="text-sm font-medium text-ink-900">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 flex items-start gap-3 rounded-xl bg-brand-50 p-4">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
                  strokeWidth={2}
                />
                <p className="text-sm leading-relaxed text-brand-900">
                  <span className="font-semibold">ملاحظة: </span>
                  {active.note}
                </p>
              </div>

              {active.id === "cooling" ? (
                <Button className="mt-6" onClick={() => onNavigate("whatIf")}>
                  جرّب تغيير إعدادات التكييف
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </Card>

        <EstimateNote className="mt-4">
          هذه النسب <span className="font-medium text-ink-500">تقديرية</span>{" "}
          ومبنية على بيانات المنزل ({household.residents} أفراد،{" "}
          {household.acUnits} مكيفات، {household.houseType}) ودرجة حرارة{" "}
          {household.city} ({weather.temperatureC}
          {units.celsiusShort}) — وليست قراءة فعلية لمستوى الأجهزة من عدّاد
          ذكي.
        </EstimateNote>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-200 p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="tnum mt-1.5 text-2xl font-semibold text-ink-900">{value}</p>
    </div>
  );
}
