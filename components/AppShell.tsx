"use client";

import { useCallback, useEffect, useState } from "react";
import { Landing } from "@/components/landing/Landing";
import { UploadScreen } from "@/components/invoice/UploadScreen";
import {
  AnalyzingScreen,
  type AnalysisOutcome,
} from "@/components/analysis/AnalyzingScreen";
import {
  DashboardShell,
  type SectionId,
} from "@/components/layout/DashboardShell";
import { BillDataProvider } from "@/components/BillDataProvider";
import { Overview } from "@/components/dashboard/Overview";
import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { PlanSection } from "@/components/savings/PlanSection";
import { WhatIfSection } from "@/components/simulator/WhatIfSection";
import { WaterSection } from "@/components/water/WaterSection";
import { recommendedSettings, simulationDefaults } from "@/data/mock-analysis";
import type { SimulationInput } from "@/lib/simulation";
import type { ExtractedInvoice } from "@/types/extracted-invoice";

type Stage = "landing" | "upload" | "analyzing" | "dashboard";

/**
 * حالة التطبيق كاملة في مكان واحد — بلا مكتبة إدارة حالة.
 * الرحلة: الواجهة ← رفع الفاتورة ← التحليل ← لوحة النتائج.
 */
export function AppShell() {
  const [stage, setStage] = useState<Stage>("landing");
  const [section, setSection] = useState<SectionId>("overview");
  const [settings, setSettings] = useState<SimulationInput>({
    ...simulationDefaults,
  });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [useDemo, setUseDemo] = useState(false);
  const [extractedInvoice, setExtractedInvoice] =
    useState<ExtractedInvoice | null>(null);
  const [analysisKey, setAnalysisKey] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [stage, section]);

  const applyPlan = useCallback(() => {
    setSettings({ ...recommendedSettings });
    setSection("whatIf");
  }, []);

  const restart = useCallback(() => {
    setSettings({ ...simulationDefaults });
    setSection("overview");
    setInvoiceFile(null);
    setUseDemo(false);
    setExtractedInvoice(null);
    setStage("landing");
  }, []);

  const handleAnalysisDone = useCallback((outcome: AnalysisOutcome) => {
    if (outcome.mode === "extracted") {
      setExtractedInvoice(outcome.data);
    } else {
      setExtractedInvoice(null);
    }
    setStage("dashboard");
  }, []);

  if (stage === "landing") {
    return (
      <Landing
        onStart={() => setStage("upload")}
        onDemo={() => {
          setUseDemo(true);
          setInvoiceFile(null);
          setExtractedInvoice(null);
          setAnalysisKey((k) => k + 1);
          setStage("analyzing");
        }}
      />
    );
  }

  if (stage === "upload") {
    return (
      <UploadScreen
        onAnalyze={(file) => {
          setInvoiceFile(file);
          setUseDemo(false);
          setExtractedInvoice(null);
          setAnalysisKey((k) => k + 1);
          setStage("analyzing");
        }}
        onDemo={() => {
          setUseDemo(true);
          setInvoiceFile(null);
          setExtractedInvoice(null);
          setAnalysisKey((k) => k + 1);
          setStage("analyzing");
        }}
        onBack={() => setStage("landing")}
      />
    );
  }

  if (stage === "analyzing") {
    return (
      <AnalyzingScreen
        key={analysisKey}
        file={invoiceFile}
        demo={useDemo}
        onDone={handleAnalysisDone}
        onRetry={() => setAnalysisKey((k) => k + 1)}
        onBack={() => setStage("upload")}
      />
    );
  }

  return (
    <BillDataProvider extracted={extractedInvoice}>
      <DashboardShell
        active={section}
        onNavigate={setSection}
        onRestart={restart}
      >
        <div key={section} className="rs-fade">
          {section === "overview" ? <Overview onNavigate={setSection} /> : null}
          {section === "analysis" ? (
            <AnalysisSection onNavigate={setSection} />
          ) : null}
          {section === "plan" ? (
            <PlanSection onNavigate={setSection} onApplyPlan={applyPlan} />
          ) : null}
          {section === "whatIf" ? (
            <WhatIfSection
              settings={settings}
              onChange={setSettings}
              onReset={() => setSettings({ ...simulationDefaults })}
              onApplyPlan={applyPlan}
            />
          ) : null}
          {section === "water" ? <WaterSection /> : null}
        </div>
      </DashboardShell>
    </BillDataProvider>
  );
}
