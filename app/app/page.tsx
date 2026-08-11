import { getHouseholdProfile } from "@/lib/household";
import { AppClientWrapper } from "./AppClientWrapper";

export default async function ProtectedApp() {
  const profile = await getHouseholdProfile();
  
  return (
    <AppClientWrapper profile={profile} />
  );
}
