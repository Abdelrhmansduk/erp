import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  ShieldCheck,
  FileSignature,
  Stamp,
  Globe2,
  CheckCircle2,
  History,
  Eye,
  EyeOff,
  Building2,
  CheckSquare,
  Square,
  PenLine,
  RotateCcw,
  Mail,
} from 'lucide-react';
import {
  generateRealQrSvg,
  generateRealCode128BarcodeSvg,
} from '../../utils/realBarcodeGenerator';
import { maskNationalId, maskIban } from '../../utils/pdplMasking';
import { realErpDataStore } from '../../services/realErpDataStore';
import { useAppStore } from '../../stores/appStore';
import {
  ALL_ENTITY_OPTIONS,
  CanonicalEntityCode,
  resolveDocumentBranding,
  setEntityHideHoldingPreference,
} from '../../services/entityBrandingService';
import { RecordQuickActions } from '../common/RecordQuickActions';
import {
  ReemHrDocumentSignatureBlock,
  IncludeReemSignatureToggle,
} from './ReemHrDocumentSignatureBlock';
import {
  composeReemHrOfficialEmail,
  REEM_HR_SIGNATORY,
} from '../../services/reemHrEmailTemplatesEngine';
import {
  dispatchComposedHrEmailDirect,
  getProviderDisplayNameAr,
} from '../../services/hrDirectEmailDispatchService';
import { KAS_ALLOWED_EMPLOYEES, EXCLUDED_KAS_EMAILS } from '../../config/kasAllowedEmails';

export type OfficialHrLetterTemplateCode =
  | 'SALARY_CERTIFICATE'
  | 'SALARY_TRANSFER_BANK'
  | 'EMBASSY_NOC_SCHENGEN'
  | 'EMPLOYMENT_CONFIRMATION'
  | 'EXPERIENCE_CERTIFICATE'
  | 'JOB_OFFER_LETTER'
  | 'DIRECT_JOINING_DECISION'
  | 'PROMOTION_INCREMENT_DECISION'
  | 'BRANCH_COMPANY_TRANSFER'
  | 'CONTRACT_RENEWAL_NOTICE'
  | 'OFFICIAL_WARNING_ART80'
  | 'FINAL_CLEARANCE_RELEASE';

export interface OfficialLetterEmployeeInput {
  id: string;
  employee_code: string;
  name: string;
  name_en?: string;
  national_id: string;
  job_title: string;
  department: string;
  branch: string;
  hire_date: string;
  basic_salary?: number;
  housing_allowance?: number;
  transport_allowance?: number;
  salary: number;
  iban?: string;
  bank_name?: string;
  company_id?: string;
  phone?: string;
  email?: string;
}

export interface OfficialHrLetterRecord {
  id: string;
  company_id: string;
  letter_number: string;
  employee_id: string;
  employee_name: string;
  template_code: OfficialHrLetterTemplateCode;
  template_title: string;
  directed_to: string;
  language: 'AR' | 'EN' | 'BILINGUAL';
  chamber_attestation_required: boolean;
  electronic_stamp_applied: boolean;
  verification_code: string;
  issued_by: string;
  issued_at: string;
  hide_holding_group_brand?: boolean;
  custom_body_ar?: string;
}

interface HrLettersStudioModalProps {
  employee: OfficialLetterEmployeeInput;
  companyName?: string;
  companyCode?: string;
  issuedBy?: string;
  initialTemplate?: OfficialHrLetterTemplateCode;
  onClose: () => void;
}

const TEMPLATES_CATALOG: Array<{
  code: OfficialHrLetterTemplateCode;
  titleAr: string;
  titleEn: string;
  defaultRecipientAr: string;
  defaultRecipientEn: string;
  category: 'شهادات وتعريف' | 'قرارات إدارية وتعاقدية';
}> = [
  {
    code: 'SALARY_CERTIFICATE',
    titleAr: 'شهادة تعريف بالراتب التفصيلية',
    titleEn: 'Detailed Salary Certificate',
    defaultRecipientAr: 'إلى من يهمه الأمر',
    defaultRecipientEn: 'To Whom It May Concern',
    category: 'شهادات وتعريف',
  },
  {
    code: 'SALARY_TRANSFER_BANK',
    titleAr: 'خطاب تثبيت وتحويل راتب للبنك',
    titleEn: 'Bank Salary Transfer Undertaking',
    defaultRecipientAr: 'السادة / مصرف الراجحي — إدارة التمويل الشخصي',
    defaultRecipientEn: 'Messrs. Al Rajhi Bank — Retail Financing Dept.',
    category: 'شهادات وتعريف',
  },
  {
    code: 'EMBASSY_NOC_SCHENGEN',
    titleAr: 'خطاب عدم ممانعة للسفارات وتأشيرة شنغن (NOC)',
    titleEn: 'Embassy Visa No-Objection Certificate (NOC)',
    defaultRecipientAr: 'السادة / قسم التأشيرات والقنصلية المعتمدة بالرياض',
    defaultRecipientEn: 'Consular Visa Section — Embassy in Riyadh',
    category: 'شهادات وتعريف',
  },
  {
    code: 'EMPLOYMENT_CONFIRMATION',
    titleAr: 'مشهد إثبات عمل على رأس العمل (بدون راتب)',
    titleEn: 'Employment Verification Letter',
    defaultRecipientAr: 'إلى من يهمه الأمر',
    defaultRecipientEn: 'To Whom It May Concern',
    category: 'شهادات وتعريف',
  },
  {
    code: 'EXPERIENCE_CERTIFICATE',
    titleAr: 'شهادة خبرة عملية رسمية (المادة 64)',
    titleEn: 'Official Certificate of Experience (Art. 64)',
    defaultRecipientAr: 'إلى من يهمه الأمر',
    defaultRecipientEn: 'To Whom It May Concern',
    category: 'شهادات وتعريف',
  },
  {
    code: 'JOB_OFFER_LETTER',
    titleAr: 'عرض وظيفي رسمي معتمد (Job Offer)',
    titleEn: 'Official Employment Offer Letter',
    defaultRecipientAr: 'السيد / المرشح المعتمد',
    defaultRecipientEn: 'Dear Selected Candidate',
    category: 'قرارات إدارية وتعاقدية',
  },
  {
    code: 'DIRECT_JOINING_DECISION',
    titleAr: 'إشعار مباشرة عمل رسمية (Joining Notice)',
    titleEn: 'Official Duty Assumption Notice',
    defaultRecipientAr: 'إدارة الموارد البشرية والشؤون المالية',
    defaultRecipientEn: 'Human Resources & Finance Department',
    category: 'قرارات إدارية وتعاقدية',
  },
  {
    code: 'PROMOTION_INCREMENT_DECISION',
    titleAr: 'قرار ترقية وتعديل سلم الأجور',
    titleEn: 'Promotion & Compensation Adjustment Decision',
    defaultRecipientAr: 'ملف الموظف ونظام حماية الأجور (WPS)',
    defaultRecipientEn: 'Employee File & Payroll Operations',
    category: 'قرارات إدارية وتعاقدية',
  },
  {
    code: 'BRANCH_COMPANY_TRANSFER',
    titleAr: 'قرار نقل داخلي بين الفروع / الشركات الشقيقة',
    titleEn: 'Internal Branch / Affiliate Transfer Decision',
    defaultRecipientAr: 'إدارة العمليات والموارد البشرية',
    defaultRecipientEn: 'Operations & HR Administration',
    category: 'قرارات إدارية وتعاقدية',
  },
  {
    code: 'CONTRACT_RENEWAL_NOTICE',
    titleAr: 'إشعار تجديد عقد عمل موثق في قوى',
    titleEn: 'Qiwa Employment Contract Renewal Notice',
    defaultRecipientAr: 'الموظف المعني ومنصة قوى',
    defaultRecipientEn: 'Employee & Qiwa Contract Registry',
    category: 'قرارات إدارية وتعاقدية',
  },
  {
    code: 'OFFICIAL_WARNING_ART80',
    titleAr: 'لفت نظر / إنذار كتابي وفق لائحة تنظيم العمل',
    titleEn: 'Official Written Warning (Saudi Labor Law)',
    defaultRecipientAr: 'الموظف المعني — سري وشخصي',
    defaultRecipientEn: 'Employee Record — Confidential',
    category: 'قرارات إدارية وتعاقدية',
  },
  {
    code: 'FINAL_CLEARANCE_RELEASE',
    titleAr: 'شهادة إخلاء طرف نهائي وبراءة ذمة مالية',
    titleEn: 'Final Clearance & Release Certificate',
    defaultRecipientAr: 'إلى من يهمه الأمر',
    defaultRecipientEn: 'To Whom It May Concern',
    category: 'قرارات إدارية وتعاقدية',
  },
];

export const HrLettersStudioModal: React.FC<HrLettersStudioModalProps> = ({
  employee,
  companyName,
  companyCode,
  issuedBy,
  initialTemplate = 'SALARY_CERTIFICATE',
  onClose,
}) => {
  const { addNotification } = useAppStore();

  // Resolve initial entity strictly from the employee's own company_id first, then companyCode/companyName
  const initialBranding = resolveDocumentBranding(
    employee.company_id || companyCode || companyName
  );

  const [selectedEntity, setSelectedEntity] = useState<CanonicalEntityCode>(initialBranding.code);
  const [hideHoldingGroupBrand, setHideHoldingGroupBrand] = useState<boolean>(
    initialBranding.hideHoldingGroupBrand
  );
  const [customEntityTitleAr, setCustomEntityTitleAr] = useState<string>('');
  const [customSignatoryAr, setCustomSignatoryAr] = useState<string>(
    issuedBy || initialBranding.hrIssuerTitleAr
  );

  const [selectedCode, setSelectedCode] = useState<OfficialHrLetterTemplateCode>(initialTemplate);
  const [language, setLanguage] = useState<'AR' | 'EN' | 'BILINGUAL'>('BILINGUAL');
  const [chamberAttestation, setChamberAttestation] = useState<boolean>(false);
  const [electronicStamp, setElectronicStamp] = useState<boolean>(true);
  const [includeReemSignature, setIncludeReemSignature] = useState<boolean>(true);
  const [revealPii, setRevealPii] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [editBodyMode, setEditBodyMode] = useState<boolean>(false);
  const [customArabicBody, setCustomArabicBody] = useState<string | null>(null);
  const [customEnglishBody, setCustomEnglishBody] = useState<string | null>(null);
  const [history, setHistory] = useState<OfficialHrLetterRecord[]>([]);

  const branding = resolveDocumentBranding(employee, {
    entityCode: selectedEntity,
    hideHoldingGroupBrand,
    customCompanyNameAr: customEntityTitleAr.trim() || undefined,
  });

  const effectiveCompanyNameAr = branding.displayNameAr;
  const effectiveCompanyNameEn = branding.displayNameEn;

  const activeTemplate =
    TEMPLATES_CATALOG.find((t) => t.code === selectedCode) || TEMPLATES_CATALOG[0];

  const [directedTo, setDirectedTo] = useState<string>(activeTemplate.defaultRecipientAr);

  useEffect(() => {
    const tpl = TEMPLATES_CATALOG.find((t) => t.code === selectedCode) || TEMPLATES_CATALOG[0];
    setDirectedTo(language === 'EN' ? tpl.defaultRecipientEn : tpl.defaultRecipientAr);
    setCustomArabicBody(null);
    setCustomEnglishBody(null);
  }, [selectedCode, language]);

  useEffect(() => {
    setCustomSignatoryAr(issuedBy || branding.hrIssuerTitleAr);
  }, [selectedEntity, hideHoldingGroupBrand]);

  useEffect(() => {
    let mounted = true;
    realErpDataStore
      .getRecords<OfficialHrLetterRecord>('hr_official_letters', [])
      .then((rows) => {
        if (!mounted) return;
        const list = Array.isArray(rows) ? rows : [];
        setHistory(list.filter((r) => r.employee_id === employee.id).slice(0, 8));
      });
    return () => {
      mounted = false;
    };
  }, [employee.id]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const piiRole = revealPii ? 'SUPER_ADMIN' : 'VIEWER';
  const maskedId = maskNationalId(employee.national_id, piiRole);
  const maskedIban = employee.iban ? maskIban(employee.iban, piiRole) : '—';

  const basicSal = employee.basic_salary ?? Math.round(employee.salary * 0.65);
  const housingSal = employee.housing_allowance ?? Math.round(employee.salary * 0.25);
  const transportSal =
    employee.transport_allowance ?? Math.max(0, employee.salary - basicSal - housingSal);

  const letterSerial = `LTR-${branding.code}-${employee.employee_code}-${selectedCode.slice(0, 4)}-${todayIso.replace(/-/g, '')}`;
  const verificationHash = `${branding.qrVerifyNamespace}|${letterSerial}|${employee.employee_code}|${employee.salary}|${todayIso}`;

  const renderDefaultArabicBody = () => {
    switch (selectedCode) {
      case 'SALARY_CERTIFICATE':
        return `تشهد ${effectiveCompanyNameAr} (سجل تجاري رقم ${branding.crNumber}) بأن السيد/ة (${employee.name})، هوية/إقامة رقم (${maskedId})، يعمل لدينا على رأس العمل بوظيفة (${employee.job_title}) في (${employee.department} — ${employee.branch}) منذ تاريخ (${employee.hire_date})، ويتقاضى راتباً شهرياً إجمالياً قدره (⃁ ${employee.salary.toLocaleString()}) مفصلاً كالتالي: أساسي ⃁ ${basicSal.toLocaleString()} + بدل سكن ⃁ ${housingSal.toLocaleString()} + بدل نقل ⃁ ${transportSal.toLocaleString()}. وقد أُعطيت له هذه الشهادة بناءً على طلبه دون أدنى مسؤولية مالية أو التزام قانوني على الشركة تجاه الغير.`;
      case 'SALARY_TRANSFER_BANK':
        return `نفيدكم نحن ${effectiveCompanyNameAr} بأن الموظف المذكور أعلاه (${employee.name} — هوية رقم ${maskedId}) يعمل لدينا بوظيفة (${employee.job_title}) وبراتب شهري إجمالي قدره (⃁ ${employee.salary.toLocaleString()}) يحول شهرياً إلى حسابه البنكي رقم (${maskedIban}) لدى (${employee.bank_name || 'المصرف المعتمد'}). وتتعهد الشركة باستمرار تحويل راتبه ومستحقات نهاية خدمته إلى حسابه لديكم وعدم تعديل جهة التحويل إلا بعد الحصول على إخلاء طرف خطي معتمد من قبلكم.`;
      case 'EMBASSY_NOC_SCHENGEN':
        return `تهديكم ${effectiveCompanyNameAr} أطيب التحيات، وتفيدكم بأن السيد/ة (${employee.name} — رقم الهوية/الإقامة ${maskedId}) يعمل لدينا بوظيفة (${employee.job_title}) منذ تاريخ (${employee.hire_date}) براتب شهري قدره (⃁ ${employee.salary.toLocaleString()})، ولا مانع لدى الشركة من سفره خارج المملكة العربية السعودية خلال فترة إجازته المعتمدة مع احتفاظه الكامل بوظيفته ومخصصاته عند عودته.`;
      case 'EMPLOYMENT_CONFIRMATION':
        return `تشهد ${effectiveCompanyNameAr} بأن السيد/ة (${employee.name})، هوية/إقامة رقم (${maskedId})، منسوب معتمد وعلى رأس العمل لدينا في (${employee.department}) بمسمى وظيفي (${employee.job_title}) اعتباراً من تاريخ المباشرة (${employee.hire_date}) وحتى تاريخه.`;
      case 'EXPERIENCE_CERTIFICATE':
        return `استناداً إلى المادة (64) من نظام العمل السعودي، تشهد ${effectiveCompanyNameAr} بأن السيد/ة (${employee.name} — هوية/إقامة رقم ${maskedId}) قد عمل لدينا بوظيفة (${employee.job_title}) في (${employee.department}) اعتباراً من (${employee.hire_date}) وحتى تاريخ (${todayIso})، وكان خلال فترة عمله مثالاً للكفاءة المهنية والانضباط الوظيفي، ونتمنى له دوام التوفيق والسداد.`;
      case 'JOB_OFFER_LETTER':
        return `يسر ${effectiveCompanyNameAr} تقديم هذا العرض الوظيفي الرسمي للسيد/ة (${employee.name}) لشغل وظيفة (${employee.job_title}) ضمن (${employee.department} — ${employee.branch}) بحزمة تعويضات شهرية إجمالية قدرها (⃁ ${employee.salary.toLocaleString()}) تشمل الراتب الأساسي وبدلي السكن والنقل والتأمين الطبي المعتمد، مع فترة تجربة نظامية (90 يوماً) خاضعة لأحكام نظام العمل السعودي وتوثيق منصة قوى.`;
      case 'DIRECT_JOINING_DECISION':
        return `إقرار مباشرة عمل رسمية: نفيدكم بمباشرة الموظف (${employee.name} — الرقم الوظيفي ${employee.employee_code}) مهام عمله فعلياً في ${effectiveCompanyNameAr} بوظيفة (${employee.job_title}) في (${employee.department}) اعتباراً من تاريخ (${todayIso})، ويُعتمد هذا الإشعار لتفعيل استحقاق الأجر في مسير نظام حماية الأجور (WPS) والتسجيل في التأمينات الاجتماعية (GOSI).`;
      case 'PROMOTION_INCREMENT_DECISION':
        return `بناءً على نتائج تقييم الأداء المؤسسي وصلاحيات الإدارة التنفيذية في ${effectiveCompanyNameAr}، تقرر اعتماد ترقية وتعديل المخصص المالي للموظف (${employee.name} — ${employee.employee_code}) بوظيفة (${employee.job_title}) ليصبح إجمالي الراتب الشهري (⃁ ${employee.salary.toLocaleString()}) اعتباراً من دورة الرواتب الحالية وتحديث العقد الموثق في منصة قوى.`;
      case 'BRANCH_COMPANY_TRANSFER':
        return `تقتضي المصلحة التشغيلية في ${effectiveCompanyNameAr} نقل خدمات ومهام الموظف (${employee.name} — ${employee.employee_code}) للعمل في (${employee.branch} / ${employee.department}) بذات المزايا والدرجة الوظيفية (${employee.job_title}) مع تسليم واستلام العهد أصولاً عبر بوابة الخدمة الذاتية.`;
      case 'CONTRACT_RENEWAL_NOTICE':
        return `إشعار رسمي صادر عن ${effectiveCompanyNameAr} بتجديد عقد العمل الموحد للموظف (${employee.name} — هوية/إقامة ${maskedId}) لمدة مماثلة بوظيفة (${employee.job_title}) وإجمالي أجر شهري (⃁ ${employee.salary.toLocaleString()}) وفق أحكام المادة (55) من نظام العمل السعودي والربط الإلكتروني في منصة قوى.`;
      case 'OFFICIAL_WARNING_ART80':
        return `إشعار إداري من ${effectiveCompanyNameAr} وفق لائحة تنظيم العمل المعتمدة من وزارة الموارد البشرية والتنمية الاجتماعية: نلفت عناية الموظف (${employee.name} — ${employee.employee_code}) بضرورة الالتزام التام بمواعيد الوردية الرسمية وضوابط العمل في (${employee.department})، تفادياً لتطبيق الجزاءات التصاعدية المنصوص عليها في المادتين (66) و(80) من نظام العمل.`;
      case 'FINAL_CLEARANCE_RELEASE':
        return `تقر ${effectiveCompanyNameAr} بأن الموظف (${employee.name} — الرقم الوظيفي ${employee.employee_code}) قد أتم تسليم كافة العهد العينية والتقنية والمالية الموكلة إليه وأكمل إجراءات إخلاء الطرف المعتمدة واستلم كافة مستحقاته النظامية ومكافأة نهاية الخدمة وفق المادة (88) من نظام العمل السعودي.`;
    }
  };

  const renderDefaultEnglishBody = () => {
    switch (selectedCode) {
      case 'SALARY_CERTIFICATE':
        return `This is to certify that ${employee.name} (ID/Iqama No. ${maskedId}) has been employed full-time with ${effectiveCompanyNameEn} (CR: ${branding.crNumber}) as "${employee.job_title}" in "${employee.department}" since ${employee.hire_date}, earning a gross monthly package of ⃁ ${employee.salary.toLocaleString()} (Basic: ⃁ ${basicSal.toLocaleString()}, Housing: ⃁ ${housingSal.toLocaleString()}, Transport: ⃁ ${transportSal.toLocaleString()}). Issued upon employee request without financial liability on the company.`;
      case 'SALARY_TRANSFER_BANK':
        return `We, ${effectiveCompanyNameEn}, confirm that ${employee.name} (ID/Iqama ${maskedId}) works with us as "${employee.job_title}" with a monthly gross salary of ⃁ ${employee.salary.toLocaleString()} credited to IBAN (${maskedIban}). We undertake to continue transferring monthly salary and End-of-Service benefits to this account until an official written release is received from your bank.`;
      case 'EMBASSY_NOC_SCHENGEN':
        return `${effectiveCompanyNameEn} confirms that ${employee.name} (ID/Iqama ${maskedId}) is an active full-time employee holding the position of "${employee.job_title}" since ${employee.hire_date} with a monthly compensation of ⃁ ${employee.salary.toLocaleString()}. The company has no objection to the employee traveling abroad during approved annual leave and resuming duties thereafter.`;
      case 'EXPERIENCE_CERTIFICATE':
        return `Pursuant to Article 64 of the Saudi Labor Law, ${effectiveCompanyNameEn} certifies that ${employee.name} (ID/Iqama ${maskedId}) served as "${employee.job_title}" from ${employee.hire_date} until ${todayIso}, demonstrating exemplary professionalism and dedication throughout their tenure.`;
      default:
        return `Official HR Resolution (${activeTemplate.titleEn}) issued by ${effectiveCompanyNameEn} (CR: ${branding.crNumber}) for employee ${employee.name} (Code: ${employee.employee_code}, ID: ${maskedId}), Position: "${employee.job_title}", Gross Package: ⃁ ${employee.salary.toLocaleString()}, effective ${todayIso} in full compliance with Saudi Labor Law and Qiwa electronic standards.`;
    }
  };

  const effectiveArabicBody = customArabicBody !== null ? customArabicBody : renderDefaultArabicBody();
  const effectiveEnglishBody =
    customEnglishBody !== null ? customEnglishBody : renderDefaultEnglishBody();

  const handleIssueAndArchive = async (triggerPrint: boolean) => {
    const newRecord: OfficialHrLetterRecord = {
      id: `hrltr-${Date.now()}`,
      company_id: branding.code,
      letter_number: letterSerial,
      employee_id: employee.id,
      employee_name: employee.name,
      template_code: selectedCode,
      template_title: activeTemplate.titleAr,
      directed_to: directedTo,
      language,
      chamber_attestation_required: chamberAttestation,
      electronic_stamp_applied: electronicStamp,
      verification_code: verificationHash,
      issued_by: customSignatoryAr || branding.hrIssuerTitleAr,
      issued_at: new Date().toISOString(),
      hide_holding_group_brand: hideHoldingGroupBrand,
      custom_body_ar: effectiveArabicBody,
    };

    await realErpDataStore.addRecord('hr_official_letters', newRecord);
    setHistory((prev) => [newRecord, ...prev.slice(0, 7)]);

    addNotification({
      type: 'success',
      title: 'تم إصدار وأرشفة الخطاب الموثق بـ QR',
      message: `تم اعتماد (${activeTemplate.titleAr}) باسم (${effectiveCompanyNameAr}) للموظف ${employee.name} برقم ${letterSerial}.`,
    });

    if (triggerPrint && typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleSendLetterViaOfficialHrEmail = async () => {
    const nowIso = new Date().toISOString();
    const newLetterRecord: OfficialHrLetterRecord = {
      id: `hrltr-${Date.now()}`,
      company_id: branding.code,
      letter_number: letterSerial,
      employee_id: employee.id,
      employee_name: employee.name,
      template_code: selectedCode,
      template_title: activeTemplate.titleAr,
      directed_to: directedTo,
      language,
      chamber_attestation_required: chamberAttestation,
      electronic_stamp_applied: electronicStamp,
      verification_code: verificationHash,
      issued_by: `${REEM_HR_SIGNATORY.fullNameAr} (${REEM_HR_SIGNATORY.email})`,
      issued_at: nowIso,
      hide_holding_group_brand: hideHoldingGroupBrand,
      custom_body_ar: effectiveArabicBody,
    };

    await realErpDataStore.addRecord('hr_official_letters', newLetterRecord);
    setHistory((prev) => [newLetterRecord, ...prev.slice(0, 7)]);

    const excludedSet = new Set(Object.keys(EXCLUDED_KAS_EMAILS).map((e) => e.trim().toLowerCase()));
    const allowedPool = KAS_ALLOWED_EMPLOYEES.filter(
      (emp) => !excludedSet.has(emp.email.trim().toLowerCase())
    );
    const rawEmpEmail = (employee.email || '').trim();
    const matchedByName = allowedPool.find(
      (emp) =>
        emp.nameAr === employee.name.trim() ||
        emp.nameAr.includes(employee.name.trim()) ||
        employee.name.trim().includes(emp.nameAr)
    );

    const targetEmail =
      rawEmpEmail && rawEmpEmail.includes('@') && !excludedSet.has(rawEmpEmail.toLowerCase())
        ? rawEmpEmail
        : matchedByName?.email || allowedPool[0]?.email || REEM_HR_SIGNATORY.email;

    const includeSalaryBreakdown = [
      'SALARY_CERTIFICATE',
      'SALARY_TRANSFER_BANK',
      'JOB_OFFER_LETTER',
      'PROMOTION_INCREMENT_DECISION',
    ].includes(selectedCode);

    const customBodyArLines = [
      `• نوع الخطاب الرسمي: ${activeTemplate.titleAr}`,
      `• الرقم المرجعي الموثق: ${letterSerial}`,
      `• موجه إلى: ${directedTo}`,
      `• الشركة المصدرة: ${effectiveCompanyNameAr}`,
      `• الموظف: ${employee.name} (${employee.employee_code}) — المسمى: ${employee.job_title} — الإدارة: ${employee.department}`,
      ...(includeSalaryBreakdown
        ? [
            `• البيان المالي للراتب: الأساسي \u20C1 ${basicSal.toLocaleString('en-US')} | بدل السكن \u20C1 ${housingSal.toLocaleString('en-US')} | بدل النقل \u20C1 ${transportSal.toLocaleString('en-US')} | الإجمالي الشهري \u20C1 ${employee.salary.toLocaleString('en-US')}`,
          ]
        : []),
      effectiveArabicBody,
      ...(customNote.trim() ? [`ملاحظة إضافية معتمدة: ${customNote.trim()}`] : []),
    ];

    const customBodyEnLines = [
      `• Official Letter Type: ${activeTemplate.titleEn}`,
      `• Verified Reference No: ${letterSerial}`,
      `• Addressed To: ${directedTo}`,
      `• Issuing Entity: ${branding.displayNameEn}`,
      `• Employee: ${employee.name_en || employee.name} (${employee.employee_code}) — Title: ${employee.job_title} — Dept: ${employee.department}`,
      ...(includeSalaryBreakdown
        ? [
            `• Salary Breakdown: Basic \u20C1 ${basicSal.toLocaleString('en-US')} | Housing \u20C1 ${housingSal.toLocaleString('en-US')} | Transport \u20C1 ${transportSal.toLocaleString('en-US')} | Total Monthly \u20C1 ${employee.salary.toLocaleString('en-US')}`,
          ]
        : []),
      effectiveEnglishBody,
      ...(customNote.trim() ? [`Approved Additional Note: ${customNote.trim()}`] : []),
    ];

    const composed = composeReemHrOfficialEmail({
      templateId: 'CUSTOM_OFFICIAL_CORRESPONDENCE',
      recipientEmails: [targetEmail],
      ccEmails: [...REEM_HR_SIGNATORY.defaultCc],
      recipientNameAr: employee.name,
      recipientNameEn: employee.name_en || matchedByName?.nameEn || employee.name,
      customSubjectAr: `${activeTemplate.titleAr} — ${employee.name} (${letterSerial})`,
      customSubjectEn: `${activeTemplate.titleEn} - ${employee.name_en || employee.name} (${letterSerial})`,
      customBodyAr: customBodyArLines.join('\n'),
      customBodyEn: customBodyEnLines.join('\n'),
      includeReemSignature,
    });

    const result = await dispatchComposedHrEmailDirect({
      composed,
      companyId: branding.code,
      categoryAr: 'الخطابات والقرارات الرسمية للموارد البشرية',
      templateTitleAr: activeTemplate.titleAr,
      recipientNameAr: employee.name,
      recipientNameEn: employee.name_en || matchedByName?.nameEn || employee.name,
      customDetailsAr: effectiveArabicBody,
      referenceNo: letterSerial,
      moduleName: 'hr_official_letters',
      openOutlookWebFallbackIfUnconfigured: true,
    });

    if (result.ok) {
      addNotification({
        type: 'success',
        title: `تم الإرسال المباشر وأرشفة الخطاب عبر ${getProviderDisplayNameAr(result.provider)}`,
        message: `أُرسل خطاب (${activeTemplate.titleAr}) مباشرة من HR@kas.sa إلى ${composed.toEmails.join(', ')} مع نسخة إلى ${composed.ccEmails.join(', ')} وشعار المجموعة والتوقيع الرسمي (دون تنزيل ملفات).`,
      });
    } else if (result.openedInOutlookWeb) {
      addNotification({
        type: 'warning',
        title: 'فُتح الخطاب في Outlook Web (تفعيل بوابة SMTP/Graph مطلوب)',
        message:
          result.errorAr ||
          'تم نسخ الترويسة والتوقيع المعتمد وفتح Outlook Web مباشرة؛ أضف بيانات Microsoft 365 أو SMTP من بوابات الإرسال للإرسال التلقائي.',
      });
    } else {
      addNotification({
        type: 'error',
        title: 'تعذر الإرسال المباشر للخطاب عبر بوابة HR@kas.sa',
        message: result.errorAr || 'تحقق من إعدادات بوابة البريد المباشر Microsoft 365 / SMTP.',
      });
    }
  };

  const modalNode = (
    <div
      data-printable-modal="true"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-[#141414]/65 backdrop-blur-sm z-[11000] flex items-center justify-center p-4 font-sans"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-5xl bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="no-print print:hidden px-6 py-3.5 bg-[#141414] text-[#ffffff] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <FileSignature className="w-5 h-5 text-[#ffffff]" />
            <div>
              <h3 className="font-bold text-sm text-[#ffffff] m-0">
                استوديو الخطابات والقرارات الرسمية الموثقة بـ QR (12 نموذجاً ثنائي اللغة)
              </h3>
              <p className="text-[11px] text-[#adadad] m-0 mt-0.5">
                {employee.name} • {employee.employee_code} • الشركة المصدرة: {effectiveCompanyNameAr}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <IncludeReemSignatureToggle
              checked={includeReemSignature}
              onChange={setIncludeReemSignature}
              compact
            />
            <RecordQuickActions
              showLabels
              onPrint={() => window.print()}
              sharePayload={{
                title: activeTemplate.titleAr,
                customSubjectEn: activeTemplate.titleEn,
                referenceNumber: letterSerial,
                recipientName: employee.name,
                recipientNameEn: employee.name_en,
                recipientPhone: employee.phone,
                recipientEmail: employee.email,
                entityCode: branding.code,
                hideHoldingGroupBrand,
                moduleName: 'hr_official_letters',
                department: 'hr',
                includeReemSignature,
                summaryLines: [
                  { label: 'الشركة المصدرة', value: effectiveCompanyNameAr },
                  { label: 'اسم الموظف', value: employee.name },
                  { label: 'الرقم المرجعي', value: letterSerial },
                  { label: 'موجه إلى', value: directedTo },
                ],
                bodyText: effectiveArabicBody,
                customBodyEn: effectiveEnglishBody,
              }}
            />
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#adadad] hover:text-[#ffffff] hover:bg-[#262626] rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Controls Column */}
          <div className="no-print print:hidden lg:col-span-4 bg-[#f3f3f3] border-l border-[#e0e0e0] p-4 overflow-y-auto space-y-3.5">
            {/* 0. Issuing Entity & Removing Holding Group Phrase */}
            <div className="p-3 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#141414]">
                <Building2 className="w-3.5 h-3.5" />
                <span>الشركة المُصدِرة للمستند وتبعياته:</span>
              </label>
              <select
                value={selectedEntity}
                onChange={(e) => {
                  const nextCode = e.target.value as CanonicalEntityCode;
                  setSelectedEntity(nextCode);
                  const nextResolved = resolveDocumentBranding(nextCode, { entityCode: nextCode });
                  setHideHoldingGroupBrand(nextResolved.hideHoldingGroupBrand);
                }}
                className="w-full px-3 py-2 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              >
                {ALL_ENTITY_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.labelAr}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  const next = !hideHoldingGroupBrand;
                  setHideHoldingGroupBrand(next);
                  setEntityHideHoldingPreference(selectedEntity, next);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[12px] border text-right text-xs font-bold transition-colors cursor-pointer ${
                  hideHoldingGroupBrand
                    ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                    : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]'
                }`}
              >
                <span>إلغاء جملة «مجموعة خالد السليم»</span>
                {hideHoldingGroupBrand ? (
                  <CheckSquare className="w-4 h-4 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-[#707070] shrink-0" />
                )}
              </button>

              <input
                type="text"
                value={customEntityTitleAr}
                onChange={(e) => setCustomEntityTitleAr(e.target.value)}
                placeholder="تخصيص اسم الجهة المصدرة (اختياري)..."
                className="w-full px-3 py-1.5 rounded-[10px] bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-semibold text-[#141414]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">
                1. اختر نوع الخطاب أو القرار الرسمي (12 قالباً)
              </label>
              <select
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value as OfficialHrLetterTemplateCode)}
                className="w-full px-3.5 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              >
                {TEMPLATES_CATALOG.map((tpl) => (
                  <option key={tpl.code} value={tpl.code}>
                    [{tpl.category}] {tpl.titleAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">
                2. الجهة الموجه إليها الخطاب
              </label>
              <input
                type="text"
                value={directedTo}
                onChange={(e) => setDirectedTo(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">
                3. جهة التوقيع والاعتماد أسفل الخطاب
              </label>
              <input
                type="text"
                value={customSignatoryAr}
                onChange={(e) => setCustomSignatoryAr(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">
                4. لغة الإصدار الرسمي وتحرير النص
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'BILINGUAL', label: 'ثنائي (AR/EN)' },
                    { id: 'AR', label: 'عربي فقط' },
                    { id: 'EN', label: 'English' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLanguage(opt.id)}
                    className={`py-1.5 px-2 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                      language === opt.id
                        ? 'bg-[#141414] text-[#ffffff]'
                        : 'bg-[#ffffff] text-[#141414] border border-[#e0e0e0]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!editBodyMode && customArabicBody === null) {
                      setCustomArabicBody(renderDefaultArabicBody());
                      setCustomEnglishBody(renderDefaultEnglishBody());
                    }
                    setEditBodyMode((v) => !v);
                  }}
                  className={`flex-1 py-2 px-3 rounded-full text-xs font-bold border inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                    editBodyMode
                      ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                      : 'bg-[#ffffff] text-[#141414] border-[#e0e0e0]'
                  }`}
                >
                  <PenLine className="w-3.5 h-3.5" />
                  <span>{editBodyMode ? 'إغلاق محرر النص المباشر' : 'تحرير نص الخطاب يدوياً'}</span>
                </button>
                {(customArabicBody !== null || customEnglishBody !== null) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomArabicBody(null);
                      setCustomEnglishBody(null);
                    }}
                    title="استعادة الصياغة التلقائية"
                    className="p-2 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {editBodyMode && (
              <div className="p-3 rounded-[16px] bg-[#ffffff] border border-[#141414] space-y-2">
                {(language === 'AR' || language === 'BILINGUAL') && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#141414] mb-1">
                      النص العربي للخطاب:
                    </label>
                    <textarea
                      rows={4}
                      value={effectiveArabicBody}
                      onChange={(e) => setCustomArabicBody(e.target.value)}
                      className="w-full px-3 py-2 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs text-[#141414] leading-relaxed"
                    />
                  </div>
                )}
                {(language === 'EN' || language === 'BILINGUAL') && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#141414] mb-1">
                      English Body Text:
                    </label>
                    <textarea
                      rows={3}
                      dir="ltr"
                      value={effectiveEnglishBody}
                      onChange={(e) => setCustomEnglishBody(e.target.value)}
                      className="w-full px-3 py-2 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs text-[#141414] leading-relaxed"
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">
                5. فقرة أو ملاحظة إضافية (اختياري)
              </label>
              <textarea
                rows={2}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="مثال: رقم جواز السفر أو غرض التمويل العقاري..."
                className="w-full px-3.5 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] text-xs text-[#141414]"
              />
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center justify-between p-2.5 rounded-[14px] bg-[#ffffff] border border-[#141414] cursor-pointer">
                <span className="text-xs font-bold text-[#141414] inline-flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-[#141414]" />
                  تضمين توقيع مديرة الموارد البشرية (أ. ريم بن حسين — HR@kas.sa)
                </span>
                <input
                  type="checkbox"
                  checked={includeReemSignature}
                  onChange={(e) => setIncludeReemSignature(e.target.checked)}
                  className="accent-[#141414]"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] cursor-pointer">
                <span className="text-xs font-bold text-[#141414] inline-flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-[#141414]" />
                  إدراج الختم الإلكتروني والتوقيع المعتمد
                </span>
                <input
                  type="checkbox"
                  checked={electronicStamp}
                  onChange={(e) => setElectronicStamp(e.target.checked)}
                  className="accent-[#141414]"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] cursor-pointer">
                <span className="text-xs font-bold text-[#141414] inline-flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-[#141414]" />
                  ترويسة تصديق الغرفة التجارية الإلكترونية
                </span>
                <input
                  type="checkbox"
                  checked={chamberAttestation}
                  onChange={(e) => setChamberAttestation(e.target.checked)}
                  className="accent-[#141414]"
                />
              </label>

              <button
                type="button"
                onClick={() => setRevealPii((v) => !v)}
                className="w-full py-2 px-3 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414] hover:bg-[#e0e0e0]/50 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {revealPii ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>
                  {revealPii
                    ? 'إخفاء الهوية والآيبان (PDPL Masking)'
                    : 'إظهار كامل رقم الهوية والآيبان للطباعة البنكية'}
                </span>
              </button>
            </div>

            {history.length > 0 && (
              <div className="pt-2 border-t border-[#e0e0e0]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#141414] mb-2">
                  <History className="w-3.5 h-3.5" />
                  <span>آخر الخطابات المؤرشفة للموظف ({history.length})</span>
                </div>
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="px-3 py-1.5 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] text-[11px] flex items-center justify-between"
                    >
                      <span className="font-bold text-[#141414] truncate max-w-[165px]">
                        {item.template_title}
                      </span>
                      <span className="font-mono text-[#707070]">
                        {item.issued_at.slice(0, 10)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Live A4 Document Preview */}
          <div className="lg:col-span-8 print:col-span-12 p-6 sm:p-8 print:p-0 overflow-y-auto bg-[#f3f3f3] print:bg-[#ffffff] text-[#141414]">
            <div
              data-a4-fullpage="true"
              className="erp-printable-sheet erp-a4-sheet border-2 border-[#141414] p-8 sm:p-10 bg-[#ffffff]"
            >
              <div className="space-y-6">
                {/* Letterhead */}
                <div className="flex items-start justify-between border-b-2 border-[#141414] pb-5 gap-4 flex-wrap">
                  <div>
                    <div className="text-[11px] font-bold text-[#707070]">
                      {branding.letterheadSovereignLineAr}
                    </div>
                    <div className="text-lg font-black text-[#141414] mt-0.5">
                      {effectiveCompanyNameAr}
                    </div>
                    <div className="text-[11px] font-semibold text-[#707070]">
                      {effectiveCompanyNameEn} • س.ت: {branding.crNumber} • الرقم الضريبي:{' '}
                      {branding.taxNumber}
                    </div>
                    <div className="text-xs font-bold text-[#141414] mt-1.5">
                      {activeTemplate.titleAr} — {activeTemplate.titleEn}
                    </div>
                    {chamberAttestation && (
                      <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        مهيأ للتصديق الإلكتروني عبر الغرفة التجارية (عضوية:{' '}
                        {branding.entity.chamberMembershipNo || 'معتمدة'})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-left font-mono text-[11px] bg-[#f3f3f3] border border-[#e0e0e0] px-3 py-2 rounded-[16px]">
                      <div className="font-bold text-[#141414]">{letterSerial}</div>
                      <div className="text-[#707070]">التاريخ: {todayIso}</div>
                      <div
                        className="mt-1"
                        dangerouslySetInnerHTML={{
                          __html: generateRealCode128BarcodeSvg(letterSerial, {
                            widthPx: 120,
                            heightPx: 20,
                          }),
                        }}
                      />
                    </div>
                    <div
                      className="p-1.5 rounded-[12px] border border-[#e0e0e0] bg-[#ffffff]"
                      dangerouslySetInnerHTML={{
                        __html: generateRealQrSvg(verificationHash, { sizePx: 72 }),
                      }}
                    />
                  </div>
                </div>

                {/* Recipient */}
                <div className="flex items-center justify-between bg-[#f3f3f3] px-4 py-3 rounded-[16px] border border-[#e0e0e0] text-xs">
                  <div>
                    <span className="text-[#707070] ml-2">موجه إلى:</span>
                    <strong className="text-[#141414]">{directedTo}</strong>
                  </div>
                  <span className="font-mono text-[11px] text-[#707070]">
                    الرقم الوظيفي: {employee.employee_code}
                  </span>
                </div>

                {/* Arabic Section */}
                {(language === 'AR' || language === 'BILINGUAL') && (
                  <div className="space-y-2 text-right" dir="rtl">
                    <p className="text-xs font-bold text-[#141414] m-0">
                      السلام عليكم ورحمة الله وبركاته،،،
                    </p>
                    <p className="text-sm leading-7 text-[#141414] text-justify m-0">
                      {effectiveArabicBody}
                    </p>
                    {customNote.trim() && (
                      <p className="text-xs font-bold text-[#141414] bg-[#f3f3f3] p-3 rounded-[12px] m-0">
                        ملاحظة معتمدة: {customNote.trim()}
                      </p>
                    )}
                  </div>
                )}

                {/* Divider if Bilingual */}
                {language === 'BILINGUAL' && <hr className="border-[#e0e0e0]" />}

                {/* English Section */}
                {(language === 'EN' || language === 'BILINGUAL') && (
                  <div className="space-y-2 text-left" dir="ltr">
                    <p className="text-xs font-bold text-[#141414] m-0">
                      Dear Sirs / {activeTemplate.defaultRecipientEn},
                    </p>
                    <p className="text-xs leading-6 text-[#141414] text-justify m-0">
                      {effectiveEnglishBody}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Signature & Stamp */}
              <div className="pt-6 mt-8 border-t border-[#e0e0e0] space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="text-xs space-y-1">
                    <div className="text-[#707070]">جهة الإصدار والاعتماد:</div>
                    <div className="font-bold text-[#141414]">
                      {customSignatoryAr || branding.hrIssuerTitleAr}
                    </div>
                    <div className="text-[11px] font-semibold text-[#141414]">
                      المسؤول المفوض:{' '}
                      {includeReemSignature
                        ? `${REEM_HR_SIGNATORY.fullNameAr} (${REEM_HR_SIGNATORY.titleAr} — ${REEM_HR_SIGNATORY.email})`
                        : branding.hrSignatoryNameAr}
                    </div>
                    <div className="text-[11px] text-[#707070] font-mono">
                      رمز التحقق الرقمي: {letterSerial}
                    </div>
                  </div>

                  {electronicStamp && (
                    <div className="px-5 py-3 rounded-[20px] border-2 border-dashed border-[#141414] bg-[#f3f3f3] text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-black text-[#141414]">
                        <ShieldCheck className="w-4 h-4" />
                        <span>ختم إلكتروني موثق — {effectiveCompanyNameAr}</span>
                      </div>
                      <div className="text-[10px] text-[#707070] mt-0.5">
                        س.ت: {branding.crNumber} • {branding.address}
                      </div>
                    </div>
                  )}
                </div>

                {includeReemSignature && (
                  <ReemHrDocumentSignatureBlock
                    referenceNumber={letterSerial}
                    dateStr={todayIso}
                    hideHoldingLogo={hideHoldingGroupBrand}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="no-print print:hidden px-6 py-3.5 bg-[#f3f3f3] border-t border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-[#707070]">
            يُحفظ الخطاب تلقائياً في سجل الوثائق الرسمية (`hr_official_letters`) باسم ({effectiveCompanyNameAr}) مع رمز QR قابل للتحقق.
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => void handleSendLetterViaOfficialHrEmail()}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#141414] text-[#ffffff] hover:bg-[#262626] transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>إرسال الخطاب مباشرة ببريد HR@kas.sa (بالتوقيع الرسمي)</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-full text-xs font-bold bg-[#ffffff] text-[#141414] border border-[#e0e0e0] hover:bg-[#e0e0e0] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة فورية للمعاينة</span>
            </button>
            <button
              type="button"
              onClick={() => handleIssueAndArchive(false)}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#ffffff] text-[#141414] border border-[#141414] hover:bg-[#e0e0e0] transition-colors cursor-pointer"
            >
              اعتماد وأرشفة في ملف الموظف
            </button>
            <button
              type="button"
              onClick={() => handleIssueAndArchive(true)}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#ffffff] text-[#141414] border border-[#141414] hover:bg-[#e0e0e0] transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>اعتماد وطباعة رسمية (PDF / A4)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
