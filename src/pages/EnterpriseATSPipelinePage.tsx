import React, { useState, useEffect } from 'react';
import { Candidate, CandidateStage } from '../types';
import { useCompany } from '../contexts/CompanyContext';
import { Badge } from '../components/ui/Badge';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { Users, UserPlus, Calendar, ArrowRight, ArrowLeft, Video, X } from 'lucide-react';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: 'CND-8801',
    candidateCode: 'C-2026-091',
    name: 'مريم علي أحمد',
    email: 'mariam.ali@gmail.com',
    phone: '+639171234567',
    nationality: 'الفلبين',
    appliedPosition: 'سائقة خاصة / عاملة منزليّة',
    targetCompanyId: 'masi',
    targetBranch: 'فرع المنسكية',
    stage: 'تقديم جديد',
    aiScore: 94,
    experienceYears: 5,
    education: 'دبلوم التمريض ورعاية كبار السن',
    expectedSalary: 1800,
    source: 'مكتب خارجي',
    externalOfficeName: 'Manila Talent Agency Manila',
    appliedDate: '2026-08-01',
  },
  {
    id: 'CND-8802',
    candidateCode: 'C-2026-092',
    name: 'أبيبيتش تاديسي',
    email: 'abebetch.t@yahoo.com',
    phone: '+251911987654',
    nationality: 'إثيوبيا',
    appliedPosition: 'عاملة منزلية شاملة',
    targetCompanyId: 'yaqoot',
    targetBranch: 'فرع جدة الرئيسي',
    stage: 'مؤهل',
    aiScore: 88,
    experienceYears: 3,
    education: 'الثانوية العامة',
    expectedSalary: 1200,
    source: 'مكتب خارجي',
    externalOfficeName: 'Addis International Bureau',
    appliedDate: '2026-08-03',
  },
  {
    id: 'CND-8803',
    candidateCode: 'C-2026-093',
    name: 'راجيش كومار',
    email: 'rajesh.kumar@outlook.com',
    phone: '+919820011223',
    nationality: 'الهند',
    appliedPosition: 'سائق مهني حافلات',
    targetCompanyId: 'topaz',
    targetBranch: 'فرع الدمام',
    stage: 'عرض عمل',
    aiScore: 96,
    experienceYears: 8,
    education: 'رخصة قيادة دولية معتمدة',
    expectedSalary: 2200,
    source: 'مكتب خارجي',
    externalOfficeName: 'Mumbai Skills Center',
    appliedDate: '2026-08-05',
  },
  {
    id: 'CND-8804',
    candidateCode: 'C-2026-094',
    name: 'ساليوان بيسيتشا',
    email: 'saliwan.b@recruit.co.th',
    phone: '+66812345678',
    nationality: 'تايلاند',
    appliedPosition: 'طباخة ماهرة ومربية',
    targetCompanyId: 'masi',
    targetBranch: 'فرع العليا - الرياض',
    stage: 'تأشيرة وتذكرة',
    aiScore: 92,
    experienceYears: 6,
    education: 'دبلوم فنون الطهي والضيافة',
    expectedSalary: 2000,
    source: 'مكتب خارجي',
    externalOfficeName: 'Bangkok Hospitality Hub',
    appliedDate: '2026-08-07',
  }
];

export const EnterpriseATSPipelinePage: React.FC = () => {
  const { activeCompany } = useCompany();
  const { addNotification } = useAppStore();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>('الكل');
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewDate, setInterviewDate] = useState('2026-08-20T10:00');
  const [interviewerName, setInterviewerName] = useState('عبدالعزيز التميمي');

  // New Requisition / Candidate Modal
  const [showNewCandidateModal, setShowNewCandidateModal] = useState(false);
  const [newCandidateForm, setNewCandidateForm] = useState({
    name: '',
    phone: '',
    nationality: 'الفلبين',
    appliedPosition: 'عاملة منزلية شاملة',
    targetBranch: 'الفرع الرئيسي - الرياض',
    expectedSalary: 1800,
    education: 'ثانوية عامة / تدريب مهني',
    experienceYears: 3,
  });

  useEffect(() => {
    realErpDataStore.getRecords<Candidate>('ats_candidates', INITIAL_CANDIDATES).then(data => setCandidates(data));
  }, []);

  const stagesList: CandidateStage[] = [
    'تقديم جديد',
    'فرز أولى',
    'مؤهل',
    'مقابلة أولى',
    'اختبار تقني',
    'المقابلة النهائية',
    'عرض عمل',
    'قبول العرض',
    'ما قبل الانضمام',
    'تأشيرة وتذكرة',
    'وصول وانضمام',
    'مرفوض',
  ];

  const handleMoveStage = async (candidateId: string, direction: 'next' | 'prev') => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    const currentIdx = stagesList.indexOf(candidate.stage);
    if (currentIdx === -1) return;

    let targetIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (targetIdx < 0 || targetIdx >= stagesList.length) return;

    const newStage = stagesList[targetIdx];
    const updated = await realErpDataStore.updateRecord<Candidate>(
      'ats_candidates',
      candidateId,
      { stage: newStage },
      INITIAL_CANDIDATES
    );
    setCandidates(updated);

    if (targetIdx === stagesList.length - 1) {
      await realErpDataStore.addRecord('employees', {
        id: `EMP-${Date.now().toString().slice(-4)}`,
        name: candidate.name,
        email: `${candidate.name.toLowerCase().replace(/\s+/g, '.')}@alsulaim.sa`,
        phone: candidate.phone,
        department: candidate.targetBranch || 'الإدارة العامة',
        role: candidate.appliedPosition || 'موظف تشغيلي',
        status: 'نشط',
        company_id: 'SAF',
        salary: candidate.expectedSalary || 5000,
        hire_date: new Date().toISOString().slice(0, 10),
      });
      addNotification({
        title: 'توظيف مرشح رسمي',
        message: `تم ترقية المرشح (${candidate.name}) لمرحلة التعيين وإنشاء ملفه الوظيفي تلقائياً في سجل الموظفين (HR).`,
        type: 'success',
      });
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (selectedStage !== 'الكل' && c.stage !== selectedStage) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#000000',
          color: '#FFF',
          padding: '28px',
          borderRadius: '16px',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="flex items-center gap-3">
          <BusinessIllustration type="ats-talent" size="sm" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                ENTERPRISE ATS RECRUITMENT PIPELINE
              </span>
              <span style={{ color: '#a1a1aa', fontSize: '12px' }}>تتبع المتقدمين والتوظيف الدولي</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, margin: '6px 0 0 0', letterSpacing: '-0.02em', color: '#ffffff', fontFamily: 'var(--font-family-display)' }}>
              مسار التوظيف والفرز الذكي (12 مرحلة متكاملة)
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa', fontWeight: 420 }}>
              تقييم السير بالذكاء الاصطناعي، جدولة المقابلات المرئية، وإصدار عروض العمل الرقمية لـ {activeCompany.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewCandidateModal(true)}
            className="button-white-pill"
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <UserPlus className="w-4 h-4 ml-1" />
            <span>+ طلب احتياج وظيفي جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 550, color: '#000000' }}>إجمالي المتقدمين النشطين</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>{candidates.length} مرشحاً</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>تم التدقيق الأمني</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', fontWeight: 550, color: '#71717a' }}>متوسط توافق الـ AI</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>92.5%</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>مطابقة المعايير</span>
        </div>

        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#000000', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', fontWeight: 550, color: '#a1a1aa' }}>عروض العمل المقبولة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>8 عروض</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>مرحلة التأشيرة</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', fontWeight: 550, color: '#71717a' }}>متوسط مدة الفرز والتوظيف</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>4.5 أيام</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>أسرع بـ 40%</span>
        </div>
      </div>

      {/* Stage Selector Pills */}
      <div className="flex flex-wrap gap-2 pb-3 border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setSelectedStage('الكل')}
          style={{
            padding: '6px 16px',
            borderRadius: '9999px',
            border: '1px solid',
            borderColor: selectedStage === 'الكل' ? '#000000' : '#e4e4e7',
            backgroundColor: selectedStage === 'الكل' ? '#000000' : '#ffffff',
            color: selectedStage === 'الكل' ? '#ffffff' : '#27272a',
            fontWeight: selectedStage === 'الكل' ? 550 : 420,
            fontSize: '12.5px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          جميع المراحل ({candidates.length})
        </button>
        {stagesList.map((stg) => {
          const count = candidates.filter(c => c.stage === stg).length;
          const isSel = selectedStage === stg;
          return (
            <button
              key={stg}
              type="button"
              onClick={() => setSelectedStage(stg)}
              style={{
                padding: '6px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isSel ? '#000000' : '#e4e4e7',
                backgroundColor: isSel ? '#000000' : '#ffffff',
                color: isSel ? '#ffffff' : '#27272a',
                fontWeight: isSel ? 550 : 420,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{stg}</span>
              <span className={isSel ? "pill-tag-mint" : "pill-tag-shade"} style={{ fontSize: '10px' }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Candidates Visual Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCandidates.map((cnd) => (
          <div
            key={cnd.id}
            className="card-pricing"
            style={{
              borderRadius: '24px',
              background: '#ffffff',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2.5">
                  <CorporateAvatar name={cnd.name} profession={cnd.appliedPosition} isCandidate size="md" status="verified" />
                  <div>
                    <span className="text-xs text-zinc-400 font-mono font-bold">{cnd.candidateCode}</span>
                    <h3 className="text-base font-bold text-black mt-0.5">{cnd.name}</h3>
                  </div>
                </div>

                {/* AI Score Badge */}
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-2.5 py-1 text-center">
                  <div className="text-[10px] font-bold">مطابقة AI</div>
                  <div className="text-sm font-bold font-mono">{cnd.aiScore}%</div>
                </div>
              </div>

              <div className="text-xs font-semibold text-zinc-800 mb-3">
                الوظيفة المطلوبة: <span className="text-emerald-700 font-bold">{cnd.appliedPosition}</span>
              </div>

              <div className="bg-zinc-50 p-3 rounded-2xl text-xs space-y-1.5 mb-4 border border-zinc-100 text-zinc-700">
                <div><strong>الجنسية والخبرة:</strong> {cnd.nationality} ({cnd.experienceYears} سنوات خبرة)</div>
                <div><strong>المؤهل العلمي:</strong> {cnd.education}</div>
                <div><strong>المكتب المصدر:</strong> {cnd.externalOfficeName || 'وكالة دولية معتمدة'}</div>
                <div><strong>الراتب المتوقع:</strong> <span className="font-mono font-bold text-black">{cnd.expectedSalary.toLocaleString()}</span> ⃁</div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <Badge
                  text={`المرحلة: ${cnd.stage}`}
                  type={cnd.stage === 'وصول وانضمام' ? 'success' : cnd.stage === 'مرفوض' ? 'danger' : 'purple'}
                />
                <button
                  onClick={() => {
                    setActiveCandidate(cnd);
                    setShowInterviewModal(true);
                  }}
                  className="button-outline-on-light"
                  style={{ fontSize: '11px', padding: '3px 10px', minHeight: '26px' }}
                >
                  <Calendar className="w-3 h-3 ml-1 text-blue-600" />
                  <span>جدولة مقابلة</span>
                </button>
              </div>
            </div>

            {/* Stage Transition Buttons */}
            <div className="flex gap-2 border-t border-zinc-100 pt-3">
              <button
                type="button"
                onClick={() => handleMoveStage(cnd.id, 'prev')}
                disabled={stagesList.indexOf(cnd.stage) <= 0}
                className="button-outline-on-light flex-1"
                style={{ fontSize: '11px', minHeight: '30px', padding: '4px', opacity: stagesList.indexOf(cnd.stage) <= 0 ? 0.35 : 1 }}
              >
                <ArrowRight className="w-3 h-3 ml-1" />
                <span>المرحلة السابقة</span>
              </button>
              <button
                type="button"
                onClick={() => handleMoveStage(cnd.id, 'next')}
                disabled={stagesList.indexOf(cnd.stage) >= stagesList.length - 1}
                className="button-primary-pill flex-1"
                style={{ fontSize: '11px', minHeight: '30px', padding: '4px', opacity: stagesList.indexOf(cnd.stage) >= stagesList.length - 1 ? 0.35 : 1 }}
              >
                <span>المرحلة التالية</span>
                <ArrowLeft className="w-3 h-3 mr-1" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* INTERVIEW MODAL */}
      {showInterviewModal && activeCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in dir-rtl text-right">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 bg-black text-white flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                <span>جدولة مقابلة مرئية: {activeCandidate.name}</span>
              </h2>
              <button
                onClick={() => setShowInterviewModal(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-white text-black">
              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">تاريخ وتوقيت المقابلة (بتوقيت الرياض)</label>
                <input
                  type="datetime-local"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">المسؤول عن المقابلة</label>
                <input
                  type="text"
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl text-xs text-emerald-900 leading-relaxed">
                سيتم إرسال رابط المقابلة المرئية تلقائياً للمرشح عبر الواتساب والبريد الإلكتروني، وإشعار المكتب الخارجي.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInterviewModal(false)}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (activeCandidate) {
                      const updated = candidates.map(c => 
                        c.id === activeCandidate.id ? { ...c, stage: 'مقابلة أولى' as CandidateStage } : c
                      );
                      setCandidates(updated);
                      await realErpDataStore.updateRecord<Candidate>('ats_candidates', activeCandidate.id, { stage: 'مقابلة أولى' }, INITIAL_CANDIDATES);
                      addNotification({
                        title: 'تأكيد موعد المقابلة',
                        message: `تم تأكيد موعد المقابلة للمرشح (${activeCandidate.name}) بتاريخ (${interviewDate}) وإرسال رابط المقابلة المرئية.`,
                        type: 'success',
                      });
                    }
                    setShowInterviewModal(false);
                  }}
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
                  تأكيد وإرسال الدعوة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Candidate / Requisition Modal */}
      {showNewCandidateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in border border-zinc-200">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-black m-0">إضافة طلب احتياج / مرشح وظيفي جديد</h3>
              </div>
              <button onClick={() => setShowNewCandidateModal(false)} className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCandidateForm.name || !newCandidateForm.phone) return;
                const newCandidate: Candidate = {
                  id: `CND-${Date.now().toString().slice(-4)}`,
                  candidateCode: `C-2026-${Math.floor(100 + Math.random() * 900)}`,
                  name: newCandidateForm.name,
                  email: `${newCandidateForm.name.replace(/\s+/g, '.').toLowerCase()}@example.com`,
                  phone: newCandidateForm.phone,
                  nationality: newCandidateForm.nationality,
                  appliedPosition: newCandidateForm.appliedPosition,
                  targetCompanyId: activeCompany.id,
                  targetBranch: newCandidateForm.targetBranch,
                  stage: 'تقديم جديد',
                  aiScore: Math.floor(85 + Math.random() * 14),
                  experienceYears: Number(newCandidateForm.experienceYears),
                  education: newCandidateForm.education,
                  expectedSalary: Number(newCandidateForm.expectedSalary),
                  source: 'موقع الشركة',
                  appliedDate: new Date().toISOString().split('T')[0],
                };

                const updated = await realErpDataStore.addRecord<Candidate>('ats_candidates', newCandidate, INITIAL_CANDIDATES);
                setCandidates(updated);
                addNotification({
                  title: 'إضافة مرشح جديد',
                  message: `تم تسجيل المرشح (${newCandidate.name}) بنجاح وإدراجه في مرحلة التقديم الأولي.`,
                  type: 'success',
                });
                setShowNewCandidateModal(false);
                setNewCandidateForm({
                  name: '',
                  phone: '',
                  nationality: 'الفلبين',
                  appliedPosition: 'عاملة منزلية شاملة',
                  targetBranch: 'الفرع الرئيسي - الرياض',
                  expectedSalary: 1800,
                  education: 'ثانوية عامة / تدريب مهني',
                  experienceYears: 3,
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">اسم المرشح / العاملة الكامل</label>
                <input
                  type="text"
                  required
                  value={newCandidateForm.name}
                  onChange={e => setNewCandidateForm({ ...newCandidateForm, name: e.target.value })}
                  placeholder="مثال: ساندرا كروز / مريم أحمد"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">رقم الهاتف / الواتساب</label>
                  <input
                    type="text"
                    required
                    value={newCandidateForm.phone}
                    onChange={e => setNewCandidateForm({ ...newCandidateForm, phone: e.target.value })}
                    placeholder="+9665xxxxxxxx"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">الجنسية</label>
                  <select
                    value={newCandidateForm.nationality}
                    onChange={e => setNewCandidateForm({ ...newCandidateForm, nationality: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value="الفلبين">الفلبين</option>
                    <option value="إثيوبيا">إثيوبيا</option>
                    <option value="كينيا">كينيا</option>
                    <option value="أوغندا">أوغندا</option>
                    <option value="سريلانكا">سريلانكا</option>
                    <option value="بنغلاديش">بنغلاديش</option>
                    <option value="الهند">الهند</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">المهنة المستهدفة</label>
                  <input
                    type="text"
                    value={newCandidateForm.appliedPosition}
                    onChange={e => setNewCandidateForm({ ...newCandidateForm, appliedPosition: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">الراتب الشهري المتوقع (⃁)</label>
                  <input
                    type="number"
                    value={newCandidateForm.expectedSalary}
                    onChange={e => setNewCandidateForm({ ...newCandidateForm, expectedSalary: Number(e.target.value) })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowNewCandidateModal(false)}
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
                  حفظ وتسجيل المرشح
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseATSPipelinePage;
