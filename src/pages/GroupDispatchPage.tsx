import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { useLanguage } from '../i18n/LanguageContext';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { 
  Send, Plus, FileSpreadsheet, FileText, Eye, Printer, X, Check, 
  Building2, Plane, Globe, Award, ShieldAlert, Sparkles
} from 'lucide-react';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

export interface GroupDispatchMemo {
  id: string;
  dispatch_no: string;
  source_entity: string;
  target_entity: string;
  dispatch_type: 'خطاب تكليف رسمي' | 'طلب استقدام عاجل' | 'حجز رحلات وسفر' | 'اعتماد مالي' | 'توثيق جوازات';
  subject: string;
  details: string;
  priority: 'عادي' | 'هام' | 'عاجل جداً' | 'تعميم مالي';
  status: 'تم الاستلام والتنفيذ' | 'قيد المراجعة' | 'بانتظار الاعتماد' | 'مكتمل';
  created_at: string;
  assigned_officer: string;
}

const GROUP_COMPANIES = [
  { id: 'topaz', name: 'شركة توباز (Topaz Group)', icon: Award, color: '#0f6b6e' },
  { id: 'ruwad', name: 'دار الرواد (Dar Al-Ruwad)', icon: Building2, color: '#141414' },
  { id: 'saffir', name: 'السفير (Al-Saffir)', icon: Building2, color: '#535f74' },
  { id: 'masi', name: 'الماسي (Al-Masi Luxury)', icon: Sparkles, color: '#181c1c' },
  { id: 'ayal', name: 'الأيال للسفر والسياحة (Al-Ayal Travel)', icon: Plane, color: '#6f3b18' },
  { id: 'damas', name: 'مكتب داماس الإثيوبي (DAMAS Agency)', icon: Globe, color: '#059669' },
  { id: 'platinum', name: 'مكتب بلاتينيوم الفلبيني (PLATINUM Int\'l)', icon: Globe, color: '#2563EB' },
  { id: 'versatile', name: 'مكتب فيرساتيل الهندي (VERSATILE Ltd)', icon: Globe, color: '#141414' }
];

const MOCK_DISPATCHES: GroupDispatchMemo[] = [
  {
    id: 'd-1',
    dispatch_no: '#DISP-2026-0491',
    source_entity: 'شركة توباز (Topaz)',
    target_entity: 'الأيال للسفر والسياحة (Al-Ayal)',
    dispatch_type: 'حجز رحلات وسفر',
    subject: 'طلب اصدار تذاكر وصول لدفعة عمالة إثيوبية (12 عاملة)',
    details: 'يرجى إصدار وتأكيد حجوزات الطيران القادمة من أديس أبابا إلى مطار الرياض الملك خالد.',
    priority: 'عاجل جداً',
    status: 'تم الاستلام والتنفيذ',
    created_at: '2026-07-31 11:20',
    assigned_officer: 'خالد السليم (الأيال)'
  },
  {
    id: 'd-2',
    dispatch_no: '#DISP-2026-0492',
    source_entity: 'دار الرواد (Dar Al-Ruwad)',
    target_entity: 'السفير (Al-Saffir)',
    dispatch_type: 'خطاب تكليف رسمي',
    subject: 'تفويض استلام حافلات نقل الكوادر لمشاريع دار الرواد',
    details: 'المواكبة التشغيلية وتخصيص سائقين ونقل الكوادر من سكن الإيواء للمواقع.',
    priority: 'هام',
    status: 'قيد المراجعة',
    created_at: '2026-07-31 13:45',
    assigned_officer: 'فهد العتيبي'
  },
  {
    id: 'd-3',
    dispatch_no: '#DISP-2026-0493',
    source_entity: 'الماسي (Al-Masi)',
    target_entity: 'مكتب داماس الإثيوبي (DAMAS)',
    dispatch_type: 'طلب استقدام عاجل',
    subject: 'حجز ومقابلة 5 طهاة منازل وطباخين بريميوم',
    details: 'يشترط الخبرة السابقة بالخليج وإتقان اللغة والطهي المتقدم.',
    priority: 'عاجل جداً',
    status: 'بانتظار الاعتماد',
    created_at: '2026-07-31 14:10',
    assigned_officer: 'Mr. Solomon (DAMAS)'
  }
];

export const GroupDispatchPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const [dispatches, setDispatches] = useState<GroupDispatchMemo[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<GroupDispatchMemo | null>(null);

  useEffect(() => {
    realErpDataStore.getRecords<GroupDispatchMemo>('group_dispatches', MOCK_DISPATCHES).then(data => setDispatches(data));
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    source_entity: 'شركة توباز (Topaz Group)',
    target_entity: 'الأيال للسفر والسياحة (Al-Ayal Travel)',
    dispatch_type: 'حجز رحلات وسفر' as const,
    subject: '',
    details: '',
    priority: 'عاجل جداً' as const
  });

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.details) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى ملء كافة حقول المعاملة الرسمية.',
        type: 'warning',
      });
      return;
    }

    const newDisp: GroupDispatchMemo = {
      id: `d-${Date.now()}`,
      dispatch_no: `#DISP-2026-0${494 + dispatches.length}`,
      source_entity: formData.source_entity,
      target_entity: formData.target_entity,
      dispatch_type: formData.dispatch_type,
      subject: formData.subject,
      details: formData.details,
      priority: formData.priority,
      status: 'قيد المراجعة',
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
      assigned_officer: 'مدير المتابعة الموحدة'
    };

    const updated = await realErpDataStore.addRecord('group_dispatches', newDisp, MOCK_DISPATCHES);
    setDispatches(updated);
    addNotification({
      title: 'إرسال معاملة رسمية',
      message: `تم توجيه المعاملة (${newDisp.dispatch_no}) بنجاح إلى (${formData.target_entity}).`,
      type: 'success',
    });
    setShowDispatchModal(false);
    setFormData({
      source_entity: 'شركة توباز (Topaz Group)',
      target_entity: 'الأيال للسفر والسياحة (Al-Ayal Travel)',
      dispatch_type: 'حجز رحلات وسفر',
      subject: '',
      details: '',
      priority: 'عاجل جداً'
    });
  };

  const handlePrintMemo = (memo: GroupDispatchMemo) => {
    exportData('group_dispatch', [{
      'رقم المعاملة': memo.dispatch_no,
      'الجهة المرسلة': memo.source_entity,
      'الجهة المستلمة': memo.target_entity,
      'نوع الخطاب': memo.dispatch_type,
      'الموضوع': memo.subject,
      'التفاصيل': memo.details,
      'الأولوية': memo.priority,
      'الحالة': memo.status,
      'المسؤول': memo.assigned_officer,
      'التاريخ': memo.created_at
    }], 'print', `معاملة رسمية - ${memo.dispatch_no}`);
  };

  const filteredDispatches = dispatches.filter(d => {
    if (selectedEntity === 'all') return true;
    return d.source_entity.includes(selectedEntity) || d.target_entity.includes(selectedEntity);
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
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
          <div className="flex items-center gap-3">
            <BusinessIllustration type="travel-logistics" size="sm" />
            <div style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <Send className="w-5 h-5 text-[#141414]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  CENTRAL GROUP DISPATCH HUB
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>8 كيانات ومكاتب</span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                مركز التواصل والإرسال الموحد لشركات المجموعة والمكاتب الخارجية
              </h1>
              <p className="text-xs text-[#707070] mt-1 font-sans">
                مجموعة خالد السليم • توباز، دار الرواد، السفير، الماسي، الأيال للسفر والسياحة، والمكاتب الخارجية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="button-white-pill"
              onClick={() => setShowDispatchModal(true)}
              style={{ fontSize: '12px', padding: '6px 18px', minHeight: '38px' }}
            >
              <Plus className="w-4 h-4 ml-1 text-[#141414]" />
              <span>+ توجيه معاملة جديدة</span>
            </button>
            <ExportDropdown 
              sectionKey="group-dispatch" 
              data={filteredDispatches} 
              variant="outline-dark" 
              customTitle="تقرير توجيه المعاملات والمراسلات الإدارية" 
            />
          </div>
        </div>
      </div>

      {/* Group Companies Interactive Selector Grid */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        <button
          onClick={() => setSelectedEntity('all')}
          style={{
            padding: '6px 16px',
            borderRadius: '9999px',
            border: '1px solid',
            borderColor: selectedEntity === 'all' ? '#141414' : '#e4e4e7',
            backgroundColor: selectedEntity === 'all' ? '#141414' : '#ffffff',
            color: selectedEntity === 'all' ? '#ffffff' : '#27272a',
            fontWeight: selectedEntity === 'all' ? 550 : 420,
            fontSize: '12.5px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>جميع الشركات والمكاتب ({dispatches.length})</span>
        </button>

        {GROUP_COMPANIES.map(c => {
          const isSelected = selectedEntity.includes(c.id) || selectedEntity.includes(c.name.split(' ')[1]);
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedEntity(c.name.split(' ')[1] || c.id)}
              style={{
                padding: '6px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isSelected ? '#141414' : '#e4e4e7',
                backgroundColor: isSelected ? '#141414' : '#ffffff',
                color: isSelected ? '#ffffff' : '#27272a',
                fontWeight: isSelected ? 550 : 420,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{c.name}</span>
            </button>
          );
        })}
      </div>

      {/* Data Table */}
      <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
        <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#141414] flex items-center gap-2 m-0">
            <Send className="w-4 h-4 text-[#141414]" />
            <span>سجل المراسلات والمعاملات الرسمية بين شركات المجموعة</span>
          </h3>
          <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
            {filteredDispatches.length} معاملة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-zinc-700">
            <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3.5">رقم المعاملة</th>
                <th className="p-3.5">الجهة المُرسِلة والمُستلِمة</th>
                <th className="p-3.5">نوع الخطاب والموضوع</th>
                <th className="p-3.5">الأولوية</th>
                <th className="p-3.5">الحالة والمتابعة</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredDispatches.map(row => (
                <tr key={row.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-[#141414]">{row.dispatch_no}</td>
                  <td className="p-3.5">
                    <div className="font-bold text-[#141414]">من: {row.source_entity}</div>
                    <div className="text-[11px] text-[#707070]">إلى: {row.target_entity}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded-full text-[10px] font-bold inline-block mb-1">
                      {row.dispatch_type}
                    </span>
                    <div className="font-bold text-[#141414] text-xs">{row.subject}</div>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        row.priority === 'عاجل جداً'
                          ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                          : row.priority === 'هام'
                          ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                          : 'bg-zinc-100 text-zinc-800'
                      }`}
                    >
                      {row.priority}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        row.status === 'تم الاستلام والتنفيذ'
                          ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                          : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                      }`}
                    >
                      {row.status}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <CorporateAvatar name={row.assigned_officer} profession="سائق خاص" size="sm" />
                      <span className="text-[10px] text-[#707070] font-medium">المسؤول: {row.assigned_officer}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-[#707070] font-mono text-[11px]">{row.created_at}</td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="button-outline-on-light"
                        style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '24px' }}
                        onClick={() => setSelectedMemo(row)}
                      >
                        عرض الخطاب
                      </button>
                      <button
                        className="button-outline-on-light"
                        style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '24px' }}
                        onClick={() => handlePrintMemo(row)}
                      >
                        طباعة
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <Send className="w-4 h-4 text-[#141414]" />
                <span>توجيه خطاب / معاملة رسمية بين الشركات</span>
              </h3>
              <button onClick={() => setShowDispatchModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDispatch} className="p-6 space-y-4 bg-white text-[#141414]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الجهة المُرسِلة *</label>
                  <select
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                    value={formData.source_entity}
                    onChange={e => setFormData({ ...formData, source_entity: e.target.value })}
                  >
                    {GROUP_COMPANIES.map(c => <option key={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الجهة المُستلِمة *</label>
                  <select
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                    value={formData.target_entity}
                    onChange={e => setFormData({ ...formData, target_entity: e.target.value })}
                  >
                    {GROUP_COMPANIES.map(c => <option key={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">نوع الخطاب / المعاملة *</label>
                  <select
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                    value={formData.dispatch_type}
                    onChange={e => setFormData({ ...formData, dispatch_type: e.target.value as any })}
                  >
                    <option value="خطاب تكليف رسمي">خطاب تكليف رسمي</option>
                    <option value="طلب استقدام عاجل">طلب استقدام عاجل</option>
                    <option value="حجز رحلات وسفر">حجز رحلات وتذاكر طيران (الأيال)</option>
                    <option value="اعتماد مالي">اعتماد مصروف مالي</option>
                    <option value="توثيق جوازات">توثيق واستلام جوازات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">درجة الأولوية</label>
                  <select
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                  >
                    <option value="عادي">عادي</option>
                    <option value="هام">هام</option>
                    <option value="عاجل جداً">عاجل جداً</option>
                    <option value="تعميم مالي">تعميم مالي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">موضوع الخطاب / المعاملة *</label>
                <input
                  type="text"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  placeholder="مثال: طلب اصدار وتأكيد حجوزات طيران..."
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">تفاصيل ونص المعاملة *</label>
                <textarea
                  rows={4}
                  placeholder="اكتب التوجيهات والقرارات التفصيلية هنا..."
                  value={formData.details}
                  onChange={e => setFormData({ ...formData, details: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] leading-relaxed focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  className="button-outline-on-light"
                  style={{ padding: '6px 16px', fontSize: '13px', minHeight: '36px' }}
                  onClick={() => setShowDispatchModal(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ padding: '6px 20px', fontSize: '13px', minHeight: '36px' }}
                >
                  <Send className="w-3.5 h-3.5 ml-1" />
                  <span>اعتماد وإرسال المعاملة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Memo Details Modal */}
      {selectedMemo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#141414]" />
                <span>وثيقة الخطاب والمعاملة الرسمية {selectedMemo.dispatch_no}</span>
              </h3>
              <button onClick={() => setSelectedMemo(null)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-white text-[#141414]">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-100 text-xs">
                <div><strong>من:</strong> {selectedMemo.source_entity}</div>
                <div><strong>إلى:</strong> {selectedMemo.target_entity}</div>
                <div><strong>نوع الخطاب:</strong> {selectedMemo.dispatch_type}</div>
                <div><strong>التاريخ:</strong> {selectedMemo.created_at}</div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#141414] mb-1">الموضوع: {selectedMemo.subject}</h4>
                <p className="text-xs text-zinc-600 leading-relaxed bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                  {selectedMemo.details}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  className="button-outline-on-light"
                  style={{ padding: '6px 16px', fontSize: '13px', minHeight: '36px' }}
                  onClick={() => setSelectedMemo(null)}
                >
                  إغلاق
                </button>
                <button
                  className="button-primary-pill"
                  style={{ padding: '6px 20px', fontSize: '13px', minHeight: '36px' }}
                  onClick={() => {
                    handlePrintMemo(selectedMemo);
                    setSelectedMemo(null);
                  }}
                >
                  <Printer className="w-3.5 h-3.5 ml-1" />
                  <span>طباعة الوثيقة الرسمية</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDispatchPage;
