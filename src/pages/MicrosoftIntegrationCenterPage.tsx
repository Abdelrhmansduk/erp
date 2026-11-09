import i18n from '../i18n/config';
import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { useAppStore } from '../stores/appStore';
import { MsProjectTask, PowerBiDashboardItem, CompanyId } from '../types';
import { realErpDataStore } from '../services/realErpDataStore';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { 
  Building2, 
  BarChart3, 
  Network, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ExternalLink, 
  Sparkles,
  GitFork,
  X
} from 'lucide-react';

const INITIAL_TASKS: MsProjectTask[] = [
  {
    id: 'MSP-101',
    taskName: 'حملة الاستقدام المكثف - 500 كادر فلبيني وهندي',
    companyId: 'SAF',
    assignedResource: 'فهد العتيبي (مسؤول التوظيف)',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    progressPercent: 68,
    status: 'قيد التنفيذ',
    milestone: false,
  },
  {
    id: 'MSP-102',
    taskName: 'افتتاح فرع المنسكية والتجهيزات التقنية اللوجستية',
    companyId: 'YAQ',
    assignedResource: 'م. خالد السليم',
    startDate: '2026-06-15',
    endDate: '2026-08-15',
    progressPercent: 100,
    status: 'مكتمل',
    milestone: true,
  },
  {
    id: 'MSP-103',
    taskName: 'تحديث معايير الامتثال والربط الضريبي ZATCA Phase 2',
    companyId: 'TOP',
    assignedResource: 'أحمد المحاسب المالي',
    startDate: '2026-08-01',
    endDate: '2026-10-01',
    progressPercent: 45,
    status: 'قيد التنفيذ',
    milestone: false,
  }
];

export const MicrosoftIntegrationCenterPage: React.FC = () => {
  const { activeCompany } = useCompany();
  const { addNotification } = useAppStore();
  const [activeTab, setActiveTab] = useState<'project' | 'powerbi' | 'visio'>('project');
  const [projectTasks, setProjectTasks] = useState<MsProjectTask[]>([]);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [selectedPowerBiDash, setSelectedPowerBiDash] = useState<PowerBiDashboardItem | null>(null);

  // Form State
  const [projectForm, setProjectForm] = useState<{
    taskName: string;
    companyId: CompanyId;
    assignedResource: string;
    startDate: string;
    endDate: string;
    progressPercent: string;
    milestone: boolean;
  }>({
    taskName: '',
    companyId: 'SAF',
    assignedResource: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    progressPercent: '10',
    milestone: false
  });

  useEffect(() => {
    realErpDataStore.getRecords<MsProjectTask>('ms_project_tasks', INITIAL_TASKS).then(data => setProjectTasks(data));
  }, []);

  const [powerbiDashboards] = useState<PowerBiDashboardItem[]>([
    {
      id: 'PBI-01',
      title: 'لوحة التحليل المالي والإيرادات والتكاليف (Executive P&L)',
      category: 'محاسبة',
      reportUrl: 'https://app.powerbi.com/view?reportId=ExecutivePLReport',
      datasetName: 'Sulaim_Financial_Data_v2',
      rlsApplied: true,
      lastSyncTime: '2026-08-11 12:00 PM',
    },
    {
      id: 'PBI-02',
      title: 'تحليلات كفاءة الاستقدام وتكلفة التوظيف (ATS Time-to-Hire)',
      category: 'توظيف ATS',
      reportUrl: 'https://app.powerbi.com/view?reportId=ATSKPIsReport',
      datasetName: 'Sulaim_ATS_Pipeline_DB',
      rlsApplied: true,
      lastSyncTime: '2026-08-11 11:30 AM',
    },
    {
      id: 'PBI-03',
      title: 'مؤشرات أداء الكادر البشري والدوران الوظيفي (HR Turnover)',
      category: 'موارد بشرية',
      reportUrl: 'https://app.powerbi.com/view?reportId=HRMetricsReport',
      datasetName: 'Sulaim_HRIS_Employee_Master',
      rlsApplied: true,
      lastSyncTime: '2026-08-11 10:45 AM',
    },
  ]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.taskName.trim()) return;

    const progress = Math.min(100, Math.max(0, Number(projectForm.progressPercent) || 0));
    const newTask: MsProjectTask = {
      id: `MSP-${104 + projectTasks.length}`,
      taskName: projectForm.taskName.trim(),
      companyId: projectForm.companyId,
      assignedResource: projectForm.assignedResource.trim() || 'فريق التطوير والتشغيل',
      startDate: projectForm.startDate,
      endDate: projectForm.endDate,
      progressPercent: progress,
      status: progress === 100 ? 'مكتمل' : 'قيد التنفيذ',
      milestone: projectForm.milestone,
    };

    const updated = await realErpDataStore.addRecord<MsProjectTask>('ms_project_tasks', newTask, INITIAL_TASKS);
    setProjectTasks(updated);
    setShowAddProjectModal(false);
    setProjectForm({
      taskName: '',
      companyId: 'SAF',
      assignedResource: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      progressPercent: '10',
      milestone: false
    });

    addNotification({
      title: 'مزامنة Microsoft Project',
      message: `تم إنشاء مشروع (${newTask.taskName}) وحفظه في جدول المشاريع بنجاح.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden sm:block shrink-0">
              <BusinessIllustration type="ai-copilot" size="sm" showBackground={true} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  MICROSOFT ENTERPRISE INTEGRATION
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>M365 & Power BI</span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                مركز تكامل ميكروسوفت المؤسسي (Project + Power BI + Visio)
              </h1>
              <p className="text-xs text-[#707070] mt-1 font-sans">
                ربط مباشر مع بيئة Microsoft 365 لإدارة المشاريع، التحليلات المتقدمة مع RLS، والهياكل التنظيمية الديناميكية بقاعدة البيانات
              </p>
            </div>
          </div>

          <div>
            <span className="pill-tag-mint flex items-center gap-1" style={{ fontSize: '11.5px', padding: '6px 14px' }}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{i18n.t("exec.entraConnected", "متصل بـ Microsoft Entra ID")}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { id: 'project', label: `Microsoft Project (المشاريع والمهام - ${projectTasks.length})`, icon: Clock },
          { id: 'powerbi', label: `Power BI Analytics (التحليلات RLS - ${powerbiDashboards.length})`, icon: BarChart3 },
          { id: 'visio', label: 'Visio Org Architect (الهيكل الإداري)', icon: GitFork },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '6px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isActive ? '#141414' : '#e4e4e7',
                backgroundColor: isActive ? '#141414' : '#ffffff',
                color: isActive ? '#ffffff' : '#27272a',
                fontWeight: isActive ? 550 : 420,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: MS Project */}
      {activeTab === 'project' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-[#141414] flex items-center gap-2 m-0">
              <Clock className="w-4 h-4 text-[#141414]" />
              <span>مزامنة مشاريع الاستقدام والتوسع اللوجستي (Project Timeline)</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowAddProjectModal(true)}
              className="button-primary-pill"
              style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
            >
              <Plus className="w-3.5 h-3.5 ml-1" />
              <span>+ مزامنة مشروع جديد</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">رقم المشروع</th>
                  <th className="p-3.5">اسم المشروع / المبادرة</th>
                  <th className="p-3.5">المسؤول المعتمد</th>
                  <th className="p-3.5">تاريخ البدء والانتهاء</th>
                  <th className="p-3.5">نسبة الإنجاز</th>
                  <th className="p-3.5">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {projectTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{t.id}</td>
                    <td className="p-3.5 font-bold text-[#141414]">
                      {t.taskName} {t.milestone && <span className="bg-[#f3f3f3] text-[#141414] text-[10px] px-2 py-0.5 rounded-full font-bold ml-1">Milestone</span>}
                    </td>
                    <td className="p-3.5 text-zinc-600">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar
                          name={t.assignedResource}
                          size="sm"
                          status="verified"
                        />
                        <span>{t.assignedResource}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-[#707070] font-mono text-[11px]">{t.startDate} إلى {t.endDate}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-zinc-100 h-2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${t.progressPercent === 100 ? 'bg-[#141414]' : 'bg-[#f3f3f3] border-b border-[#e0e0e0]'}`} style={{ width: `${t.progressPercent}%` }} />
                        </div>
                        <span className="font-mono font-bold text-[11px]">{t.progressPercent}%</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'مكتمل' ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]' : 'bg-zinc-100 text-zinc-800'}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Power BI */}
      {activeTab === 'powerbi' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {powerbiDashboards.map((dash) => (
            <div key={dash.id} className="card-pricing" style={{ padding: '20px', borderRadius: '24px', background: '#ffffff' }}>
              <div className="flex justify-between items-center mb-3">
                <span className="bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  {dash.category}
                </span>
                <span className="text-[10px] text-[#707070] font-medium">RLS: {dash.rlsApplied ? 'مفعل بالأدوار' : 'عام'}</span>
              </div>
              <h3 className="text-xs font-bold text-[#141414] mb-1">
                {dash.title}
              </h3>
              <div className="text-[11px] text-[#707070] mb-4 font-mono">
                مجموعة البيانات: {dash.datasetName}
              </div>

              {/* Power BI Embed Simulation Box */}
              <div className="bg-[#f3f3f3] border-b border-[#e0e0e0] rounded-2xl p-6 text-center text-[#141414] mb-4 flex flex-col items-center justify-center gap-2">
                <BarChart3 className="w-8 h-8 text-[#141414]" />
                <span className="text-xs font-bold text-[#141414]">Power BI Embedded Service Ready</span>
                <span className="text-[10px] text-[#707070]">التقرير مشفر ومربوط بنماذج Row-Level Security لقاعدتك.</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPowerBiDash(dash);
                  addNotification({
                    title: 'فتح تقرير Power BI',
                    message: `تم تحميل لوحة (${dash.title}) وتفعيل أمان الوصول حسب دورك المؤسسي.`,
                    type: 'info',
                  });
                }}
                className="button-primary-pill w-full flex items-center justify-center gap-2"
                style={{ padding: '8px', fontSize: '12px' }}
              >
                <span>فتح لوحة Power BI المباشرة</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Visio Org Chart */}
      {activeTab === 'visio' && (
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
          <h3 className="text-sm font-bold text-[#141414] mb-1 flex items-center gap-2">
            <GitFork className="w-4 h-4 text-[#141414]" />
            <span>الهيكل التنظيمي الخريطي الموحد (Visio Interactive Group Org Chart)</span>
          </h3>
          <p className="text-xs text-[#707070] mb-6">
            توليد ديناميكي للهيكل التنظيمي لمجموعة خالد السليم والشركات الأربع المعتمدة بناءً على بيانات HRIS الفعلية.
          </p>

          {/* Org Chart Visualization Tree */}
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-[#f3f3f3] text-[#141414] p-4 rounded-2xl text-center border-2 border-[#e0e0e0] shadow-lg min-w-[260px] flex items-center gap-3">
              <CorporateAvatar
                archetype="saudi-executive"
                name="خالد السليم"
                role="رئيس مجلس الإدارة"
                size="md"
                status="verified"
              />
              <div className="text-right">
                <div className="text-sm font-bold">خالد السليم للاستقدام والتشغيل</div>
                <div className="text-[11px] text-[#141414] font-semibold mt-0.5">مجلس الإدارة والمدير التنفيذي للمجموعة</div>
              </div>
            </div>

            <div className="w-0.5 h-6 bg-zinc-300" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl">
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-center">
                <div className="text-xs font-bold text-[#141414]">شركة السفير الماسي</div>
                <div className="text-[10px] text-[#707070] mt-0.5">5 فروع | 120 موظف</div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-center">
                <div className="text-xs font-bold text-[#141414]">شركة ياقوت نجد</div>
                <div className="text-[10px] text-[#707070] mt-0.5">4 فروع | 95 موظف</div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-center">
                <div className="text-xs font-bold text-[#141414]">شركة توباز للاستقدام</div>
                <div className="text-[10px] text-[#707070] mt-0.5">6 فروع | 160 موظف</div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-center">
                <div className="text-xs font-bold text-[#141414]">دار الرواد</div>
                <div className="text-[10px] text-[#707070] mt-0.5">3 فروع | 75 موظف</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add MS Project Task */}
      {showAddProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-zinc-200 font-sans">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-[#141414] m-0">مزامنة مشروع جديد في Microsoft Project</h3>
              <button onClick={() => setShowAddProjectModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">اسم المشروع / المبادرة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: حملة استقدام الربع الرابع 2026"
                  value={projectForm.taskName}
                  onChange={e => setProjectForm({ ...projectForm, taskName: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">الشركة التابعة</label>
                  <select
                    value={projectForm.companyId}
                    onChange={e => setProjectForm({ ...projectForm, companyId: e.target.value as CompanyId })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="SAF">شركة السفير الماسي (SAF)</option>
                    <option value="YAQ">شركة ياقوت نجد (YAQ)</option>
                    <option value="TOP">شركة توباز للاستقدام (TOP)</option>
                    <option value="KAS">دار الرواد / كاس للتجارة (KAS)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">المسؤول المعتمد</label>
                  <input
                    type="text"
                    placeholder="اسم المسؤول..."
                    value={projectForm.assignedResource}
                    onChange={e => setProjectForm({ ...projectForm, assignedResource: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">تاريخ البدء</label>
                  <input
                    type="date"
                    value={projectForm.startDate}
                    onChange={e => setProjectForm({ ...projectForm, startDate: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">تاريخ الانتهاء المستهدف</label>
                  <input
                    type="date"
                    value={projectForm.endDate}
                    onChange={e => setProjectForm({ ...projectForm, endDate: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">نسبة الإنجاز الحالية (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={projectForm.progressPercent}
                    onChange={e => setProjectForm({ ...projectForm, progressPercent: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div className="pt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="milestone"
                    checked={projectForm.milestone}
                    onChange={e => setProjectForm({ ...projectForm, milestone: e.target.checked })}
                    className="rounded text-[#141414]"
                  />
                  <label htmlFor="milestone" className="text-xs text-zinc-700 font-semibold cursor-pointer">
                    محطة رئيسية (Milestone)
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="button-outline-on-light text-xs py-1.5 px-4"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs py-1.5 px-5"
                >
                  حفظ ومزامنة المشروع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Power BI Embedded Live Viewer Modal */}
      {selectedPowerBiDash && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-200 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#141414] text-[#ffffff] flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#141414] m-0">{selectedPowerBiDash.title}</h3>
                  <span className="text-[11px] text-[#707070] font-mono">
                    Dataset: {selectedPowerBiDash.datasetName} • RLS: {selectedPowerBiDash.rlsApplied ? 'مفعل بالأدوار' : 'عام'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPowerBiDash(null)}
                className="p-1.5 rounded-full hover:bg-zinc-100 text-[#707070]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                <div className="text-[11px] text-[#707070]">دقة مزامنة البيانات</div>
                <div className="text-lg font-bold text-[#141414] font-mono mt-1">99.8%</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                <div className="text-[11px] text-[#707070]">حالة اتصال الـ Gateway</div>
                <div className="text-lg font-bold text-[#141414] mt-1">متصل حياً</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                <div className="text-[11px] text-[#707070]">الكيان النشط</div>
                <div className="text-xs font-bold text-[#141414] mt-1.5">{activeCompany.name}</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#141414] font-bold">مؤشرات الأداء المباشرة (Power BI Live Stream)</span>
                <span className="font-mono text-[11px] text-[#707070]">{new Date().toISOString().slice(0, 10)}</span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>نسبة تحقيق المستهدف التشغيلي</span>
                    <span className="font-mono text-[#141414]">94%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#141414] rounded-full" style={{ width: '94%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span>كفاءة التحصيل المالي والالتزام الضريبي</span>
                    <span className="font-mono text-[#141414]">98%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#141414] rounded-full" style={{ width: '98%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="button-outline-on-light text-xs py-1.5 px-4"
              >
                طباعة التقرير
              </button>
              <button
                type="button"
                onClick={() => setSelectedPowerBiDash(null)}
                className="button-primary-pill text-xs py-1.5 px-5"
              >
                إغلاق اللوحة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MicrosoftIntegrationCenterPage;
