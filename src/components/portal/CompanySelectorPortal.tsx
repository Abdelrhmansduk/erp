import React from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { CompanyId } from '../../types';
import { CompanyLogo } from '../common/CompanyLogo';
import { 
  Building2, Users, FileText, CheckCircle2, ArrowLeft, 
  Sparkles, Layers, ShieldCheck, ArrowUpRight, Landmark,
  Receipt, Briefcase, ChevronLeft, Globe, Award, DollarSign
} from 'lucide-react';

interface CompanySelectorPortalProps {
  onSelectCompany: (companyId: CompanyId) => void;
}

export const CompanySelectorPortal: React.FC<CompanySelectorPortalProps> = ({ onSelectCompany }) => {
  const { companies, activeCompanyId, setActiveCompanyId } = useCompany();

  const handleChoose = (id: CompanyId) => {
    setActiveCompanyId(id);
    onSelectCompany(id);
  };

  const kasCompany = companies.find(c => c.id === 'KAS' || c.id === 'kas');
  const recruitmentCompanies = companies.filter(c => c.id !== 'KAS' && c.id !== 'kas' && c.id !== 'all');

  return (
    <div className="space-y-8 pb-16">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BANNER - Pitch Black Cinematic Header */}
      {/* ========================================================================= */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#141414',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
              <Building2 className="w-5 h-5 text-[#141414]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  ENTERPRISE MULTI-COMPANY SCOPE
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>
                  مجموعة شركات خالد السليم ERP
                </span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                بوابة اختيار الكيانات التشغيلية والشركات المستقلة
              </h1>
              <p className="text-xs text-[#707070] mt-1 font-sans max-w-3xl leading-relaxed">
                اختر بيئة العمل الخاصة بكل كيان قانوني للوصول إلى السجلات المحاسبية المستقلة، المنافسات الحكومية، عقود الاستقدام، والتقارير التنفيذية مع الحفاظ التام على عزل البيانات.
              </p>
            </div>
          </div>

          {/* Global Group Admin Button */}
          <button
            type="button"
            onClick={() => handleChoose('all')}
            className="button-white-pill self-start lg:self-center"
            style={{
              fontSize: '12.5px',
              padding: '8px 20px',
              minHeight: '40px',
              backgroundColor: '#ffffff',
              color: '#141414',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <Globe className="w-4 h-4 text-[#141414]" />
            <span>الدخول للإدارة المركزية للمجموعة (All Companies)</span>
            <ChevronLeft className="w-4 h-4 text-[#707070]" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FEATURED MASTER CARD: KAS TRADING & ETMAD SUITE */}
      {/* ========================================================================= */}
      {kasCompany && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#141414] animate-pulse"></span>
              <span>قطاع التجارة والمقاولات والمنافسات الحكومية (Featured Entity):</span>
            </h2>
            <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
              سحابة اعتماد + BOQ
            </span>
          </div>

          <div
            className="card-feature-cinematic"
            style={{
              background: '#141414',
              borderRadius: '16px',
              padding: '28px',
              color: '#FFFFFF',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left Details */}
              <div className="space-y-4 flex-1">
                <div className="flex items-start sm:items-center gap-4">
                  <div style={{ width: '56px', height: '56px', borderRadius: '9999px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CompanyLogo companyId={kasCompany.id as CompanyId} size={42} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                        {kasCompany.code || 'KAS'}
                      </span>
                      <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>
                        CR: {kasCompany.crNumber || '1010567890'}
                      </span>
                      <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>
                        منظومة سحابة اعتماد كاس
                      </span>
                    </div>
                    <h3 className="display-sm" style={{ fontSize: '22px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                      {kasCompany.name}
                    </h3>
                    <p className="text-xs text-[#707070] mt-1 font-sans">
                      KAS Trading & Contracting • إدارة المنافسات الحكومية، الفواتير الإلكترونية ZATCA، عروض الأسعار، وكراسات الكميات
                    </p>
                  </div>
                </div>

                {/* Live Stats 4-Grid matching Signature Tokens */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="card-pricing" style={{ padding: '14px 18px', borderRadius: '12px', background: '#ffffff', color: '#141414' }}>
                    <span style={{ fontSize: '11.5px', color: '#71717a', fontWeight: 550 }}>المنافسات الحكومية</span>
                    <span className="display-sm block mt-1" style={{ fontSize: '22px', fontWeight: 330, color: '#141414' }}>2,651 منافسة</span>
                    <span className="pill-tag-shade" style={{ fontSize: '10px', marginTop: '4px' }}>مسجلة بشيت كاس</span>
                  </div>
                  <div className="card-pistachio-band" style={{ padding: '14px 18px', borderRadius: '12px' }}>
                    <span style={{ fontSize: '11.5px', color: '#141414', fontWeight: 550 }}>المبيعات المعتمدة</span>
                    <span className="display-sm block mt-1" style={{ fontSize: '22px', fontWeight: 330, color: '#141414' }}>106,006 ⃁</span>
                    <span className="pill-tag-mint" style={{ fontSize: '10px', marginTop: '4px' }}>فواتير ZATCA</span>
                  </div>
                  <div className="card-pricing-featured" style={{ padding: '14px 18px', borderRadius: '12px', background: '#141414', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <span style={{ fontSize: '11.5px', color: '#a1a1aa', fontWeight: 550 }}>فريق العمل</span>
                    <span className="display-sm block mt-1" style={{ fontSize: '22px', fontWeight: 330, color: '#ffffff' }}>4 أعضاء</span>
                    <span className="pill-tag-mint" style={{ fontSize: '10px', marginTop: '4px' }}>طاقم إدارة المنافسات</span>
                  </div>
                  <div className="card-pricing" style={{ padding: '14px 18px', borderRadius: '12px', background: '#ffffff', color: '#141414' }}>
                    <span style={{ fontSize: '11.5px', color: '#71717a', fontWeight: 550 }}>الرقم الضريبي</span>
                    <span className="block mt-1 font-mono font-bold text-xs" style={{ color: '#141414' }}>310245879600003</span>
                    <span className="pill-tag-shade" style={{ fontSize: '10px', marginTop: '4px' }}>هيئة الزكاة والضريبة</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[220px]">
                <button
                  type="button"
                  onClick={() => handleChoose(kasCompany.id as CompanyId)}
                  className="button-white-pill"
                  style={{
                    padding: '12px 24px',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    color: '#141414',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles className="w-4 h-4 text-[#141414]" />
                  <span>دخول البوابة المستقلة لشركة كاس (KAS Suite)</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. RECRUITMENT & OPERATING ENTITIES GRID */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-600" />
          <span>شركات الاستقدام والكيانات التشغيلية المعتمدة (Recruitment Entities):</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {recruitmentCompanies.map((comp) => {
            const isCurrent = activeCompanyId === comp.id;

            return (
              <div
                key={comp.id}
                className="card-pricing"
                style={{
                  padding: '24px',
                  borderRadius: '16px',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '20px',
                  border: isCurrent ? '2px solid #141414' : '1px solid #e4e4e7',
                  boxShadow: isCurrent ? '0 10px 25px rgba(0,0,0,0.1)' : undefined,
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div style={{ width: '48px', height: '48px', borderRadius: '9999px', background: '#f4f4f5', border: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CompanyLogo companyId={comp.id as CompanyId} size={36} />
                      </div>
                      <span className="pill-tag-shade" style={{ fontSize: '11px', fontWeight: 700, background: '#141414', color: '#ffffff' }}>
                        {comp.code}
                      </span>
                    </div>

                    <span className="pill-tag-shade" style={{ fontSize: '10px', background: '#f4f4f5', color: '#71717a' }}>
                      CR: {comp.crNumber}
                    </span>
                  </div>

                  {/* Company Titles */}
                  <h3 className="display-sm" style={{ fontSize: '18px', fontWeight: 330, color: '#141414', letterSpacing: '-0.01em', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                    {comp.name}
                  </h3>
                  <div className="text-xs text-[#707070] mt-1 font-sans font-medium">
                    {comp.nameEn}
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200 mt-4 text-xs">
                    <div>
                      <span className="text-[11px] text-[#707070] block font-medium">الفروع النشطة</span>
                      <span className="text-sm font-bold text-[#141414] block mt-0.5">{comp.branchesCount} فروع</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#707070] block font-medium">إجمالي الكادر</span>
                      <span className="text-sm font-bold text-[#141414] block mt-0.5">{comp.employeesCount} موظف</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#707070] block font-medium">الطلبات السارية</span>
                      <span className="text-sm font-bold text-zinc-900 block mt-0.5">{comp.activeOrdersCount} طلب</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#707070] block font-medium">الرقم الضريبي</span>
                      <span className="text-[11px] font-mono font-bold text-zinc-700 block mt-0.5">{comp.taxNumber.slice(0, 8)}...</span>
                    </div>
                  </div>
                </div>

                {/* Choose Button */}
                <button
                  type="button"
                  onClick={() => handleChoose(comp.id as CompanyId)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: isCurrent ? '#141414' : '#141414',
                    backgroundColor: isCurrent ? '#141414' : '#141414',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{isCurrent ? 'الشركة الحالية (مفعلة)' : 'دخول بيئة العمل'}</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

