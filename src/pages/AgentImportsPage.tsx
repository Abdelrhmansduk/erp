import i18n from '../i18n/config';
import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '../components/ui/Badge';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { useAuthContext } from '../contexts/AuthContext';
import { IMPORT_TEMPLATES, downloadTemplate } from '../services/importEngine';
import {
  UploadCloud,
  Download,
  FileSpreadsheet,
  Check,
  Search,
  Plus,
  Eye,
  X,
  Trash2,
  FileText,
  MessageCircle,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { SmartCvExtractorModal } from '../components/cvs/SmartCvExtractorModal';
import {
  ProfessionalAgencyCvTemplate,
  type PrintableAgencyCvData,
} from '../components/cvs/ProfessionalAgencyCvTemplate';
import {
  getUnifiedAgenciesSync,
  dispatchViaEmailAndWhatsApp,
} from '../services/externalAgencyMasterService';

export interface ImportBatch {
  id: string;
  batch_code: string;
  office_name: string;
  agency_id?: string;
  country: string;
  cvs_count: number;
  status: 'بانتظار الاعتماد' | 'مستوردة بالكامل' | 'مرفوضة';
  created_at: string;
  notes?: string;
  candidates?: Array<{
    id: string;
    cv_id?: string;
    name: string;
    passport: string;
    age: number;
    profession: string;
    experience: string;
    medical: 'لائق' | 'قيد الفحص';
    status: 'معتمد' | 'مرفوض' | 'قيد المراجعة';
  }>;
}

const MOCK_BATCHES: ImportBatch[] = [];

export const AgentImportsPage: React.FC = () => {
  const { user } = useAuthContext();
  const { setActiveTab, addNotification } = useAppStore();

  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [pendingCvs, setPendingCvs] = useState<Record<string, any>[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSmartExtractor, setShowSmartExtractor] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch | null>(null);
  const [previewCv, setPreviewCv] = useState<PrintableAgencyCvData | null>(null);
  const [revisionTargetCv, setRevisionTargetCv] = useState<Record<string, any> | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [targetScopeByCv, setTargetScopeByCv] = useState<Record<string, string>>({});

  const agencies = getUnifiedAgenciesSync();

  const refreshQueue = useCallback(async () => {
    const batchData = await realErpDataStore.getRecords<ImportBatch>('agent_imports', MOCK_BATCHES);
    setBatches(batchData);
    const allCvs = await realErpDataStore.getRecords<any>('cvs', []);
    setPendingCvs(allCvs.filter((c) => c.status === 'بانتظار الاعتماد'));
  }, []);

  useEffect(() => {
    void refreshQueue();
    window.addEventListener('erp-data-updated', refreshQueue);
    return () => window.removeEventListener('erp-data-updated', refreshQueue);
  }, [refreshQueue]);

  const handleApproveSingleCv = async (cv: Record<string, any>) => {
    const chosenScope = targetScopeByCv[cv.id] || cv.target_company_scope || 'ALL';
    const approverName = user?.full_name || 'إسلام أحمد عرفة';

    await realErpDataStore.updateRecord<any>('cvs', cv.id, {
      status: 'متاح',
      approval_status: 'APPROVED',
      approved_by: approverName,
      approved_at: new Date().toISOString(),
      target_company_scope: chosenScope,
      revision_note: '',
    });

    const ag = agencies.find((a) => a.id === cv.agency_id);
    await dispatchViaEmailAndWhatsApp({
      recipientName: cv.external_office || ag?.name_ar || 'الوكيل الخارجي',
      recipientPhone: ag?.whatsapp || ag?.phone,
      recipientEmail: ag?.email,
      subject: `اعتماد ونشر السيرة الذاتية (${cv.cv_code}) للمبيعات`,
      bodyText: `تم اعتماد السيرة الذاتية للمرشحة (${cv.maid_name}) جواز (${cv.passport_number}) من قبل (${approverName}) وإتاحتها الآن لأقسام المبيعات (${chosenScope === 'ALL' ? 'مشترك لجميع الشركات' : chosenScope}).`,
      channel: 'both',
      templateName: 'إشعار اعتماد سيرة ذاتية للمبيعات',
      companyId: chosenScope === 'ALL' ? 'SAF' : chosenScope,
      openExternalClient: false,
    });

    await refreshQueue();
    addNotification({
      title: 'تم اعتماد السيرة ونشرها للمبيعات',
      message: `أصبحت السيرة (${cv.cv_code}) بحالة «متاح» لدى المبيعات وتم إشعار الوكيل عبر البريد والواتساب.`,
      type: 'success',
    });
  };

  const handleRequestRevisionOnCv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionTargetCv || !revisionNote.trim()) return;

    await realErpDataStore.updateRecord<any>('cvs', revisionTargetCv.id, {
      approval_status: 'REVISION_REQUESTED',
      revision_note: revisionNote.trim(),
    });

    const ag = agencies.find((a) => a.id === revisionTargetCv.agency_id);
    await dispatchViaEmailAndWhatsApp({
      recipientName: revisionTargetCv.external_office || ag?.name_ar || 'الوكيل الخارجي',
      recipientPhone: ag?.whatsapp || ag?.phone,
      recipientEmail: ag?.email,
      subject: `ملاحظة تعديل على السيرة (${revisionTargetCv.cv_code})`,
      bodyText: `يرجى من الوكالة استكمال الملاحظة التالية على السيرة (${revisionTargetCv.maid_name} — ${revisionTargetCv.passport_number}):\n"${revisionNote.trim()}"`,
      channel: 'both',
      templateName: 'طلب استكمال/تعديل سيرة من الوكيل',
      companyId: 'SAF',
      openExternalClient: false,
    });

    setRevisionTargetCv(null);
    setRevisionNote('');
    await refreshQueue();
    addNotification({
      title: 'تم إرجاع السيرة بملاحظة للوكيل',
      message: 'ظهرت الملاحظة في بوابة الوكيل الخارجي وتم إرسالها عبر البريد الإلكتروني والواتساب.',
      type: 'info',
    });
  };

  const handleApproveBatch = async (batchId: string) => {
    const target = batches.find((b) => b.id === batchId);
    await realErpDataStore.updateRecord<ImportBatch>(
      'agent_imports',
      batchId,
      { status: 'مستوردة بالكامل' },
      MOCK_BATCHES
    );

    if (target?.candidates) {
      const existingCvs = await realErpDataStore.getRecords<any>('cvs', []);
      for (const cand of target.candidates) {
        const matchedExisting = existingCvs.find(
          (c) =>
            c.id === cand.cv_id ||
            String(c.passport_number || '').toUpperCase() === cand.passport.toUpperCase()
        );
        if (matchedExisting) {
          await realErpDataStore.updateRecord<any>('cvs', matchedExisting.id, {
            status: 'متاح',
            approval_status: 'APPROVED',
            approved_by: user?.full_name || 'قسم المتابعة الخارجية',
          });
        } else {
          await realErpDataStore.addRecord('cvs', {
            id: `CV-${Date.now()}-${cand.id}`,
            cv_code: `#CV-2026-${Math.floor(100 + Math.random() * 899)}`,
            agency_id: target.agency_id,
            target_company_scope: 'ALL',
            maid_name: cand.name,
            maid_name_ar: cand.name,
            passport_number: cand.passport,
            nationality: target.country,
            job: cand.profession,
            type: 'استقدام',
            age: cand.age,
            religion: 'مسلمة',
            marital_status: 'عزباء',
            experience_years: 2,
            experience_country: cand.experience,
            salary: 1200,
            external_office: target.office_name,
            skills: ['تنظيف شامل', 'رعاية أطفال', 'إدارة منزلية'],
            status: 'متاح',
            approval_status: 'APPROVED',
            created_at: new Date().toISOString().slice(0, 10),
          });
        }
      }
    }

    const ag = agencies.find((a) => a.id === target?.agency_id);
    if (target) {
      await dispatchViaEmailAndWhatsApp({
        recipientName: target.office_name,
        recipientPhone: ag?.whatsapp || ag?.phone,
        recipientEmail: ag?.email,
        subject: `اعتماد دفعة السير (${target.batch_code})`,
        bodyText: `تم اعتماد دفعة السير (${target.batch_code}) المرفوعة من (${target.office_name}) ونشرها لأقسام المبيعات.`,
        channel: 'both',
        templateName: 'اعتماد دفعة سير من الوكيل',
        companyId: 'SAF',
        openExternalClient: false,
      });
    }

    await refreshQueue();
    addNotification({
      title: 'تم اعتماد الدفعة ونشر السير للمبيعات',
      message: `تم اعتماد الدفعة (${target?.batch_code || batchId}) وإشعار الوكيل عبر البريد والواتساب.`,
      type: 'success',
    });
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (window.confirm('هل أنت متأكد من حذف سجل هذه الدفعة؟')) {
      await realErpDataStore.deleteRecord<ImportBatch>('agent_imports', batchId, MOCK_BATCHES);
      await refreshQueue();
      addNotification({
        title: 'حذف الدفعة',
        message: 'تم حذف الدفعة بنجاح من سجلات الاستيراد.',
        type: 'info',
      });
    }
  };

  const handleDownloadCVTemplate = () => {
    const cvTemplate = IMPORT_TEMPLATES.find((t) => t.entityKey === 'cvs');
    if (cvTemplate) downloadTemplate(cvTemplate);
  };

  const filteredBatches = (batches.length > 0 ? batches : MOCK_BATCHES).filter(
    (b) =>
      (b.batch_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.office_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.country || '').includes(searchQuery)
  );

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Top Banner */}
      <div className="bg-[#141414] text-[#ffffff] rounded-[24px] p-6 sm:p-7 border border-[#262626] flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3.5">
          <BusinessIllustration type="foreign-agencies" size="sm" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full bg-[#262626] text-[#ffffff] text-[11px] font-semibold">
                {i18n.t('ats.agentBatchImports', 'بوابة الاعتماد الإلزامي — إسلام عرفة ومحمود فودة')}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#ffffff]">
              طابور تدقيق واعتماد سير الوكلاء بالخارج.
            </h1>
            <p className="text-xs text-[#adadad] mt-1">
              لا تظهر أي سيرة يرفعها الوكيل الخارجي لقسم المبيعات إلا بعد مراجعتها واعتمادها هنا مع إشعار البريد والواتساب.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowSmartExtractor(true)}
            className="px-4 py-2.5 rounded-full bg-[#ffffff] hover:bg-[#f3f3f3] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>رفع واستخلاص سيرة ذكي (PDF / MRZ)</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadCVTemplate}
            className="px-4 py-2.5 rounded-full bg-[#262626] hover:bg-[#333333] text-[#ffffff] border border-[#404040] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تحميل نموذج Excel</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transactions-followup', 'مركز متابعة المعاملات والوكلاء (مساند)')}
            className="px-4 py-2.5 rounded-full bg-[#262626] hover:bg-[#333333] text-[#ffffff] border border-[#404040] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>مركز متابعة المعاملات</span>
          </button>
        </div>
      </div>

      {/* Individual CVs Awaiting Mandatory Follow-up Approval */}
      {pendingCvs.length > 0 && (
        <div className="bg-[#ffffff] border border-[#141414] rounded-[24px] overflow-hidden">
          <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#141414]">
                سير ذاتية مرفوعة من الوكلاء بانتظار الاعتماد الإلزامي ({pendingCvs.length})
              </h2>
              <p className="text-[11px] text-[#707070]">
                افحص القالب ثنائي الصفحات وحدد شركة المبيعات المستهدفة (أو البنك المشترك) ثم اعتمدها أو اطلب تعديلاً من الوكيل.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#ffffff] border-b border-[#e0e0e0] font-bold text-[#141414]">
                <tr>
                  <th className="p-3.5">كود السيرة</th>
                  <th className="p-3.5">المرشحة والجواز</th>
                  <th className="p-3.5">الوكيل الخارجي</th>
                  <th className="p-3.5">نطاق الإتاحة للمبيعات</th>
                  <th className="p-3.5 text-center">قرار المتابعة (إسلام / محمود)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {pendingCvs.map((cv) => (
                  <tr key={cv.id} className="hover:bg-[#f3f3f3]">
                    <td className="p-3.5 font-mono font-bold">{cv.cv_code}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#141414]">{cv.maid_name}</div>
                      <div className="font-mono text-[11px] text-[#707070]">
                        {cv.passport_number} ({cv.nationality} • {cv.salary} ⃁)
                      </div>
                    </td>
                    <td className="p-3.5 font-semibold">{cv.external_office}</td>
                    <td className="p-3.5">
                      <select
                        aria-label={`نطاق شركة المبيعات للسيرة ${cv.cv_code}`}
                        value={targetScopeByCv[cv.id] || cv.target_company_scope || 'ALL'}
                        onChange={(e) =>
                          setTargetScopeByCv({ ...targetScopeByCv, [cv.id]: e.target.value })
                        }
                        className="px-3 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
                      >
                        <option value="ALL">بنك مشترك (SAF + TOP + YAQ + DAR)</option>
                        <option value="SAF">السفير الماسي فقط (SAF)</option>
                        <option value="TOP">توباز فقط (TOP)</option>
                        <option value="YAQ">ياقوت نجد فقط (YAQ)</option>
                        <option value="DAR">دار الرواد فقط (DAR)</option>
                      </select>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                        <button
                          type="button"
                          onClick={() => setPreviewCv(cv as PrintableAgencyCvData)}
                          className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>فحص القالب</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveSingleCv(cv)}
                          className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>اعتماد ونشر + بريد/واتس</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRevisionTargetCv(cv);
                            setRevisionNote(cv.revision_note || '');
                          }}
                          className="px-3 py-1.5 rounded-full bg-[#ffffff] hover:bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>طلب تعديل من الوكيل</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Batches Table */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#e0e0e0] flex-wrap gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#707070]" />
            <input
              type="text"
              aria-label="ابحث بكود الدفعة، المكتب، أو الدولة"
              placeholder="ابحث بكود الدفعة، المكتب، أو الدولة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 rounded-full bg-[#f0f0f0] text-xs text-[#141414]"
            />
          </div>
          <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-xs font-bold text-[#141414]">
            الدفعات: {filteredBatches.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-[#141414]">
            <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
              <tr>
                <th className="p-3.5">كود الدفعة</th>
                <th className="p-3.5">المكتب الخارجي والدولة</th>
                <th className="p-3.5">عدد السير</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {filteredBatches.map((row) => (
                <tr key={row.id} className="hover:bg-[#f3f3f3] transition-colors">
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
                  <td className="p-3.5 font-semibold">{row.cvs_count} سيرة ذاتية</td>
                  <td className="p-3.5 font-mono text-[#707070]">{row.created_at}</td>
                  <td className="p-3.5">
                    <Badge
                      text={row.status}
                      type={
                        row.status === 'مستوردة بالكامل'
                          ? 'success'
                          : row.status === 'مرفوضة'
                          ? 'danger'
                          : 'warning'
                      }
                    />
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedBatch(row)}
                        className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>فحص الدفعة</span>
                      </button>
                      {row.status === 'بانتظار الاعتماد' && (
                        <button
                          type="button"
                          onClick={() => handleApproveBatch(row.id)}
                          className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>اعتماد ونشر</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteBatch(row.id)}
                        className="p-1.5 rounded-full hover:bg-[#f3f3f3] text-[#707070] hover:text-[#141414] cursor-pointer"
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

      {/* Smart CV Extractor Modal */}
      <SmartCvExtractorModal
        isOpen={showSmartExtractor}
        onClose={() => setShowSmartExtractor(false)}
        agencyName={agencies[0]?.name_ar || 'وكالة خارجية معتمدة'}
        agencyId={agencies[0]?.id}
        isExternalAgentSession={false}
        onSaved={() => void refreshQueue()}
      />

      {/* Revision Request Modal */}
      {revisionTargetCv && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setRevisionTargetCv(null)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 max-w-md w-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h3 className="font-bold text-sm text-[#141414]">
                طلب تعديل / استكمال من الوكيل — {revisionTargetCv.cv_code}
              </h3>
              <button
                type="button"
                onClick={() => setRevisionTargetCv(null)}
                className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRequestRevisionOnCv} className="space-y-3 text-xs">
              <textarea
                rows={3}
                required
                placeholder="مثال: يرجى إرفاق صورة جواز سفر أوضح أو تحديث رابط فيديو المقابلة..."
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                className="w-full p-3 rounded-[16px] bg-[#f0f0f0] text-[#141414]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRevisionTargetCv(null)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] text-[#141414] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>إرسال الملاحظة للوكيل (بريد + واتس)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Inspection Modal */}
      {selectedBatch && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedBatch(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] rounded-[24px] p-6 max-w-2xl w-full border border-[#e0e0e0] space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#e0e0e0]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#141414]" />
                <div>
                  <h3 className="font-bold text-[#141414] text-base">
                    فحص السير الذاتية — الدفعة ({selectedBatch.batch_code})
                  </h3>
                  <p className="text-[11px] text-[#707070]">
                    {selectedBatch.office_name} • {selectedBatch.country}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBatch(null)}
                className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] font-bold border-b border-[#e0e0e0] text-[#141414]">
                  <tr>
                    <th className="p-3">اسم المرشحة</th>
                    <th className="p-3">رقم الجواز</th>
                    <th className="p-3">العمر والمهنة</th>
                    <th className="p-3">الخبرة</th>
                    <th className="p-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {(selectedBatch.candidates || []).map((c) => (
                    <tr key={c.id} className="hover:bg-[#f3f3f3]">
                      <td className="p-3 font-bold text-[#141414]">{c.name}</td>
                      <td className="p-3 font-mono text-[#141414]">{c.passport}</td>
                      <td className="p-3 text-[#707070]">
                        {c.profession} ({c.age} سنة)
                      </td>
                      <td className="p-3 text-[#707070]">{c.experience}</td>
                      <td className="p-3 font-bold">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {selectedBatch.status === 'بانتظار الاعتماد' && (
                <button
                  type="button"
                  onClick={() => {
                    void handleApproveBatch(selectedBatch.id);
                    setSelectedBatch(null);
                  }}
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                >
                  اعتماد الدفعة ونشرها للمبيعات
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedBatch(null)}
                className="px-4 py-2 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-Page SHEGER Preview Modal */}
      {previewCv && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewCv(null)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 max-w-5xl w-full max-h-[92vh] overflow-y-auto"
          >
            <ProfessionalAgencyCvTemplate
              cv={previewCv}
              defaultOfficeCode="INTERNAL_AUDIT"
              canViewInternalAudit={true}
              onClose={() => setPreviewCv(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentImportsPage;
