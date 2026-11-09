import i18n from '../i18n/config';
import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { realErpDataStore } from '../services/realErpDataStore';
import { ClipboardCheck, FileSpreadsheet, FileText, Upload, Plus, Search, X, Check, CloudUpload } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  emp_name: string;
  department: string;
  date: string;
  check_in: string;
  check_out: string;
  status: 'حاضر' | 'متأخر' | 'غياب' | 'إجازة';
  work_hours: number;
}

const INITIAL_ATTENDANCES: AttendanceRecord[] = [
  { id: '1', emp_name: 'محمد مصطفي', department: 'الإدارة العليا', date: '2026-08-12', check_in: '08:00 ص', check_out: '04:30 م', status: 'حاضر', work_hours: 8.5 },
  { id: '2', emp_name: 'سهام الشاذلي', department: 'الموارد البشرية', date: '2026-08-12', check_in: '08:15 ص', check_out: '04:30 م', status: 'متأخر', work_hours: 8.25 },
  { id: '3', emp_name: 'فهد العتيبي', department: 'التشغيل والاستقدام', date: '2026-08-12', check_in: '07:55 ص', check_out: '05:00 م', status: 'حاضر', work_hours: 9.0 },
  { id: '4', emp_name: 'عبدالفتح مسؤول الوكلاء', department: 'المكاتب الخارجية', date: '2026-08-12', check_in: '08:05 ص', check_out: '04:30 م', status: 'حاضر', work_hours: 8.4 },
  { id: '5', emp_name: 'سارة خالد', department: 'خدمة العملاء CRM', date: '2026-08-12', check_in: '09:30 ص', check_out: '04:30 م', status: 'متأخر', work_hours: 7.0 }
];

const normalizeAttendanceRecord = (raw: any, idx: number): AttendanceRecord => ({
  id: String(raw?.id || raw?.attendance_id || `att-${idx + 1}`),
  emp_name: String(raw?.emp_name || raw?.employee_name || raw?.name || 'موظف مسجل'),
  department: String(raw?.department || raw?.branch || 'الموارد البشرية'),
  date: String(raw?.date || raw?.attendance_date || (raw?.created_at ? String(raw.created_at).slice(0, 10) : '2026-08-12')),
  check_in: String(raw?.check_in || raw?.checkIn || '08:00 ص'),
  check_out: String(raw?.check_out || raw?.checkOut || '04:30 م'),
  status: (raw?.status === 'حاضر' || raw?.status === 'متأخر' || raw?.status === 'غياب' || raw?.status === 'إجازة')
    ? raw.status
    : 'حاضر',
  work_hours: Number(raw?.work_hours ?? raw?.hours_worked ?? 8.5),
});

export const AttendancesPage: React.FC = () => {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    realErpDataStore
      .getRecords<AttendanceRecord>('attendances', INITIAL_ATTENDANCES)
      .then((data) => {
        const list = Array.isArray(data) && data.length > 0 ? data : INITIAL_ATTENDANCES;
        setAttendances(list.map((item, idx) => normalizeAttendanceRecord(item, idx)));
      });
  }, []);

  const [manualForm, setManualForm] = useState({
    emp_name: '',
    department: 'الموارد البشرية',
    date: new Date().toISOString().slice(0, 10),
    check_in: '08:00',
    check_out: '16:30',
    status: 'حاضر' as 'حاضر' | 'متأخر' | 'غياب' | 'إجازة'
  });

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.emp_name) return;

    const newRec: AttendanceRecord = {
      id: String(Date.now()),
      emp_name: manualForm.emp_name,
      department: manualForm.department,
      date: manualForm.date,
      check_in: `${manualForm.check_in} ص`,
      check_out: `${manualForm.check_out} م`,
      status: manualForm.status,
      work_hours: 8.5
    };

    const updated = await realErpDataStore.addRecord('attendances', newRec, INITIAL_ATTENDANCES);
    setAttendances(updated.map((item, idx) => normalizeAttendanceRecord(item, idx)));
    setShowManualModal(false);
    setManualForm({ emp_name: '', department: 'الموارد البشرية', date: new Date().toISOString().slice(0, 10), check_in: '08:00', check_out: '16:30', status: 'حاضر' });
  };

  const handleSimulatedSheetImport = () => {
    const imported: AttendanceRecord[] = [
      { id: String(Date.now() + 1), emp_name: 'علي حسن السليمان', department: 'المالية', date: new Date().toISOString().slice(0, 10), check_in: '07:50 ص', check_out: '04:30 م', status: 'حاضر', work_hours: 8.6 },
      { id: String(Date.now() + 2), emp_name: 'ريم الدوسري', department: 'خدمة العملاء', date: new Date().toISOString().slice(0, 10), check_in: '08:22 ص', check_out: '04:30 م', status: 'متأخر', work_hours: 8.1 }
    ];
    setAttendances([...imported, ...attendances]);
    setShowUploadModal(false);
  };

  const q = searchQuery.toLowerCase();
  const filteredAttendances = attendances.filter((a) =>
    (a.emp_name || '').toLowerCase().includes(q) ||
    (a.department || '').toLowerCase().includes(q) ||
    (a.date || '').toLowerCase().includes(q)
  );

  const totalPresent = attendances.filter(a => a.status === 'حاضر').length;
  const totalLate = attendances.filter(a => a.status === 'متأخر').length;

  return (
    <div className="space-y-6">
      {/* Top Banner Header — Mobbin Gallery-White Monochrome */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          borderRadius: '24px',
          padding: '24px',
          color: '#141414',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="flex items-center gap-3.5">
          <div className="hidden sm:block">
            <BusinessIllustration type="attendance-monitoring" size="sm" showBackground={false} />
          </div>
          <div className="sm:hidden" style={{ width: '44px', height: '44px', borderRadius: '9999px', background: '#f3f3f3', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#141414' }}>
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-shade" style={{ fontSize: '11px' }}>{i18n.t("hr.biometricAttendance", "البصمة والحضور الذكي")}</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', color: '#141414', margin: 0 }}>
              سجل الحضور والانصراف والبصمة
            </h1>
            <p style={{ fontSize: '13px', color: '#707070', margin: '4px 0 0 0', fontWeight: 500 }}>
              رفع واستيراد كشوف البصمة الإلكترونية الجماعية، تتبع التأخيرات، ومطابقة ساعات العمل
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="button-primary-pill"
            onClick={() => setShowUploadModal(true)}
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Upload className="w-4 h-4 ml-1" />
            <span>رفع شيت بصمة الإكسيل</span>
          </button>
          <button
            className="button-outline-on-light"
            onClick={() => setShowManualModal(true)}
            style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>تسجيل يدوي</span>
          </button>
          <ExportDropdown
            sectionKey="attendances"
            data={filteredAttendances}
            customTitle="سجل الحضور والانصراف والبصمة الذكية"
            variant="outline-light"
            buttonLabel="تصدير كشوفات الحضور (12 صيغة)"
          />
        </div>
      </div>

      {/* Stats Cards Bar — Mobbin Gallery-White Monochrome */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e0e0e0' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 600 }}>الموظفون الحاضرون اليوم</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 700, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>{totalPresent} موظفاً</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>حضور مكتمل</span>
        </div>
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e0e0e0' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 600 }}>حالات التأخير المسجلة</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 700, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>{totalLate} حالات</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>بحاجة لمراجعة</span>
        </div>
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e0e0e0' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 600 }}>معدل الانضباط العام</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 700, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>98.4%</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>ممتاز</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
        <div className="flex items-center justify-between p-4 border-b border-[#e0e0e0] bg-[#ffffff] flex-wrap gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3 top-3 text-[#707070]" />
            <input
              type="text"
              aria-label="ابحث باسم الموظف، القسم، أو التاريخ"
              placeholder="ابحث باسم الموظف، القسم، أو التاريخ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-input"
              style={{ width: '100%', height: '36px', minHeight: '36px', borderRadius: '9999px', paddingRight: '36px', fontSize: '12px' }}
            />
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px' }}>
            العدد: {filteredAttendances.length} سجلات
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-[#141414]">
            <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
              <tr>
                <th className="p-3.5">اسم الموظف</th>
                <th className="p-3.5">القسم والفرع</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">وقت الحضور (Check-In)</th>
                <th className="p-3.5">وقت الانصراف (Check-Out)</th>
                <th className="p-3.5">ساعات العمل</th>
                <th className="p-3.5">حالة الحضور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {filteredAttendances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#707070]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BusinessIllustration type="empty-search" size="md" />
                      <span className="font-bold text-[#141414]">لا توجد سجلات حضور مطابقة للبحث</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAttendances.map((row, idx) => (
                  <tr key={`${row.id}-${idx}`} className="hover:bg-[#f3f3f3]/60 transition-colors">
                    <td className="p-3.5 font-bold text-[#141414]">
                      <div className="flex items-center gap-2.5">
                        <CorporateAvatar
                          name={row.emp_name}
                          role={row.department}
                          departmentId="hr"
                          size="sm"
                          status={row.status === 'حاضر' ? 'online' : 'none'}
                        />
                        <span>{row.emp_name}</span>
                      </div>
                    </td>
                    <td className="p-3.5"><Badge text={row.department} type="purple" /></td>
                    <td className="p-3.5 font-mono text-[#707070]">{row.date}</td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{row.check_in}</td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{row.check_out}</td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{row.work_hours} س</td>
                    <td className="p-3.5">
                      <Badge text={row.status} type={row.status === 'حاضر' ? 'success' : row.status === 'متأخر' ? 'warning' : 'danger'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Biometric Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#ffffff] rounded-3xl shadow-2xl border border-[#e0e0e0] overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#141414]" />
                <span>استيراد شيت البصمة الجماعي</span>
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-[#e0e0e0] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-[#ffffff] text-[#141414]">
              <p className="text-xs text-[#707070]">
                اختر ملف إكسيل (.xlsx / .csv) المصدَر من جهاز البصمة الإلكترونية للمعالجة التلقائية.
              </p>

              <div className="border border-dashed border-[#e0e0e0] p-8 text-center rounded-2xl bg-[#f3f3f3] flex flex-col items-center justify-center">
                <CloudUpload className="w-10 h-10 text-[#141414] mb-2" />
                <div className="text-xs font-bold text-[#141414]">اسحب وأسقط ملف البصمة هنا</div>
                <span className="text-[11px] text-[#707070] mt-1">أو قم باختيار الملف من جهازك</span>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-[#e0e0e0]">
                <button className="button-outline-on-light" onClick={() => setShowUploadModal(false)} style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}>
                  إلغاء
                </button>
                <button className="button-primary-pill" onClick={handleSimulatedSheetImport} style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}>
                  معالجة واستيراد السجلات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Attendance Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#ffffff] rounded-3xl shadow-2xl border border-[#e0e0e0] overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#141414]" />
                <span>تسجيل حضور وانصراف يدوي</span>
              </h3>
              <button onClick={() => setShowManualModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-[#e0e0e0] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 space-y-4 bg-[#ffffff] text-[#141414]">
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">اسم الموظف *</label>
                <input
                  type="text"
                  placeholder="الاسم الثلاثي..."
                  value={manualForm.emp_name}
                  onChange={e => setManualForm({ ...manualForm, emp_name: e.target.value })}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">وقت الحضور *</label>
                  <input
                    type="time"
                    value={manualForm.check_in}
                    onChange={e => setManualForm({ ...manualForm, check_in: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">وقت الانصراف *</label>
                  <input
                    type="time"
                    value={manualForm.check_out}
                    onChange={e => setManualForm({ ...manualForm, check_out: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-[#e0e0e0]">
                <button type="button" className="button-outline-on-light" onClick={() => setShowManualModal(false)} style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}>
                  إلغاء
                </button>
                <button type="submit" className="button-primary-pill" style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}>
                  <Check className="w-4 h-4 ml-1" />
                  <span>حفظ السجل</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancesPage;
