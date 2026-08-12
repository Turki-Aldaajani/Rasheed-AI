'use client';
import { useState } from 'react';
import { HistoryChart } from './HistoryChart';
import { ImprovementCard } from './ImprovementCard';
import { HistoricalBill, compareLatestBills } from '@/lib/historyComparison';

export function HistoryTabs({ electricityBills, waterBills }: { electricityBills: HistoricalBill[], waterBills: HistoricalBill[] }) {
  const [activeTab, setActiveTab] = useState<'electricity' | 'water'>('electricity');

  const bills = activeTab === 'electricity' ? electricityBills : waterBills;
  const title = activeTab === 'electricity' ? 'الكهرباء' : 'المياه';
  const unit = activeTab === 'electricity' ? 'كيلوواط/ساعة' : 'متر مكعب';
  
  const comparison = compareLatestBills(bills);

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('electricity')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'electricity' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          الكهرباء
        </button>
        <button
          onClick={() => setActiveTab('water')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'water' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          المياه
        </button>
      </div>

      <ImprovementCard comparison={comparison} title={title} unit={unit} />
      
      <div className="grid grid-cols-1 gap-6">
        <HistoryChart bills={bills} title={`استهلاك ${title}`} dataKey="consumption" yAxisLabel={unit} />
        <HistoryChart bills={bills} title={`تكلفة ${title}`} dataKey="amount_sar" yAxisLabel="ر.س" />
      </div>
    </div>
  );
}
