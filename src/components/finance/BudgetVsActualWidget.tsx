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

export const DEFAULT_BUDGET_ITEMS: BudgetItem[] = [];

export const BudgetVsActualWidget: React.FC<{ items?: BudgetItem[] }> = ({ items = DEFAULT_BUDGET_ITEMS }) => {
  const totalAllocated = items.reduce((sum, item) => sum + item.allocatedBudget, 0);
  const totalSpent = items.reduce((sum, item) => sum + item.spentAmount, 0);
  const totalCommitted = items.reduce((sum, item) => sum + item.committedAmount, 0);
  const totalRemaining = totalAllocated - (totalSpent + totalCommitted);
  const overallUsagePct = totalAllocated > 0 ? Number((((totalSpent + totalCommitted) / totalAllocated) * 100).toFixed(1)) : 0;
  const spentPct = totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#f3f3f3] text-[#141414]  border border-[#e0e0e0]">
          <div className="flex items-center justify-between text-[#707070] text-xs mb-1">
            <span>إجمالي الميزانية المعتمدة</span>
            <DollarSign className="w-4 h-4 text-[#141414]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#141414]">{totalAllocated.toLocaleString()} ⃁</div>
          <div className="text-[10px] text-[#707070] mt-1">المخصص لعام 2026</div>
        </div>

        <div className="p-4 rounded-2xl bg-white  border border-[#e0e0e0]">
          <div className="flex items-center justify-between text-[#707070] text-xs mb-1">
            <span>المصروف الفعلي (Actual)</span>
            <TrendingDown className="w-4 h-4 text-[#141414]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#141414]">{totalSpent.toLocaleString()} ⃁</div>
          <div className="text-[10px] text-[#707070] mt-1">{spentPct}% من الميزانية</div>
        </div>

        <div className="p-4 rounded-2xl bg-white  border border-[#e0e0e0]">
          <div className="flex items-center justify-between text-[#707070] text-xs mb-1">
            <span>التزامات قيد الصرف (Committed)</span>
            <TrendingUp className="w-4 h-4 text-[#141414]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#141414]">{totalCommitted.toLocaleString()} ⃁</div>
          <div className="text-[10px] text-[#707070] mt-1">عقود وأوامر شراء معتمدة</div>
        </div>

        <div className="p-4 rounded-2xl bg-white  border border-[#e0e0e0]">
          <div className="flex items-center justify-between text-[#707070] text-xs mb-1">
            <span>الفائض / المتبقي المتاح</span>
            {totalRemaining >= 0 ? <CheckCircle2 className="w-4 h-4 text-[#141414]" /> : <AlertTriangle className="w-4 h-4 text-[#141414]" />}
          </div>
          <div className={`text-xl font-bold font-mono ${totalRemaining >= 0 ? 'text-[#141414]' : 'text-[#141414]'}`}>
            {totalRemaining.toLocaleString()} ⃁
          </div>
          <div className="text-[10px] text-[#707070] mt-1">نسبة الاستهلاك الكلي: {overallUsagePct}%</div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-white rounded-2xl border border-[#e0e0e0] overflow-hidden ">
        <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-[#141414] m-0">تفاصيل الميزانيات المعتمدة مقابل الفعلي حسب القسم</h4>
            <p className="text-xs text-[#707070] mt-0.5">مراقبة الانحرافات المالية والتحكم في الإنفاق التشغيلي والمنافسات</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0] text-right">
                <th className="p-3">بند الميزانية</th>
                <th className="p-3">القسم / الإدارة</th>
                <th className="p-3 text-center">الميزانية المعتمدة</th>
                <th className="p-3 text-center">المنصرف الفعلي</th>
                <th className="p-3 text-center">المتبقي</th>
                <th className="p-3 text-center w-40">نسبة الاستهلاك</th>
                <th className="p-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[#707070]">
                    لا توجد بنود ميزانية مسجلة حالياً
                  </td>
                </tr>
              ) : items.map((item) => {
                const totalUsed = item.spentAmount + item.committedAmount;
                const percent = item.allocatedBudget > 0 ? Math.min(100, Math.round((totalUsed / item.allocatedBudget) * 100)) : 0;
                const remaining = item.allocatedBudget - totalUsed;
                const isWarning = percent >= 85 && percent < 100;
                const isOver = percent >= 100;

                return (
                  <tr key={item.id} className="hover:bg-[#f3f3f3] transition-colors">
                    <td className="p-3 font-semibold text-[#141414]">{item.category}</td>
                    <td className="p-3 text-[#707070]">{item.department}</td>
                    <td className="p-3 text-center font-mono font-bold">{item.allocatedBudget.toLocaleString()} ⃁</td>
                    <td className="p-3 text-center font-mono text-[#141414]">{item.spentAmount.toLocaleString()} ⃁</td>
                    <td className={`p-3 text-center font-mono font-bold ${remaining < 0 ? 'text-[#141414]' : 'text-[#141414]'}`}>
                      {remaining.toLocaleString()} ⃁
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-grow h-2 bg-[#f3f3f3] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOver ? 'bg-[#141414]' : isWarning ? 'bg-[#141414]' : 'bg-[#141414]'
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
                            ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                            : isWarning
                            ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                            : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
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
