import { ComparisonResult } from '@/lib/historyComparison';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

export function ImprovementCard({ comparison, title, unit }: { comparison: ComparisonResult, title: string, unit: string }) {
  if (!comparison.hasEnoughData || !comparison.currentBill || !comparison.previousBill) {
    return null;
  }

  const {
    amountDiff,
    amountPercentChange,
    consumptionDiff,
    consumptionPercentChange,
    isAmountImproved,
    isConsumptionImproved,
  } = comparison;

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6">
      <div className="flex-1">
        <h4 className="text-sm font-medium text-slate-500 mb-1">تغير الاستهلاك ({title})</h4>
        <div className="flex items-end gap-3">
          <div className="text-2xl font-bold text-slate-800" dir="ltr">
            {Math.abs(consumptionDiff || 0).toLocaleString()} <span className="text-sm font-normal text-slate-500">{unit}</span>
          </div>
          <Badge value={consumptionPercentChange || 0} isImproved={isConsumptionImproved || false} />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          مقارنة بالفاتورة السابقة
        </p>
      </div>
      
      <div className="hidden md:block w-px bg-slate-100"></div>
      
      <div className="flex-1">
        <h4 className="text-sm font-medium text-slate-500 mb-1">تغير التكلفة</h4>
        <div className="flex items-end gap-3">
          <div className="text-2xl font-bold text-slate-800" dir="ltr">
            {Math.abs(amountDiff || 0).toLocaleString()} <span className="text-sm font-normal text-slate-500">ر.س</span>
          </div>
          <Badge value={amountPercentChange || 0} isImproved={isAmountImproved || false} />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          مقارنة بالفاتورة السابقة
        </p>
      </div>
    </div>
  );
}

function Badge({ value, isImproved }: { value: number; isImproved: boolean }) {
  if (Math.abs(value) < 0.1) {
    return (
      <div className="flex items-center text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
        <Minus className="w-3 h-3 mr-1" />
        بدون تغيير
      </div>
    );
  }
  
  if (isImproved) {
    return (
      <div className="flex items-center text-xs font-medium px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md">
        <ArrowDownRight className="w-3 h-3 ml-1" />
        انخفاض {Math.abs(value).toFixed(1)}%
      </div>
    );
  }

  return (
    <div className="flex items-center text-xs font-medium px-2 py-1 bg-rose-50 text-rose-600 rounded-md">
      <ArrowUpRight className="w-3 h-3 ml-1" />
      ارتفاع {Math.abs(value).toFixed(1)}%
    </div>
  );
}
