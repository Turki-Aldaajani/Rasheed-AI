'use client';

import { AppShell } from "@/components/AppShell";
import { useRouter } from "next/navigation";
import { HouseholdProfile } from "@/lib/household";

export function AppClientWrapper({ profile }: { profile: HouseholdProfile | null }) {
  const router = useRouter();
  
  return (
    <AppShell 
      initialStage="upload" 
      onExit={() => router.push("/")}
      isAuthenticated={true}
      profile={profile}
    />
  );
}
