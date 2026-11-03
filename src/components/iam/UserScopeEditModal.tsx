import React, { useState } from 'react';
import { 
  X, ShieldCheck, Building2, MapPin, Layers, KeyRound, 
  CheckCircle2, AlertTriangle, Save, User, Mail, Phone, 
  Briefcase, Lock, Shield, Sparkles
} from 'lucide-react';
import { 
  IamUser, 
  DataScopeLevel, 
  DataScopeName, 
  AccountType 
} from '../../types/iam';
import { useAppStore } from '../../stores/appStore';

interface UserScopeEditModalProps {
  user: IamUser;
  onClose: () => void;
  onSave: (updatedUser: IamUser) => void;
}

const ALL_COMPANIES = [
  { code: 'SAF', name: 'شركة الصفا الماسي للاستقدام (SAF RC01)' },
  { code: 'YAQ', name: 'شركة الياقوت الشرقية للتشغيل والتأجير (YAQ RC02)' },
  { code: 'TOP', name: 'شركة توب تالنت الدولية للتوظيف (TOP RC03)' },
  { code: 'KAS', name: 'مؤسسة كاس وسحابة اعتماد للمنافسات والتشغيل (KAS RC04)' },
];

const ALL_BRANCHES = [
  { id: 'BR-RUH', name: 'فرع الرياض الرئيسي (HQ-RUH)' },
  { id: 'BR-JED', name: 'فرع جدة الغربية (BR-JED)' },
  { id: 'BR-DMM', name: 'فرع المنطقة الشرقية - الدمام والخبر (BR-DMM)' },
  { id: 'SHL-RUH', name: 'مجمع الإيواء والرعاية المتكاملة بالرياض (SHL-RUH)' },
];

const ALL_DEPARTMENTS = [
  { id: 'DEPT-HR', name: 'إدارة الموارد البشرية وشؤون الموظفين (HR)' },
  { id: 'DEPT-FIN', name: 'الإدارة المالية والمحاسبة والفوترة (Finance)' },
  { id: 'DEPT-REC', name: 'إدارة الاستقدام والتشغيل والتأشيرات (Recruitment)' },
  { id: 'DEPT-RENT', name: 'إدارة التأجير والتشغيل السكني والمهني (Rental)' },
  { id: 'DEPT-CRM', name: 'إدارة علاقات العملاء وخدمة ما بعد البيع (CRM)' },
  { id: 'DEPT-SHL', name: 'إدارة الإيواء والرعاية الإنسانية (Shelter)' },
  { id: 'DEPT-TEND', name: 'إدارة المناقصات وعقود سحابة اعتماد (Tenders/BOQ)' },
  { id: 'DEPT-LEGAL', name: 'الشؤون القانونية والامتثال العمالي (Legal)' },
  { id: 'DEPT-IT', name: 'تقنية المعلومات وأمن البيانات (IT & Security)' },
];

const DATA_SCOPES: { level: DataScopeLevel; name: DataScopeName; ar: string; desc: string }[] = [
  { level: 0, name: 'No Access', ar: '0 — لا وصول (No Access)', desc: 'حجب كامل لأي سجلات أو شاشات.' },
  { level: 1, name: 'Own', ar: '1 — شخصي (Own)', desc: 'سجلات ومعاملات المستخدم المسندة له شخصياً فقط.' },
  { level: 2, name: 'Team', ar: '2 — فريق العمل (Team)', desc: 'سجلات فريق العمل المباشر فقط.' },
  { level: 3, name: 'Department', ar: '3 — القسم (Department)', desc: 'كافة سجلات القسم المصرح به في الفرع.' },
  { level: 4, name: 'Branch', ar: '4 — الفرع (Branch)', desc: 'كافة سجلات ومعاملات الفرع المحدد.' },
  { level: 5, name: 'Company', ar: '5 — كامل الشركة (Company)', desc: 'كافة سجلات وفروع الشركة النشطة بالكامل.' },
  { level: 6, name: 'Group', ar: '6 — المجموعة القابضة (Group)', desc: 'رؤية موحدة وشاملة لكافة شركات وفروع المجموعة (للإدارة العليا فقط).' },
];

export const UserScopeEditModal: React.FC<UserScopeEditModalProps> = ({
  user,
  onClose,
  onSave,
}) => {
  const { addNotification } = useAppStore();

  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [jobTitle, setJobTitle] = useState(user.jobTitle);
  const [accountType, setAccountType] = useState<AccountType>(user.accountType);
  const [status, setStatus] = useState(user.status);
  const [dataScope, setDataScope] = useState<DataScopeLevel>(user.dataScope ?? 5);

  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(['SAF', 'YAQ', 'TOP', 'KAS']);
  const [selectedBranches, setSelectedBranches] = useState<string[]>(['BR-RUH', 'BR-JED', 'BR-DMM', 'SHL-RUH']);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(['DEPT-HR', 'DEPT-FIN', 'DEPT-REC']);

  const [overrideReason, setOverrideReason] = useState('');
  const [overrideExpiry, setOverrideExpiry] = useState('');

  const handleToggleCompany = (code: string) => {
    setSelectedCompanies(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleToggleBranch = (id: string) => {
    setSelectedBranches(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const handleToggleDepartment = (id: string) => {
    setSelectedDepartments(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCompanies.length === 0) {
      addNotification({
        title: 'تنبيه النطاق',
        message: 'يجب تحديد شركة واحدة على الأقل للمستخدم.',
        type: 'warning',
      });
      return;
    }

    const updatedUser: IamUser = {
      ...user,
      fullName,
      email,
      phone,
      jobTitle,
      accountType,
      status,
      dataScope,
    };

    onSave(updatedUser);
    addNotification({
      title: 'حفظ نطاق الصلاحيات',
      message: `تم تحديث وضبط نطاقات الوصول للمستخدم (${fullName}) بنجاح.`,
      type: 'success',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#141414]/60 backdrop-blur-sm animate-fade-in font-sans">
      <div 
        className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        dir="rtl"
      >
        {/* Header — Mobbin Pure Light Mode */}
        <div className="p-5 sm:p-6 bg-[#ffffff] text-[#141414] border-b border-[#e5e5e5] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#f3f3f3] flex items-center justify-center text-[#141414] border border-[#e0e0e0]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#141414] m-0">
                إدارة نطاقات الوصول والصلاحيات (Access Scope & Data Level)
              </h3>
              <p className="text-xs text-[#707070] m-0 mt-0.5">
                المستخدم: {user.fullName} • {user.employeeNumber}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Section 1: User Profile & Account Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">الاسم الرباعي الكامل:</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="w-full bg-white border border-zinc-300 rounded-xl p-2 text-xs font-bold text-black"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">المسمى الوظيفي الرسمي:</label>
              <input
                type="text"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                required
                className="w-full bg-white border border-zinc-300 rounded-xl p-2 text-xs font-bold text-black"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">نوع الحساب الإداري (Account Role):</label>
              <select
                value={accountType}
                onChange={e => setAccountType(e.target.value as AccountType)}
                className="w-full bg-white border border-zinc-300 rounded-xl p-2 text-xs font-bold text-black"
              >
                <option value="Group Super Admin">Group Super Admin (مدير عام المجموعة)</option>
                <option value="Board / Group Executive">Board / Group Executive (إدارة عليا)</option>
                <option value="Company Admin">Company Admin (مدير تنفيذي لشركة)</option>
                <option value="Branch Manager">Branch Manager (مدير فرع)</option>
                <option value="Department Manager">Department Manager (مدير قسم)</option>
                <option value="Employee">Employee (موظف تشغيلي / أخصائي)</option>
                <option value="Auditor">Auditor (مراجع داخلي / خارجي)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">حالة الحساب:</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full bg-white border border-zinc-300 rounded-xl p-2 text-xs font-bold text-black"
              >
                <option value="نشط">نشط (Active)</option>
                <option value="معلق">معلق (Suspended)</option>
                <option value="موقوف">موقوف (Deactivated)</option>
              </select>
            </div>
          </div>

          {/* Section 2: Data Scope Level (0 to 6) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-black">
              مستوى نطاق البيانات (Data Scope Level 0–6) — حسب المعيار المؤسسي:
            </label>
            <div className="space-y-2">
              {DATA_SCOPES.map(scope => (
                <label
                  key={scope.level}
                  className={`flex items-start gap-3 p-3 rounded-[16px] border cursor-pointer transition-all ${
                    dataScope === scope.level 
                      ? 'border-[#141414] bg-[#f3f3f3] shadow-xs' 
                      : 'border-[#e5e5e5] bg-[#ffffff] hover:border-[#141414]'
                  }`}
                >
                  <input
                    type="radio"
                    name="data_scope"
                    checked={dataScope === scope.level}
                    onChange={() => setDataScope(scope.level)}
                    className="mt-0.5 text-[#141414] accent-[#141414]"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#141414]">{scope.ar}</div>
                    <div className="text-[11px] text-[#707070]">{scope.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section 3: Company Access */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-black">
              الشركات المصرح بها للمستخدم (Company Access Scope):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_COMPANIES.map(c => {
                const checked = selectedCompanies.includes(c.code);
                return (
                  <div
                    key={c.code}
                    onClick={() => handleToggleCompany(c.code)}
                    className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                      checked 
                        ? 'border-black bg-zinc-50 font-bold text-black' 
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                    }`}
                  >
                    <span className="text-xs">{c.name}</span>
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                      checked ? 'bg-black text-white' : 'bg-zinc-100 text-transparent'
                    }`}>
                      ✓
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Branch Access */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-black">
              الفروع المصرح بها (Branch Access Scope):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_BRANCHES.map(b => {
                const checked = selectedBranches.includes(b.id);
                return (
                  <div
                    key={b.id}
                    onClick={() => handleToggleBranch(b.id)}
                    className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                      checked 
                        ? 'border-black bg-zinc-50 font-bold text-black' 
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                    }`}
                  >
                    <span className="text-xs">{b.name}</span>
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                      checked ? 'bg-black text-white' : 'bg-zinc-100 text-transparent'
                    }`}>
                      ✓
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 5: Department Access */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-black">
              الأقسام المصرح بها (Department Access Scope):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ALL_DEPARTMENTS.map(d => {
                const checked = selectedDepartments.includes(d.id);
                return (
                  <div
                    key={d.id}
                    onClick={() => handleToggleDepartment(d.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                      checked 
                        ? 'border-black bg-zinc-50 font-bold text-black' 
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                    }`}
                  >
                    <span className="text-[11px] truncate">{d.name}</span>
                    <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] ${
                      checked ? 'bg-black text-white' : 'bg-zinc-100 text-transparent'
                    }`}>
                      ✓
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 6: Exceptions & Expiration Override */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <h4 className="text-xs font-bold text-amber-900 m-0">
                استثناء الصلاحيات المؤقت وتاريخ الانتهاء (Permission Overrides):
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">سبب الاستثناء الإداري:</label>
                <input
                  type="text"
                  placeholder="مثال: تغطية مهام قسم المالية أثناء الإجازة الرسمية"
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl p-2 text-xs text-black"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">تاريخ انتهاء الاستثناء:</label>
                <input
                  type="date"
                  value={overrideExpiry}
                  onChange={e => setOverrideExpiry(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl p-2 text-xs text-black"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              className="button-outline-on-light"
              style={{ padding: '8px 16px', fontSize: '12px' }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="button-black-pill"
              style={{ padding: '8px 24px', fontSize: '12px' }}
            >
              <Save className="w-4 h-4 ml-1" />
              <span>حفظ واعتماد النطاقات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
