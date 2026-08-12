import { Metadata } from 'next';
import Link from 'next/link';
import { getHistoricalBills } from '@/lib/data/history';
import { HistoryTabs } from '@/components/history/HistoryTabs';
import { Suspense } from 'react';
import { Wordmark } from '@/components/layout/Logo';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'سجل الفواتير - رشيد',
  description: 'مقارنة وتحليل فواتير الكهرباء والمياه السابقة',
};

export default async function HistoryPage() {
  const allBills = await getHistoricalBills();
  
  const electricityBills = allBills.filter(b => b.bill_type === 'electricity');
  const waterBills = allBills.filter(b => b.bill_type === 'water');

  return (
    <div className="min-h-dvh bg-ink-50/50">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Wordmark />
          <Link
            href="/app"
            className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            العودة للوحة القيادة
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>
      
      <main className="mx-auto max-w-6xl px-5 pb-28 pt-8 sm:px-8 sm:pb-16 sm:pt-10">
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
          <div>
            <h1 className="text-2xl font-bold text-ink-900 mb-2">المقارنة التاريخية للفواتير</h1>
            <p className="text-ink-500">
              تتبع استهلاكك وتكلفتك شهراً بشهر، وقارن الفواتير لترى أثر التحسينات التي قمت بها.
            </p>
          </div>

          <Suspense fallback={<div className="h-96 flex items-center justify-center text-ink-500">جاري تحميل السجل...</div>}>
            <HistoryTabs electricityBills={electricityBills} waterBills={waterBills} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
