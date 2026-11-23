import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2,
  Fingerprint,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import {
  collectUserAddedHrInventory,
  sanitizeHrDemoDataPreservingUserAdditions,
  type UserAddedHrInventoryReport,
} from '../../services/hrUserAddedDataSanitizer';
import { KAS_ALLOWED_EMPLOYEES, CORPORATE_DEPARTMENTS } from '../../services/authService';
import { saveUnifiedEmployeeProfile } from '../../services/employeeProfileSync';

export interface UserAddedHrDataModalProps {
  isOpen: boolean;
  companyScope?: string;
  onClose: () => void;
  onAfterSanitizeOrImport?: () => void;
}

export const UserAddedHrDataModal: React.FC<UserAddedHrDataModalProps> = ({
  isOpen,
  companyScope,
  onClose,
  onAfterSanitizeOrImport,
}) => {
  const [report, setReport] = useState<UserAddedHrInventoryReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewSection, setViewSection] = useState<'OPERATIONAL' | 'HARDWARE' | 'KAS_DIRECTORY'>(
    'OPERATIONAL'
  );
  const [bannerMsg, setBannerMsg] = useState<string>('');
  const [importingId, setImportingId] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await collectUserAddedHrInventory(companyScope);
      setReport(data);
    } finally {
      setLoading(false);
    }
  }, [companyScope]);

  useEffect(() => {
    if (isOpen) {
      setBannerMsg('');
      void loadInventory();
    }
  }, [isOpen, loadInventory]);

  if (!isOpen) return null;

  const handleForceSanitize = async () => {
    setLoading(true);
    try {
      const res = await sanitizeHrDemoDataPreservingUserAdditions(true);
      await loadInventory();
      onAfterSanitizeOrImport?.();
      setBannerMsg(
        `تم تطهير (${res.removedDemoCount}) سجل تجريبي/محاكاة والاحتفاظ بـ (${res.preservedUserCount}) سجل مضاف من قبلك بنجاح.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImportCleanKasStaff = async (emp: (typeof KAS_ALLOWED_EMPLOYEES)[number]) => {
    setImportingId(emp.id);
    try {
      const deptName = CORPORATE_DEPARTMENTS[emp.department_id]?.nameAr || emp.titleAr;
      await saveUnifiedEmployeeProfile(
        {
          id: emp.id,
          employee_code: emp.id,
          company_id: emp.company_id === 'all' ? 'SAF' : emp.company_id,
          name: emp.nameAr,
          name_en: emp.nameEn,
          email: emp.email,
          job_title: emp.titleAr,
          department: deptName,
          branch: emp.branch,
          national_id: '',
          phone: '',
          iban: '',
          bank_name: '',
          basic_salary: 0,
          housing_allowance: 0,
          transport_allowance: 0,
          other_allowances: 0,
          salary: 0,
          leave_balance: 0,
          status: 'نشط',
          notes: 'مضاف من دليل حسابات @kas.sa الرسمي بدون بيانات محاكاة',
        },
        null,
        'المستخدم (استيراد نظيف بدون محاكاة)'
      );
      await loadInventory();
      onAfterSanitizeOrImport?.();
      setBannerMsg(`تمت إضافة (${emp.nameAr} — ${emp.email}) إلى سجل الموظفين بدون أي أرقام محاكاة.`);
    } finally {
      setImportingId(null);
    }
  };

  const addedEmployeeCodes = new Set(
    (report?.categories.find((c) => c.key === 'employees')?.items || []).map((i) => i.id)
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-[#141414]/60 flex items-center justify-center p-4 font-['Cairo']"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e0e0e0] flex flex-wrap items-center justify-between gap-3 bg-[#ffffff]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#141414] text-[#ffffff] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#141414] m-0">
                سجل البيانات المضافة من قبلك فقط (بدون بيانات تجريبية أو محاكاة).
              </h2>
              <p className="text-xs text-[#707070] m-0 mt-0.5">
                يعرض حصرياً ما قمت بإضافته فعلياً في السحابة والمتصفح وأجهزة الشبكة، مع استبعاد كافة السجلات التجريبية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleForceSanitize}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث وتطهير أي بقايا تجريبية</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="w-9 h-9 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] flex items-center justify-center text-[#141414] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {bannerMsg && (
          <div className="mx-6 mt-4 px-4 py-2.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{bannerMsg}</span>
          </div>
        )}

        {/* Segmented Control */}
        <div className="px-6 pt-4 pb-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewSection('OPERATIONAL')}
            className={`px-4 py-2 rounded-full text-xs font-bold cursor-pointer transition-colors ${
              viewSection === 'OPERATIONAL'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0]'
            }`}
          >
            ١. سجلات الموارد البشرية المضافة ({report?.totalOperationalRecords ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setViewSection('HARDWARE')}
            className={`px-4 py-2 rounded-full text-xs font-bold cursor-pointer transition-colors ${
              viewSection === 'HARDWARE'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0]'
            }`}
          >
            ٢. أجهزة البصمة والشبكة المربوطة ({report?.registeredHardware.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setViewSection('KAS_DIRECTORY')}
            className={`px-4 py-2 rounded-full text-xs font-bold cursor-pointer transition-colors ${
              viewSection === 'KAS_DIRECTORY'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0]'
            }`}
          >
            ٣. حسابات الدخول الرسمية @kas.sa ({report?.officialKasAccountsCount ?? 68})
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading && !report ? (
            <div className="py-12 text-center text-xs font-bold text-[#707070]">
              جاري فحص السجلات الفعلية المضافة من قبلك...
            </div>
          ) : viewSection === 'OPERATIONAL' ? (
            <div className="space-y-3">
              {report?.totalOperationalRecords === 0 && (
                <div className="rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0] p-5 text-center space-y-1.5">
                  <Sparkles className="w-5 h-5 text-[#141414] mx-auto" />
                  <p className="text-sm font-black text-[#141414] m-0">
                    التطبيق الآن نظيف 100% وخالٍ من أي بيانات تجريبية أو محاكاة
                  </p>
                  <p className="text-xs text-[#707070] m-0">
                    لا توجد معاملات أو موظفون تجريبيون. أي موظف أو إجازة أو سلفة أو مسير تضيفه الآن سيظهر هنا فوراً ويحفظ سحابياً.
                  </p>
                </div>
              )}

              {report?.categories.map((cat) => (
                <div
                  key={cat.key}
                  className="rounded-[20px] bg-[#ffffff] border border-[#e0e0e0] p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-[#141414]">{cat.titleAr}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        cat.count > 0
                          ? 'bg-[#141414] text-[#ffffff]'
                          : 'bg-[#f3f3f3] text-[#707070]'
                      }`}
                    >
                      {cat.count} سجل
                    </span>
                  </div>

                  {cat.items.length > 0 ? (
                    <div className="space-y-1.5 pt-1 border-t border-[#f0f0f0]">
                      {cat.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-[14px] bg-[#f3f3f3] px-3.5 py-2 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div>
                            <div className="text-xs font-bold text-[#141414]">
                              {item.primaryLabel}
                            </div>
                            <div className="text-[11px] text-[#707070]">{item.secondaryLabel}</div>
                          </div>
                          {item.metaBadge && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[10px] font-bold text-[#141414]">
                              {item.metaBadge}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#707070] m-0">
                      لم تتم إضافة سجلات في هذا القسم بعد.
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : viewSection === 'HARDWARE' ? (
            <div className="space-y-3">
              <div className="rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0] p-4 text-xs text-[#141414]">
                الأجهزة أدناه هي الأجهزة الفعلية المضافة بأرقامها التسلسلية وعناوينها الحقيقية فقط (تم حذف الأجهزة التجريبية الوهمية).
              </div>
              {(report?.registeredHardware || []).map((dev) => (
                <div
                  key={dev.id}
                  className="rounded-[20px] bg-[#ffffff] border border-[#e0e0e0] p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-[12px] bg-[#f3f3f3] flex items-center justify-center shrink-0">
                      <Fingerprint className="w-4 h-4 text-[#141414]" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-[#141414]">{dev.device_name_ar}</div>
                      <div className="text-[11px] text-[#707070] mt-0.5">
                        الرقم التسلسلي: <span className="font-mono">{dev.serial_number}</span> • العنوان:{' '}
                        <span className="font-mono">
                          {dev.ip_address}:{dev.port}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10px] font-bold text-[#141414]">
                    {dev.vendor_model}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0] p-4 text-xs text-[#141414]">
                هذه قائمة حسابات البريد المؤسسي المعتمدة للدخول والصلاحيات (68 حساباً رسمياً بعد استبعاد الحسابين المحظورين). لم نعد نولّد لها أي رواتب أو هويات أو آيبان وهمي تلقائياً؛ يمكنك استيراد أي موظف منها نظيفاً ثم إدخال راتبه وبياناته الفعلية.
              </div>
              <div className="space-y-2">
                {KAS_ALLOWED_EMPLOYEES.map((emp) => {
                  const alreadyAdded = addedEmployeeCodes.has(emp.id);
                  return (
                    <div
                      key={emp.id}
                      className="rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <Mail className="w-4 h-4 text-[#707070] shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-[#141414]">
                            {emp.nameAr}{' '}
                            <span className="font-mono text-[11px] text-[#707070]">
                              ({emp.email})
                            </span>
                          </div>
                          <div className="text-[11px] text-[#707070]">
                            {emp.titleAr} • {emp.branch}
                          </div>
                        </div>
                      </div>

                      {alreadyAdded ? (
                        <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[10px] font-bold text-[#141414] inline-flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          <span>مُدرج في السجل</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={importingId === emp.id}
                          onClick={() => void handleImportCleanKasStaff(emp)}
                          className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>إدراج نظيف بدون محاكاة</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
