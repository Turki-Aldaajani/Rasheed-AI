import { getHouseholdProfile } from '@/lib/household';
import { ProfileForm } from '@/components/dashboard/ProfileForm';

export const metadata = {
  title: 'ملف المنزل | رشيد',
};

export default async function ProfilePage() {
  const profile = await getHouseholdProfile();

  return (
    <div className="min-h-dvh bg-bg-muted/50 py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <ProfileForm initialProfile={profile} />
      </div>
    </div>
  );
}
