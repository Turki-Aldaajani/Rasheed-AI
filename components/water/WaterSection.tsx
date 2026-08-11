"use client";

import { ArrowUpRight, Droplet, Gauge, ShowerHead, TrendingDown } from "lucide-react";
import { Card, SectionTitle, EstimateNote, Chip } from "@/components/ui/Primitives";
import { useBillData } from "@/components/BillDataProvider";
import { waterHistory } from "@/data/mock-bill";
import { waterOpportunities } from "@/data/mock-analysis";
import { household } from "@/data/mock-household";
import {
  changePercent,
  formatNumber,
  formatSar,
  formatPercent,
  units,
} from "@/lib/formatting";

const ICONS = [ShowerHead, Gauge, TrendingDown];

export function WaterSection() {
  const { waterBill } = useBillData();
  const m3Change = changePercent(
    waterBill.consumptionM3,
    waterBill.previousConsumptionM3
  );
  const maxHistory = Math.max(...waterHistory.map((h) => h.m3));
  const totalOpportunity = waterOpportunities.reduce(
    (sum, item) => sum + item.estimateSar,
    0
  );
  const perPerson = waterBill.consumptionM3 / household.residents;

  return (
    <div className="space-y-8">
      <section className="rs-rise">
        <SectionTitle
          title="استهلاك المياه"
          hint={`فاتورة ${waterBill.periodLabel} — ${household.city}`}
        />

        <Card className="overflow-hidden">
          <div className="grid gap-px bg-ink-200 lg:grid-cols-[1fr_1fr]">
            <div className="bg-bg-main p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-text-muted">
                    الاستهلاك هذا الشهر
                  </p>
                  <p className="mt-3 flex items-baseline gap-2.5">
                    <span className="tnum text-6xl font-bold leading-none tracking-tight text-text-main">
                      {formatNumber(waterBill.consumptionM3)}
                    </span>
                    <span className="text-xl text-text-muted">{units.m3}</span>
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                  <Droplet
                    className="h-5 w-5 text-brand-700"
                    strokeWidth={1.75}
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <p className="flex items-baseline gap-2">
                  <span className="text-sm text-text-muted">الفاتورة</span>
                  <span className="tnum text-2xl font-semibold text-text-main">
                    {formatSar(waterBill.amountSar)}
                  </span>
                  <span className="text-sm text-text-muted">{units.sar}</span>
                </p>
                <span className="inline-flex items-center gap-1 rounded-lg bg-alert-soft px-2.5 py-1 text-sm font-semibold text-alert">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span className="tnum">{formatPercent(m3Change)}٪</span>
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Chip>
                  {formatNumber(perPerson, 1)} {units.m3} للفرد
                </Chip>
                <Chip>{household.residents} أفراد</Chip>
                <Chip>
                  الشهر السابق: {formatNumber(waterBill.previousConsumptionM3)}{" "}
                  {units.m3}
                </Chip>
              </div>
            </div>

            <div className="bg-bg-main p-6 sm:p-8">
              <p className="text-xs font-medium text-text-muted">
                الاستهلاك خلال 6 أشهر ({units.m3})
              </p>
              <div className="mt-4 flex items-end justify-between gap-2">
                {waterHistory.map((item, index) => {
                  const isLast = index === waterHistory.length - 1;
                  return (
                    <div
                      key={item.month}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <span className="tnum text-[10px] text-text-muted">
                        {item.m3}
                      </span>
                      <div
                        className={
                          isLast
                            ? "w-full rounded-t bg-brand-600"
                            : "w-full rounded-t bg-ink-200"
                        }
                        style={{ height: (item.m3 / maxHistory) * 96 }}
                      />
                      <span className="text-[10px] text-text-muted">
                        {item.month.slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-xl bg-brand-50 p-4">
                <p className="text-sm leading-relaxed text-brand-900">
                  <span className="font-semibold">ملاحظة: </span>
                  ارتفاع الاستهلاك{" "}
                  <span className="tnum">{formatPercent(m3Change)}٪</span> عن
                  الشهر السابق قد يعود إلى زيادة الري أو تسريب بسيط — يُنصح
                  بمراجعة العدّاد عند إغلاق جميع المصادر.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* فرص ترشيد المياه */}
      <section className="rs-rise [animation-delay:100ms]">
        <SectionTitle
          title="فرص ترشيد المياه"
          hint={`مجموع تقديري ≈ ${formatSar(totalOpportunity)} ${units.sar} شهريًا`}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          {waterOpportunities.map((opportunity, index) => {
            const Icon = ICONS[index] ?? Droplet;
            return (
              <Card key={opportunity.title} className="flex flex-col p-5">
                <Icon
                  className="h-5 w-5 text-brand-700"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <h3 className="mt-4 font-semibold text-text-main">
                  {opportunity.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted">
                  {opportunity.description}
                </p>
                <p className="mt-4 flex items-baseline gap-1.5 border-t border-ink-100 pt-4">
                  <span className="text-xs text-text-muted">توفير محتمل</span>
                  <span className="text-text-muted">≈</span>
                  <span className="tnum text-xl font-bold text-brand-700">
                    {formatSar(opportunity.estimateSar)}
                  </span>
                  <span className="text-xs text-text-muted">{units.sar}</span>
                </p>
              </Card>
            );
          })}
        </div>

        <EstimateNote className="mt-5">
          محاكاة المياه التفصيلية خارج نطاق هذا النموذج الأولي — الأرقام أعلاه
          تقديرية لعرض تغطية رشيد للكهرباء والمياه معًا.
        </EstimateNote>
      </section>
    </div>
  );
}
