"use client";

import { useMemo } from "react";
import { Check, RotateCcw, Snowflake, Timer, Flame } from "lucide-react";
import { Card, SectionTitle, Button, EstimateNote } from "@/components/ui/Primitives";
import { Slider } from "@/components/ui/Slider";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import {
  lightSettings,
  recommendedSettings,
  simulationDefaults,
  simulationRanges,
} from "@/data/mock-analysis";
import {
  simulate,
  currentScenario,
  planScenario,
  type SimulationInput,
} from "@/lib/simulation";
import { formatSar, formatNumber, units, cn } from "@/lib/formatting";

export function WhatIfSection({
  settings,
  onChange,
  onReset,
  onApplyPlan,
}: {
  settings: SimulationInput;
  onChange: (settings: SimulationInput) => void;
  onReset: () => void;
  onApplyPlan: () => void;
}) {
  const scenario = useMemo(() => simulate(settings), [settings]);
  const lightScenario = useMemo(() => simulate(lightSettings), []);

  const isPlan =
    settings.acHours === recommendedSettings.acHours &&
    settings.acTemp === recommendedSettings.acTemp &&
    settings.heaterHours === recommendedSettings.heaterHours;
  const isBaseline =
    settings.acHours === simulationDefaults.acHours &&
    settings.acTemp === simulationDefaults.acTemp &&
    settings.heaterHours === simulationDefaults.heaterHours;

  const saving = scenario.savingSar;
  const isSaving = saving > 0.5;
  const isCosting = saving < -0.5;

  const set = (key: keyof SimulationInput) => (value: number) =>
    onChange({ ...settings, [key]: value });

  /* أقصى قيمة في المقارنة — لتحجيم الأعمدة */
  const comparisonMax = Math.max(
    currentScenario.billSar,
    lightScenario.billSar,
    planScenario.billSar,
    scenario.billSar
  );

  return (
    <div className="space-y-8">
      <section className="rs-rise">
        <SectionTitle
          title="ماذا لو؟"
          hint="غيّر عادات الاستخدام وشاهد كيف قد تتغير فاتورتك."
          action={
            <Button variant="ghost" onClick={onReset} disabled={isBaseline}>
              <RotateCcw className="h-4 w-4" />
              إعادة للوضع الحالي
            </Button>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
          {/* ——— أدوات التحكم ——— */}
          <Card className="p-6 sm:p-7">
            <h3 className="text-sm font-semibold text-ink-700">
              عادات الاستخدام
            </h3>
            <div className="mt-5 space-y-7">
              <Slider
                label="ساعات تشغيل المكيفات"
                icon={<Timer className="h-4 w-4" strokeWidth={1.75} />}
                value={settings.acHours}
                baseline={simulationDefaults.acHours}
                min={simulationRanges.acHours.min}
                max={simulationRanges.acHours.max}
                step={simulationRanges.acHours.step}
                unit={simulationRanges.acHours.unit}
                onChange={set("acHours")}
              />
              <Slider
                label="درجة حرارة المكيف"
                icon={<Snowflake className="h-4 w-4" strokeWidth={1.75} />}
                value={settings.acTemp}
                baseline={simulationDefaults.acTemp}
                min={simulationRanges.acTemp.min}
                max={simulationRanges.acTemp.max}
                step={simulationRanges.acTemp.step}
                unit={simulationRanges.acTemp.unit}
                onChange={set("acTemp")}
              />
              <Slider
                label="ساعات تشغيل سخان المياه"
                icon={<Flame className="h-4 w-4" strokeWidth={1.75} />}
                value={settings.heaterHours}
                baseline={simulationDefaults.heaterHours}
                min={simulationRanges.heaterHours.min}
                max={simulationRanges.heaterHours.max}
                step={simulationRanges.heaterHours.step}
                unit={simulationRanges.heaterHours.unit}
                onChange={set("heaterHours")}
              />
            </div>

            <div className="mt-7 border-t border-ink-100 pt-5">
              <Button
                className="w-full"
                onClick={onApplyPlan}
                disabled={isPlan}
              >
                {isPlan ? (
                  <>
                    <Check className="h-4 w-4" />
                    خطة رشيد مطبَّقة
                  </>
                ) : (
                  "طبّق خطة رشيد"
                )}
              </Button>
              <p className="mt-2.5 text-center text-xs text-text-muted">
                يضبط الإعدادات الثلاثة على القيم الموصى بها.
              </p>
            </div>
          </Card>

          {/* ——— النتيجة الحيّة ——— */}
          <div className="space-y-6">
            <Card
              className={cn(
                "overflow-hidden transition-colors",
                isSaving && "border-brand-300",
                isCosting && "border-alert/30"
              )}
            >
              <div className="p-6 sm:p-7">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm text-text-muted">
                    فاتورتك الحالية
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="tnum text-2xl font-semibold text-text-muted line-through decoration-ink-300">
                      {formatSar(currentScenario.billSar)}
                    </span>
                    <span className="text-xs text-text-muted">{units.sar}</span>
                  </span>
                </div>

                <div className="mt-5 border-t border-dashed border-border pt-5">
                  <p className="text-sm font-medium text-text-secondary">
                    الفاتورة المتوقعة في هذا السيناريو
                  </p>
                  <p className="mt-2 flex items-baseline gap-2.5">
                    <span className="text-2xl text-text-muted">≈</span>
                    <AnimatedNumber
                      value={scenario.billSar}
                      className={cn(
                        "tnum text-6xl font-bold leading-none tracking-tight transition-colors sm:text-7xl",
                        isSaving && "text-brand-700",
                        isCosting && "text-alert",
                        !isSaving && !isCosting && "text-text-main"
                      )}
                    />
                    <span className="text-xl text-text-muted">{units.sar}</span>
                  </p>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width,background-color] duration-500 ease-out",
                        isCosting ? "bg-alert" : "bg-brand-600"
                      )}
                      style={{
                        width: `${Math.min(
                          (scenario.billSar / comparisonMax) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div
                    className={cn(
                      "rounded-xl p-4 transition-colors",
                      isCosting ? "bg-alert-soft" : "bg-brand-50"
                    )}
                  >
                    <p
                      className={cn(
                        "text-xs",
                        isCosting ? "text-alert" : "text-brand-800"
                      )}
                    >
                      {isCosting ? "زيادة محتملة" : "توفير محتمل"}
                    </p>
                    <p className="mt-1 flex items-baseline gap-1">
                      <AnimatedNumber
                        value={Math.abs(saving)}
                        className={cn(
                          "tnum text-3xl font-bold",
                          isCosting ? "text-alert" : "text-brand-700"
                        )}
                      />
                      <span className="text-xs text-text-muted">
                        {units.sar}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-bg-muted p-4">
                    <p className="text-xs text-text-muted">الاستهلاك المتوقع</p>
                    <p className="mt-1 flex items-baseline gap-1">
                      <AnimatedNumber
                        value={scenario.totalKwh}
                        className="tnum text-3xl font-bold text-text-main"
                      />
                      <span className="text-xs text-text-muted">
                        {units.kwh}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* شريط الحالة */}
              <div
                className={cn(
                  "border-t px-6 py-4 text-sm transition-colors sm:px-7",
                  isSaving && "border-brand-100 bg-brand-50/60 text-brand-900",
                  isCosting && "border-alert/15 bg-alert-soft text-alert",
                  !isSaving &&
                    !isCosting &&
                    "border-ink-100 bg-bg-muted/60 text-text-muted"
                )}
              >
                {isSaving ? (
                  <>
                    قد توفّر{" "}
                    <span className="tnum font-semibold">
                      {formatSar(saving)} {units.sar}
                    </span>{" "}
                    شهريًا — أي ≈{" "}
                    <span className="tnum font-semibold">
                      {formatSar(saving * 12)} {units.sar}
                    </span>{" "}
                    سنويًا.
                  </>
                ) : isCosting ? (
                  <>
                    هذا السيناريو قد يرفع فاتورتك{" "}
                    <span className="tnum font-semibold">
                      {formatSar(Math.abs(saving))} {units.sar}
                    </span>{" "}
                    شهريًا.
                  </>
                ) : (
                  "حرّك أي مؤشر أعلاه لترى أثر التغيير على فاتورتك فورًا."
                )}
              </div>
            </Card>

            {/* توزيع السيناريو الحالي */}
            <Card className="p-6 sm:p-7">
              <h3 className="text-sm font-semibold text-ink-700">
                توزيع الاستهلاك في هذا السيناريو
              </h3>
              <div className="mt-5 space-y-4">
                <BreakdownRow
                  label="التبريد والتكييف"
                  kwh={scenario.coolingKwh}
                  total={scenario.totalKwh}
                  tone="brand-700"
                />
                <BreakdownRow
                  label="تسخين المياه"
                  kwh={scenario.waterHeatingKwh}
                  total={scenario.totalKwh}
                  tone="brand-500"
                />
                <BreakdownRow
                  label="الأجهزة الأخرى (ثابتة)"
                  kwh={scenario.baseloadKwh}
                  total={scenario.totalKwh}
                  tone="brand-300"
                />
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ——— مقارنة السيناريوهات ——— */}
      <section className="rs-rise [animation-delay:120ms]">
        <SectionTitle
          title="مقارنة السيناريوهات"
          hint="ثلاث حالات جاهزة — اضغط أي واحدة لتطبيقها على المؤشرات."
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <ScenarioCard
            title="الوضع الحالي"
            description="كما هو منزلك اليوم"
            bill={currentScenario.billSar}
            max={comparisonMax}
            active={isBaseline}
            tone="muted"
            onClick={onReset}
          />
          <ScenarioCard
            title="تعديل بسيط"
            description="ساعة أقل ودرجة أعلى"
            bill={lightScenario.billSar}
            max={comparisonMax}
            active={
              settings.acHours === lightSettings.acHours &&
              settings.acTemp === lightSettings.acTemp &&
              settings.heaterHours === lightSettings.heaterHours
            }
            tone="mid"
            onClick={() => onChange({ ...lightSettings })}
          />
          <ScenarioCard
            title="خطة رشيد"
            description="التوصيات الثلاث كاملة"
            bill={planScenario.billSar}
            max={comparisonMax}
            active={isPlan}
            tone="brand"
            onClick={onApplyPlan}
          />
        </div>

        <EstimateNote className="mt-5">
          نموذج محاكاة محلي وحتمي لأغراض العرض — يوضح اتجاه الأثر وحجمه التقريبي،
          ولا يمثل خوارزمية الفوترة الرسمية. لا تُرسل أي بيانات إلى الخارج.
        </EstimateNote>
      </section>
    </div>
  );
}

function BreakdownRow({
  label,
  kwh,
  total,
  tone,
}: {
  label: string;
  kwh: number;
  total: number;
  tone: "brand-700" | "brand-500" | "brand-300";
}) {
  const share = total > 0 ? (kwh / total) * 100 : 0;
  const colors = {
    "brand-700": "bg-brand-700",
    "brand-500": "bg-brand-500",
    "brand-300": "bg-brand-300",
  };

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-muted">
          <span className="tnum font-semibold text-text-main">
            {formatNumber(kwh)}
          </span>{" "}
          <span className="text-xs">{units.kwh}</span>
          {/* bdi يعزل الرقم عن النص العربي حتى لا تنعكس علامة النسبة */}
          <bdi className="tnum mr-2 text-xs text-text-muted">
            {Math.round(share)}٪
          </bdi>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            colors[tone]
          )}
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}

function ScenarioCard({
  title,
  description,
  bill,
  max,
  active,
  tone,
  onClick,
}: {
  title: string;
  description: string;
  bill: number;
  max: number;
  active: boolean;
  tone: "muted" | "mid" | "brand";
  onClick: () => void;
}) {
  const bars = {
    muted: "bg-ink-300",
    mid: "bg-brand-400",
    brand: "bg-brand-700",
  };

  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-2xl border p-5 text-right transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        active
          ? "border-brand-600 bg-brand-50/60 ring-1 ring-brand-600"
          : "border-border bg-bg-main hover:border-border hover:bg-bg-muted/50"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-text-main">{title}</span>
        {active ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-2 py-0.5 text-[10px] font-medium text-white">
            <Check className="h-3 w-3" strokeWidth={3} />
            مطبَّق
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-text-muted">{description}</p>

      <p className="mt-4 flex items-baseline gap-1.5">
        <span className="tnum text-3xl font-bold tracking-tight text-text-main">
          {formatSar(bill)}
        </span>
        <span className="text-sm text-text-muted">{units.sar}</span>
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn("rs-grow h-full rounded-full", bars[tone])}
          style={{ width: `${(bill / max) * 100}%` }}
        />
      </div>
    </button>
  );
}
