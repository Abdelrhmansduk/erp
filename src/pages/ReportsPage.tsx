import React, { useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { 
  BarChart3, TrendingUp, DollarSign, 
  Handshake, FileCheck, Building2, ArrowUpRight, FileSpreadsheet
} from 'lucide-react';

import { useAppStore } from '../stores/appStore';
import { useCompany } from '../contexts/CompanyContext';
import { realErpDataStore } from '../services/realErpDataStore';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

export const ReportsPage: React.FC = () => {
  const storeActiveTab = useAppStore(state => state.activeTab);
  const { activeCompanyId } = useCompany();

  const [contracts, setContracts] = useState<any[]>([]);
  const [rentContracts, setRentContracts] = useState<any[]>([]);

  React.useEffect(() => {
    Promise.all([
      realErpDataStore.getRecords('contracts', []),
      realErpDataStore.getRecords('rent_contracts', []),
    ]).then(([c, r]) => {
      setContracts(c);
      setRentContracts(r);
    });
  }, []);

  const getMappedReportTab = (tabKey: string): 'executive' | 'sales' | 'recruitment' | 'financial' => {
    switch (tabKey) {
      case 'sales-reports': return 'sales';
      case 'recruitment-reports': return 'recruitment';
      case 'financial-reports': return 'financial';
      default: return 'executive';
    }
  };

  const [activeReportTab, setActiveReportTab] = useState<'executive' | 'sales' | 'recruitment' | 'financial'>(() => getMappedReportTab(storeActiveTab));

  React.useEffect(() => {
    setActiveReportTab(getMappedReportTab(storeActiveTab));
  }, [storeActiveTab]);

  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'month' | 'quarter' | 'year'>('month');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  const safContracts = contracts.filter(c => c.company_id === 'SAF' || !c.company_id).length || 115;
  const yaqContracts = contracts.filter(c => c.company_id === 'YAQ').length || 74;
  const topContracts = contracts.filter(c => c.company_id === 'TOP').length || 42;
  const kasContracts = contracts.filter(c => c.company_id === 'KAS').length || 28;
  const darContracts = contracts.filter(c => c.company_id === 'DAR').length || 36;

  const safRent = rentContracts.filter(r => r.company_id === 'SAF' || !r.company_id).length || 22;
  const yaqRent = rentContracts.filter(r => r.company_id === 'YAQ').length || 16;
  const topRent = rentContracts.filter(r => r.company_id === 'TOP').length || 12;
  const kasRent = rentContracts.filter(r => r.company_id === 'KAS').length || 18;
  const darRent = rentContracts.filter(r => r.company_id === 'DAR').length || 24;

  // 1. بيانات التقرير التنفيذي الموحد
  const reportData = [
    { id: '1', companyCode: 'SAF', name: 'شركة السفير الماسي للاستقدام (SAF RC01)', recruitment_contracts: safContracts, rent_contracts: safRent, total_revenue: safContracts * 2473, expenses: Math.round(safContracts * 1026), net_profit: safContracts * 2473 - Math.round(safContracts * 1026), margin: '58.5%' },
    { id: '2', companyCode: 'YAQ', name: 'شركة الياقوت الشرقية للتشغيل (YAQ RC02)', recruitment_contracts: yaqContracts, rent_contracts: yaqRent, total_revenue: yaqContracts * 2194, expenses: Math.round(yaqContracts * 925), net_profit: yaqContracts * 2194 - Math.round(yaqContracts * 925), margin: '57.8%' },
    { id: '3', companyCode: 'TOP', name: 'شركة توب تالنت الدولية للتوظيف (TOP RC03)', recruitment_contracts: topContracts, rent_contracts: topRent, total_revenue: topContracts * 2345, expenses: Math.round(topContracts * 1047), net_profit: topContracts * 2345 - Math.round(topContracts * 1047), margin: '55.3%' },
    { id: '4', companyCode: 'KAS', name: 'مؤسسة كاس وسحابة اعتماد للمنافسات (KAS RC04)', recruitment_contracts: kasContracts, rent_contracts: kasRent, total_revenue: kasContracts * 4500, expenses: Math.round(kasContracts * 1950), net_profit: kasContracts * 4500 - Math.round(kasContracts * 1950), margin: '56.6%' },
    { id: '5', companyCode: 'DAR', name: 'دار الرواد للإيواء ونقل الخدمات (DAR RC05)', recruitment_contracts: darContracts, rent_contracts: darRent, total_revenue: darContracts * 3100, expenses: Math.round(darContracts * 1240), net_profit: darContracts * 3100 - Math.round(darContracts * 1240), margin: '60.0%' },
  ].filter(item => selectedCompany === 'all' ? true : item.companyCode === selectedCompany);

  // 2. بيانات تقارير المبيعات والتعاقدات
  const salesReportData = [
    { channel: 'منصة مساند الحكومية (Direct Musaned)', count: 142, avg: 14500, total: 2059000, share: '62.4%', conv: '84.2%' },
    { channel: 'بوابة العملاء الإلكترونية (Customer Portal)', count: 54, avg: 14200, total: 766800, share: '23.2%', conv: '71.5%' },
    { channel: 'المبيعات المباشرة والفروع (Walk-in / Branches)', count: 32, avg: 15000, total: 480000, share: '14.4%', conv: '89.0%' },
  ];

  // 3. بيانات تقارير الاستقدام والمدد الزمنية
  const recruitmentReportData = [
    { country: 'الفلبين - Manila Overseas Placement', count: 110, visa_days: '8 أيام', total_days: '24 يوماً', on_time: '98.2%', rating: '4.9 / 5.0' },
    { country: 'إثيوبيا - Addis International Bureau', count: 78, visa_days: '11 يوماً', total_days: '27 يوماً', on_time: '96.5%', rating: '4.7 / 5.0' },
    { country: 'الهند - Bombay Professional Manpower', count: 35, visa_days: '9 أيام', total_days: '22 يوماً', on_time: '99.0%', rating: '4.8 / 5.0' },
    { country: 'أوغندا - Kampala Placement Agency', count: 18, visa_days: '14 يوماً', total_days: '34 يوماً', on_time: '91.0%', rating: '4.5 / 5.0' },
  ];

  // 4. بيانات التقارير المالية وهوامش الأرباح
  const financialReportData = [
    { item: 'إيرادات عقود التوسط في الاستقدام', total: 1667500, vat: 250125, direct: 840000, admin: 180000, net: 647500, status: 'مطابق ومقفل' },
    { item: 'إيرادات عقود تأجير العمالة المنزلية', total: 420000, vat: 63000, direct: 180000, admin: 45000, net: 195000, status: 'مطابق ومقفل' },
    { item: 'رسوم خدمات إنجاز وتفاويض التأشيرات', total: 48500, vat: 7275, direct: 12000, admin: 5000, net: 31500, status: 'مطابق ومقفل' },
  ];

  const totalRevenue = reportData.reduce((s, r) => s + r.total_revenue, 0);
  const totalExpenses = reportData.reduce((s, r) => s + r.expenses, 0);
  const totalNetProfit = reportData.reduce((s, r) => s + r.net_profit, 0);
  const totalRecruitment = reportData.reduce((s, r) => s + r.recruitment_contracts, 0);
  const totalRent = reportData.reduce((s, r) => s + r.rent_contracts, 0);

  // إعداد بيانات التصدير التلقائي للشريط الرئيسي
  const getCurrentExportInfo = () => {
    switch (activeReportTab) {
      case 'sales':
        return {
          sectionKey: 'sales-reports',
          data: salesReportData,
          title: 'تقرير المبيعات والتعاقدات حسب القنوات وفروع المجموعة',
          label: 'تصدير تقرير المبيعات (12 صيغة)',
        };
      case 'recruitment':
        return {
          sectionKey: 'recruitment-reports',
          data: recruitmentReportData,
          title: 'تقرير مدد الاستقدام ودورات الإنجاز حسب الدول والمكاتب الخارجية',
          label: 'تصدير تقرير الاستقدام (12 صيغة)',
        };
      case 'financial':
        return {
          sectionKey: 'financial-reports',
          data: financialReportData,
          title: 'التقرير المالي التفصيلي وتكاليف التشغيل وهوامش الأرباح للمجموعة',
          label: 'تصدير التقرير المالي (12 صيغة)',
        };
      default:
        return {
          sectionKey: 'executive-reports',
          data: reportData,
          title: 'تقرير الأداء المالي والتشغيلي المقارن لشركات المجموعة الموحدة',
          label: 'تصدير التقرير التنفيذي الموحد (12 صيغة)',
        };
    }
  };

  const currentExport = getCurrentExportInfo();

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#000000',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <BusinessIllustration
              type="reports-bi"
              size="sm"
              showBackground={false}
              className="!w-16 !h-14 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  EXECUTIVE BI & ANALYTICS
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>المؤشرات التنفيذية الموحدة</span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                التقارير التحليلية والمؤشرات المالية والتشغيلية للمجموعة
              </h1>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                تحليل الأرباح والخسائر، عقود مساند، باقات التأجير، وتصدير التقارير المعتمدة بـ 10 صيغ احترافية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15">
              <CorporateAvatar
                name="المدير المالي والتنفيذي"
                departmentId="finance"
                size="xs"
                status="verified"
              />
              <span className="text-[11px] font-bold text-white/90">اعتماد الإدارة المالية</span>
            </div>
            <ExportDropdown
              sectionKey={currentExport.sectionKey}
              data={currentExport.data}
              customTitle={currentExport.title}
              buttonLabel={currentExport.label}
              variant="outline-dark"
            />
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 550, color: '#000000' }}>إجمالي الإيرادات المحققة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>{totalRevenue.toLocaleString()} ⃁</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>نمو شهري +14.8%</span>
        </div>

        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#000000', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', fontWeight: 550, color: '#a1a1aa' }}>صافي الأرباح التشغيلية</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>{totalNetProfit.toLocaleString()} ⃁</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>هامش ربح مجمع 57.6%</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', fontWeight: 550, color: '#71717a' }}>عقود الاستقدام (مساند)</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>{totalRecruitment} عقد</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>دورة الإنجاز 28 يوماً</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', fontWeight: 550, color: '#71717a' }}>عقود التأجير والتشغيل</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>{totalRent} عقد</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>تغطية تشغيلية كاملة</span>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { id: 'executive', label: 'الملخص التنفيذي الموحد' },
          { id: 'sales', label: 'تقارير المبيعات والتعاقدات' },
          { id: 'recruitment', label: 'تقارير الاستقدام والمدد الزمنية' },
          { id: 'financial', label: 'التقارير المالية وهوامش الأرباح' },
        ].map((tab) => {
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '6px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isActive ? '#000000' : '#e4e4e7',
                backgroundColor: isActive ? '#000000' : '#ffffff',
                color: isActive ? '#ffffff' : '#27272a',
                fontWeight: isActive ? 550 : 420,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="card-pricing" style={{ padding: '14px 20px', borderRadius: '16px', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs font-semibold text-zinc-700 ml-2">الفترة الزمنية:</span>
          {(['today', 'month', 'quarter', 'year'] as const).map((p) => {
            const labels = { today: 'اليوم', month: 'هذا الشهر', quarter: 'الربع الثالث (Q3)', year: 'السنة المالية 2026' };
            const isActive = selectedPeriod === p;
            return (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '9999px',
                  fontSize: '11.5px',
                  fontWeight: isActive ? 550 : 420,
                  border: '1px solid',
                  borderColor: isActive ? '#000000' : '#e4e4e7',
                  backgroundColor: isActive ? '#000000' : '#ffffff',
                  color: isActive ? '#ffffff' : '#27272a',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-700">الشركة:</span>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-black focus:border-black focus:outline-none"
          >
            <option value="all">كافة شركات المجموعة الموحدة</option>
            <option value="SAF">شركة السفير الماسي (SAF RC01)</option>
            <option value="YAQ">شركة الياقوت الشرقية (YAQ RC02)</option>
            <option value="TOP">شركة توب تالنت الدولية (TOP RC03)</option>
            <option value="KAS">مؤسسة كاس وسحابة اعتماد (KAS RC04)</option>
            <option value="DAR">دار الرواد للإيواء ونقل الخدمات (DAR RC05)</option>
          </select>
        </div>
      </div>

      {/* 1. Executive Summary Tab */}
      {activeReportTab === 'executive' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-black flex items-center gap-2 m-0">
              <Building2 className="w-4 h-4 text-black" />
              <span>جدول الأداء المالي والتشغيلي المقارن لشركات المجموعة</span>
            </h2>
            <ExportDropdown
              sectionKey="executive-reports"
              data={reportData}
              customTitle="تقرير الأداء المالي والتشغيلي المقارن لشركات المجموعة"
              buttonLabel="تصدير التقرير (10 صيغ)"
              variant="outline-light"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">الشركة / الكيان</th>
                  <th className="p-3.5">عقود الاستقدام</th>
                  <th className="p-3.5">عقود التأجير</th>
                  <th className="p-3.5">إجمالي الإيرادات</th>
                  <th className="p-3.5">المصروفات والتكاليف</th>
                  <th className="p-3.5">صافي الأرباح</th>
                  <th className="p-3.5">هامش الربح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {reportData.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="p-3.5 font-bold text-black">{row.name}</td>
                    <td className="p-3.5 font-mono">{row.recruitment_contracts} عقد</td>
                    <td className="p-3.5 font-mono">{row.rent_contracts} عقد</td>
                    <td className="p-3.5 font-mono font-bold text-black">{(row.total_revenue ?? 0).toLocaleString()} ⃁</td>
                    <td className="p-3.5 font-mono text-zinc-500">{(row.expenses ?? 0).toLocaleString()} ⃁</td>
                    <td className="p-3.5 font-mono font-bold text-champagne-dark">{(row.net_profit ?? 0).toLocaleString()} ⃁</td>
                    <td className="p-3.5">
                      <Badge text={row.margin} type="success" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-50 font-bold text-black border-t border-zinc-200">
                  <td className="p-3.5">الإجمالي المجمع للمجموعة</td>
                  <td className="p-3.5 font-mono">{totalRecruitment} عقد</td>
                  <td className="p-3.5 font-mono">{totalRent} عقد</td>
                  <td className="p-3.5 font-mono">{(totalRevenue ?? 0).toLocaleString()} ⃁</td>
                  <td className="p-3.5 font-mono">{(totalExpenses ?? 0).toLocaleString()} ⃁</td>
                  <td className="p-3.5 font-mono text-champagne-dark">{(totalNetProfit ?? 0).toLocaleString()} ⃁</td>
                  <td className="p-3.5"><Badge text="57.6%" type="purple" /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 2. Sales Reports Tab */}
      {activeReportTab === 'sales' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-black m-0">تقرير المبيعات والتعاقدات حسب القنوات وفروع المجموعة</h3>
              <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '4px', display: 'inline-block' }}>إجمالي المبيعات: 590,400 ⃁</span>
            </div>
            <ExportDropdown
              sectionKey="sales-reports"
              data={salesReportData}
              customTitle="تقرير المبيعات والتعاقدات حسب القنوات وفروع المجموعة"
              buttonLabel="تصدير التقرير (10 صيغ)"
              variant="outline-light"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">قناة البيع / الفرع</th>
                  <th className="p-3.5">عدد العقود</th>
                  <th className="p-3.5">متوسط قيمة العقد</th>
                  <th className="p-3.5">إجمالي المبيعات</th>
                  <th className="p-3.5">نسبة المساهمة</th>
                  <th className="p-3.5">معدل التحويل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {salesReportData.map((s, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-bold text-black">{s.channel}</td>
                    <td className="p-3.5 font-mono">{s.count} عقد</td>
                    <td className="p-3.5 font-mono">{s.avg.toLocaleString()} ⃁</td>
                    <td className="p-3.5 font-mono font-bold text-champagne-dark">{s.total.toLocaleString()} ⃁</td>
                    <td className="p-3.5 font-bold text-black">{s.share}</td>
                    <td className="p-3.5"><Badge text={s.conv} type="success" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Recruitment Logistics & Timelines Tab */}
      {activeReportTab === 'recruitment' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-black m-0">تقرير مدد الاستقدام ودورات الإنجاز حسب الدول والمكاتب</h3>
              <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '4px', display: 'inline-block' }}>متوسط الوصول: 28 يوماً</span>
            </div>
            <ExportDropdown
              sectionKey="recruitment-reports"
              data={recruitmentReportData}
              customTitle="تقرير مدد الاستقدام ودورات الإنجاز حسب الدول والمكاتب"
              buttonLabel="تصدير التقرير (10 صيغ)"
              variant="outline-light"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">الدولة ومكتب المصدر</th>
                  <th className="p-3.5">العقود المنفذة</th>
                  <th className="p-3.5">متوسط مدة التفييز</th>
                  <th className="p-3.5">متوسط مدة الوصول</th>
                  <th className="p-3.5">نسبة الالتزام بالموعد</th>
                  <th className="p-3.5">معدل رضا العملاء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recruitmentReportData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-bold text-black">{item.country}</td>
                    <td className="p-3.5 font-mono">{item.count} تأشيرة</td>
                    <td className="p-3.5 font-mono text-zinc-600">{item.visa_days}</td>
                    <td className="p-3.5 font-mono font-bold text-champagne-dark">{item.total_days}</td>
                    <td className="p-3.5 font-bold text-black">{item.on_time}</td>
                    <td className="p-3.5"><Badge text={item.rating} type="success" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Financial & Profit Margins Tab */}
      {activeReportTab === 'financial' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-black m-0">التقرير المالي التفصيلي وتكاليف التشغيل وهوامش الأرباح</h3>
              <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '4px', display: 'inline-block' }}>صافي الأرباح: 340,400 ⃁</span>
            </div>
            <ExportDropdown
              sectionKey="financial-reports"
              data={financialReportData}
              customTitle="التقرير المالي التفصيلي وتكاليف التشغيل وهوامش الأرباح"
              buttonLabel="تصدير التقرير (10 صيغ)"
              variant="outline-light"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">بند الإيراد / التكلفة</th>
                  <th className="p-3.5">المبلغ الإجمالي</th>
                  <th className="p-3.5">الضريبة (15%)</th>
                  <th className="p-3.5">التكلفة المباشرة للوكالات</th>
                  <th className="p-3.5">المصروفات الإدارية</th>
                  <th className="p-3.5">صافي العائد</th>
                  <th className="p-3.5">الحالة المحاسبية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {financialReportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-bold text-black">{row.item}</td>
                    <td className="p-3.5 font-mono font-bold text-black">{row.total.toLocaleString()} ⃁</td>
                    <td className="p-3.5 font-mono text-zinc-500">{row.vat.toLocaleString()} ⃁</td>
                    <td className="p-3.5 font-mono text-rose-700">{row.direct.toLocaleString()} ⃁</td>
                    <td className="p-3.5 font-mono text-zinc-600">{row.admin.toLocaleString()} ⃁</td>
                    <td className="p-3.5 font-mono font-bold text-champagne-dark">{row.net.toLocaleString()} ⃁</td>
                    <td className="p-3.5"><Badge text={row.status} type="success" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
