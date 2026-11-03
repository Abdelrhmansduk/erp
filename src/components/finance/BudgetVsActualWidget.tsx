import React from 'react';
import { DollarSign, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';

export interface BudgetItem {
  id: string;
  category: string;
  department: string;
  allocatedBudget: number;
  spentAmount: number;
  committedAmount: number;
  period: string;
}

export const DEFAULT_BUDGET_ITEMS: BudgetItem[] = [
  { id: 'b-1', category: 'رواتب وأجور الكوادر', department: 'الموارد البشرية', allocatedBudget: 1500000, spentAmount: 1100000, committedAmount: 150000, period: '2026' },
  { id: 'b-2', category: 'تجهيزات ومشتريات مناقصات كاس', department: 'التوريدات والمناقصات', allocatedBudget: 800000, spentAmount: 620000, committedAmount: 95000, period: '2026' },
  { id: 'b-3', category: 'مصروفات تشغيل ومراكز إيواء', department: 'العمليات والتشغيل', allocatedBudget: 350000, spentAmount: 290000, committedAmount: 35000, period: '2026' },
  { id: 'b-4', category: 'تقنية المعلومات والاتصالات', department: 'تقنية المعلومات', allocatedBudget: 200000, spentAmount: 130000, committedAmount: 20000, period: '2026' },
  { id: 'b-5', category: 'تسويق وإعلانات واستقطاب', department: 'التسويق والمبيعات', allocatedBudget: 180000, spentAmount: 165000, committedAmount: 25000, period: '2026' },
  { id: 'b-6', category: 'استشارات قانونية ورسوم حكومية', department: 'الشؤون القانونية', allocatedBudget: 120000, spentAmount: 75000, committedAmount: 10000, period: '2026' },
];

export const BudgetVsActualWidget: React.FC<{ items?: BudgetItem[] }> = ({ items = DEFAULT_BUDGET_ITEMS }) => {
  const totalAllocated = items.reduce((sum, item) => sum + item.allocatedBudget, 0);
  const totalSpent = items.reduce((sum, item) => sum + item.spentAmount, 0);
  const totalCommitted = items.reduce((sum, item) => sum + item.committedAmount, 0);
  const totalRemaining = totalAllocated - (totalSpent + totalCommitted);
  const overallUsagePct = totalAllocated > 0 ? Number((((totalSpent + totalCommitted) / totalAllocated) * 100).toFixed(1)) : 0;

  return (
    <div className="space-y-6">
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900 text-white shadow-sm border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>إجمالي الميزانية المعتمدة</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">{totalAllocated.toLocaleString()} ⃁</div>
          <div className="text-[10px] text-zinc-400 mt-1">المخصص لعام 2026</div>
        </div>

        <div className="p-4 rounded-2xl bg-white shadow-xs border border-zinc-200">
          <div className="flex items-center justify-between text-zinc-600 text-xs mb-1">
            <span>المصروف الفعلي (Actual)</span>
            <TrendingDown className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900">{totalSpent.toLocaleString()} ⃁</div>
          <div className="text-[10px] text-zinc-500 mt-1">{((totalSpent / totalAllocated) * 100).toFixed(1)}% من الميزانية</div>
        </div>

        <div className="p-4 rounded-2xl bg-white shadow-xs border border-zinc-200">
          <div className="flex items-center justify-between text-zinc-600 text-xs mb-1">
            <span>التزامات قيد الصرف (Committed)</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-700">{totalCommitted.toLocaleString()} ⃁</div>
          <div className="text-[10px] text-zinc-500 mt-1">عقود وأوامر شراء معتمدة</div>
        </div>

        <div className="p-4 rounded-2xl bg-white shadow-xs border border-zinc-200">
          <div className="flex items-center justify-between text-zinc-600 text-xs mb-1">
            <span>الفائض / المتبقي المتاح</span>
            {totalRemaining >= 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
          </div>
          <div className={`text-xl font-bold font-mono ${totalRemaining >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {totalRemaining.toLocaleString()} ⃁
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">نسبة الاستهلاك الكلي: {overallUsagePct}%</div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-black m-0">تفاصيل الميزانيات المعتمدة مقابل الفعلي حسب القسم</h4>
            <p className="text-xs text-zinc-500 mt-0.5">مراقبة الانحرافات المالية والتحكم في الإنفاق التشغيلي والمنافسات</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200 text-right">
                <th className="p-3">بند الميزانية</th>
                <th className="p-3">القسم / الإدارة</th>
                <th className="p-3 text-center">الميزانية المعتمدة</th>
                <th className="p-3 text-center">المنصرف الفعلي</th>
                <th className="p-3 text-center">المتبقي</th>
                <th className="p-3 text-center w-40">نسبة الاستهلاك</th>
                <th className="p-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((item) => {
                const totalUsed = item.spentAmount + item.committedAmount;
                const percent = Math.min(100, Math.round((totalUsed / item.allocatedBudget) * 100));
                const remaining = item.allocatedBudget - totalUsed;
                const isWarning = percent >= 85 && percent < 100;
                const isOver = percent >= 100;

                return (
                  <tr key={item.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="p-3 font-semibold text-zinc-900">{item.category}</td>
                    <td className="p-3 text-zinc-600">{item.department}</td>
                    <td className="p-3 text-center font-mono font-bold">{item.allocatedBudget.toLocaleString()} ⃁</td>
                    <td className="p-3 text-center font-mono text-zinc-800">{item.spentAmount.toLocaleString()} ⃁</td>
                    <td className={`p-3 text-center font-mono font-bold ${remaining < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {remaining.toLocaleString()} ⃁
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-grow h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOver ? 'bg-red-600' : isWarning ? 'bg-amber-500' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-semibold w-9 text-left">{percent}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isOver
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : isWarning
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isOver ? 'تجاوز' : isWarning ? 'تنبيه صرف' : 'ضمن الحدود'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
