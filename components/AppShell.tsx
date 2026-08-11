"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Landing } from "@/components/landing/Landing";
import { UploadScreen } from "@/components/invoice/UploadScreen";
import { AnalyzingScreen } from "@/components/analysis/AnalyzingScreen";
import {
  DashboardShell,
  type SectionId,
} from "@/components/layout/DashboardShell";
import { Overview } from "@/components/dashboard/Overview";
import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { PlanSection } from "@/components/savings/PlanSection";
import { WhatIfSection } from "@/components/simulator/WhatIfSection";
import { WaterSection } from "@/components/water/WaterSection";
import { recommendedSettings, simulationDefaults } from "@/data/mock-analysis";
import type { SimulationInput } from "@/lib/simulation";

type Stage = "landing" | "upload" | "analyzing" | "dashboard";

/**
 * حالة التطبيق كاملة في مكان واحد — بلا مكتبة إدارة حالة.
 * الرحلة: الواجهة ← رفع الفاتورة ← التحليل ← لوحة النتائج.
 */
export function AppShell({
  initialStage = "landing",
  onExit,
  isAuthenticated = false,
}: {
  initialStage?: Stage;
  onExit?: () => void;
  isAuthenticated?: boolean;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(initialStage);
  const [section, setSection] = useState<SectionId>("overview");
  const [settings, setSettings] = useState<SimulationInput>({
    ...simulationDefaults,
  });

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
    if (onExit) {
      onExit();
    } else {
      setStage("landing");
    }
  }, [onExit]);

  if (stage === "landing") {
    return (
      <Landing
        onStart={() => router.push("/app")}
        onDemo={() => setStage("analyzing")}
      />
    );
  }

  if (stage === "upload") {
    return (
      <UploadScreen
        onAnalyze={() => setStage("analyzing")}
        onBack={() => {
          if (onExit) onExit();
          else setStage("landing");
        }}
      />
    );
  }

  if (stage === "analyzing") {
    return <AnalyzingScreen onDone={() => setStage("dashboard")} />;
  }

  return (
    <DashboardShell
      active={section}
      onNavigate={setSection}
      onRestart={restart}
      isAuthenticated={isAuthenticated}
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
  );
}
