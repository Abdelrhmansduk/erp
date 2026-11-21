import React, { useEffect, useMemo, useState } from 'react';
import { X, Undo2, Redo2, Eye, Search, ArrowUpRight } from 'lucide-react';
import { ExportDropdown } from '../common/ExportDropdown';
import { ExportPreviewModal } from '../common/ExportPreviewModal';
import { formatSaudiRiyal } from '../../utils/saudiRiyal';
import {
  AD_PLATFORM_LABELS,
  CREATIVE_ANGLES_META,
  LEAD_STAGE_META,
  type CrmContentTask,
  type CrmLead,
  type CrmPromoReferral,
  type EvaluatedCampaignMetrics,
  evaluateLeadSlaAndRotting,
} from '../../services/crmMarketingEngine';

export type CrmKpiDetailKind = 'roas' | 'pipeline' | 'cpl_cpa' | 'studio_referrals';

interface CrmMarketingKpiDetailsModalProps {
  kind: CrmKpiDetailKind | null;
  activeCompanyId: string;
  evaluatedCampaigns: EvaluatedCampaignMetrics[];
  blendedRoas: number;
  totalRevenueSar: number;
  totalSpentSar: number;
  blendedCplSar: number;
  blendedCpaSar: number;
  provenSharePct: number;
  testingSharePct: number;
  scopedLeads: CrmLead[];
  weightedForecastSar: number;
  rottingLeadsCount: number;
  scopedContentTasks: CrmContentTask[];
  scopedPromos: CrmPromoReferral[];
  viralKFactor: number;
  undoCount: number;
  redoCount: number;
  onUndo: () => void;
  onRedo: () => void;
  onJumpToTab: (tab: 'overview' | 'campaigns' | 'pipeline' | 'studio' | 'referrals') => void;
  onClose: () => void;
}

type Row = Record<string, string | number>;

const STUDIO_STATUS_AR: Record<string, string> = {
  brief: 'موجز إبداعي',
  designing: 'قيد التصميم',
  review: 'مراجعة واعتماد',
  approved: 'معتمد للنشر',
  published: 'منشور',
};

export const CrmMarketingKpiDetailsModal: React.FC<CrmMarketingKpiDetailsModalProps> = ({
  kind,
  activeCompanyId,
  evaluatedCampaigns,
  blendedRoas,
  totalRevenueSar,
  totalSpentSar,
  blendedCplSar,
  blendedCpaSar,
  provenSharePct,
  testingSharePct,
  scopedLeads,
  weightedForecastSar,
  rottingLeadsCount,
  scopedContentTasks,
  scopedPromos,
  viralKFactor,
  undoCount,
  redoCount,
  onUndo,
  onRedo,
  onJumpToTab,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setQuery('');
  }, [kind]);

  useEffect(() => {
    if (!kind) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !previewOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [kind, previewOpen, onClose]);

  const view = useMemo(() => {
    if (!kind) return null;

    if (kind === 'roas') {
      const rows: Row[] = evaluatedCampaigns.map((i) => ({
        'كود الحملة': i.campaign.campaign_code,
        'اسم الحملة': i.campaign.name,
        الشركة: i.campaign.company_id,
        المنصة: AD_PLATFORM_LABELS[i.campaign.platform] || i.campaign.platform,
        'الميزانية (⃁)': Number(i.campaign.budget_sar || 0),
        'الإنفاق (⃁)': Number(i.campaign.spent_sar || 0),
        'الإيرادات (⃁)': Number(i.campaign.revenue_sar || 0),
        'ROAS': `${i.roas}x`,
        'مؤشر الكفاءة': i.efficiencyIndex,
        'التنبيهات': i.outlierFlags.length ? i.outlierFlags.join(' • ') : 'سليم',
        التوصية: i.verdict,
      }));
      return {
        title: `تفاصيل العائد الإعلاني المجمّع (ROAS) — ${activeCompanyId}`,
        sectionKey: 'crm_marketing_roas_detail',
        targetTab: 'campaigns' as const,
        targetTabLabel: 'فتح محلل الحملات',
        rows,
        summary: [
          { label: 'العائد المجمّع ROAS', value: `${blendedRoas}x` },
          { label: 'الإيرادات المنسوبة', value: formatSaudiRiyal(totalRevenueSar) },
          { label: 'إجمالي الإنفاق', value: formatSaudiRiyal(totalSpentSar) },
          { label: 'عدد الحملات', value: String(evaluatedCampaigns.length) },
        ],
      };
    }

    if (kind === 'pipeline') {
      const rows: Row[] = scopedLeads.map((l) => {
        const sla = evaluateLeadSlaAndRotting(l);
        const stageMeta = LEAD_STAGE_META[l.stage];
        return {
          'رقم الفرصة': l.lead_no,
          العميل: l.full_name,
          الشركة: l.company_id,
          الخدمة: l.service_interest,
          المنصة: (AD_PLATFORM_LABELS as Record<string, string>)[l.source_platform] || l.source_platform,
          المرحلة: stageMeta?.labelAr || l.stage,
          'الاحتمالية %': `${l.probability_pct}%`,
          'القيمة المتوقعة (⃁)': Number(l.estimated_value_sar || 0),
          'القيمة المرجّحة (⃁)': sla.weightedValueSar,
          'المسؤول': l.assigned_to_name,
          'حالة SLA / الركود': sla.isRotting
            ? `راكد (${Math.round(sla.idleHours)} ساعة)`
            : sla.slaBreached
              ? 'تجاوز 15 دقيقة'
              : 'ضمن المهلة',
        };
      });
      return {
        title: `تفاصيل التوقع البيعي المرجّح (Weighted Pipeline) — ${activeCompanyId}`,
        sectionKey: 'crm_pipeline_detail',
        targetTab: 'pipeline' as const,
        targetTabLabel: 'فتح لوحة المبيعات Kanban',
        rows,
        summary: [
          { label: 'التوقع المرجّح', value: formatSaudiRiyal(weightedForecastSar) },
          { label: 'إجمالي الفرص', value: String(scopedLeads.length) },
          { label: 'فرص راكدة', value: String(rottingLeadsCount) },
          { label: 'صفقات مغلقة ناجحة', value: String(scopedLeads.filter((l) => l.stage === 'won').length) },
        ],
      };
    }

    if (kind === 'cpl_cpa') {
      const rows: Row[] = evaluatedCampaigns.map((i) => ({
        'اسم الحملة': i.campaign.name,
        الشركة: i.campaign.company_id,
        المنصة: AD_PLATFORM_LABELS[i.campaign.platform] || i.campaign.platform,
        'المحفظة (70/30)': i.campaign.budget_bucket === 'proven_70' ? 'رابحة (70%)' : 'اختبار (30%)',
        'CTR %': `${i.ctrPct}%`,
        'CPL الفعلي (⃁)': i.cplSar,
        'CPA الفعلي (⃁)': i.cpaSar,
        'CPA المستهدف (⃁)': i.campaign.target_cpa_sar,
        'الميزانية الحالية (⃁)': i.campaign.budget_sar,
        'الميزانية المقترحة ±20% (⃁)': i.recommendedSpendSar,
      }));
      return {
        title: `تحليل تكلفة الليد والتعاقد وتوزيع 70/30 — ${activeCompanyId}`,
        sectionKey: 'crm_cpl_cpa_detail',
        targetTab: 'campaigns' as const,
        targetTabLabel: 'إدارة الميزانيات والحملات',
        rows,
        summary: [
          { label: 'متوسط CPL', value: formatSaudiRiyal(blendedCplSar) },
          { label: 'متوسط CPA', value: formatSaudiRiyal(blendedCpaSar) },
          { label: 'حصة الرابحة (70%)', value: `${provenSharePct}%` },
          { label: 'حصة الاختبار (30%)', value: `${testingSharePct}%` },
        ],
      };
    }

    const rows: Row[] = [
      ...scopedContentTasks.map((t) => ({
        النوع: 'مهمة استوديو محتوى',
        المرجع: t.task_code,
        العنوان: t.title,
        الشركة: t.company_id,
        المنصة: AD_PLATFORM_LABELS[t.target_platform] || t.target_platform,
        'الزاوية / التفاصيل': CREATIVE_ANGLES_META[t.creative_angle]?.labelAr || t.creative_angle,
        الحالة: STUDIO_STATUS_AR[t.approval_status] || t.approval_status,
        'المسؤول / العائد': t.marketer_email,
      })),
      ...scopedPromos.map((p) => ({
        النوع: p.program_kind === 'promo_coupon' ? 'كوبون عرض' : 'برنامج إحالة',
        المرجع: p.code,
        العنوان: p.title_ar,
        الشركة: p.company_id,
        المنصة: p.applicable_service,
        'الزاوية / التفاصيل': `خصم ${p.client_discount_value} • مكافأة ${p.referrer_reward_sar} ⃁`,
        الحالة: p.is_active ? p.payout_status : 'متوقف',
        'المسؤول / العائد': `${p.conversions_count} تحويل / ${p.max_uses} حد أقصى`,
      })),
    ];
    return {
      title: `تفاصيل استوديو المحتوى والعروض والإحالات — ${activeCompanyId}`,
      sectionKey: 'crm_studio_referrals_detail',
      targetTab: 'studio' as const,
      targetTabLabel: 'فتح استوديو المحتوى',
      rows,
      summary: [
        { label: 'مهام الاستوديو', value: String(scopedContentTasks.length) },
        { label: 'العروض والإحالات', value: String(scopedPromos.length) },
        { label: 'معامل الانتشار K-Factor', value: String(viralKFactor) },
        { label: 'حماية PDPL م.25', value: 'مفعّلة' },
      ],
    };
  }, [
    kind,
    activeCompanyId,
    evaluatedCampaigns,
    blendedRoas,
    totalRevenueSar,
    totalSpentSar,
    blendedCplSar,
    blendedCpaSar,
    provenSharePct,
    testingSharePct,
    scopedLeads,
    weightedForecastSar,
    rottingLeadsCount,
    scopedContentTasks,
    scopedPromos,
    viralKFactor,
  ]);

  const filteredRows = useMemo(() => {
    if (!view) return [];
    const q = query.trim().toLowerCase();
    if (!q) return view.rows;
    return view.rows.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [view, query]);

  if (!kind || !view) return null;
  const columns = view.rows.length ? Object.keys(view.rows[0]) : [];

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-3"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={view.title}
      onClick={onClose}
    >
      <div
        className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-[#f0f0f0] space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#141414] m-0">{view.title}</h2>
              <p className="text-xs text-[#707070] mt-0.5 mb-0">
                بيانات تحليلية حيّة قابلة للبحث والمعاينة والتصدير والتراجع الفوري.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="w-9 h-9 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414] hover:bg-[#e0e0e0]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {view.summary.map((s) => (
              <div key={s.label} className="bg-[#f3f3f3] rounded-[16px] px-3 py-2">
                <div className="text-[11px] text-[#707070]">{s.label}</div>
                <div className="text-sm font-bold text-[#141414] font-mono">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#707070]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="بحث داخل التفاصيل..."
                className="w-full rounded-full bg-[#f0f0f0] pr-9 pl-4 py-2 text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
              />
            </div>

            <button
              type="button"
              disabled={undoCount === 0}
              onClick={onUndo}
              title="تراجع عن آخر إجراء (Ctrl+Z)"
              className="px-3 py-2 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#e0e0e0] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>تراجع ({undoCount})</span>
            </button>
            <button
              type="button"
              disabled={redoCount === 0}
              onClick={onRedo}
              title="إعادة (Ctrl+Y)"
              className="px-3 py-2 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#e0e0e0] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span>إعادة ({redoCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={filteredRows.length === 0}
              className="px-3 py-2 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 hover:border-[#141414] disabled:opacity-40"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>معاينة</span>
            </button>
            <ExportDropdown
              sectionKey={view.sectionKey}
              data={filteredRows}
              customTitle={view.title}
              buttonLabel="تصدير"
              variant="compact"
              showCountBadge
            />
            <button
              type="button"
              onClick={() => {
                onClose();
                onJumpToTab(view.targetTab);
              }}
              className="px-3.5 py-2 rounded-full bg-[#141414] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#262626]"
            >
              <span>{view.targetTabLabel}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredRows.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#707070]">لا توجد بيانات مطابقة.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#fafafa] z-10">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="text-right font-bold text-[#141414] px-3 py-2 whitespace-nowrap border-b border-[#f0f0f0]">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-[#f3f3f3] border-b border-[#f7f7f7]">
                    {columns.map((c) => (
                      <td key={c} className="px-3 py-2 whitespace-nowrap text-[#141414]">
                        {typeof r[c] === 'number' ? Number(r[c]).toLocaleString('en-US') : r[c]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 py-2.5 border-t border-[#f0f0f0] text-[11px] text-[#707070] flex justify-between">
          <span>
            المعروض: <strong className="text-[#141414] font-mono">{filteredRows.length}</strong> من{' '}
            <strong className="text-[#141414] font-mono">{view.rows.length}</strong>
          </span>
          <span>Esc للإغلاق</span>
        </div>
      </div>

      {previewOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <ExportPreviewModal
            isOpen={previewOpen}
            onClose={() => setPreviewOpen(false)}
            sectionKey={view.sectionKey}
            data={filteredRows}
            customTitle={view.title}
          />
        </div>
      )}
    </div>
  );
};

export default CrmMarketingKpiDetailsModal;
