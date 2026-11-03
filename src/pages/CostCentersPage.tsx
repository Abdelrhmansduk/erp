import React, { useState } from 'react';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { useCostCenters, useTableMutation } from '../hooks/queries/useErpQueries';
import { useCompany } from '../contexts/CompanyContext';
import { useAppStore } from '../stores/appStore';
import { 
  PieChart, Plus, FileSpreadsheet, FileText, Search, X, Trash2, 
  DollarSign, ArrowDownRight, CheckCircle2 
} from 'lucide-react';
import { realErpDataStore } from '../services/realErpDataStore';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

export interface CostCenterRecord {
  id: string;
  company_id: string;
  code: string;
  name: string;
  manager_name?: string;
  budget: number;
  actual_spent: number;
  created_at: string;
}

const DEFAULT_MOCK_COST_CENTERS: CostCenterRecord[] = [
  {
    id: 'cc-1',
    company_id: 'SAF',
    code: 'CC-OPS-01',
    name: 'مركز تكلفة عمليات الاستقدام ومساند',
    manager_name: 'فهد العتيبي',
    budget: 150000.0,
    actual_spent: 42500.0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cc-2',
    company_id: 'SAF',
    code: 'CC-RENT-02',
    name: 'مركز تكلفة عقود التأجير والتشغيل',
    manager_name: 'محمد مصطفى',
    budget: 90000.0,
    actual_spent: 18400.0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cc-3',
    company_id: 'SAF',
    code: 'CC-SHELTER-03',
    name: 'مركز إيواء وتغذية حي الرمال',
    manager_name: 'سهام الشاذلي',
    budget: 80000.0,
    actual_spent: 64500.0,
    created_at: new Date().toISOString(),
  },
];

export const CostCentersPage: React.FC = () => {
  const { activeCompanyId, activeCompany } = useCompany();
  const { data: rawCostCenters = [], isLoading } = useCostCenters();
  const { createItem, updateItem, deleteItem } = useTableMutation('cost_centers');
  const { addNotification } = useAppStore();

  const costCenters: CostCenterRecord[] = rawCostCenters.length > 0 ? rawCostCenters : DEFAULT_MOCK_COST_CENTERS;

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Record Expense State
  const [selectedCostCenterForExpense, setSelectedCostCenterForExpense] = useState<CostCenterRecord | null>(null);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseBeneficiary, setExpenseBeneficiary] = useState('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState('تحويل بنكي');

  const [name, setName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [budget, setBudget] = useState('50000');

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCostCenterForExpense || !expenseAmount) return;

    const amt = parseFloat(expenseAmount) || 0;
    const newSpent = (selectedCostCenterForExpense.actual_spent || 0) + amt;

    // 1. Update cost center actual_spent
    await updateItem.mutateAsync({
      id: selectedCostCenterForExpense.id,
      data: {
        actual_spent: newSpent,
      },
    });

    // 2. Automatically register a disbursement voucher in 'vouchers'
    const voucher = {
      id: `VOUCH-CC-${Date.now().toString().slice(-5)}`,
      voucher_number: `PAY-CC-${Date.now().toString().slice(-4)}`,
      voucher_type: 'سند صرف',
      date: new Date().toISOString().slice(0, 10),
      beneficiary: expenseBeneficiary || selectedCostCenterForExpense.name,
      amount: amt,
      payment_method: expensePaymentMethod,
      description: `مصروف مسجل على ${selectedCostCenterForExpense.name} [${selectedCostCenterForExpense.code}]: ${expenseDescription}`,
      status: 'معتمد ومصروف',
      created_by: 'إدارة مراكز التكلفة',
      company_id: activeCompanyId !== 'all' ? activeCompanyId : 'SAF',
      created_at: new Date().toISOString(),
    };
    await realErpDataStore.addRecord('vouchers', voucher);

    // 3. Automatically post balanced double-entry Journal Entry for the expense
    const newJournal = {
      id: `JV-${Date.now()}`,
      company_id: activeCompanyId !== 'all' ? activeCompanyId : 'SAF',
      entry_number: `JV-EXP-${Date.now().toString().slice(-6)}`,
      entry_date: new Date().toISOString().slice(0, 10),
      entry_type: 'AUTOMATIC',
      source_module: 'EXPENSE',
      source_reference: voucher.id,
      description: `قيد مصروف مركز تكلفة (${selectedCostCenterForExpense.name}): ${expenseDescription || 'مصروفات تشغيلية'}`,
      total_debit: amt,
      total_credit: amt,
      status: 'POSTED',
      branch_name: 'فرع الرياض الرئيسي',
      cost_center_code: selectedCostCenterForExpense.code,
      created_by: 'النظام المحاسبي الآلي',
      approved_by: 'المدير المالي',
      created_at: new Date().toISOString()
    };
    await realErpDataStore.addRecord('company_journal_entries', newJournal);

    addNotification({
      title: 'تسجيل مصروف وقيد محاسبي',
      message: `تم قيد مصروف بقيمة ${amt.toLocaleString()} ⃁ على (${selectedCostCenterForExpense.name}) وتوليد سند صرف وقيد محاسبي مزدوج تلقائياً.`,
      type: 'success',
    });

    setSelectedCostCenterForExpense(null);
    setExpenseAmount('');
    setExpenseDescription('');
    setExpenseBeneficiary('');
  };

  const handleAddCostCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const companyCode = activeCompanyId !== 'all' ? activeCompanyId : 'SAF';
    const code = `CC-${companyCode}-${String(costCenters.length + 1).padStart(2, '0')}`;

    const newRecord = {
      company_id: companyCode,
      code,
      name,
      manager_name: managerName || 'مشرف القسم',
      budget: parseFloat(budget) || 50000,
      actual_spent: 0,
    };

    await createItem.mutateAsync(newRecord);
    setShowAddModal(false);
    setName('');
    setManagerName('');
    setBudget('50000');
  };

  const filteredCostCenters = costCenters.filter(
    (c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.includes(searchQuery) ||
      (c.manager_name && c.manager_name.includes(searchQuery))
  );

  const totalBudget = costCenters.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalSpent = costCenters.reduce((sum, c) => sum + (c.actual_spent || 0), 0);
  const remainingBudget = totalBudget - totalSpent;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#000000',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="flex items-center gap-3.5">
          <BusinessIllustration
            type="inventory-custody"
            size="sm"
            showBackground={false}
            className="!w-16 !h-14 shrink-0"
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>ANALYTICAL ACCOUNTING</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              مراكز التكلفة والمحاسبة التحليلية
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0 0', fontWeight: 420 }}>
              إدارة الميزانيات المعتمدة والمصروفات الفعلية per Cost Center لـ{' '}
              <strong style={{ color: '#ffffff' }}>{activeCompany.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAddModal(true)}
            className="button-white-pill"
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>+ إضافة مركز تكلفة جديد</span>
          </button>
          <ExportDropdown
            sectionKey="cost_centers"
            data={filteredCostCenters}
            customTitle={`مراكز التكلفة - ${activeCompany.name}`}
            variant="outline-dark"
            buttonLabel="تصدير التقارير (10 صيغ)"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>إجمالي الميزانيات المخصصة</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>{totalBudget.toLocaleString()} ⃁</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>{costCenters.length} مراكز نشطة</span>
        </div>

        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#000000', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>إجمالي المنصرف الفعلي</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>{totalSpent.toLocaleString()} ⃁</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>
            معدل الصرف: {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%
          </span>
        </div>

        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#000000', fontWeight: 550 }}>المتبقي من الميزانية المعتمدة</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>{remainingBudget.toLocaleString()} ⃁</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>سيولة متبقية</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3 top-3 text-zinc-400" />
            <input
              type="text"
              placeholder="ابحث بكود المركز، الاسم، أو المسؤول..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-input"
              style={{ width: '100%', height: '36px', minHeight: '36px', borderRadius: '9999px', paddingRight: '36px', fontSize: '12px' }}
            />
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
            العدد: {filteredCostCenters.length} مراكز
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-zinc-700">
            <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3.5">كود المركز</th>
                <th className="p-3.5">اسم مركز التكلفة</th>
                <th className="p-3.5">المسؤول</th>
                <th className="p-3.5">الميزانية المعتمدة</th>
                <th className="p-3.5">المنصرف الفعلي</th>
                <th className="p-3.5">المتبقي</th>
                <th className="p-3.5">نسبة الاستهلاك</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-zinc-400">
                    جاري استرجاع مراكز التكلفة...
                  </td>
                </tr>
              ) : filteredCostCenters.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-zinc-400">
                    لا توجد مراكز تكلفة مسجلة
                  </td>
                </tr>
              ) : (
                filteredCostCenters.map((c) => {
                  const spentPct = c.budget > 0 ? Math.min(100, Math.round((c.actual_spent / c.budget) * 100)) : 0;
                  const remaining = c.budget - c.actual_spent;

                  return (
                    <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-black">{c.code}</td>
                      <td className="p-3.5 font-bold text-black">{c.name}</td>
                      <td className="p-3.5 text-zinc-600">
                        <div className="flex items-center gap-2">
                          <CorporateAvatar
                            name={c.manager_name || 'مشرف القسم'}
                            departmentId="finance"
                            size="xs"
                            status="verified"
                          />
                          <span>{c.manager_name || 'غير محدد'}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-black">{c.budget.toLocaleString()} ⃁</td>
                      <td className="p-3.5 font-mono font-bold text-rose-700">{c.actual_spent.toLocaleString()} ⃁</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-700">{remaining.toLocaleString()} ⃁</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-zinc-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                spentPct > 80 ? 'bg-rose-500' : spentPct > 50 ? 'bg-amber-500' : 'bg-black'
                              }`}
                              style={{ width: `${spentPct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-bold text-zinc-700">{spentPct}%</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedCostCenterForExpense(c)}
                            className="button-outline-on-light text-rose-700 hover:bg-rose-50 flex items-center gap-1 font-bold"
                            style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                            title="تسجيل مصروف وقيد سند صرف"
                          >
                            <DollarSign className="w-3 h-3 text-rose-600" />
                            <span>تسجيل مصروف</span>
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف مركز التكلفة (${c.name})؟`)) {
                                deleteItem.mutate(c.id);
                              }
                            }}
                            className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                            title="حذف المركز"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Cost Center Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-black text-white flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-400" />
                <span>إضافة مركز تكلفة تحليلي جديد</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCostCenter} className="p-6 space-y-4 bg-white text-black">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم مركز التكلفة *</label>
                <input
                  type="text"
                  placeholder="مثال: مركز تكلفة فرع جدة، إيواء الرياض..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم المشرف / المسؤول</label>
                <input
                  type="text"
                  placeholder="اسم مدير المركز..."
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">الميزانية التقديرية المعتمدة (⃁) *</label>
                <input
                  type="number"
                  placeholder="50000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono font-bold focus:border-black focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
                  حفظ واعتماد المركز
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Record Expense Modal */}
      {selectedCostCenterForExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans animate-in fade-in zoom-in-95">
            <div className="p-5 bg-black text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base text-white m-0">
                  قيد وتسجيل مصروف على مركز التكلفة
                </h3>
              </div>
              <button 
                onClick={() => setSelectedCostCenterForExpense(null)} 
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-zinc-50 border-b border-zinc-200 text-xs">
              <div className="text-zinc-500 font-medium">مركز التكلفة المحدد:</div>
              <div className="font-bold text-black text-sm mt-0.5">{selectedCostCenterForExpense.name} ({selectedCostCenterForExpense.code})</div>
              <div className="flex justify-between mt-2 pt-2 border-t border-zinc-200 font-mono text-[11px]">
                <span>الميزانية: {selectedCostCenterForExpense.budget.toLocaleString()} ⃁</span>
                <span className="text-rose-700">المنصرف: {selectedCostCenterForExpense.actual_spent.toLocaleString()} ⃁</span>
                <span className="text-emerald-700 font-bold">المتبقي: {(selectedCostCenterForExpense.budget - selectedCostCenterForExpense.actual_spent).toLocaleString()} ⃁</span>
              </div>
            </div>

            <form onSubmit={handleRecordExpense} className="p-6 space-y-4 bg-white text-black text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">مبلغ المصروف (⃁) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="2500"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono font-bold focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">بيان وشرح المصروف *</label>
                <input
                  type="text"
                  required
                  placeholder="سداد فواتير، رسوم حكومية، مستلزمات إيواء..."
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">المستفيد / الجهة</label>
                  <input
                    type="text"
                    placeholder="اسم المورد أو المستفيد..."
                    value={expenseBeneficiary}
                    onChange={(e) => setExpenseBeneficiary(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">طريقة الصرف</label>
                  <select
                    value={expensePaymentMethod}
                    onChange={(e) => setExpensePaymentMethod(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value="تحويل بنكي">تحويل بنكي</option>
                    <option value="نقداً من الخزينة">نقداً من الخزينة</option>
                    <option value="شيك بنكي">شيك بنكي</option>
                    <option value="بطاقة مدى">بطاقة مدى</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setSelectedCostCenterForExpense(null)}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill bg-rose-600 hover:bg-rose-700 text-white font-bold"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
                  قيد المصروف وتوليد سند صرف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostCentersPage;
