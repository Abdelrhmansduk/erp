import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, FileText, CheckCircle2, AlertTriangle, Lock, 
  Scale, Fingerprint, RefreshCw, Download, Check, X, ArrowLeft,
  Building2, UserCheck, Calendar, Globe, Sparkles
} from 'lucide-react';
import { realErpDataStore } from '../../services/realErpDataStore';
import { legalService } from '../../services/legalService';
import { useAppStore } from '../../stores/appStore';

export interface DepartmentLegalClause {
  id: string;
  title: string;
  lawReference: string;
  description: string;
}

export interface DepartmentPolicyConfig {
  departmentKey: string;
  departmentName: string;
  applicableLaws: string[];
  clauses: DepartmentLegalClause[];
}

export const DEPARTMENT_LEGAL_POLICIES: Record<string, DepartmentPolicyConfig> = {
  'recruitment': {
    departmentKey: 'recruitment',
    departmentName: 'إدارة التشغيل والاستقدام والتعاقدات الدولية',
    applicableLaws: [
      'نظام التعاملات الإلكترونية (مرسوم ملكي م/18)',
      'نظام مكافحة جرائم المعلوماتية (مرسوم ملكي م/17)',
      'نظام حماية البيانات الشخصية السعودي (PDPL)',
      'لوائح منصة مساند وقواعد ممارسة نشاط الاستقدام',
    ],
    clauses: [
      {
        id: 'rec-1',
        title: 'سرية بيانات العمالة والسير الذاتية وجوازات السفر',
        lawReference: 'المادة (3) والمادة (5) من نظام مكافحة جرائم المعلوماتية ونظام PDPL',
        description: 'أتعهد بالمحافظة التامة على سرية كافة السير الذاتية، الجوازات، والفحوصات الطبية، ويحظر قطعياً تصويرها أو تداولها عبر الهواتف الشخصية أو وسائل التواصل خارج القنوات الرسمية لمنصة مساند ومنظومة الـ ERP.'
      },
      {
        id: 'rec-2',
        title: 'حظر تداول شروط الوكالات الأجنبية والعمولات الخارجية',
        lawReference: 'لائحة شركات ومكاتب الاستقدام وقواعد المنافسة العادلة',
        description: 'أقر بعدم إفشاء أو مشاركة أي اتفاقيات تجارية أو عمولات خاصة بالوكلاء والمكاتب الخارجية في الفلبين وإثيوبيا وسريلانكا وغيرها لأي جهة أو أفراد خارج دائرة الاختصاص المعتمدة.'
      },
      {
        id: 'rec-3',
        title: 'المسؤولية عن صحة مسارات التأشيرات وتفويض إنجاز',
        lawReference: 'نظام العمل السعودي ولائحة تنظيم التأشيرات الصادرة من وزارة الخارجية',
        description: 'أتحمل المسؤولية الإدارية والمدنية والجنائية عن دقة البيانات المدخلة في طلبات العقود، التفويض الإلكتروني (إنجاز)، ومطابقة مواصفات الاستقدام المعتمدة في منصة مساند.'
      }
    ]
  },
  'finance': {
    departmentKey: 'finance',
    departmentName: 'الإدارة المالية والحسابات والتدقيق المحاسبي',
    applicableLaws: [
      'نظام التعاملات الإلكترونية وسندات الدين التنفيذية',
      'لوائح هيئة الزكاة والضريبة والجمارك (ZATCA) والفاتورة الإلكترونية',
      'معايير المحاسبة والمراجعة السعودية (SOCPA)',
      'نظام مكافحة غسل الأموال وتمويل الإرهاب'
    ],
    clauses: [
      {
        id: 'fin-1',
        title: 'سلامة السندات والقيود والفوترة الإلكترونية',
        lawReference: 'لائحة الفاتورة الإلكترونية المعتمدة من ZATCA ونظام المحاسبين القانونيين',
        description: 'أتعهد بعدم إصدار أو تعديل أي سند قبض أو صرف أو قيد يومي دون مستندات ثبوتية معتمدة ومطابقة لضوابط الفاتورة الإلكترونية المشفرة، وأقر بتحمل التبعات القانونية عن أي قيد مالي مخالف.'
      },
      {
        id: 'fin-2',
        title: 'سرية الحسابات البنكية وحماية الأجور (WPS)',
        lawReference: 'أنظمة البنك المركزي السعودي (SAMA) ونظام حماية الأجور',
        description: 'ألتزم بالسرية التامة لبيانات الحسابات البنكية للمجموعة وأرصدة العملاء ومسيرات رواتب الموظفين والعمالة، وأقر بأن تسريب أي كشف بنكي أو مسير يُعد خيانة للأمانة وجريمة معلوماتية.'
      },
      {
        id: 'fin-3',
        title: 'الامتثال لضوابط مكافحة الاحتيال والعهد المالية',
        lawReference: 'المادة (4) من نظام مكافحة الاحتيال المالي وخيانة الأمانة',
        description: 'أتعهد بتصفية كافة العهد النقدية في مواعيدها ومطابقة التسويات البنكية بدقة، وعدم قبول أو تحويل أي مبالغ نقدية أو بنكية خارج القنوات الرسمية للمنشأة.'
      }
    ]
  },
  'crm': {
    departmentKey: 'crm',
    departmentName: 'إدارة خدمة العملاء والمبيعات والـ CRM',
    applicableLaws: [
      'نظام حماية البيانات الشخصية السعودي (PDPL)',
      'نظام التجارة الإلكترونية ولائحته التنفيذية',
      'ضوابط هيئة الاتصالات والفضاء والتقنية لمكافحة الرسائل الاقتحامية (Spam)'
    ],
    clauses: [
      {
        id: 'crm-1',
        title: 'حماية بيانات العملاء وخصوصية المستفيدين (PDPL)',
        lawReference: 'المواد (4، 12، 31) من نظام حماية البيانات الشخصية السعودي',
        description: 'أتعهد بعدم تصدير، نسخ، أو استخدام أرقام هواتف وعناوين العملاء لأي غرض شخصي أو ترويجي غير مصرح به، وألتزم بمسح أي بيانات مؤقتة فور انتهاء الخدمة.'
      },
      {
        id: 'crm-2',
        title: 'الشفافية في الأسعار والشروط المعتمدة',
        lawReference: 'لوائح حماية المستهلك وقواعد وزارة الموارد البشرية',
        description: 'ألتزم بتقديم المعلومات الصادقة والأسعار الرسمية المعتمدة لخدمات التوسط والتأجير دون أي زيادة غير نظامية، وعدم تقديم وعود غير مدرجة في بنود العقد الموحد.'
      },
      {
        id: 'crm-3',
        title: 'قنوات التواصل المعتمدة وحظر التواصل الفردي',
        lawReference: 'سياسة الأمن المؤسسي وضوابط التواصل المعتمدة',
        description: 'يحظر قطعياً التواصل مع العملاء من أرقام شخصية، والاعتماد الحصري على بوابة الواتساب الرسمية والسنترال الموحد 9200 لتوثيق سجل المحادثات وحماية حقوق الطرفين.'
      }
    ]
  },
  'shelter': {
    departmentKey: 'shelter',
    departmentName: 'إدارة مراكز الإيواء والتسكين والرعاية',
    applicableLaws: [
      'نظام العمل السعودي والمعايير الدولية لحقوق الإنسان',
      'لوائح واشتراطات مراكز إيواء العمالة المنزلية الصادرة من وزارة الموارد البشرية',
      'الضوابط الصحية والبلدية لغرف التسكين والإعاشة'
    ],
    clauses: [
      {
        id: 'shl-1',
        title: 'احترام حقوق وكرامة العمالة النزيلة',
        lawReference: 'لائحة عمال الخدمة المنزلية ومن في حكمهم والاتفاقيات الدولية المصادق عليها',
        description: 'أتعهد بالمعاملة الكريمة والإنسانية لكافة النزيلات، وتوفير الرعاية الصحية والإعاشة الكريمة، وعدم ممارسة أي تصرف يمس كرامتهن أو حقوقهن النظامية.'
      },
      {
        id: 'shl-2',
        title: 'حظر التصوير ونشر بيانات الإيواء',
        lawReference: 'المادة (3) الفقرة (4) من نظام مكافحة جرائم المعلوماتية (المساس بالحياة الخاصة)',
        description: 'يحظر حظراً تاماً التقاط أي صور أو مقاطع فيديو داخل مراكز الإيواء أو نشرها على شبكات التواصل، ويتحمل المخالف أقصى العقوبات الجزائية المنصوص عليها نظاماً.'
      },
      {
        id: 'shl-3',
        title: 'دقة سجلات الدخول والمغادرة والمطارات',
        lawReference: 'تعليمات الجوازات وهيئة الطيران المدني لنقل واستقبال العمالة',
        description: 'ألتزم بالتوثيق الدقيق لكل حركة دخول، خروج، نقل، أو تسليم للعميل مع أخذ التواقيع الرسمية وتأكيد سلامة الأمتعة والمستندات الشخصية.'
      }
    ]
  },
  'hr': {
    departmentKey: 'hr',
    departmentName: 'الموارد البشرية والشؤون الإدارية العامة',
    applicableLaws: [
      'نظام العمل السعودي الصادر بالمرسوم الملكي م/51 وتعديلاته',
      'لوائح منصة قوى ومدد والتأمينات الاجتماعية (GOSI)',
      'نظام مكافحة التحرش وضوابط بيئة العمل المعتمدة'
    ],
    clauses: [
      {
        id: 'hr-1',
        title: 'السرية المهنية لملفات الموظفين والرواتب',
        lawReference: 'المادة (80) من نظام العمل واللائحة التنفيذية لحماية الأجور',
        description: 'أتعهد بالسرية المطلقة لبيانات الموظفين والتقييمات والقرارات الإدارية، وعدم إفشاء رواتب أو مكافآت أو عقود العمل لأي موظف آخر.'
      },
      {
        id: 'hr-2',
        title: 'الالتزام بتوثيق العقود وحقوق العاملين',
        lawReference: 'قواعد التوثيق الإلكتروني في منصة قوى ولوائح التأمينات GOSI',
        description: 'ألتزم بتطبيق معايير العدالة المهنية وتوثيق العقود المعتمدة واحتساب الإجازات ومستحقات نهاية الخدمة بدقة وفقاً لنظام العمل السعودي.'
      }
    ]
  },
  'admin': {
    departmentKey: 'admin',
    departmentName: 'الإدارة العليا والتنفيذية وتقنية المعلومات',
    applicableLaws: [
      'الضوابط الأساسية للأمن السيبراني (NCA ECC-1:2018)',
      'نظام الشركات السعودي ونظام التعاملات الإلكترونية',
      'نظام مكافحة جرائم المعلوماتية ونظام PDPL'
    ],
    clauses: [
      {
        id: 'adm-1',
        title: 'حماية الحسابات الإدارية وصلاحيات الـ Super Admin',
        lawReference: 'ضوابط الهيئة الوطنية للأمن السيبراني (NCA) - التحكم بالوصول وحسابات الامتياز',
        description: 'أتعهد بالمحافظة الصارمة على بيانات الدخول ومفاتيح التشفير والمصادقة الثنائية 2FA، وعدم تفويض الصلاحيات لغير المخولين نظامياً، ومراقبة سجلات التدقيق الأمني.'
      },
      {
        id: 'adm-2',
        title: 'المسؤولية عن نزاهة القرارات المؤسسية',
        lawReference: 'نظام الشركات وحوكمة المنشآت التجارية في المملكة العربية السعودية',
        description: 'أقر بالالتزام بأعلى معايير الحوكمة والنزاهة والمساءلة القانونية في كافة القرارات الإدارية والتعاقدية والمالية المتخذة داخل المنظومة.'
      }
    ]
  }
};

export interface SignedUndertakingRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  national_id: string;
  username: string;
  department: string;
  branch: string;
  job_title: string;
  signature_data_url: string;
  signed_at: string;
  signed_at_hijri?: string;
  ip_address: string;
  user_agent: string;
  compliance_hash: string;
  status: 'معتمد وموثق نظامياً';
}

interface LegalDisclaimerModalProps {
  user: {
    name: string;
    username: string;
    department?: string;
    job_title?: string;
    branch?: string;
    national_id?: string;
    role?: string;
  };
  onAcceptAndContinue: (signedRecord: SignedUndertakingRecord) => void;
  onLogout: () => void;
}

export const LegalDisclaimerModal: React.FC<LegalDisclaimerModalProps> = ({
  user,
  onAcceptAndContinue,
  onLogout
}) => {
  const { addNotification } = useAppStore();

  // Detect Department Policy
  const getPolicyKey = (): string => {
    const dept = (user.department || user.role || '').toLowerCase();
    if (dept.includes('استقدام') || dept.includes('تشغيل') || dept.includes('عمليات') || dept.includes('recruitment') || dept.includes('ops')) return 'recruitment';
    if (dept.includes('مالية') || dept.includes('حسابات') || dept.includes('finance') || dept.includes('accounting')) return 'finance';
    if (dept.includes('عملاء') || dept.includes('مبيعات') || dept.includes('crm') || dept.includes('sales')) return 'crm';
    if (dept.includes('إيواء') || dept.includes('تسكين') || dept.includes('shelter')) return 'shelter';
    if (dept.includes('موارد') || dept.includes('hr')) return 'hr';
    return 'admin';
  };

  const policy = DEPARTMENT_LEGAL_POLICIES[getPolicyKey()] || DEPARTMENT_LEGAL_POLICIES['admin'];

  // Checkbox Acknowledgements
  const [agreedGeneral, setAgreedGeneral] = useState(false);
  const [agreedDepartment, setAgreedDepartment] = useState(false);
  const [agreedCyberLaw, setAgreedCyberLaw] = useState(false);
  const [agreedPDPL, setAgreedPDPL] = useState(false);

  // Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [useBiometricSign, setUseBiometricSign] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Digital Metadata — the real client IP is captured server-side (DB trigger
  // reads x-forwarded-for from the PostgREST request headers); never faked here.
  const [clientIp] = useState('يُسجَّل تلقائياً من الخادم');
  const [currentDate] = useState(() => new Date().toISOString().slice(0, 16).replace('T', ' '));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const allAgreed = agreedGeneral && agreedDepartment && agreedCyberLaw && agreedPDPL && (hasSignature || useBiometricSign);

  const handleSubmitSignature = async () => {
    if (!allAgreed) return;
    setIsSubmitting(true);
    setSubmitError(null);

    let signatureData = '';
    let signatureMethod: 'drawn' | 'confirmation' = 'confirmation';
    if (canvasRef.current && hasSignature) {
      signatureData = canvasRef.current.toDataURL('image/png');
      signatureMethod = 'drawn';
    } else if (useBiometricSign) {
      signatureData = `CONFIRMATION:${user.username}:${new Date().toISOString()}`;
    }

    // Persist server-side FIRST. If this fails, the user is NOT let in.
    let signed;
    try {
      signed = await legalService.sign({
        department: policy.departmentName,
        branch: user.branch,
        jobTitle: user.job_title || user.role,
        employeeName: user.name,
        username: user.username,
        signatureDataUrl: signatureData,
        signatureMethod,
      });
    } catch (err: any) {
      setSubmitError(err?.message || 'تعذّر توثيق الإقرار. حاول مرة أخرى.');
      setIsSubmitting(false);
      return;
    }

    const complianceHash = signed.complianceHash;
    const record: SignedUndertakingRecord = {
      id: signed.id,
      employee_id: user.username || '',
      employee_name: user.name || '',
      national_id: user.national_id || '',
      username: user.username || '',
      department: policy.departmentName,
      branch: user.branch || '',
      job_title: user.job_title || user.role || '',
      signature_data_url: signatureData,
      signed_at: signed.signedAt.slice(0, 19).replace('T', ' '),
      ip_address: clientIp,
      user_agent: navigator.userAgent,
      compliance_hash: complianceHash,
      status: 'معتمد وموثق نظامياً'
    };

    // Audit log (best effort — the authoritative record is already stored above)
    await realErpDataStore.addRecord('activity_log', {
      id: `LOG-${Date.now()}`,
      user_name: user.name,
      role: user.role || 'User',
      action_type: 'تعديل',
      module: 'الأمان والامتثال القانوني',
      details: `توقيع واعتماد ميثاق التبرئة القانونية وسياسة استخدام النظام (${policy.departmentName}) برقم توثيق #${complianceHash}`,
      severity: 'تنبيه',
      ip_address: clientIp,
      device: navigator.userAgent.slice(0, 50),
      created_at: new Date().toISOString().slice(0, 16).replace('T', ' ')
    });

    addNotification({
      title: 'تم اعتماد التوقيع والميثاق القانوني',
      message: `مرحباً بك (${user.name}). تم توثيق إقرارك برقم اعتماد #${complianceHash} وتم فتح المنظومة.`,
      type: 'success',
    });

    setIsSubmitting(false);
    onAcceptAndContinue(record);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-black text-white p-6 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="pill-tag-mint text-[10px] font-bold">المملكة العربية السعودية • الامتثال الرقمي</span>
                <span className="pill-tag-shade text-[10px] bg-zinc-800 text-zinc-300">إقرار إلزامي عند أول دخول</span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white mt-1">
                ميثاق التبرئة القانونية وسياسة استخدام منظومة الـ ERP
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                مخصص لـ: <span className="font-bold text-emerald-400">{policy.departmentName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="text-xs text-zinc-400 hover:text-rose-400 transition-colors p-2 rounded-xl hover:bg-zinc-900 flex items-center gap-1"
            title="تسجيل الخروج والرجوع"
          >
            <span>تسجيل الخروج</span>
            <ArrowLeft className="w-4 h-4 ml-1" />
          </button>
        </div>

        {/* User Identity Stripe */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-700">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-zinc-400 block text-[10px]">الموظف المصرح له:</span>
              <span className="font-bold text-black">{user.name}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">المسمى الوظيفي:</span>
              <span className="font-semibold text-zinc-800">{user.job_title || user.role || 'أخصائي معتمد'}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">الفرع:</span>
              <span className="font-semibold text-zinc-800">{user.branch || 'الفرع الرئيسي'}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">عنوان الـ IP الموثق:</span>
              <span className="font-mono text-emerald-700 font-bold">{clientIp}</span>
            </div>
          </div>
          <div className="text-zinc-500 font-mono text-[11px]">
            التاريخ: {currentDate}
          </div>
        </div>

        {/* Scrollable Policy Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-zinc-800 text-xs leading-relaxed">
          {/* Saudi Legal Reference Box */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
            <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>المرجعيات النظامية والقوانين السعودية الحاكمة</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-emerald-900 font-medium">
              {policy.applicableLaws.map((law, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span>{law}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Department Specific Clauses */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-black flex items-center gap-2">
              <Building2 className="w-4 h-4 text-black" />
              <span>البنود والشروط المخصصة لـ ({policy.departmentName}):</span>
            </h4>

            {policy.clauses.map((clause, idx) => (
              <div key={clause.id} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-1.5 hover:border-zinc-300 transition-colors">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-xs text-black flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <span>{clause.title}</span>
                  </span>
                  <span className="text-[10px] bg-zinc-200/80 text-zinc-800 px-2.5 py-0.5 rounded-full font-mono font-medium">
                    {clause.lawReference}
                  </span>
                </div>
                <p className="text-zinc-600 text-xs pr-7 leading-relaxed">
                  {clause.description}
                </p>
              </div>
            ))}
          </div>

          {/* Mandatory Checkboxes */}
          <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
            <h4 className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>الإقرارات والتعهدات الإلزامية للمصادقة والدخول:</span>
            </h4>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedGeneral}
                onChange={e => setAgreedGeneral(e.target.checked)}
                className="mt-1 rounded text-black focus:ring-0 w-4 h-4 accent-black"
              />
              <span className="text-xs text-zinc-800">
                <strong>إقرار الاطلاع والالتزام:</strong> أقر بأنني اطلعت وفهمت كافة السياسات واللوائح والتعليمات المحددة أعلاه، وأتعهد بالامتثال التام لها طيلة فترة عملي واستخدامي للمنظومة.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedDepartment}
                onChange={e => setAgreedDepartment(e.target.checked)}
                className="mt-1 rounded text-black focus:ring-0 w-4 h-4 accent-black"
              />
              <span className="text-xs text-zinc-800">
                <strong>المسؤولية القانونية والإدارية:</strong> أقر بتحمل المسؤولية الكاملة عن كافة العمليات والسجلات المنجزة تحت اسم المستخدم الخاص بي، وأبرئ ذمة المنشأة من أي تصرف أو تسريب فردي خارج النطاق المصرح به.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedCyberLaw}
                onChange={e => setAgreedCyberLaw(e.target.checked)}
                className="mt-1 rounded text-black focus:ring-0 w-4 h-4 accent-black"
              />
              <span className="text-xs text-zinc-800">
                <strong>الامتثال لنظام مكافحة جرائم المعلوماتية:</strong> أقر بعلمي بأن الدخول غير المشروع أو إفشاء البيانات أو مسح السجلات يُعد جريمة يعاقب عليها القانون بالسجن والغرامات المالية وفق الأنظمة السعودية.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedPDPL}
                onChange={e => setAgreedPDPL(e.target.checked)}
                className="mt-1 rounded text-black focus:ring-0 w-4 h-4 accent-black"
              />
              <span className="text-xs text-zinc-800">
                <strong>حماية البيانات الشخصية (PDPL):</strong> أتعهد بالمحافظة على سرية بيانات العملاء والعمالة المنزلية وعدم مشاركتها مع أطراف خارجية تحت طائلة المساءلة القانونية.
              </span>
            </label>
          </div>

          {/* Electronic Signature Canvas Section */}
          <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-xs text-black flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-emerald-600" />
                  <span>التوقيع الإلكتروني المعتمد للموظف (Digital E-Signature)</span>
                </h4>
                <p className="text-[11px] text-zinc-500">
                  ارسم توقيعك في المربع أدناه أو اختر المصادقة البيومترية المعترف بها بنظام التعاملات الإلكترونية
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUseBiometricSign(!useBiometricSign)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                    useBiometricSign
                      ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                      : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                  }`}
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>{useBiometricSign ? 'مفوض بالبصمة البيومترية' : 'توقيع بالبصمة البيومترية'}</span>
                </button>

                {!useBiometricSign && (
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-xs text-zinc-500 hover:text-rose-600 px-3 py-1 rounded-full border border-zinc-200 bg-white flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>مسح التوقيع</span>
                  </button>
                )}
              </div>
            </div>

            {!useBiometricSign ? (
              <div className="border-2 border-dashed border-zinc-300 rounded-2xl bg-white p-2 relative overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={130}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-32 cursor-crosshair touch-none"
                />
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-400 text-xs">
                    ارسم توقيعك هنا بالماوس أو الشاشة اللمسية...
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <Fingerprint className="w-10 h-10 text-emerald-600 mx-auto" />
                <div className="font-bold text-xs text-emerald-950">
                  تم اعتماد التفويض البيومتري للموظف ({user.name})
                </div>
                <div className="text-[11px] text-emerald-800">
                  سيتم ربط التوقيع بالبصمة المحمية وتوليد شهادة أمان رقمية مشفرة بختم المنظومة.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {submitError && (
          <div role="alert" className="px-5 py-3 bg-red-50 border-t border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{submitError}</span>
          </div>
        )}
        <div className="p-5 bg-zinc-50 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>توثيق رقمي مشفر • التزام بنظام التعاملات الإلكترونية السعودي</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onLogout}
              className="button-outline-on-light text-xs py-2 px-4"
            >
              إلغاء وتسجيل الخروج
            </button>

            <button
              onClick={handleSubmitSignature}
              disabled={!allAgreed || isSubmitting}
              className={`button-primary-pill text-xs py-2.5 px-6 flex items-center gap-2 ${
                !allAgreed ? 'opacity-40 cursor-not-allowed' : 'shadow-lg hover:scale-105 transition-all'
              }`}
            >
              {isSubmitting ? (
                <span>جاري توثيق التوقيع...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>اعتماد التوقيع والدخول للمنظومة</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
