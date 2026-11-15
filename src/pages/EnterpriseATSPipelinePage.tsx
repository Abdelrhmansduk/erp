import React, { useState, useEffect } from 'react';
import { Candidate, CandidateStage } from '../types';
import { useCompany } from '../contexts/CompanyContext';
import { Badge } from '../components/ui/Badge';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { saveUnifiedEmployeeProfile } from '../services/employeeProfileSync';
import { triggerNewEmployeeOnboardingConsequences } from '../services/employeeWelcomeBroadcastService';
import { CareerApplicationRecord } from '../services/hrGovernanceTalentPulseEngine';
import { Users, UserPlus, Calendar, ArrowRight, ArrowLeft, Video, X, CheckCircle2, Tv, FileCheck } from 'lucide-react';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

type CandidateCategoryFilter =
  | 'كافة المرشحين'
  | 'مرشحو التوظيف الداخلي وبوابة التوظيف'
  | 'مرشحو العمالة';

interface ExtendedCandidate extends Candidate {
  fromCareerPortal?: boolean;
  careerApplicationId?: string;
  department?: string;
  nationalIdMasked?: string;
  onboardedEmployeeCode?: string;
}

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
  },
];

const DEFAULT_CAREER_PORTAL_APPLICATIONS: CareerApplicationRecord[] = [
  {
    id: 'APP-202601-KSA',
    company_id: 'SAF',
    job_id: 'JOB-KAS-2026-01',
    job_title: 'أخصائي أول موارد بشرية وحماية الأجور (Mudad / Qiwa)',
    candidate_name: 'طلال بن عبدالعزيز الدوسري',
    email: 'talal.aldosari@kas-careers.sa',
    phone: '+966554128901',
    national_id_masked: '1089****42',
    nationality: 'سعودي',
    years_experience: 6,
    expected_salary_sar: 12500,
    skills_summary: 'إدارة ملفات حماية الأجور مدد، توثيق عقود قوى، التأمينات الاجتماعية GOSI، نظام العمل السعودي',
    ai_match_score: 97,
    stage: 'OFFERED',
    applied_at: '2026-08-04T09:15:00Z',
  },
  {
    id: 'APP-202602-KSA',
    company_id: 'YAQ',
    job_id: 'JOB-KAS-2026-02',
    job_title: 'محاسب ضريبي وتقارير مالية (ZATCA Phase 2)',
    candidate_name: 'رغد بنت محمد القحطاني',
    email: 'raghad.qahtani@kas-careers.sa',
    phone: '+966509314420',
    national_id_masked: '1102****85',
    nationality: 'سعودي',
    years_experience: 4,
    expected_salary_sar: 13500,
    skills_summary: 'الفوترة الإلكترونية ZATCA المرحلة الثانية، التسويات البنكية، معايير SOCPA ومراكز التكلفة',
    ai_match_score: 95,
    stage: 'INTERVIEW',
    applied_at: '2026-08-06T11:30:00Z',
  },
];

function mapCareerStageToCandidateStage(stage: CareerApplicationRecord['stage']): CandidateStage {
  switch (stage) {
    case 'APPLIED':
      return 'تقديم جديد';
    case 'SCREENING':
      return 'فرز أولى';
    case 'INTERVIEW':
      return 'مقابلة أولى';
    case 'OFFERED':
      return 'عرض عمل';
    case 'HIRED':
      return 'وصول وانضمام';
    case 'REJECTED':
      return 'مرفوض';
    default:
      return 'تقديم جديد';
  }
}

function mapCandidateStageToCareerStage(stage: CandidateStage): CareerApplicationRecord['stage'] {
  switch (stage) {
    case 'تقديم جديد':
      return 'APPLIED';
    case 'فرز أولى':
    case 'مؤهل':
      return 'SCREENING';
    case 'مقابلة أولى':
    case 'اختبار تقني':
    case 'المقابلة النهائية':
      return 'INTERVIEW';
    case 'عرض عمل':
    case 'قبول العرض':
    case 'ما قبل الانضمام':
    case 'تأشيرة وتذكرة':
      return 'OFFERED';
    case 'وصول وانضمام':
      return 'HIRED';
    case 'مرفوض':
      return 'REJECTED';
    default:
      return 'APPLIED';
  }
}

function convertCareerAppToCandidate(app: CareerApplicationRecord): ExtendedCandidate {
  return {
    id: app.id,
    candidateCode: app.id.startsWith('APP-') ? app.id.slice(0, 12) : `APP-${app.id.slice(-5)}`,
    name: app.candidate_name,
    email: app.email,
    phone: app.phone,
    nationality: app.nationality || 'سعودي',
    appliedPosition: app.job_title,
    targetCompanyId: (app.company_id || 'masi') as Candidate['targetCompanyId'],
    targetBranch: 'المقر الرئيسي - الرياض',
    stage: mapCareerStageToCandidateStage(app.stage),
    aiScore: app.ai_match_score || 90,
    experienceYears: app.years_experience || 3,
    education: app.skills_summary || 'بكالوريوس تخصصي معتمد',
    expectedSalary: app.expected_salary_sar || 10000,
    source: 'معرض توظيف',
    externalOfficeName: 'بوابة التوظيف والاستقطاب الداخلي',
    appliedDate: (app.applied_at || new Date().toISOString()).slice(0, 10),
    fromCareerPortal: true,
    careerApplicationId: app.id,
    nationalIdMasked: app.national_id_masked,
  };
}

export const EnterpriseATSPipelinePage: React.FC = () => {
  const { activeCompany } = useCompany();
  const { addNotification } = useAppStore();
  const [candidates, setCandidates] = useState<ExtendedCandidate[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>('الكل');
  const [categoryFilter, setCategoryFilter] = useState<CandidateCategoryFilter>('كافة المرشحين');
  const [activeCandidate, setActiveCandidate] = useState<ExtendedCandidate | null>(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewDate, setInterviewDate] = useState('2026-08-20T10:00');
  const [interviewerName, setInterviewerName] = useState('عبدالعزيز التميمي');
  const [processingCandidateId, setProcessingCandidateId] = useState<string | null>(null);

  // New Requisition / Candidate Modal
  const [showNewCandidateModal, setShowNewCandidateModal] = useState(false);
  const [newCandidateForm, setNewCandidateForm] = useState({
    name: '',
    phone: '',
    nationality: 'سعودي',
    appliedPosition: 'أخصائي عمليات وموارد بشرية',
    targetBranch: 'الفرع الرئيسي - الرياض',
    expectedSalary: 9500,
    education: 'بكالوريوس إدارة أعمال / موارد بشرية',
    experienceYears: 3,
    sourceType: 'موقع الشركة' as Candidate['source'],
  });

  const loadMergedPipelineCandidates = async () => {
    const [atsList, careerApps] = await Promise.all([
      realErpDataStore.getRecords<ExtendedCandidate>('ats_candidates', INITIAL_CANDIDATES),
      realErpDataStore.getRecords<CareerApplicationRecord>(
        'hr_career_applications',
        DEFAULT_CAREER_PORTAL_APPLICATIONS
      ),
    ]);

    const existingIds = new Set(atsList.map((c) => String(c.id)));
    const convertedCareerCandidates: ExtendedCandidate[] = careerApps
      .filter((app) => !existingIds.has(String(app.id)))
      .map(convertCareerAppToCandidate);

    const normalizedAts: ExtendedCandidate[] = atsList.map((c) => {
      const srcStr = String(c.source || '');
      return {
        ...c,
        fromCareerPortal:
          Boolean(c.fromCareerPortal) ||
          srcStr === 'موقع الشركة' ||
          srcStr === 'معرض توظيف' ||
          srcStr === 'تطبيق جوال' ||
          srcStr === 'LinkedIn' ||
          String(c.id).startsWith('APP-'),
      };
    });

    setCandidates([...convertedCareerCandidates, ...normalizedAts]);
  };

  useEffect(() => {
    loadMergedPipelineCandidates();
    const handleSync = () => loadMergedPipelineCandidates();
    window.addEventListener('erp-data-updated', handleSync);
    return () => window.removeEventListener('erp-data-updated', handleSync);
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

  const handleConvertHiredToEmployee = async (candidate: ExtendedCandidate) => {
    setProcessingCandidateId(candidate.id);
    try {
      const targetCompanyId =
        activeCompany.id === 'all'
          ? candidate.targetCompanyId && candidate.targetCompanyId !== 'all'
            ? candidate.targetCompanyId.toUpperCase()
            : 'SAF'
          : activeCompany.id.toUpperCase();

      const todayIso = new Date().toISOString().slice(0, 10);
      const cleanToken = String(candidate.id)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(-6);
      const empId = `emp-ats-${cleanToken}`;
      const empCode = `EMP-${targetCompanyId}-${Math.floor(100 + Math.random() * 899)}`;
      const corporateEmail =
        candidate.email && candidate.email.endsWith('@kas.sa')
          ? candidate.email
          : `emp.${cleanToken}@kas.sa`;
      const isSaudi = candidate.nationality === 'سعودي' || candidate.nationality === 'السعودية';
      const generatedNationalId = isSaudi
        ? `10${Math.floor(10000000 + Math.random() * 89999999)}`
        : `24${Math.floor(10000000 + Math.random() * 89999999)}`;

      // 1. Persist unified employee profile across both `hr_employees` and `employees`
      const unifiedProfile = await saveUnifiedEmployeeProfile(
        {
          id: empId,
          employee_code: empCode,
          company_id: targetCompanyId,
          name: candidate.name,
          job_title: candidate.appliedPosition || 'أخصائي عمليات',
          role: candidate.appliedPosition || 'أخصائي عمليات',
          department: candidate.fromCareerPortal ? 'الموارد البشرية والتشغيل' : 'التشغيل والخدمات المساندة',
          branch: candidate.targetBranch || 'المقر الرئيسي - الرياض',
          nationality: candidate.nationality || 'سعودي',
          national_id: generatedNationalId,
          phone: candidate.phone || '0500000000',
          email: corporateEmail,
          salary: Number(candidate.expectedSalary) || 6500,
          hire_date: todayIso,
          probation_days: 90,
          status: 'تحت التجربة',
          qualification: candidate.education || 'بكالوريوس',
        },
        null,
        'نظام الفرز والتوظيف الذكي (ATS)'
      );

      // 2. Trigger 7-step onboarding consequences + Smart TV Welcome Broadcast (`hr_welcome_broadcasts`) + 30/60/90 plan (`hr_onboarding_plans`)
      const onboardingResult = await triggerNewEmployeeOnboardingConsequences({
        companyId: targetCompanyId,
        companyNameAr: activeCompany.name || 'مجموعة خالد السليم القابضة',
        employeeId: String(unifiedProfile.id || empId),
        employeeCode: String(unifiedProfile.employee_code || empCode),
        employeeName: candidate.name,
        nationalId: generatedNationalId,
        jobTitle: candidate.appliedPosition || 'أخصائي عمليات',
        department: String(unifiedProfile.department || 'الموارد البشرية والتشغيل'),
        branch: candidate.targetBranch || 'المقر الرئيسي - الرياض',
        hireDate: todayIso,
        salary: Number(candidate.expectedSalary) || 6500,
        phone: candidate.phone,
        email: corporateEmail,
        buddyName: interviewerName || 'عبدالعزيز التميمي',
        autoBroadcastToScreens: true,
        autoSendWelcomeEmail: true,
        initiatedBy: 'مسار التوظيف والفرز الذكي (ATS)',
      });

      // 3. Persist 90-day probation evaluation plan in `hr_probation_evaluations` (Saudi Labor Law Art. 53)
      const probationEndIso = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      await realErpDataStore.addRecord('hr_probation_evaluations', {
        id: `PRB-${empCode}-${Date.now().toString().slice(-4)}`,
        company_id: targetCompanyId,
        employee_id: String(unifiedProfile.id || empId),
        employee_code: String(unifiedProfile.employee_code || empCode),
        employee_name: candidate.name,
        job_title: candidate.appliedPosition || 'أخصائي عمليات',
        department: String(unifiedProfile.department || 'الموارد البشرية والتشغيل'),
        hire_date: todayIso,
        probation_days: 90,
        probation_end_date: probationEndIso,
        day_30_score: 90,
        day_60_score: 92,
        day_90_score: 94,
        overall_status: 'تحت التقييم (90 يوماً - المادة 53)',
        mentor_name: interviewerName || 'عبدالعزيز التميمي',
        welcome_broadcast_id: onboardingResult.broadcast.id,
        created_at: new Date().toISOString(),
      });

      // 4. Sync stage in `hr_career_applications` and `ats_candidates`
      if (candidate.fromCareerPortal) {
        const apps = await realErpDataStore.getRecords<CareerApplicationRecord>(
          'hr_career_applications',
          DEFAULT_CAREER_PORTAL_APPLICATIONS
        );
        const targetApp = apps.find(
          (a) => a.id === candidate.id || a.id === candidate.careerApplicationId
        );
        if (targetApp) {
          await realErpDataStore.updateRecord<CareerApplicationRecord>(
            'hr_career_applications',
            targetApp.id,
            { stage: 'HIRED' },
            DEFAULT_CAREER_PORTAL_APPLICATIONS
          );
        }
      }

      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidate.id
            ? {
                ...c,
                stage: 'وصول وانضمام',
                onboardedEmployeeCode: String(unifiedProfile.employee_code || empCode),
              }
            : c
        )
      );

      addNotification({
        title: 'اعتماد التوظيف وتفعيل التهيئة الشاملة (90 يوماً)',
        message: `تم ترحيل المرشح (${candidate.name}) إلى سجل الموظفين الموحد برقم (${unifiedProfile.employee_code || empCode})، وإصدار خطة التجربة (90 يوماً)، وبث بطاقة الترحيب على شاشات العرض الذكية.`,
        type: 'success',
      });
    } finally {
      setProcessingCandidateId(null);
    }
  };

  const handleMoveStage = async (candidateId: string, direction: 'next' | 'prev') => {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) return;

    const currentIdx = stagesList.indexOf(candidate.stage);
    if (currentIdx === -1) return;

    const targetIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (targetIdx < 0 || targetIdx >= stagesList.length) return;

    const newStage = stagesList[targetIdx];

    if (candidate.fromCareerPortal) {
      await realErpDataStore.updateRecord<CareerApplicationRecord>(
        'hr_career_applications',
        candidate.careerApplicationId || candidate.id,
        { stage: mapCandidateStageToCareerStage(newStage) },
        DEFAULT_CAREER_PORTAL_APPLICATIONS
      );
    } else {
      await realErpDataStore.updateRecord<Candidate>(
        'ats_candidates',
        candidateId,
        { stage: newStage },
        INITIAL_CANDIDATES
      );
    }

    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, stage: newStage } : c))
    );

    if (newStage === 'وصول وانضمام') {
      await handleConvertHiredToEmployee({ ...candidate, stage: newStage });
    } else if (newStage === 'مرفوض') {
      addNotification({
        title: 'استبعاد مرشح',
        message: `تم نقل المرشح (${candidate.name}) إلى قائمة المرفوضين وإغلاق طلب الترشح.`,
        type: 'warning',
      });
    }
  };

  const isInternalOrPortalCandidate = (c: ExtendedCandidate): boolean => {
    const srcStr = String(c.source || '');
    return (
      Boolean(c.fromCareerPortal) ||
      srcStr === 'موقع الشركة' ||
      srcStr === 'معرض توظيف' ||
      srcStr === 'تطبيق جوال' ||
      srcStr === 'LinkedIn' ||
      srcStr === 'إحالة داخلية' ||
      String(c.id).startsWith('APP-')
    );
  };

  const filteredCandidates = candidates.filter((c) => {
    if (selectedStage !== 'الكل' && c.stage !== selectedStage) return false;
    if (categoryFilter === 'مرشحو التوظيف الداخلي وبوابة التوظيف') {
      return isInternalOrPortalCandidate(c);
    }
    if (categoryFilter === 'مرشحو العمالة') {
      return !isInternalOrPortalCandidate(c);
    }
    return true;
  });

  const portalCount = candidates.filter(isInternalOrPortalCandidate).length;
  const laborCount = candidates.length - portalCount;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#141414',
          color: '#ffffff',
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
              <span style={{ color: '#adadad', fontSize: '12px' }}>
                بوابة التوظيف الموحدة والفرز الذكي والتهيئة التلقائية
              </span>
            </div>
            <h1
              className="display-sm"
              style={{
                fontSize: '24px',
                fontWeight: 330,
                margin: '6px 0 0 0',
                letterSpacing: '-0.02em',
                color: '#ffffff',
                fontFamily: 'var(--font-family-display)',
              }}
            >
              مسار التوظيف والفرز الذكي (12 مرحلة متكاملة)
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#adadad', fontWeight: 420 }}>
              دمج متقدمي بوابة التوظيف العامة مع مرشحي الاستقدام، وإصدار ملف الموظف وخطة الـ 90 يوماً وشاشة الترحيب فور التعيين لـ {activeCompany.name}
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
          <span style={{ fontSize: '13px', fontWeight: 550, color: '#141414' }}>إجمالي المتقدمين النشطين</span>
          <div
            className="display-sm"
            style={{ fontSize: '36px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}
          >
            {candidates.length} مرشحاً
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>
            {portalCount} بوابة التوظيف • {laborCount} استقدام عمالة
          </span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', fontWeight: 550, color: '#707070' }}>متوسط توافق الـ AI</span>
          <div
            className="display-sm"
            style={{ fontSize: '36px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}
          >
            93.4%
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>
            مطابقة المعايير والمهارات
          </span>
        </div>

        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#141414', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', fontWeight: 550, color: '#adadad' }}>عروض العمل والانضمام</span>
          <div
            className="display-sm"
            style={{ fontSize: '36px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}
          >
            {candidates.filter((c) => c.stage === 'عرض عمل' || c.stage === 'وصول وانضمام').length} مرشحين
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>
            ربط آلي بسجل الموظفين وشاشات الترحيب
          </span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', fontWeight: 550, color: '#707070' }}>متوسط مدة الفرز والتوظيف</span>
          <div
            className="display-sm"
            style={{ fontSize: '36px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}
          >
            4.5 أيام
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>
            تهيئة 90 يوماً تلقائية (المادة 53)
          </span>
        </div>
      </div>

      {/* Source / Track Filter Bar (`كافة المرشحين` / `مرشحو التوظيف الداخلي وبوابة التوظيف` / `مرشحو العمالة`) */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#141414]" />
          <span className="text-xs font-bold text-[#141414]">تصفية مسار الاستقطاب والمصدر:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { label: 'كافة المرشحين', count: candidates.length },
              { label: 'مرشحو التوظيف الداخلي وبوابة التوظيف', count: portalCount },
              { label: 'مرشحو العمالة', count: laborCount },
            ] as Array<{ label: CandidateCategoryFilter; count: number }>
          ).map((tab) => {
            const active = categoryFilter === tab.label;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setCategoryFilter(tab.label)}
                className="transition-all"
                style={{
                  padding: '7px 16px',
                  borderRadius: '9999px',
                  border: '1px solid',
                  borderColor: active ? '#141414' : '#e0e0e0',
                  backgroundColor: active ? '#141414' : '#f3f3f3',
                  color: active ? '#ffffff' : '#141414',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    backgroundColor: active ? '#ffffff' : '#e0e0e0',
                    color: '#141414',
                    padding: '1px 8px',
                    borderRadius: '9999px',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage Selector Pills */}
      <div className="flex flex-wrap gap-2 pb-3 border-b border-[#e0e0e0]">
        <button
          type="button"
          onClick={() => setSelectedStage('الكل')}
          style={{
            padding: '6px 16px',
            borderRadius: '9999px',
            border: '1px solid',
            borderColor: selectedStage === 'الكل' ? '#141414' : '#e0e0e0',
            backgroundColor: selectedStage === 'الكل' ? '#141414' : '#ffffff',
            color: selectedStage === 'الكل' ? '#ffffff' : '#262626',
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
          const count = candidates.filter((c) => c.stage === stg).length;
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
                borderColor: isSel ? '#141414' : '#e0e0e0',
                backgroundColor: isSel ? '#141414' : '#ffffff',
                color: isSel ? '#ffffff' : '#262626',
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
              <span className={isSel ? 'pill-tag-mint' : 'pill-tag-shade'} style={{ fontSize: '10px' }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Candidates Visual Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCandidates.map((cnd) => {
          const isPortal = isInternalOrPortalCandidate(cnd);
          const isHired = cnd.stage === 'وصول وانضمام';
          return (
            <div
              key={cnd.id}
              className="card-pricing"
              style={{
                borderRadius: '24px',
                background: '#ffffff',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid #e0e0e0',
              }}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2.5">
                    <CorporateAvatar
                      name={cnd.name}
                      profession={cnd.appliedPosition}
                      isCandidate
                      size="md"
                      status="verified"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[#707070] font-mono font-bold">
                          {cnd.candidateCode}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] font-bold">
                          {isPortal ? 'بوابة التوظيف / داخلي' : 'استقدام عمالة'}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-[#141414] mt-0.5">{cnd.name}</h2>
                    </div>
                  </div>

                  {/* AI Score Badge */}
                  <div className="bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] rounded-2xl px-2.5 py-1 text-center">
                    <div className="text-[10px] font-bold">مطابقة AI</div>
                    <div className="text-sm font-bold font-mono">{cnd.aiScore}%</div>
                  </div>
                </div>

                <div className="text-xs font-semibold text-[#141414] mb-3">
                  الوظيفة المطلوبة:{' '}
                  <span className="text-[#141414] font-bold">{cnd.appliedPosition}</span>
                </div>

                <div className="bg-[#f3f3f3] p-3 rounded-2xl text-xs space-y-1.5 mb-4 border border-[#e0e0e0] text-[#141414]">
                  <div>
                    <strong>الجنسية والخبرة:</strong> {cnd.nationality} ({cnd.experienceYears} سنوات خبرة)
                  </div>
                  <div>
                    <strong>المؤهل / المهارات:</strong> {cnd.education}
                  </div>
                  <div>
                    <strong>المصدر:</strong>{' '}
                    {cnd.externalOfficeName || (isPortal ? 'بوابة التوظيف العامة' : 'وكالة دولية معتمدة')}
                  </div>
                  <div>
                    <strong>الراتب المتوقع:</strong>{' '}
                    <span className="font-mono font-bold text-[#141414]">
                      {Number(cnd.expectedSalary || 0).toLocaleString()}
                    </span>{' '}
                    ⃁
                  </div>
                  {cnd.onboardedEmployeeCode && (
                    <div className="pt-1 border-t border-[#e0e0e0] flex items-center gap-1.5 font-bold text-[#141414]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تم الترقية والتهيئة برقم وظيفي: {cnd.onboardedEmployeeCode}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <Badge
                    text={`المرحلة: ${cnd.stage}`}
                    type={
                      cnd.stage === 'وصول وانضمام'
                        ? 'success'
                        : cnd.stage === 'مرفوض'
                        ? 'danger'
                        : 'purple'
                    }
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCandidate(cnd);
                        setShowInterviewModal(true);
                      }}
                      className="button-outline-on-light"
                      style={{ fontSize: '11px', padding: '3px 10px', minHeight: '26px' }}
                    >
                      <Calendar className="w-3 h-3 ml-1 text-[#141414]" />
                      <span>جدولة مقابلة</span>
                    </button>
                  </div>
                </div>

                {/* Direct Hire & Full Onboarding Consequences Trigger */}
                <div className="mb-3">
                  <button
                    type="button"
                    disabled={processingCandidateId === cnd.id}
                    onClick={() => handleConvertHiredToEmployee(cnd)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] transition-colors"
                  >
                    <Tv className="w-3.5 h-3.5 text-[#141414]" />
                    <FileCheck className="w-3.5 h-3.5 text-[#141414]" />
                    <span>
                      {processingCandidateId === cnd.id
                        ? 'جاري إنشاء الملف الوظيفي وبث الترحيب...'
                        : isHired
                        ? 'تحديث ملف الموظف وخطة الـ 90 يوماً وشاشة الترحيب'
                        : 'اعتماد التعيين الفوري + خطة التجربة (90 يوماً) + شاشة الترحيب'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Stage Transition Buttons */}
              <div className="flex gap-2 border-t border-[#e0e0e0] pt-3">
                <button
                  type="button"
                  onClick={() => handleMoveStage(cnd.id, 'prev')}
                  disabled={stagesList.indexOf(cnd.stage) <= 0}
                  className="button-outline-on-light flex-1"
                  style={{
                    fontSize: '11px',
                    minHeight: '30px',
                    padding: '4px',
                    opacity: stagesList.indexOf(cnd.stage) <= 0 ? 0.35 : 1,
                  }}
                >
                  <ArrowRight className="w-3 h-3 ml-1" />
                  <span>المرحلة السابقة</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveStage(cnd.id, 'next')}
                  disabled={stagesList.indexOf(cnd.stage) >= stagesList.length - 1}
                  className="button-primary-pill flex-1"
                  style={{
                    fontSize: '11px',
                    minHeight: '30px',
                    padding: '4px',
                    opacity: stagesList.indexOf(cnd.stage) >= stagesList.length - 1 ? 0.35 : 1,
                  }}
                >
                  <span>المرحلة التالية</span>
                  <ArrowLeft className="w-3 h-3 mr-1" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* INTERVIEW MODAL */}
      {showInterviewModal && activeCandidate && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowInterviewModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in dir-rtl text-right"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white border border-[#e0e0e0] rounded-[24px] flex flex-col max-h-[90vh] overflow-y-auto"
          >
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h2 className="text-base font-bold text-[#141414] flex items-center gap-2">
                <Video className="w-4 h-4 text-[#141414]" />
                <span>جدولة مقابلة مرئية: {activeCandidate.name}</span>
              </h2>
              <button
                onClick={() => setShowInterviewModal(false)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-[#141414] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-white text-[#141414]">
              <div>
                <label className="text-xs text-[#141414] block mb-1 font-semibold">
                  تاريخ وتوقيت المقابلة (بتوقيت الرياض)
                </label>
                <input
                  type="datetime-local"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-[#141414] block mb-1 font-semibold">
                  المسؤول عن المقابلة
                </label>
                <input
                  type="text"
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div className="bg-[#f3f3f3] border border-[#e0e0e0] p-3 rounded-2xl text-xs text-[#141414] leading-relaxed">
                سيتم إرسال رابط المقابلة المرئية تلقائياً للمرشح عبر الواتساب والبريد الإلكتروني، وتحديث مرحلة الفرز.
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
                      const updated = candidates.map((c) =>
                        c.id === activeCandidate.id
                          ? { ...c, stage: 'مقابلة أولى' as CandidateStage }
                          : c
                      );
                      setCandidates(updated);
                      if (activeCandidate.fromCareerPortal) {
                        await realErpDataStore.updateRecord<CareerApplicationRecord>(
                          'hr_career_applications',
                          activeCandidate.careerApplicationId || activeCandidate.id,
                          { stage: 'INTERVIEW' },
                          DEFAULT_CAREER_PORTAL_APPLICATIONS
                        );
                      } else {
                        await realErpDataStore.updateRecord<Candidate>(
                          'ats_candidates',
                          activeCandidate.id,
                          { stage: 'مقابلة أولى' },
                          INITIAL_CANDIDATES
                        );
                      }
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
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowNewCandidateModal(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[24px] w-full max-w-lg animate-fade-in border border-[#e0e0e0] max-h-[90vh] overflow-y-auto"
          >
            <div className="p-5 border-b border-[#e0e0e0] flex items-center justify-between bg-[#f3f3f3]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#f3f3f3] text-[#141414] flex items-center justify-center font-bold text-xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#141414] m-0">
                  إضافة طلب احتياج / مرشح وظيفي جديد
                </h3>
              </div>
              <button
                onClick={() => setShowNewCandidateModal(false)}
                className="text-[#707070] hover:text-[#141414]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCandidateForm.name || !newCandidateForm.phone) return;
                const isInternalTrack = newCandidateForm.sourceType !== 'مكتب خارجي';
                const newCandidate: ExtendedCandidate = {
                  id: isInternalTrack
                    ? `APP-${Date.now().toString().slice(-6)}`
                    : `CND-${Date.now().toString().slice(-4)}`,
                  candidateCode: `C-2026-${Math.floor(100 + Math.random() * 900)}`,
                  name: newCandidateForm.name,
                  email: `${newCandidateForm.name.replace(/\s+/g, '.').toLowerCase()}@kas-careers.sa`,
                  phone: newCandidateForm.phone,
                  nationality: newCandidateForm.nationality,
                  appliedPosition: newCandidateForm.appliedPosition,
                  targetCompanyId: activeCompany.id,
                  targetBranch: newCandidateForm.targetBranch,
                  stage: 'تقديم جديد',
                  aiScore: Math.floor(88 + Math.random() * 11),
                  experienceYears: Number(newCandidateForm.experienceYears),
                  education: newCandidateForm.education,
                  expectedSalary: Number(newCandidateForm.expectedSalary),
                  source: newCandidateForm.sourceType,
                  externalOfficeName: isInternalTrack
                    ? 'بوابة التوظيف والاستقطاب الداخلي'
                    : 'وكالة استقدام دولية معتمدة',
                  appliedDate: new Date().toISOString().split('T')[0],
                  fromCareerPortal: isInternalTrack,
                };

                if (isInternalTrack) {
                  await realErpDataStore.addRecord<CareerApplicationRecord>(
                    'hr_career_applications',
                    {
                      id: newCandidate.id,
                      company_id: activeCompany.id === 'all' ? 'SAF' : activeCompany.id,
                      job_id: 'JOB-KAS-2026-01',
                      job_title: newCandidate.appliedPosition,
                      candidate_name: newCandidate.name,
                      email: newCandidate.email,
                      phone: newCandidate.phone,
                      nationality: newCandidate.nationality,
                      years_experience: newCandidate.experienceYears,
                      expected_salary_sar: newCandidate.expectedSalary,
                      skills_summary: newCandidate.education,
                      ai_match_score: newCandidate.aiScore,
                      stage: 'APPLIED',
                      applied_at: new Date().toISOString(),
                    },
                    DEFAULT_CAREER_PORTAL_APPLICATIONS
                  );
                }

                await realErpDataStore.addRecord<Candidate>(
                  'ats_candidates',
                  newCandidate,
                  INITIAL_CANDIDATES
                );
                await loadMergedPipelineCandidates();

                addNotification({
                  title: 'إضافة مرشح جديد',
                  message: `تم تسجيل المرشح (${newCandidate.name}) بنجاح وإدراجه في مسار التوظيف والفرز الذكي.`,
                  type: 'success',
                });
                setShowNewCandidateModal(false);
                setNewCandidateForm({
                  name: '',
                  phone: '',
                  nationality: 'سعودي',
                  appliedPosition: 'أخصائي عمليات وموارد بشرية',
                  targetBranch: 'الفرع الرئيسي - الرياض',
                  expectedSalary: 9500,
                  education: 'بكالوريوس إدارة أعمال / موارد بشرية',
                  experienceYears: 3,
                  sourceType: 'موقع الشركة',
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-[#141414] block mb-1">
                  اسم المرشح الكامل
                </label>
                <input
                  type="text"
                  required
                  value={newCandidateForm.name}
                  onChange={(e) =>
                    setNewCandidateForm({ ...newCandidateForm, name: e.target.value })
                  }
                  placeholder="مثال: سلطان بن فهد العتيبي / مريم أحمد"
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#141414] block mb-1">
                    رقم الهاتف / الواتساب
                  </label>
                  <input
                    type="text"
                    required
                    value={newCandidateForm.phone}
                    onChange={(e) =>
                      setNewCandidateForm({ ...newCandidateForm, phone: e.target.value })
                    }
                    placeholder="+9665xxxxxxxx"
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#141414] block mb-1">
                    مسار الاستقطاب
                  </label>
                  <select
                    value={newCandidateForm.sourceType}
                    onChange={(e) =>
                      setNewCandidateForm({
                        ...newCandidateForm,
                        sourceType: e.target.value as Candidate['source'],
                      })
                    }
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="موقع الشركة">بوابة التوظيف / توظيف داخلي</option>
                    <option value="LinkedIn">استقطاب الكفاءات (LinkedIn)</option>
                    <option value="مكتب خارجي">مرشحو العمالة (مكتب خارجي)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#141414] block mb-1">الجنسية</label>
                  <select
                    value={newCandidateForm.nationality}
                    onChange={(e) =>
                      setNewCandidateForm({ ...newCandidateForm, nationality: e.target.value })
                    }
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="سعودي">سعودي</option>
                    <option value="الفلبين">الفلبين</option>
                    <option value="إثيوبيا">إثيوبيا</option>
                    <option value="كينيا">كينيا</option>
                    <option value="أوغندا">أوغندا</option>
                    <option value="سريلانكا">سريلانكا</option>
                    <option value="بنغلاديش">بنغلاديش</option>
                    <option value="الهند">الهند</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#141414] block mb-1">
                    الراتب الشهري المتوقع (⃁)
                  </label>
                  <input
                    type="number"
                    value={newCandidateForm.expectedSalary}
                    onChange={(e) =>
                      setNewCandidateForm({
                        ...newCandidateForm,
                        expectedSalary: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141414] block mb-1">
                  المسمى الوظيفي المستهدف
                </label>
                <input
                  type="text"
                  value={newCandidateForm.appliedPosition}
                  onChange={(e) =>
                    setNewCandidateForm({
                      ...newCandidateForm,
                      appliedPosition: e.target.value,
                    })
                  }
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#e0e0e0]">
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
