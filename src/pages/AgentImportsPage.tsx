import i18n from '../i18n/config';
import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { IMPORT_TEMPLATES, downloadTemplate } from '../services/importEngine';
import { 
  UploadCloud, Download, FileSpreadsheet, Check, Search, Plus, 
  Eye, X, Trash2, Globe, Building2, FileText, CheckCircle2, UserCheck
} from 'lucide-react';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

export interface ImportBatch {
  id: string;
  batch_code: string;
  office_name: string;
  country: string;
  cvs_count: number;
  status: 'بانتظار الاعتماد' | 'مستوردة بالكامل' | 'مرفوضة';
  created_at: string;
  notes?: string;
  candidates?: Array<{
    id: string;
    name: string;
    passport: string;
    age: number;
    profession: string;
    experience: string;
    medical: 'لائق' | 'قيد الفحص';
    status: 'معتمد' | 'مرفوض' | 'قيد المراجعة';
  }>;
}

const MOCK_BATCHES: ImportBatch[] = [
  { 
    id: '1', 
    batch_code: '#IMP-2026-08', 
    office_name: 'DAMAS FOREIGN AGENCY', 
    country: 'اثيوبيا', 
    cvs_count: 15, 
    status: 'بانتظار الاعتماد', 
    created_at: '2026-07-29',
    notes: 'دفعة طاهيات وعاملات منزليات مدربات بمعهد دماس بأديس أبابا',
    candidates: [
      { id: 'c-1', name: 'سارة أديس كيبيدي', passport: 'EP8894120', age: 26, profession: 'عاملة منزلية', experience: 'سنتين بالسعودية', medical: 'لائق', status: 'قيد المراجعة' },
      { id: 'c-2', name: 'حليمة جبري تسفاي', passport: 'EP9920140', age: 24, profession: 'عاملة منزلية', experience: 'أول مرة', medical: 'لائق', status: 'قيد المراجعة' },
      { id: 'c-3', name: 'فاطمة محمد نور', passport: 'EP7731209', age: 29, profession: 'طباخة منزلية', experience: '4 سنوات بالإمارات', medical: 'لائق', status: 'قيد المراجعة' },
    ]
  },
  { 
    id: '2', 
    batch_code: '#IMP-2026-07', 
    office_name: "PLATINUM BROTHERS INT'L", 
    country: 'الفلبين', 
    cvs_count: 22, 
    status: 'مستوردة بالكامل', 
    created_at: '2026-07-20',
    notes: 'دفعة كوادر رعاية كبار سن وتمريض منزلي معتمدة من POEA',
    candidates: [
      { id: 'c-4', name: 'ماريا سانتوس كورتيز', passport: 'P9982710B', age: 31, profession: 'رعاية كبار سن', experience: '3 سنوات في الكويت', medical: 'لائق', status: 'معتمد' },
      { id: 'c-5', name: 'جويس فلوريس', passport: 'P8871625A', age: 27, profession: 'عاملة منزلية', experience: 'أول مرة', medical: 'لائق', status: 'معتمد' }
    ]
  },
  { 
    id: '3', 
    batch_code: '#IMP-2026-06', 
    office_name: "AL-MANAR RECRUITMENT", 
    country: 'أوغندا', 
    cvs_count: 18, 
    status: 'مستوردة بالكامل', 
    created_at: '2026-07-15',
    notes: 'كوادر إجادة تامة للغة الإنجليزية وإدارة المنازل',
    candidates: [
      { id: 'c-6', name: 'فلورنس ناباتانزي', passport: 'UG1102938', age: 28, profession: 'مدبرة منزل', experience: 'سنتين بالأردن', medical: 'لائق', status: 'معتمد' }
    ]
  },
];

export const AgentImportsPage: React.FC = () => {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch | null>(null);
  const { setActiveTab, addNotification } = useAppStore();

  // Form State for new batch
  const [batchForm, setBatchForm] = useState({
    office_name: 'DAMAS FOREIGN AGENCY',
    country: 'إثيوبيا',
    cvs_count: '10',
    batch_code: `#IMP-${new Date().getFullYear()}-${String(Math.floor(10 + Math.random() * 90))}`,
    notes: ''
  });

  useEffect(() => {
    realErpDataStore.getRecords<ImportBatch>('agent_imports', MOCK_BATCHES).then(data => setBatches(data));
  }, []);

  const handleApprove = async (batchId: string) => {
    const target = batches.find(b => b.id === batchId);
    const updated = await realErpDataStore.updateRecord<ImportBatch>('agent_imports', batchId, {
      status: 'مستوردة بالكامل'
    }, MOCK_BATCHES);
    setBatches(updated);

    // If batch has candidates, register them in cvs table
    if (target && target.candidates) {
      for (const cand of target.candidates) {
        await realErpDataStore.addRecord('cvs', {
          id: `CV-${Date.now()}-${cand.id}`,
          cv_code: `#CV-2026-${Math.floor(100 + Math.random() * 899)}`,
          name: cand.name,
          maid_name: cand.name,
          maid_name_ar: cand.name,
          passport_number: cand.passport,
          nationality: target.country,
          profession: cand.profession,
          job: cand.profession,
          type: 'استقدام',
          age: cand.age,
          religion: 'مسلمة',
          marital_status: 'عزباء',
          experience_years: 2,
          experience_country: cand.experience,
          experience: cand.experience,
          salary: 1500,
          office_name: target.office_name,
          external_office: target.office_name,
          skills: ['تنظيف شامل', 'رعاية أطفال', 'إدارة منزلية'],
          status: 'متاح',
          created_at: new Date().toISOString().slice(0, 10)
        });
      }
    }

    addNotification({
      title: 'اعتماد ونشر دفعة السير',
      message: `تم اعتماد الدفعة (${target?.batch_code || batchId}) بنجاح وإتاحة سيرها في جدول السير الذاتية بالـ ERP.`,
      type: 'success',
    });
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (window.confirm('هل أنت متأكد من حذف سجل هذه الدفعة؟')) {
      const updated = await realErpDataStore.deleteRecord<ImportBatch>('agent_imports', batchId, MOCK_BATCHES);
      setBatches(updated);
      addNotification({
        title: 'حذف الدفعة',
        message: 'تم حذف الدفعة بنجاح من سجلات الاستيراد.',
        type: 'info',
      });
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.office_name || !batchForm.batch_code) return;

    const count = parseInt(batchForm.cvs_count) || 10;
    const newBatch: ImportBatch = {
      id: `batch-${Date.now()}`,
      batch_code: batchForm.batch_code,
      office_name: batchForm.office_name,
      country: batchForm.country,
      cvs_count: count,
      status: 'بانتظار الاعتماد',
      created_at: new Date().toISOString().slice(0, 10),
      notes: batchForm.notes || 'دفعة جديدة تم رفعها من وكيل خارجي',
      candidates: Array.from({ length: Math.min(count, 5) }).map((_, i) => ({
        id: `gen-${i + 1}`,
        name: `مرشحة جديدة ${i + 1} (${batchForm.country})`,
        passport: `PP${Math.floor(1000000 + Math.random() * 9000000)}`,
        age: 23 + (i * 2),
        profession: 'عاملة منزلية',
        experience: i % 2 === 0 ? 'سنتين خبرة' : 'أول مرة',
        medical: 'لائق',
        status: 'قيد المراجعة'
      }))
    };

    const updated = await realErpDataStore.addRecord<ImportBatch>('agent_imports', newBatch, MOCK_BATCHES);
    setBatches(updated);
    setShowAddBatchModal(false);
    setBatchForm({
      office_name: 'DAMAS FOREIGN AGENCY',
      country: 'إثيوبيا',
      cvs_count: '10',
      batch_code: `#IMP-${new Date().getFullYear()}-${String(Math.floor(10 + Math.random() * 90))}`,
      notes: ''
    });

    addNotification({
      title: 'تسجيل دفعة استيراد جديدة',
      message: `تم تسجيل الدفعة (${newBatch.batch_code}) بواقع ${count} سيرة ذاتية بنجاح وحفظها بقاعدة البيانات.`,
      type: 'success',
    });
  };

  const handleDownloadCVTemplate = () => {
    const cvTemplate = IMPORT_TEMPLATES.find(t => t.entityKey === 'cvs');
    if (cvTemplate) {
      downloadTemplate(cvTemplate);
    }
  };

  const filteredBatches = (batches.length > 0 ? batches : MOCK_BATCHES).filter((b) =>
    (b.batch_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.office_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.country || '').includes(searchQuery)
  );

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Top Banner with Quick Actions */}
      <div
        className="card-feature-cinematic"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#141414',
          color: '#FFF',
          padding: '28px',
          borderRadius: '16px',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="flex items-center gap-3">
          <BusinessIllustration type="foreign-agencies" size="sm" />
          <div style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                {i18n.t("ats.agentBatchImports", "استيراد دفعات الوكلاء")}
              </span>
              <span style={{ color: '#a1a1aa', fontSize: '12px' }}>استيراد السير الذاتية والمكاتب الدولية</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, margin: '6px 0 0 0', letterSpacing: '-0.02em', color: '#ffffff', fontFamily: 'var(--font-family-display)' }}>
              ملفات السير المرفوعة من الوكلاء بالخارج
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa', fontWeight: 420 }}>
              مراجعة واعتماد السير الذاتية المرفوعة بالجملة من مكاتب الاستقدام الخارجية أو استيراد ملفات Excel/CSV جديدة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAddBatchModal(true)}
            className="button-white-pill flex items-center gap-1.5"
            style={{ fontSize: '12.5px', padding: '8px 18px', minHeight: '38px', background: '#141414', color: '#ffffff' }}
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل دفعة سير جديدة</span>
          </button>
          <button
            onClick={handleDownloadCVTemplate}
            className="button-white-pill"
            style={{ fontSize: '12.5px', padding: '6px 16px', minHeight: '38px' }}
          >
            <Download className="w-4 h-4 ml-1" />
            <span>تحميل نموذج Excel</span>
          </button>
          <button
            onClick={() => setActiveTab('data-import', 'معالج استيراد البيانات الشامل (Excel / CSV)')}
            className="button-outline-on-light"
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px', background: '#ffffff' }}
          >
            <FileSpreadsheet className="w-4 h-4 ml-1 text-[#141414]" />
            <span>معالج الاستيراد</span>
          </button>
        </div>
      </div>

      {/* Batches Table Card */}
      <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3 top-3 text-[#707070]" />
            <input
              type="text"
              aria-label="ابحث بكود الدفعة، المكتب، أو الدولة"
              placeholder="ابحث بكود الدفعة، المكتب، أو الدولة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-input"
              style={{ width: '100%', height: '36px', minHeight: '36px', borderRadius: '9999px', paddingRight: '36px', fontSize: '12px' }}
            />
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
            العدد: {filteredBatches.length} دفعة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-zinc-700">
            <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3.5">كود الدفعة</th>
                <th className="p-3.5">المكتب الخارجي والدولة</th>
                <th className="p-3.5">عدد السير المرفوعة</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredBatches.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-[#141414]">{row.batch_code}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <CorporateAvatar name={row.office_name} role={row.country} size="sm" status="verified" />
                      <div>
                        <div className="font-bold text-[#141414]">{row.office_name}</div>
                        <div className="text-[#707070] text-[11px]">{row.country}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="pill-tag-shade" style={{ fontSize: '10.5px' }}>
                      {row.cvs_count} سيرة ذاتية
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-[#707070]">{row.created_at}</td>
                  <td className="p-3.5">
                    <Badge
                      text={row.status}
                      type={row.status === 'مستوردة بالكامل' ? 'success' : row.status === 'مرفوضة' ? 'danger' : 'warning'}
                    />
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedBatch(row)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-[11px] inline-flex items-center gap-1 transition-all"
                        title="معاينة وفحص السير الذاتية في هذه الدفعة"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#141414]" />
                        <span>فحص السير</span>
                      </button>
                      {row.status === 'بانتظار الاعتماد' && (
                        <button
                          onClick={() => handleApprove(row.id)}
                          className="button-primary-pill"
                          style={{ padding: '3px 10px', fontSize: '11px', minHeight: '26px' }}
                        >
                          <Check className="w-3 h-3 ml-1" />
                          <span>اعتماد ونشر</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteBatch(row.id)}
                        className="p-1.5 rounded-lg hover:bg-[#eaeaea] text-[#707070] hover:text-[#141414] transition-colors"
                        title="حذف الدفعة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Batch Modal */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="card-pricing bg-white rounded-3xl p-6 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#141414]" />
                <h3 className="font-bold text-slate-900 text-base">
                  تسجيل دفعة استيراد سير جديدة
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddBatchModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center cursor-pointer"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 mb-1">المكتب الخارجي / الوكالة</label>
                <select
                  value={batchForm.office_name}
                  onChange={(e) => setBatchForm({ ...batchForm, office_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-slate-900"
                >
                  <option value="DAMAS FOREIGN AGENCY">DAMAS FOREIGN AGENCY (إثيوبيا)</option>
                  <option value="PLATINUM BROTHERS INT'L">PLATINUM BROTHERS INT'L (الفلبين)</option>
                  <option value="VERSATILE OVERSEAS LTD">VERSATILE OVERSEAS LTD (الهند)</option>
                  <option value="AL-MANAR RECRUITMENT">AL-MANAR RECRUITMENT (أوغندا)</option>
                  <option value="COLOMBO MANPOWER BUREAU">COLOMBO MANPOWER BUREAU (سريلانكا)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">الدولة</label>
                  <input
                    type="text"
                    required
                    value={batchForm.country}
                    onChange={(e) => setBatchForm({ ...batchForm, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">عدد السير المرفوعة</label>
                  <input
                    type="number"
                    required
                    value={batchForm.cvs_count}
                    onChange={(e) => setBatchForm({ ...batchForm, cvs_count: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 mb-1">كود الدفعة</label>
                <input
                  type="text"
                  required
                  value={batchForm.batch_code}
                  onChange={(e) => setBatchForm({ ...batchForm, batch_code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 mb-1">ملاحظات واعتمادات السفارة</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات حول الفحوصات الطبية أو التخصصات..."
                  value={batchForm.notes}
                  onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-slate-900 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="button-outline-on-light text-xs font-bold"
                  style={{ padding: '8px 20px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs font-bold"
                  style={{ padding: '8px 22px', background: '#141414', color: '#ffffff' }}
                >
                  حفظ الدفعة بقاعدة البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Details Inspection Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="card-pricing bg-white rounded-3xl p-6 max-w-2xl w-full border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#141414]" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    فحص السير الذاتية - الدفعة ({selectedBatch.batch_code})
                  </h3>
                  <p className="text-[11px] text-[#707070]">{selectedBatch.office_name} • {selectedBatch.country}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedBatch(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center cursor-pointer"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto max-h-72 border border-zinc-100 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-zinc-50 font-bold border-b border-zinc-200 text-zinc-700">
                  <tr>
                    <th className="p-3">اسم المرشحة</th>
                    <th className="p-3">رقم الجواز</th>
                    <th className="p-3">العمر والمهنة</th>
                    <th className="p-3">الخبرة</th>
                    <th className="p-3">الفحص الطبي</th>
                    <th className="p-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {(selectedBatch.candidates || []).map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50">
                      <td className="p-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <CorporateAvatar name={c.name} profession={c.profession} isCandidate size="sm" />
                          <span>{c.name}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-zinc-700">{c.passport}</td>
                      <td className="p-3 text-zinc-600">{c.profession} ({c.age} سنة)</td>
                      <td className="p-3 text-zinc-600">{c.experience}</td>
                      <td className="p-3">
                        <span className="pill-tag-mint text-[11px]">{c.medical}</span>
                      </td>
                      <td className="p-3">
                        <span className={c.status === 'معتمد' ? 'pill-tag-mint text-[11px]' : 'pill-tag-shade text-[11px]'}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-zinc-100 flex-wrap gap-2">
              <span className="text-xs text-[#707070] font-mono">
                إجمالي السير المسجلة بالدفعة: {selectedBatch.cvs_count}
              </span>
              <div className="flex gap-2">
                {selectedBatch.status === 'بانتظار الاعتماد' && (
                  <button
                    onClick={() => {
                      handleApprove(selectedBatch.id);
                      setSelectedBatch(null);
                    }}
                    className="button-primary-pill text-xs font-bold inline-flex items-center gap-1"
                    style={{ padding: '6px 18px', background: '#141414', color: '#ffffff' }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>اعتماد ونقل كافة السير للـ ERP</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentImportsPage;
