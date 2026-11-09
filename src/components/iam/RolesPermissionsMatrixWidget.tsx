import React, { useState } from 'react';
import { 
  ShieldCheck, Check, X, Sliders, Download, RotateCcw, 
  Save, Sparkles, CheckSquare, Square, Eye, FileText, 
  HelpCircle, Lock, ShieldAlert, Cpu
} from 'lucide-react';
import { ModuleAction } from '../../types/iam';
import { useAppStore } from '../../stores/appStore';

export interface ModulePermissionRow {
  moduleId: string;
  moduleName: string;
  category: string;
  actions: Record<ModuleAction, boolean>;
}

export const DEFAULT_ACTIONS: ModuleAction[] = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'reject',
  'export',
  'print',
  'import',
  'assign',
  'archive',
  'restore',
];

export const ACTION_LABELS: Record<ModuleAction, { ar: string; desc: string; color: string }> = {
  view: { ar: 'عرض', desc: 'استعراض الشاشة والبيانات', color: 'bg-[#f3f3f3] text-[#141414]' },
  create: { ar: 'إنشاء', desc: 'إضافة سجلات جديدة', color: 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]' },
  edit: { ar: 'تعديل', desc: 'تحديث البيانات الحالية', color: 'bg-[#f3f3f3] text-[#141414]' },
  delete: { ar: 'حذف', desc: 'حذف السجلات نهائياً', color: 'bg-[#f3f3f3] text-[#141414]' },
  approve: { ar: 'اعتماد', desc: 'الموافقة على الطلبات والعقود', color: 'bg-[#f3f3f3] text-[#141414]' },
  reject: { ar: 'رفض', desc: 'رفض المعاملات وإعادتها', color: 'bg-[#f3f3f3] text-[#141414]' },
  export: { ar: 'تصدير', desc: 'تصدير التقارير وExcel/PDF', color: 'bg-[#f3f3f3] text-[#141414]' },
  print: { ar: 'طباعة', desc: 'طباعة النماذج والمستندات', color: 'bg-[#f3f3f3] text-[#141414]' },
  import: { ar: 'استيراد', desc: 'رفع واستيراد البيانات', color: 'bg-[#f3f3f3] text-[#141414]' },
  assign: { ar: 'إسناد', desc: 'توجيه وتعيين المهام للموظفين', color: 'bg-[#f3f3f3] text-[#141414]' },
  archive: { ar: 'أرشفة', desc: 'نقل السجلات إلى الأرشيف', color: 'bg-slate-50 text-slate-700' },
  restore: { ar: 'استعادة', desc: 'استرجاع السجلات المؤرشفة', color: 'bg-zinc-50 text-zinc-700' },
};

export const INITIAL_MODULE_ROWS: ModulePermissionRow[] = [
  {
    moduleId: 'crm',
    moduleName: 'إدارة العملاء والتواصل (CRM)',
    category: 'التسويق وخدمة العملاء',
    actions: { view: true, create: true, edit: true, delete: false, approve: false, reject: false, export: true, print: true, import: false, assign: true, archive: false, restore: false },
  },
  {
    moduleId: 'recruitment',
    moduleName: 'الاستقدام والعقود والتأشيرات',
    category: 'العمليات والتشغيل',
    actions: { view: true, create: true, edit: true, delete: false, approve: true, reject: true, export: true, print: true, import: false, assign: true, archive: true, restore: false },
  },
  {
    moduleId: 'rent',
    moduleName: 'التأجير والتشغيل والباقات',
    category: 'العمليات والتشغيل',
    actions: { view: true, create: true, edit: true, delete: false, approve: true, reject: true, export: true, print: true, import: false, assign: true, archive: true, restore: false },
  },
  {
    moduleId: 'hr',
    moduleName: 'الموارد البشرية والرواتب (HR)',
    category: 'الموارد البشرية',
    actions: { view: true, create: true, edit: true, delete: false, approve: true, reject: false, export: true, print: true, import: false, assign: true, archive: false, restore: false },
  },
  {
    moduleId: 'finance',
    moduleName: 'الإدارة المالية والفوترة (ZATCA)',
    category: 'المالية والمحاسبة',
    actions: { view: true, create: true, edit: true, delete: false, approve: true, reject: true, export: true, print: true, import: false, assign: false, archive: false, restore: false },
  },
  {
    moduleId: 'shelter',
    moduleName: 'الإيواء والرعاية وتتبع العاملات',
    category: 'الرعاية والإيواء',
    actions: { view: true, create: true, edit: true, delete: false, approve: false, reject: false, export: true, print: true, import: false, assign: true, archive: false, restore: false },
  },
  {
    moduleId: 'tenders',
    moduleName: 'المناقصات وسحابة اعتماد (BOQ)',
    category: 'المشاريع والمنافسات',
    actions: { view: true, create: true, edit: true, delete: false, approve: true, reject: false, export: true, print: true, import: true, assign: true, archive: true, restore: false },
  },
  {
    moduleId: 'iam',
    moduleName: 'إدارة الهوية والوصول (IAM)',
    category: 'الأمن والرقابة',
    actions: { view: true, create: false, edit: false, delete: false, approve: true, reject: true, export: true, print: false, import: false, assign: false, archive: false, restore: false },
  },
  {
    moduleId: 'audit',
    moduleName: 'سجل التدقيق والمراقبة الأمنية',
    category: 'الأمن والرقابة',
    actions: { view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: true, print: true, import: false, assign: false, archive: false, restore: false },
  },
];

export const ROLE_PRESETS = [
  {
    id: 'super_admin',
    name: 'مدير عام النظام (Super Admin)',
    desc: 'صلاحيات تقنية كاملة ومطلقة على كافة الوحدات والعمليات',
    apply: (rows: ModulePermissionRow[]) =>
      rows.map(r => ({
        ...r,
        actions: DEFAULT_ACTIONS.reduce((acc, a) => ({ ...acc, [a]: true }), {} as Record<ModuleAction, boolean>),
      })),
  },
  {
    id: 'company_admin',
    name: 'مدير تنفيذي للشركة (Company Admin)',
    desc: 'إدارة كاملة لكافة عمليات الشركة والفروع مع صلاحيات الاعتماد والتصدير',
    apply: (rows: ModulePermissionRow[]) =>
      rows.map(r => ({
        ...r,
        actions: DEFAULT_ACTIONS.reduce((acc, a) => ({ ...acc, [a]: a !== 'delete' }), {} as Record<ModuleAction, boolean>),
      })),
  },
  {
    id: 'branch_manager',
    name: 'مدير فرع (Branch Manager)',
    desc: 'إدارة عمليات الفرع، العقود، العملاء، والطلبات ضمن نطاق الفرع فقط',
    apply: (rows: ModulePermissionRow[]) =>
      rows.map(r => {
        const isCore = ['crm', 'recruitment', 'rent', 'shelter'].includes(r.moduleId);
        return {
          ...r,
          actions: DEFAULT_ACTIONS.reduce((acc, a) => ({
            ...acc,
            [a]: isCore ? ['view', 'create', 'edit', 'approve', 'export', 'print', 'assign'].includes(a) : (a === 'view' && r.moduleId !== 'iam'),
          }), {} as Record<ModuleAction, boolean>),
        };
      }),
  },
  {
    id: 'hr_specialist',
    name: 'أخصائي موارد بشرية (HR Specialist)',
    desc: 'متابعة الموظفين، الرواتب، السير الذاتية، والحضور دون صلاحيات مالية أو إدارية عليا',
    apply: (rows: ModulePermissionRow[]) =>
      rows.map(r => {
        const isHr = ['hr', 'recruitment'].includes(r.moduleId);
        return {
          ...r,
          actions: DEFAULT_ACTIONS.reduce((acc, a) => ({
            ...acc,
            [a]: isHr ? ['view', 'create', 'edit', 'export', 'print'].includes(a) : false,
          }), {} as Record<ModuleAction, boolean>),
        };
      }),
  },
  {
    id: 'accountant',
    name: 'محاسب مالي (Financial Accountant)',
    desc: 'إصدار الفواتير، القيود، السندات، وإعداد الإقرارات الضريبية ZATCA',
    apply: (rows: ModulePermissionRow[]) =>
      rows.map(r => {
        const isFin = ['finance', 'crm', 'tenders'].includes(r.moduleId);
        return {
          ...r,
          actions: DEFAULT_ACTIONS.reduce((acc, a) => ({
            ...acc,
            [a]: isFin ? ['view', 'create', 'edit', 'export', 'print'].includes(a) : false,
          }), {} as Record<ModuleAction, boolean>),
        };
      }),
  },
  {
    id: 'auditor',
    name: 'مراجع داخلي / خارجي (Auditor Read-Only)',
    desc: 'اطلاع وقراءة وتصدير التقارير فقط لغايات الفحص والرقابة دون أي تعديل',
    apply: (rows: ModulePermissionRow[]) =>
      rows.map(r => ({
        ...r,
        actions: DEFAULT_ACTIONS.reduce((acc, a) => ({
          ...acc,
          [a]: a === 'view' || a === 'export' || a === 'print',
        }), {} as Record<ModuleAction, boolean>),
      })),
  },
];

export const RolesPermissionsMatrixWidget: React.FC = () => {
  const { addNotification } = useAppStore();
  const [rows, setRows] = useState<ModulePermissionRow[]>(INITIAL_MODULE_ROWS);
  const [selectedPreset, setSelectedPreset] = useState<string>('company_admin');
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleAction = (moduleId: string, action: ModuleAction) => {
    setRows(prev =>
      prev.map(r => {
        if (r.moduleId === moduleId) {
          return {
            ...r,
            actions: {
              ...r.actions,
              [action]: !r.actions[action],
            },
          };
        }
        return r;
      })
    );
  };

  const handleToggleRowAll = (moduleId: string, enable: boolean) => {
    setRows(prev =>
      prev.map(r => {
        if (r.moduleId === moduleId) {
          const newActions = DEFAULT_ACTIONS.reduce((acc, a) => ({
            ...acc,
            [a]: enable,
          }), {} as Record<ModuleAction, boolean>);
          return { ...r, actions: newActions };
        }
        return r;
      })
    );
  };

  const handleApplyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = ROLE_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setRows(preset.apply(INITIAL_MODULE_ROWS));
      addNotification({
        title: 'تطبيق قالب الدور المعتمد',
        message: `تم تطبيق نمط مصفوفة الصلاحيات المعتمدة لـ (${preset.name}) بنجاح.`,
        type: 'success',
      });
    }
  };

  const handleSaveMatrix = () => {
    setIsSaving(true);
    setTimeout(() => {
      localStorage.setItem('ERP_IAM_ROLES_MATRIX', JSON.stringify(rows));
      setIsSaving(false);
      addNotification({
        title: 'حفظ مصفوفة الصلاحيات',
        message: 'تم اعتماد وتثبيت مصفوفة الصلاحيات الـ 12 بنجاح وتعميمها على الكيانات.',
        type: 'success',
      });
    }, 600);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rows, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `IAM_Permissions_Matrix_${selectedPreset}.json`);
    dlAnchorElem.click();
    addNotification({
      title: 'تصدير المصفوفة',
      message: 'تم تصدير ملف مصفوفة الصلاحيات بتنسيق JSON بنجاح.',
      type: 'success',
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 space-y-6 font-sans">
      {/* Header & Presets Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#141414] text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5 text-[#ffffff]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
              مصفوفة الصلاحيات الدقيقة للوحدات والعمليات (Roles & Permissions Matrix)
              <span className="pill-tag-mint" style={{ fontSize: '10px' }}>12 عملية معتمدة</span>
            </h3>
            <p className="text-xs text-[#707070] m-0 mt-0.5">
              تحديد وضبط الإجراءات الـ 12 المسموحة لكل وحدة بنظام Deny by Default الصارم
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            className="button-outline-on-light"
            style={{ fontSize: '11.5px', padding: '6px 12px' }}
          >
            <Download className="w-3.5 h-3.5 ml-1" />
            <span>تصدير JSON</span>
          </button>

          <button
            onClick={handleSaveMatrix}
            disabled={isSaving}
            className="button-black-pill"
            style={{ fontSize: '11.5px', padding: '6px 16px' }}
          >
            <Save className="w-3.5 h-3.5 ml-1" />
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ واعتماد المصفوفة'}</span>
          </button>
        </div>
      </div>

      {/* Role Preset Selector Cards */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-700 block">
          اختر قالب الدور الوظيفي للتعديل أو التطبيق المباشر (Role Templates):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {ROLE_PRESETS.map(preset => (
            <div
              key={preset.id}
              onClick={() => handleApplyPreset(preset.id)}
              className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedPreset === preset.id
                  ? 'border-[#141414] bg-zinc-50 shadow-xs'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#141414]">{preset.name}</span>
                {selectedPreset === preset.id && (
                  <span className="w-2 h-2 rounded-full bg-[#141414]" />
                )}
              </div>
              <p className="text-[11px] text-[#707070] m-0 leading-tight">
                {preset.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 12-Action Permissions Matrix Table */}
      <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] font-bold text-[11px]">
                <th className="py-3 px-4 w-52 sticky right-0 bg-[#f3f3f3] border-b border-[#e0e0e0] z-10">الوحدة الإدارية / Module</th>
                {DEFAULT_ACTIONS.map(action => (
                  <th key={action} className="py-3 px-2 text-center whitespace-nowrap min-w-[65px]" title={ACTION_LABELS[action].desc}>
                    <div className="font-bold">{ACTION_LABELS[action].ar}</div>
                    <div className="text-[9px] font-mono text-[#707070] uppercase font-normal">{action}</div>
                  </th>
                ))}
                <th className="py-3 px-3 text-center w-24">التحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-medium">
              {rows.map((row, idx) => (
                <tr key={row.moduleId} className={`hover:bg-zinc-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}`}>
                  <td className="py-3 px-4 font-bold text-[#141414] sticky right-0 bg-inherit z-10 border-l border-zinc-200">
                    <div className="text-xs">{row.moduleName}</div>
                    <div className="text-[10px] text-[#707070] font-mono font-normal">module: {row.moduleId}</div>
                  </td>

                  {DEFAULT_ACTIONS.map(action => {
                    const enabled = row.actions[action] || false;
                    return (
                      <td key={action} className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAction(row.moduleId, action)}
                          className={`w-6 h-6 rounded-lg inline-flex items-center justify-center transition-all ${
                            enabled
                              ? 'bg-[#141414] text-white shadow-xs hover:bg-zinc-800'
                              : 'bg-zinc-100 text-[#141414] hover:bg-zinc-200 hover:text-zinc-600'
                          }`}
                          title={`${row.moduleName} - ${ACTION_LABELS[action].ar}: ${enabled ? 'مفعل' : 'محظور'}`}
                        >
                          {enabled ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <X className="w-3.5 h-3.5 stroke-[1.5]" />}
                        </button>
                      </td>
                    );
                  })}

                  <td className="py-2.5 px-3 text-center border-r border-zinc-200">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleRowAll(row.moduleId, true)}
                        className="px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-[10px] font-bold text-zinc-700"
                        title="تفعيل الكل"
                      >
                        الكل
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleRowAll(row.moduleId, false)}
                        className="px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-[10px] font-bold text-zinc-700"
                        title="إلغاء الكل"
                      >
                        تصفير
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Decision Hierarchy Footer Notes */}
      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#141414]" />
          <span className="text-zinc-700 font-bold">
            تسلسل قرار الوصول (Deny By Default Flow):
          </span>
          <span className="text-[#707070] font-mono text-[11px]">
            Active User → Tenant → Company Isolation → Branch Scope → Dept Scope → Module Perm → Data Scope (0-6)
          </span>
        </div>
        <span className="pill-tag-mint" style={{ fontSize: '10px' }}>
          حماية فورية على مستوى الـ Backend والـ Frontend
        </span>
      </div>
    </div>
  );
};
