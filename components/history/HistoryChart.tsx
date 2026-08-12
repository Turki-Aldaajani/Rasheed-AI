'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { HistoricalBill, sortBillsChronologically } from '@/lib/historyComparison';

export function HistoryChart({ bills, title, dataKey, yAxisLabel }: { bills: HistoricalBill[], title: string, dataKey: string, yAxisLabel: string }) {
  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-100 h-64">
        <p className="text-slate-500">لا توجد فواتير سابقة مسجلة.</p>
      </div>
    );
  }

  if (bills.length === 1) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-100 h-64">
        <p className="text-slate-700 font-medium mb-2">توجد فاتورة واحدة مسجلة</p>
        <p className="text-slate-500 text-sm">أضف المزيد من الفواتير لرؤية الرسم البياني والمقارنة التاريخية.</p>
      </div>
    );
  }

  const sortedBills = sortBillsChronologically(bills);
  
  // Format data for Recharts
  const data = sortedBills.map(bill => {
    // Attempt to parse period_start, else fallback to created_at
    const d = new Date(bill.period_start || bill.created_at);
    
    // Arabic month label formatting
    const formattedDate = new Intl.DateTimeFormat('ar-SA', { month: 'short', year: 'numeric' }).format(d);
    const label = bill.period_label || formattedDate;

    return {
      name: label,
      [dataKey]: dataKey === 'consumption' ? bill.consumption : bill.amount_sar,
      bill_id: bill.id,
    };
  });

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-80">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
              labelStyle={{ fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}
              itemStyle={{ color: '#0ea5e9' }}
              formatter={(value: any) => [`${value} ${yAxisLabel}`, title]}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke="#0ea5e9"
              strokeWidth={3}
              activeDot={{ r: 6, strokeWidth: 0, fill: '#0ea5e9' }}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
