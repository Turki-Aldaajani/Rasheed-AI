"use client";

import { AppShell } from "@/components/AppShell";
import { useRouter } from "next/navigation";

export default function ProtectedApp() {
  const router = useRouter();
  
  return (
    <AppShell 
      initialStage="upload" 
      onExit={() => router.push("/")}
      isAuthenticated={true}
    />
  );
}
