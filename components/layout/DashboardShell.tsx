"use client";

import {
  Home,
  PieChart,
  ListChecks,
  SlidersHorizontal,
  Droplets,
  RotateCcw,
} from "lucide-react";
import { Wordmark } from "@/components/layout/Logo";
import { cn } from "@/lib/formatting";
import { household } from "@/data/mock-household";

export type SectionId = "overview" | "analysis" | "plan" | "whatIf" | "water";

export const SECTIONS: { id: SectionId; label: string; icon: typeof Home }[] = [
  { id: "overview", label: "الرئيسية", icon: Home },
  { id: "analysis", label: "التحليل", icon: PieChart },
  { id: "plan", label: "خطة رشيد", icon: ListChecks },
  { id: "whatIf", label: "ماذا لو؟", icon: SlidersHorizontal },
  { id: "water", label: "المياه", icon: Droplets },
];

export function DashboardShell({
  active,
  onNavigate,
  onRestart,
  children,
}: {
  active: SectionId;
  onNavigate: (id: SectionId) => void;
  onRestart: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-ink-50/50">
      {/* الشريط العلوي */}
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Wordmark />

          {/* تنقل سطح المكتب */}
          <nav className="hidden items-center gap-1 lg:flex">
            {SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                aria-current={active === id ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                  active === id
                    ? "bg-brand-700 text-white"
                    : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                )}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-ink-500 md:inline">
              {household.city} · {household.houseType}
            </span>
            <button
              onClick={onRestart}
              className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
              aria-label="البدء من جديد"
              title="البدء من جديد"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-28 pt-8 sm:px-8 sm:pb-16 sm:pt-10">
        {children}
      </main>

      {/* تنقل الجوال */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={active === id ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2.5 text-[10px] font-medium transition-colors",
                active === id ? "text-brand-700" : "text-ink-400"
              )}
            >
              <Icon
                className="h-5 w-5"
                strokeWidth={active === id ? 2.2 : 1.75}
              />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
