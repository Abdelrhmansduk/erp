import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  MapPin,
  Search,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { realErpDataStore } from '../../services/realErpDataStore';
import {
  DEFAULT_CAREER_JOB_POSTINGS,
  submitCareerPortalApplication,
  type CareerApplicationRecord,
  type CareerJobPostingRecord,
} from '../../services/jisrGovernanceTalentPulseEngine';

interface PublicCareerPortalViewProps {
  initialCompanyId?: string;
  onExitToErp?: () => void;
}

export const PublicCareerPortalView: React.FC<PublicCareerPortalViewProps> = ({
  initialCompanyId,
  onExitToErp,
}) => {
  const [jobs, setJobs] = useState<CareerJobPostingRecord[]>(DEFAULT_CAREER_JOB_POSTINGS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('ALL');
  const [selectedJob, setSelectedJob] = useState<CareerJobPostingRecord | null>(null);
  const [submittedApp, setSubmittedApp] = useState<CareerApplicationRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Application form fields
  const [candidateName, setCandidateName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [nationalId, setNationalId] = useState<string>('');
  const [nationality, setNationality] = useState<string>('سعودي');
  const [yearsExp, setYearsExp] = useState<number>(3);
  const [expectedSalary, setExpectedSalary] = useState<number>(11000);
  const [skillsSummary, setSkillsSummary] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    realErpDataStore
      .getRecords<CareerJobPostingRecord>('hr_career_job_postings', DEFAULT_CAREER_JOB_POSTINGS)
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setJobs(list);
        }
      });
  }, []);

  const publishedJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return jobs.filter((job) => {
      if (!job.is_published) return false;
      if (initialCompanyId && initialCompanyId !== 'all' && initialCompanyId !== 'ALL') {
        if (job.company_id !== initialCompanyId) return false;
      }
      if (cityFilter !== 'ALL' && job.city !== cityFilter) return false;
      if (!q) return true;
      return `${job.title_ar} ${job.department} ${job.description_ar} ${job.city}`
        .toLowerCase()
        .includes(q);
    });
  }, [jobs, searchQuery, cityFilter, initialCompanyId]);

  const handleOpenApply = (job: CareerJobPostingRecord) => {
    setSelectedJob(job);
    setSubmittedApp(null);
    setFormError(null);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    if (!candidateName.trim() || !email.trim() || !phone.trim()) {
      setFormError('يرجى إدخال الاسم الكامل، البريد الإلكتروني، ورقم الجوال للتقديم.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const app = await submitCareerPortalApplication({
        job: selectedJob,
        candidateName,
        email,
        phone,
        nationalIdRaw: nationalId,
        nationality,
        yearsExperience: yearsExp,
        expectedSalarySar: expectedSalary,
        skillsSummary,
      });
      setSubmittedApp(app);
      setCandidateName('');
      setEmail('');
      setPhone('');
      setNationalId('');
      setSkillsSummary('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cities = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.city).filter(Boolean))),
    [jobs]
  );

  return (
    <div className="min-h-screen bg-[#f3f3f3] text-[#141414] font-['Cairo']" dir="rtl">
      {/* Header */}
      <header className="bg-[#ffffff] border-b border-[#e0e0e0] px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#141414] text-[#ffffff] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-[#141414] m-0">
                بوابة الوظائف والكفاءات | مجموعة خالد السليم القابضة
              </h1>
              <p className="text-[11px] text-[#707070] m-0">
                Public Branded Career Portal & AI Candidate Matching
              </p>
            </div>
          </div>

          {onExitToErp && (
            <button
              type="button"
              onClick={onExitToErp}
              className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة إلى بوابة الدخول والنظام</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Search & City Filter Bar */}
        <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-[#707070] absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالمسمى الوظيفي، التخصص، أو الإدارة..."
              className="w-full rounded-[16px] bg-[#f0f0f0] pr-10 pl-4 py-2.5 text-xs font-bold text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
            />
          </div>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="rounded-[16px] bg-[#f0f0f0] px-4 py-2.5 text-xs font-bold text-[#141414] outline-none"
          >
            <option value="ALL">جميع المدن</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Job Cards Grid + Application Side Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`${selectedJob ? 'lg:col-span-7' : 'lg:col-span-12'} grid grid-cols-1 md:grid-cols-2 gap-4`}>
            {publishedJobs.length === 0 ? (
              <div className="col-span-full rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-8 text-center text-xs text-[#707070]">
                لا توجد شواغر مطابقة لمعايير البحث الحالية.
              </div>
            ) : (
              publishedJobs.map((job) => (
                <div
                  key={job.id}
                  className={`rounded-[24px] bg-[#ffffff] border p-5 flex flex-col justify-between gap-4 ${
                    selectedJob?.id === job.id ? 'border-[#141414]' : 'border-[#e0e0e0]'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[10px] font-bold text-[#141414]">
                        {job.department}
                      </span>
                      {job.saudization_target && (
                        <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                          مستهدف توطين
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm font-black text-[#141414] m-0">{job.title_ar}</h2>
                    <p className="text-xs text-[#707070] leading-relaxed m-0">{job.description_ar}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(job.requirements_json || []).map((req) => (
                        <span
                          key={req}
                          className="px-2.5 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10px] font-bold text-[#141414]"
                        >
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#e0e0e0] flex items-center justify-between gap-2">
                    <div className="text-[11px] text-[#707070] flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.city}
                      </span>
                      {job.salary_max_sar > 0 && (
                        <span className="font-bold text-[#141414]">
                          ⃁ {job.salary_min_sar.toLocaleString()} – {job.salary_max_sar.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenApply(job)}
                      className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>تقدم الآن</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedJob && (
            <div className="lg:col-span-5 rounded-[24px] bg-[#ffffff] border border-[#141414] p-6 space-y-4 h-fit">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-[#707070]">التقديم المباشر على الشاغر</span>
                  <h3 className="text-sm font-black text-[#141414] m-0">{selectedJob.title_ar}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="px-3 py-1 rounded-full bg-[#f3f3f3] text-xs font-bold text-[#141414] cursor-pointer"
                >
                  إغلاق
                </button>
              </div>

              {submittedApp ? (
                <div className="rounded-[20px] bg-[#f3f3f3] border border-[#141414] p-5 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-black text-[#141414] text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>تم استلام طلبك وإحالته لفريق التوظيف بنجاح</span>
                  </div>
                  <div className="text-[#707070]">
                    الرقم المرجعي: <span className="font-mono font-bold text-[#141414]">{submittedApp.id}</span>
                  </div>
                  <div className="text-[#707070]">
                    مؤشر التوافق الآلي مع المتطلبات: <span className="font-black text-[#141414]">{submittedApp.ai_match_score}%</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitApplication} className="space-y-3 text-xs">
                  {formError && (
                    <div className="rounded-[14px] bg-[#f3f3f3] border border-[#141414] p-3 font-bold text-[#141414]">
                      {formError}
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] font-bold text-[#707070] mb-1">الاسم الكامل *</label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-bold text-[#141414] outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#707070] mb-1">البريد الإلكتروني *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        dir="ltr"
                        className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-bold text-[#141414] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#707070] mb-1">الجوال *</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        dir="ltr"
                        placeholder="05XXXXXXXX"
                        className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-bold text-[#141414] outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#707070] mb-1">الهوية / الإقامة (تُشفّر PDPL)</label>
                      <input
                        type="text"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        dir="ltr"
                        className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-mono text-[#141414] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#707070] mb-1">الجنسية</label>
                      <input
                        type="text"
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-bold text-[#141414] outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#707070] mb-1">سنوات الخبرة</label>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={yearsExp}
                        onChange={(e) => setYearsExp(Number(e.target.value))}
                        className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-bold text-[#141414] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#707070] mb-1">الراتب المتوقع (⃁)</label>
                      <input
                        type="number"
                        value={expectedSalary}
                        onChange={(e) => setExpectedSalary(Number(e.target.value))}
                        className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-bold text-[#141414] outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#707070] mb-1">المهارات والشهادات المهنية</label>
                    <textarea
                      rows={3}
                      value={skillsSummary}
                      onChange={(e) => setSkillsSummary(e.target.value)}
                      placeholder="مثال: قوى، مدد، GOSI، ZATCA، نظام العمل السعودي..."
                      className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs text-[#141414] outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#707070]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#141414]" />
                    <span>تخضع بيانات المتقدم لضوابط حماية البيانات الشخصية (PDPL) في المملكة.</span>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال طلب التوظيف'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
