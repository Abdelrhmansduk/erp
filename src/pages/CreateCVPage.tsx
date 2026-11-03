import React, { useState } from 'react';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { FileText, FileSpreadsheet, ArrowRight, ArrowLeft, Check, Upload, User, Award, Paperclip, Printer, QrCode, X } from 'lucide-react';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

export const CreateCVPage: React.FC = () => {
  const { setActiveTab, addNotification } = useAppStore();
  const [activeStep, setActiveStep] = useState<number>(1);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const [formData, setFormData] = useState({
    // 1. Basic & Agency
    type_id: 'توسط',
    create_shelter_contract: false,
    nationality_id: 'الفلبين',
    office_id: "PLATINUM BROTHERS INT'L",
    job_title: 'عاملة منزلية',
    monthly_salary: 1500,
    cost_usd: 1200,

    // 2. Personal Information
    full_name_en: '',
    full_name_ar: '',
    passport_number: '',
    passport_issue_date: '',
    passport_expiry_date: '',
    date_of_birth: '',
    age: '28',
    religion: 'مسلمة',
    marital_status: 'متزوجة',
    children_count: '2',
    height_cm: '160',
    weight_kg: '58',
    complexion: 'حنطية',
    living_country: 'الفلبين',

    // 3. Contact Details
    phone_number: '',
    whatsapp_number: '',
    city: 'مانيلا',
    address: '',

    // 4. Skills & Competencies
    baby_care: true,
    elderly_care: true,
    cooking_arabic: true,
    cleaning: true,
    washing_ironing: true,
    driving: false,
    sewing: false,
    arabic_level: 'متوسط',
    english_level: 'ممتاز',

    // 5. Experience
    experience_type: 'خبرة سابقة بالخليج',
    prev_country: 'السعودية (الرياض)',
    prev_duration: 'سنتان',

    // 6. Media & Links
    video_url: '',
    medical_report_status: 'سليم ولائق طبياً',
    police_clearance: 'سارية وخالية من السوابق',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name_en || !formData.passport_number) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى إكمال الاسم الكامل ورقم جواز السفر لحفظ السيرة الذاتية.',
        type: 'warning',
      });
      return;
    }

    const cvCode = `CV-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCV = {
      id: `cv-${Date.now()}`,
      cv_code: cvCode,
      maid_name: formData.full_name_en,
      maid_name_ar: formData.full_name_ar,
      nationality: formData.nationality_id,
      job: formData.job_title,
      passport_number: formData.passport_number,
      age: parseInt(formData.age) || 28,
      salary: formData.monthly_salary,
      external_office: formData.office_id,
      type: formData.type_id,
      status: 'متاح',
      created_at: new Date().toISOString(),
    };

    await realErpDataStore.addRecord('cvs', newCV);
    addNotification({
      title: 'حفظ السيرة الذاتية بنجاح',
      message: `تم حفظ السيرة الذاتية #${cvCode} للعاملة (${formData.full_name_en}) ونشرها في المنظومة.`,
      type: 'success',
    });
    setActiveTab('cvs-recruitment', 'سير ذاتية الاستقدام المعتمدة');
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
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
        <div className="flex items-center gap-3">
          <BusinessIllustration type="ats-talent" size="sm" />
          <div style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>CV BUILDER SUITE</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              إضافة وتدقيق سيرة ذاتية جديدة
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0 0', fontWeight: 420 }}>
              إدخال البيانات الشخصية، الجواز، المهارات، الفحوصات الطبية، والوسائط بدقة متناهية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-document-extractor'))}
            className="button-white-pill flex items-center gap-1.5 shadow-sm"
            style={{ fontSize: '12.5px', padding: '6px 16px', minHeight: '38px', backgroundColor: '#CFA64A', color: '#000000', fontWeight: 'bold' }}
          >
            <Upload className="w-4 h-4 text-black" />
            <span>استخلاص آلي من ملف سيرة (PDF / Word / صورة)</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPrintPreview(true)}
            className="button-white-pill flex items-center gap-1.5 shadow-sm"
            style={{ fontSize: '12.5px', padding: '6px 16px', minHeight: '38px', backgroundColor: '#ffffff', color: '#000000', fontWeight: 'bold' }}
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>معاينة كرت السيرة للطباعة</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('data-import', 'معالج استيراد البيانات الشامل (Excel / CSV)')}
            className="button-white-pill"
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <FileSpreadsheet className="w-4 h-4 ml-1 text-emerald-600" />
            <span>+ استيراد جماعي (Excel)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cvs-recruitment', 'سير ذاتية الاستقدام المعتمدة')}
            className="button-outline-on-light"
            style={{ fontSize: '12.5px', padding: '6px 16px', minHeight: '38px', background: '#ffffff' }}
          >
            إلغاء ورجوع
          </button>
        </div>
      </div>

      {/* Live Candidate Avatar Preview Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <CorporateAvatar
            name={formData.full_name_ar || formData.full_name_en || 'مرشح جديد'}
            profession={formData.job_title || 'عاملة منزلية'}
            isCandidate
            size="lg"
            status="verified"
          />
          <div>
            <div className="text-sm font-bold text-black">
              {formData.full_name_ar || formData.full_name_en || 'معاينة الهوية الرقمية للمرشح'}
            </div>
            <div className="text-xs text-zinc-500">
              {formData.job_title} • {formData.nationality_id} • {formData.office_id}
            </div>
          </div>
        </div>
        <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
          الراتب المقترح: {formData.monthly_salary} ر.س
        </span>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { step: 1, title: '1. الوكالة والنوع', icon: User },
          { step: 2, title: '2. البيانات الشخصية', icon: FileText },
          { step: 3, title: '3. المهارات واللغات', icon: Award },
          { step: 4, title: '4. المرفقات والتكلفة', icon: Paperclip },
        ].map((s) => {
          const isActive = activeStep === s.step;
          const Icon = s.icon;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => setActiveStep(s.step)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isActive ? '#000000' : '#e4e4e7',
                backgroundColor: isActive ? '#000000' : '#ffffff',
                color: isActive ? '#ffffff' : '#71717a',
                fontWeight: isActive ? 550 : 420,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon className="w-4 h-4" />
              <span>{s.title}</span>
            </button>
          );
        })}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit}>
        {/* Step 1: Agency & Type */}
        {activeStep === 1 && (
          <div className="card-pricing" style={{ padding: '28px', borderRadius: '24px', background: '#ffffff' }}>
            <h3 className="text-base font-bold text-black mb-4">القسم 1: نوع السيرة والوكالة الخارجية</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">نوع السيرة الذاتية *</label>
                <select
                  value={formData.type_id}
                  onChange={(e) => setFormData({ ...formData, type_id: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2.5 px-3 text-xs text-black focus:border-black focus:outline-none"
                >
                  <option value="توسط">استقدام (توسط أفراد)</option>
                  <option value="إيجار">تأجير وتشغيل</option>
                  <option value="نقل كفالة">نقل كفالة وتنازل</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">الجنسية *</label>
                <select
                  value={formData.nationality_id}
                  onChange={(e) => setFormData({ ...formData, nationality_id: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2.5 px-3 text-xs text-black focus:border-black focus:outline-none"
                >
                  <option value="الفلبين">الفلبين (PHL)</option>
                  <option value="إثيوبيا">إثيوبيا (ETH)</option>
                  <option value="أوغندا">أوغندا (UGA)</option>
                  <option value="كينيا">كينيا (KEN)</option>
                  <option value="سريلانكا">سريلانكا (LKA)</option>
                  <option value="الهند">الهند (IND)</option>
                  <option value="بنغلاديش">بنغلاديش (BGD)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">المكتب / الوكالة المصدرة *</label>
                <input
                  type="text"
                  value={formData.office_id}
                  onChange={(e) => setFormData({ ...formData, office_id: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2.5 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">المهنة المصرحة *</label>
                <input
                  type="text"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2.5 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="button-primary-pill"
                style={{ padding: '8px 22px', fontSize: '12.5px', minHeight: '36px' }}
              >
                <span>التالي: البيانات الشخصية</span>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Personal Information */}
        {activeStep === 2 && (
          <div className="card-pricing" style={{ padding: '28px', borderRadius: '24px', background: '#ffffff' }}>
            <h3 className="text-base font-bold text-black mb-4">القسم 2: البيانات الشخصية والجواز</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">الاسم بالإنجليزية (حسب الجواز) *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name_en}
                  onChange={(e) => setFormData({ ...formData, full_name_en: e.target.value })}
                  placeholder="MARIA CLARA SANTOS"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2.5 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">الاسم بالعربية</label>
                <input
                  type="text"
                  value={formData.full_name_ar}
                  onChange={(e) => setFormData({ ...formData, full_name_ar: e.target.value })}
                  placeholder="ماريا كلارا سانتوس"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2.5 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">رقم جواز السفر *</label>
                <input
                  type="text"
                  required
                  value={formData.passport_number}
                  onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                  placeholder="P1234567A"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2.5 px-3 text-xs text-black font-mono font-bold focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">العمر</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2.5 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">الديانة</label>
                <select
                  value={formData.religion}
                  onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2.5 px-3 text-xs text-black focus:border-black focus:outline-none"
                >
                  <option>مسلمة</option>
                  <option>مسيحية</option>
                  <option>أخرى</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="button-outline-on-light"
                style={{ borderRadius: '9999px', fontSize: '12px', minHeight: '36px', padding: '6px 18px' }}
              >
                السابق
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="button-primary-pill"
                style={{ padding: '8px 22px', fontSize: '12.5px', minHeight: '36px' }}
              >
                <span>التالي: المهارات واللغات</span>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Skills & Languages */}
        {activeStep === 3 && (
          <div className="card-pricing" style={{ padding: '28px', borderRadius: '24px', background: '#ffffff' }}>
            <h3 className="text-base font-bold text-black mb-4">القسم 3: المهارات واللغات والخبرات السابقة</h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {[
                { key: 'baby_care', label: 'رعاية الأطفال والرضع' },
                { key: 'elderly_care', label: 'رعاية كبار السن' },
                { key: 'cooking_arabic', label: 'الطبخ وإعداد المأكولات' },
                { key: 'cleaning', label: 'التنظيف وترتيب المنزل' },
                { key: 'washing_ironing', label: 'الغسيل وكي الملابس' },
                { key: 'driving', label: 'قيادة السيارات' },
              ].map((skill) => (
                <label key={skill.key} className="flex items-center gap-2.5 p-3 bg-zinc-50 border border-zinc-100 rounded-2xl cursor-pointer hover:bg-zinc-100/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={(formData as any)[skill.key]}
                    onChange={(e) => setFormData({ ...formData, [skill.key]: e.target.checked })}
                    className="rounded border-zinc-300 text-black focus:ring-black h-4 w-4"
                  />
                  <span className="text-xs text-zinc-800 font-semibold">{skill.label}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">مستوى التحدث بالعربية</label>
                <select
                  value={formData.arabic_level}
                  onChange={(e) => setFormData({ ...formData, arabic_level: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2.5 px-3 text-xs text-black focus:border-black focus:outline-none"
                >
                  <option>ممتاز / طليق</option>
                  <option>متوسط / مفهوم</option>
                  <option>مبتدئ / بسيط</option>
                  <option>لا تتحدث العربية</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">مستوى التحدث بالإنجليزية</label>
                <select
                  value={formData.english_level}
                  onChange={(e) => setFormData({ ...formData, english_level: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2.5 px-3 text-xs text-black focus:border-black focus:outline-none"
                >
                  <option>ممتاز / Fluent</option>
                  <option>جيد / Good</option>
                  <option>متوسط</option>
                  <option>بسيط</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="button-outline-on-light"
                style={{ borderRadius: '9999px', fontSize: '12px', minHeight: '36px', padding: '6px 18px' }}
              >
                السابق
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(4)}
                className="button-primary-pill"
                style={{ padding: '8px 22px', fontSize: '12.5px', minHeight: '36px' }}
              >
                <span>التالي: المرفقات والاعتماد</span>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Media, Cost, & Submission */}
        {activeStep === 4 && (
          <div className="card-pricing" style={{ padding: '28px', borderRadius: '24px', background: '#ffffff' }}>
            <h3 className="text-base font-bold text-black mb-4">القسم 4: التكاليف، الوسائط، وحفظ السيرة</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">الراتب الشهري (ر.س) *</label>
                <input
                  type="number"
                  required
                  value={formData.monthly_salary}
                  onChange={(e) => setFormData({ ...formData, monthly_salary: parseFloat(e.target.value) || 1500 })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2.5 px-3 text-xs text-black font-mono font-bold focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">التكلفة للمكتب الخارجي ($)</label>
                <input
                  type="number"
                  value={formData.cost_usd}
                  onChange={(e) => setFormData({ ...formData, cost_usd: parseFloat(e.target.value) || 1200 })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2.5 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">رابط الفيديو التعريفي (YouTube / Drive)</label>
                <input
                  type="text"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2.5 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">حالة الفحص الطبي</label>
                <select
                  value={formData.medical_report_status}
                  onChange={(e) => setFormData({ ...formData, medical_report_status: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2.5 px-3 text-xs text-black focus:border-black focus:outline-none"
                >
                  <option>سليم ولائق طبياً (مرفق)</option>
                  <option>قيد الفحص المخبري</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="button-outline-on-light"
                style={{ borderRadius: '9999px', fontSize: '12px', minHeight: '36px', padding: '6px 18px' }}
              >
                السابق
              </button>
              <button
                type="submit"
                className="button-primary-pill"
                style={{ padding: '9px 24px', fontSize: '13px', minHeight: '38px' }}
              >
                <Check className="w-4 h-4 ml-1.5" />
                <span>حفظ ونشر السيرة الذاتية</span>
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Printable Worker CV Card Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in dir-rtl text-right">
          <div className="w-full max-w-2xl bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-black text-base">بطاقة السيرة الذاتية الرسمية للعمالة (CV Profile)</h3>
              </div>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Document Body */}
            <div className="p-6 bg-white border-2 border-zinc-900 rounded-2xl space-y-4 font-sans text-xs">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-black">مجموعة السليم للاستقدام</h2>
                  <div className="text-[11px] text-zinc-500">Al-Saleem Recruitment Group | ترخيص استقدام: 390102</div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">معتمد من مساند ووزارة الموارد البشرية</div>
                </div>
                <div className="w-14 h-14 bg-black text-white rounded-xl flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-champagne-light" />
                </div>
              </div>

              {/* Main Worker Profile Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Photo Placeholder */}
                <div className="col-span-1 bg-zinc-100 rounded-2xl border border-zinc-200 p-3 flex flex-col items-center justify-center min-h-[160px] text-center">
                  <User className="w-16 h-16 text-zinc-400 mb-2" />
                  <span className="text-[11px] font-bold text-black">{formData.full_name_ar || formData.full_name_en || 'اسم العاملة'}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{formData.full_name_en || 'CANDIDATE FULL NAME'}</span>
                  <span className="pill-tag-mint text-[9px] mt-2">لائقة طبياً</span>
                </div>

                {/* Details Table */}
                <div className="col-span-2 space-y-1.5">
                  <div className="flex justify-between py-1 border-b border-zinc-100"><span className="text-zinc-500">الجنسية:</span><strong className="text-black">{formData.nationality_id}</strong></div>
                  <div className="flex justify-between py-1 border-b border-zinc-100"><span className="text-zinc-500">المهنة:</span><strong className="text-black">{formData.job_title}</strong></div>
                  <div className="flex justify-between py-1 border-b border-zinc-100"><span className="text-zinc-500">الديانة:</span><strong className="text-black">{formData.religion}</strong></div>
                  <div className="flex justify-between py-1 border-b border-zinc-100"><span className="text-zinc-500">العمر:</span><strong className="text-black font-mono">{formData.age} سنة</strong></div>
                  <div className="flex justify-between py-1 border-b border-zinc-100"><span className="text-zinc-500">الحالة الاجتماعية:</span><strong className="text-black">{formData.marital_status} ({formData.children_count} أطفال)</strong></div>
                  <div className="flex justify-between py-1 border-b border-zinc-100"><span className="text-zinc-500">رقم الجواز:</span><strong className="text-black font-mono">{formData.passport_number || 'EP9920145'}</strong></div>
                  <div className="flex justify-between py-1 border-b border-zinc-100"><span className="text-zinc-500">الراتب الشهري:</span><strong className="text-emerald-700 font-mono font-bold">{formData.monthly_salary} ر.س</strong></div>
                </div>
              </div>

              {/* Skills Matrix */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <h4 className="font-bold text-xs text-black mb-2">مصفوفة المهارات واللغات:</h4>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">{formData.baby_care ? '' : ''} رعاية الأطفال</div>
                  <div className="flex items-center gap-1.5">{formData.elderly_care ? '' : ''} كبار السن</div>
                  <div className="flex items-center gap-1.5">{formData.cooking_arabic ? '' : ''} الطبخ الخليجي</div>
                  <div className="flex items-center gap-1.5">{formData.cleaning ? '' : ''} النظافة العامة</div>
                  <div className="flex items-center gap-1.5">{formData.washing_ironing ? '' : ''} الغسيل والكي</div>
                  <div className="flex items-center gap-1.5">{formData.driving ? '' : ''} قيادة السيارة</div>
                  <div>اللغة العربية: <strong>{formData.arabic_level}</strong></div>
                  <div>اللغة الإنجليزية: <strong>{formData.english_level}</strong></div>
                  <div>الخبرة: <strong>{formData.experience_type}</strong></div>
                </div>
              </div>

              {/* Guarantee & Agency Seal */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-200">
                <div>
                  <div className="text-[11px] font-bold text-black">المكتب الخارجي المعتمد: {formData.office_id}</div>
                  <div className="text-[10px] text-zinc-500">الضمان النظامي: 90 يوماً من تاريخ الوصول شامل الهروب ورفض العمل</div>
                </div>
                <div className="w-20 h-20 border border-dashed border-zinc-400 rounded-full flex items-center justify-center text-[9px] font-bold text-zinc-400 text-center">
                  ختم السيرة<br />المعتمد
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center gap-2 pt-4 border-t border-zinc-100 mt-4">
              <button
                type="button"
                onClick={() => window.print()}
                className="button-primary-pill text-xs font-bold inline-flex items-center gap-1.5"
                style={{ minHeight: '36px', padding: '6px 20px' }}
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الكرت فوراً</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPrintPreview(false)}
                className="button-outline-on-light text-xs font-bold"
                style={{ minHeight: '36px', padding: '6px 18px' }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCVPage;
