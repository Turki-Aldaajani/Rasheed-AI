'use client';

import { useState } from 'react';
import { HouseholdProfile } from '@/lib/household';
import { updateHouseholdProfile } from '@/app/actions/household';
import { useRouter } from 'next/navigation';

export function ProfileForm({ initialProfile }: { initialProfile: HouseholdProfile | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    
    try {
      const result = await updateHouseholdProfile(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        // Refresh router to show updated personalization
        router.refresh();
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="mx-auto max-w-xl space-y-6 rounded-2xl bg-bg-main p-6 shadow-sm border border-border">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-text-main">بيانات المنزل</h2>
        <p className="text-sm text-text-muted">
          تساعدنا هذه البيانات في تقديم توصيات مخصصة لمنزلك وتحديد فرص التوفير.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-200">
          تم حفظ البيانات بنجاح.
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="residents" className="block text-sm font-medium text-ink-700">
            عدد الأفراد
          </label>
          <input
            type="number"
            name="residents"
            id="residents"
            min="1"
            defaultValue={initialProfile?.residents ?? ''}
            className="block w-full rounded-lg border border-border px-4 py-2.5 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="مثال: 5"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="home_area_m2" className="block text-sm font-medium text-ink-700">
            مساحة المنزل (متر مربع)
          </label>
          <input
            type="number"
            name="home_area_m2"
            id="home_area_m2"
            min="1"
            step="0.01"
            defaultValue={initialProfile?.home_area_m2 ?? ''}
            className="block w-full rounded-lg border border-border px-4 py-2.5 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="مثال: 250"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="ac_units" className="block text-sm font-medium text-ink-700">
            عدد المكيفات
          </label>
          <input
            type="number"
            name="ac_units"
            id="ac_units"
            min="0"
            defaultValue={initialProfile?.ac_units ?? ''}
            className="block w-full rounded-lg border border-border px-4 py-2.5 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="مثال: 4"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="ac_type" className="block text-sm font-medium text-ink-700">
            نوع التكييف الأساسي
          </label>
          <select
            name="ac_type"
            id="ac_type"
            defaultValue={initialProfile?.ac_type ?? ''}
            className="block w-full rounded-lg border border-border px-4 py-2.5 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-bg-main"
          >
            <option value="">اختر...</option>
            <option value="split">سبليت (جداري)</option>
            <option value="window">شباك</option>
            <option value="central">مركزي / مخفي</option>
            <option value="other">أخرى</option>
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="water_heater_type" className="block text-sm font-medium text-ink-700">
            نوع سخان المياه
          </label>
          <select
            name="water_heater_type"
            id="water_heater_type"
            defaultValue={initialProfile?.water_heater_type ?? ''}
            className="block w-full rounded-lg border border-border px-4 py-2.5 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-bg-main"
          >
            <option value="">اختر...</option>
            <option value="electric">كهربائي</option>
            <option value="solar">شمسي</option>
            <option value="gas">غاز</option>
            <option value="other">أخرى</option>
          </select>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push('/app')}
          className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-muted transition-colors"
        >
          رجوع
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? 'جاري الحفظ...' : 'حفظ البيانات'}
        </button>
      </div>
    </form>
  );
}
