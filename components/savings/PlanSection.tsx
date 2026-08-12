"use client";

import { ArrowLeft, ArrowLeftRight, Lightbulb } from "lucide-react";
import { Card, SectionTitle, Button, EstimateNote } from "@/components/ui/Primitives";
import type { SectionId } from "@/components/layout/DashboardShell";
import { PlanRecommendation, calculateCombinedSavings } from "@/lib/operatingPlan";
import { currentScenario } from "@/lib/simulation";
import { formatSar, units } from "@/lib/formatting";

export function PlanSection({
  onApplyPlan,
  recs,
}: {
  onNavigate: (id: SectionId) => void;
  onApplyPlan: () => void;
  recs: PlanRecommendation[];
}) {
  const totalSaving = calculateCombinedSavings(recs);
  const maxSaving = Math.max(...recs.map((r) => r.estimatedSavingSar));

  return (
    <div className="space-y-8">
      <section className="rs-rise">
        <SectionTitle
          title="خطة التشغيل المخصصة"
          hint="خطوات تشغيلية مرتبة حسب أثرها مقارنة بالجهد المطلوب لتطبيقها."
        />

        <ol className="space-y-4">
          {recs.map((rec, index) => {
            const saving = rec.estimatedSavingSar;

            const impactLabel =
              rec.impact === 'high' ? 'أثر عالي' :
              rec.impact === 'medium' ? 'أثر متوسط' : 'أثر منخفض';

            const effortLabel =
              rec.effort === 'low' ? 'جهد منخفض' :
              rec.effort === 'medium' ? 'جهد متوسط' : 'جهد عالي';

            return (
              <li key={rec.id}>
                <Card className="overflow-hidden transition-colors hover:border-brand-300">
                  <div className="grid gap-px bg-ink-200 sm:grid-cols-[1fr_auto]">
                    <div className="bg-white p-6">
                      <div className="flex items-center gap-3">
                        <span className="tnum text-sm font-semibold text-brand-700">
                          0{index + 1}
                        </span>
                        <span className="h-px flex-1 bg-ink-100" />
                        <span className="text-xs font-medium text-ink-500 bg-ink-50 px-2 py-1 rounded-md">
                          {impactLabel} • {effortLabel}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-semibold text-ink-900">
                        {rec.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-600">
                        {rec.description}
                      </p>

                      {rec.from && rec.to && (
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                          <span className="inline-flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-1.5">
                            <span className="text-ink-500">{rec.from}</span>
                            <ArrowLeftRight
                              className="h-3.5 w-3.5 text-ink-400"
                              strokeWidth={2}
                            />
                            <span className="font-medium text-brand-800">
                              {rec.to}
                            </span>
                          </span>
                        </div>
                      )}

                      <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-ink-500">
                        <Lightbulb
                          className="mt-0.5 h-4 w-4 shrink-0 text-ink-400"
                          strokeWidth={1.75}
                        />
                        {rec.action}
                      </p>
                    </div>

                    <div className="flex flex-col justify-center bg-white p-6 sm:min-w-[210px]">
                      <p className="text-xs text-ink-500">توفير تقديري</p>
                      <p className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-ink-400">≈</span>
                        <span className="tnum text-4xl font-bold tracking-tight text-brand-700">
                          {formatSar(saving)}
                        </span>
                        <span className="text-sm text-ink-500">
                          {units.sar} / شهريًا
                        </span>
                      </p>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="rs-grow h-full rounded-full bg-brand-500"
                          style={{
                            width: `${maxSaving > 0 ? (saving / maxSaving) * 100 : 0}%`,
                            animationDelay: `${index * 120}ms`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      {/* الإجمالي */}
      {recs.length > 0 && totalSaving > 0 && (
        <section className="rs-rise [animation-delay:120ms]">
          <Card className="border-brand-200 bg-brand-700 p-6 text-white sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-sm text-brand-100">إجمالي التوفير التقديري المشترك</p>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl text-brand-200">≈</span>
                  <span className="tnum text-6xl font-bold tracking-tight">
                    {formatSar(totalSaving)}
                  </span>
                  <span className="text-lg text-brand-100">
                    {units.sar} / شهر
                  </span>
                </p>
                <p className="mt-3 text-sm text-brand-100">
                  فاتورتك قد تنخفض من{" "}
                  <span className="tnum font-semibold text-white">
                    {formatSar(currentScenario.billSar)}
                  </span>{" "}
                  إلى{" "}
                  <span className="tnum font-semibold text-white">
                    ≈ {formatSar(Math.max(0, currentScenario.billSar - totalSaving))}
                  </span>{" "}
                  {units.sar}
                </p>
              </div>

              <Button
                size="lg"
                variant="inverse"
                onClick={onApplyPlan}
              >
                طبّق خطة رشيد
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <EstimateNote className="mt-4">
            توضيح: أرقام التوفير التقديرية تُحسب من نموذج محاكاة محلي. إجمالي التوفير يحسب تتابعيًا لضمان عدم ازدواجية الخصم عند تطبيق خطوات تؤثر على نفس الاستهلاك.
          </EstimateNote>
        </section>
      )}
    </div>
  );
}
