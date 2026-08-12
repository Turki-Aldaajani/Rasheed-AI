"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { HouseholdProfile } from "@/lib/household";
import { generateOperatingPlan } from "@/lib/operatingPlan";
import type { ExtractedInvoice } from "@/types/extracted-invoice";
import { saveBillFromExtraction } from "@/lib/billService";
import { getHouseholdProfileAction } from "@/app/actions/household";

type Stage = "landing" | "upload" | "analyzing" | "dashboard";

/**
 * حالة التطبيق كاملة في مكان واحد — بلا مكتبة إدارة حالة.
 * الرحلة: الواجهة ← رفع الفاتورة ← التحليل ← لوحة النتائج.
 */
export function AppShell({
  initialStage = "landing",
  onExit,
  isAuthenticated = false,
  profile = null,
}: {
  initialStage?: Stage;
  onExit?: () => void;
  isAuthenticated?: boolean;
  profile?: HouseholdProfile | null;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(initialStage);
  const [section, setSection] = useState<SectionId>("overview");
  const [settings, setSettings] = useState<SimulationInput>({
    ...simulationDefaults,
  });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [useDemo, setUseDemo] = useState(false);
  const [extractedInvoice, setExtractedInvoice] =
    useState<ExtractedInvoice | null>(null);
  const [analysisKey, setAnalysisKey] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);

  const personalizedRecommendations = generateOperatingPlan(profile);

  /* التمرير لأعلى عند كل انتقال حتى لا تبدأ الشاشة من منتصفها */
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
    setSaveError(null);
    if (onExit) {
      onExit();
    } else {
      setStage("landing");
    }
  }, [onExit]);

  const handleAnalysisDone = useCallback(async (outcome: AnalysisOutcome) => {
    if (outcome.mode === "extracted") {
      setExtractedInvoice(outcome.data);

      // Persist to Supabase when the user is authenticated.
      if (isAuthenticated) {
        let householdId = profile?.id;
        if (!householdId) {
          try {
            const currentProfile = await getHouseholdProfileAction();
            householdId = currentProfile?.id;
          } catch (err) {
            console.error("Error retrieving household profile:", err);
          }
        }

        if (householdId) {
          const result = await saveBillFromExtraction(outcome.data, householdId);
          if (!result.success) {
            // Surface the real error — do NOT silently swallow it.
            setSaveError(result.error);
          }
        }
      }
    } else {
      setExtractedInvoice(null);
    }
    setStage("dashboard");
  }, [isAuthenticated, profile]);

  if (stage === "landing") {
    return (
      <Landing
        onStart={() => router.push("/app")}
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
        onBack={() => {
          if (onExit) onExit();
          else setStage("landing");
        }}
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
        isAuthenticated={isAuthenticated}
      >
        {saveError ? (
          <div role="alert" className="mx-4 mt-4 rounded-xl border border-alert/40 bg-alert-soft px-4 py-3 text-sm text-alert">
            <strong>تعذّر حفظ الفاتورة:</strong> {saveError}
          </div>
        ) : null}
        <div key={section} className="rs-fade">
          {section === "overview" ? <Overview onNavigate={setSection} /> : null}
          {section === "analysis" ? (
            <AnalysisSection onNavigate={setSection} />
          ) : null}
          {section === "plan" ? (
            <PlanSection onNavigate={setSection} onApplyPlan={applyPlan} recs={personalizedRecommendations} />
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
