import i18n from '../i18n/config';
import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { realErpDataStore } from '../services/realErpDataStore';
import { Mail, Plus, FileSpreadsheet, FileText, Inbox, PenSquare, Eye, Paperclip, Printer, Check, ShieldCheck } from 'lucide-react';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

export interface UnifiedCorrespondence {
  id: string;
  memo_no: string;
  sender_entity: string;
  recipient_entity: string;
  subject: string;
  category: 'خطاب رسمي' | 'تعميم إداري' | 'طلب نقل كفالة' | 'تسوية مالية' | 'طلب استقدام دولي';
  priority: 'عاجل جداً' | 'سري وهام' | 'عادي';
  body: string;
  status: 'معتمد وموجه' | 'قيد المراجعة' | 'مؤرشف';
  attachment_name?: string;
  created_at: string;
  approved_by?: string;
}

const MOCK_CORRESPONDENCE: UnifiedCorrespondence[] = [
  {
    id: 'MEMO-101',
    memo_no: 'SAF-ADM-2026-081',
    sender_entity: 'شركة السفير الماسي للاستقدام',
    recipient_entity: 'وكالة مانيلا الدولية (الفلبين)',
    subject: 'طلب تفييز عاجل لـ 15 عقد استقدام مساند خاص بفرع الرياض',
    category: 'طلب استقدام دولي',
    priority: 'عاجل جداً',
    body: 'نحيطكم علماً بصدور تأشيرات العمل لـ 15 عاملة منزلية، يرجى التكرم بحجز تذاكر الطيران على الخطوط السعودية وإشعارنا برقم الرحلة قبل نهاية الأسبوع.',
    status: 'معتمد وموجه',
    attachment_name: 'قائمة_تأشيرات_الرياض_مساند.pdf',
    created_at: '2026-08-17 11:30',
    approved_by: 'خالد السليم (الرئيس التنفيذي)'
  },
  {
    id: 'MEMO-102',
    memo_no: 'YAQ-HR-2026-042',
    sender_entity: 'شركة ياقوت نجد (جدة)',
    recipient_entity: 'شركة توباز للاستقدام (الدمام)',
    subject: 'طلب تحويل 5 سير ذاتية لسائقين مهنيين لفرع الشرقية',
    category: 'طلب نقل كفالة',
    priority: 'عادي',
    body: 'نظراً لاكتفاء فرع جدة من طلبات السائقين المهنيين ووجود طلبات شاغرة بفرع الدمام، نرجو الموافقة على تحويل السير المرفقة للمتابعة.',
    status: 'معتمد وموجه',
    attachment_name: 'سير_السائقين_المهنيين.pdf',
    created_at: '2026-08-17 10:15',
    approved_by: 'عبدالرحمن العتيبي (مدير العمليات)'
  },
  {
    id: 'MEMO-103',
    memo_no: 'GRP-FIN-2026-019',
    sender_entity: 'الإدارة المركزية للمجموعة (Al-Sulaim HQ)',
    recipient_entity: 'كافة شركات وفروع المجموعة (الرياض، جدة، الدمام)',
    subject: 'تعميم إداري: اعتماد نموذج الفوترة الإلكترونية ZATCA Phase 2',
    category: 'تعميم إداري',
    priority: 'سري وهام',
    body: 'التزاماً بتعليمات هيئة الزكاة والضريبة والجمارك، يمنع إصدار أي فاتورة يدوية ويجب تصدير كافة الفواتير حصرياً عبر محرك ZATCA المعتمد في المنظومة.',
    status: 'معتمد وموجه',
    attachment_name: 'دليل_الفوترة_المرحلة_الثانية.pdf',
    created_at: '2026-08-16 09:00',
    approved_by: 'الإدارة المالية العليا'
  },
  {
    id: 'MEMO-104',
    memo_no: 'DAR-OPS-2026-008',
    sender_entity: 'شركة دار الرواد للمقاولات والتشغيل',
    recipient_entity: 'قسم الإيواء والرعاية الموحد',
    subject: 'طلب تجهيز سكن وإعاشة لـ 20 عاملاً لقطاع الضيافة',
    category: 'خطاب رسمي',
    priority: 'عاجل جداً',
    body: 'يرجى ترتيب الوجبات الغذائية وتخصيص غرف الإيواء بمركز الرمال استعداداً لانطلاق العقد التشغيلي ابتداءً من الأسبوع القادم.',
    status: 'قيد المراجعة',
    attachment_name: 'جدول_الكوادر_التشغيلية.pdf',
    created_at: '2026-08-15 14:20'
  }
];

export const UnifiedCommunicationCenterPage: React.FC = () => {
  const [correspondenceList, setCorrespondenceList] = useState<UnifiedCorrespondence[]>([]);
  const [activeTab, setActiveTab] = useState<'inbox' | 'compose' | 'letterhead-preview'>('inbox');
  const [selectedMemo, setSelectedMemo] = useState<UnifiedCorrespondence | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('الكل');

  // New Memo State
  const [formData, setFormData] = useState({
    sender_entity: 'مجموعة شركات خالد السليم القابضة',
    recipient_entity: '',
    subject: '',
    category: 'خطاب رسمي' as const,
    priority: 'عادي' as const,
    body: '',
    attachment_name: ''
  });

  useEffect(() => {
    realErpDataStore.getRecords<UnifiedCorrespondence>('unified_correspondence', MOCK_CORRESPONDENCE).then(data => {
      setCorrespondenceList(data);
      if (data.length > 0) setSelectedMemo(data[0]);
    });
  }, []);

  const handleCreateMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    const newMemo: UnifiedCorrespondence = {
      id: `MEMO-${Date.now().toString().slice(-3)}`,
      memo_no: `GRP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      sender_entity: formData.sender_entity,
      recipient_entity: formData.recipient_entity,
      subject: formData.subject,
      category: formData.category,
      priority: formData.priority,
      body: formData.body,
      status: 'معتمد وموجه',
      attachment_name: formData.attachment_name || undefined,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
      approved_by: 'خالد السليم (الرئيس التنفيذي)'
    };

    const updated = await realErpDataStore.addRecord<UnifiedCorrespondence>('unified_correspondence', newMemo, MOCK_CORRESPONDENCE);
    setCorrespondenceList(updated);
    setSelectedMemo(newMemo);
    setActiveTab('inbox');
  };

  const categories = ['الكل', 'خطاب رسمي', 'تعميم إداري', 'طلب نقل كفالة', 'تسوية مالية', 'طلب استقدام دولي'];

  const filteredList = correspondenceList.filter(m => {
    if (filterCategory !== 'الكل' && m.category !== filterCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#141414',
          color: '#FFF',
          padding: '28px',
          borderRadius: '16px',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="flex items-center gap-4">
          <BusinessIllustration type="unified-comm" size="sm" showBackground={false} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>INTER-COMPANY CORRESPONDENCE</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, margin: '0', letterSpacing: '-0.02em', color: '#ffffff', fontFamily: 'var(--font-family-display)' }}>
              مركز التواصل والمراسلات الموحد للمجموعة
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa', fontWeight: 420 }}>
              إصدار وتوثيق الخطابات الرسمية بين الشركات، التعميمات التنفيذية، والتوجيهات للمكاتب الخارجية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('compose')}
            className="button-white-pill"
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>+ تحرير خطاب رسمي جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>إجمالي الخطابات والتعميمات</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>{correspondenceList.length} مراسلة</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>موثقة إلكترونياً</span>
        </div>

        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#141414', fontWeight: 550 }}>المراسلات العاجلة</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>2 خطابات</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>إجراء فوري</span>
        </div>

        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#141414', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>التوجيهات للمكاتب الدولية</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>18 توجيهاً</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>الفلبين، إثيوبيا</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>نسبة الاعتماد والتنفيذ</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>98.5%</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>حوكمة متكاملة</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { id: 'inbox', label: `وارد وصادر المراسلات (${correspondenceList.length})`, icon: Inbox },
          { id: 'compose', label: 'منشئ الخطابات والتعميمات', icon: PenSquare },
          ...(selectedMemo ? [{ id: 'letterhead-preview', label: 'معاينة الخطاب الرسمي المطبوع', icon: Eye }] : []),
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
                whiteSpace: 'nowrap',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: INBOX & TIMELINE */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setFilterCategory(c)}
                  className={filterCategory === c ? 'button-primary-pill' : 'button-outline-on-light'}
                  style={{ padding: '4px 14px', fontSize: '11.5px', minHeight: '30px' }}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button className="button-outline-on-light" onClick={() => exportData('unified_correspondence', filteredList, 'excel')} style={{ padding: '5px 12px', fontSize: '12px', minHeight: '32px' }}>
                <FileSpreadsheet className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                <span>{i18n.t("export.excel", "Excel")}</span>
              </button>
              <button className="button-outline-on-light" onClick={() => exportData('unified_correspondence', filteredList, 'pdf')} style={{ padding: '5px 12px', fontSize: '12px', minHeight: '32px' }}>
                <FileText className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {filteredList.length === 0 ? (
            <div className="card-pricing flex flex-col items-center justify-center py-12 text-center" style={{ borderRadius: '16px', background: '#ffffff' }}>
              <BusinessIllustration type="empty-search" size="md" />
              <div className="text-sm font-bold text-zinc-600 mt-3">لا توجد مراسلات أو خطابات مطابقة للتصنيف</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredList.map(memo => (
                <div
                  key={memo.id}
                  className="card-pricing flex flex-col justify-between"
                  style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono font-bold text-xs text-[#141414]">{memo.memo_no}</span>
                      <Badge
                        text={memo.priority}
                        type={memo.priority === 'عاجل جداً' ? 'danger' : memo.priority === 'سري وهام' ? 'warning' : 'info'}
                      />
                    </div>

                    <h2 className="text-sm font-bold text-[#141414] mb-2">{memo.subject}</h2>

                    <div className="bg-zinc-50 p-2.5 rounded-xl text-xs text-zinc-600 mb-3 flex items-center gap-2.5">
                      <CorporateAvatar name={memo.sender_entity} role={memo.recipient_entity} size="sm" status="verified" />
                      <div className="space-y-0.5">
                        <div><strong>الجهة المصدرة:</strong> {memo.sender_entity}</div>
                        <div><strong>الجهة المستلمة:</strong> {memo.recipient_entity}</div>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-700 leading-relaxed mb-3">
                      {memo.body}
                    </p>

                    {memo.attachment_name && (
                      <div className="flex items-center gap-1 text-xs text-[#141414] font-semibold mb-3">
                        <Paperclip className="w-3.5 h-3.5 text-[#707070]" />
                        <span>مرفق: {memo.attachment_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-zinc-100 text-xs">
                    <span className="text-[#707070] font-mono">{memo.created_at}</span>
                    <button
                      className="button-outline-on-light"
                      style={{ padding: '3px 12px', fontSize: '11.5px', minHeight: '26px' }}
                      onClick={() => {
                        setSelectedMemo(memo);
                        setActiveTab('letterhead-preview');
                      }}
                    >
                      <Eye className="w-3 h-3 ml-1" />
                      <span>فتح الخطاب الرسمي</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMPOSE MEMO */}
      {activeTab === 'compose' && (
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
          <h2 className="text-base font-bold text-[#141414] mb-4 flex items-center gap-2">
            <PenSquare className="w-4 h-4 text-[#141414]" />
            <span>تحرير خطاب رسمي أو تعميم تنفيذي</span>
          </h2>

          <form onSubmit={handleCreateMemo} className="space-y-4 bg-white text-[#141414]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">الجهة المصدرة للخطاب *</label>
                <input
                  type="text"
                  value={formData.sender_entity}
                  onChange={(e) => setFormData({ ...formData, sender_entity: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">الجهة أو الشخص المستلم *</label>
                <input
                  type="text"
                  placeholder="مثال: شركة توباز للاستقدام / وكالة مانيلا"
                  value={formData.recipient_entity}
                  onChange={(e) => setFormData({ ...formData, recipient_entity: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">تصنيف المراسلة</label>
                <select
                  value={formData.category}
                  onChange={(e: any) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option value="خطاب رسمي">خطاب رسمي</option>
                  <option value="تعميم إداري">تعميم إداري</option>
                  <option value="طلب نقل كفالة">طلب نقل كفالة</option>
                  <option value="تسوية مالية">تسوية مالية</option>
                  <option value="طلب استقدام دولي">طلب استقدام دولي</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">مستوى الأهمية والسرية</label>
                <select
                  value={formData.priority}
                  onChange={(e: any) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option value="عادي">عادي</option>
                  <option value="عاجل جداً">عاجل جداً</option>
                  <option value="سري وهام">سري وهام</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">موضوع الخطاب *</label>
              <input
                type="text"
                placeholder="اكتب عنوان وموضوع الخطاب..."
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">نص الخطاب / التوجيه الإداري *</label>
              <textarea
                rows={5}
                placeholder="اكتب نص الخطاب هنا بالتفصيل..."
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] leading-relaxed focus:border-[#141414] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم الملف المرفق (اختياري)</label>
              <input
                type="text"
                placeholder="مثال: ملحق_العقود_المعتمدة.pdf"
                value={formData.attachment_name}
                onChange={(e) => setFormData({ ...formData, attachment_name: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setActiveTab('inbox')}
                className="button-outline-on-light"
                style={{ padding: '6px 18px', fontSize: '13px', minHeight: '36px' }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="button-primary-pill"
                style={{ padding: '6px 22px', fontSize: '13px', minHeight: '36px' }}
              >
                <Check className="w-4 h-4 ml-1" />
                <span>اعتماد وإصدار الخطاب الرسمي</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: LETTERHEAD PREVIEW */}
      {activeTab === 'letterhead-preview' && selectedMemo && (
        <div className="bg-white rounded-3xl border border-zinc-200 p-8 max-w-3xl mx-auto shadow-sm">
          {/* Header of Letter */}
          <div className="flex justify-between items-center border-b-2 border-[#141414] pb-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-[#141414] m-0">مجموعة شركات خالد السليم للاستقدام والتشغيل</h2>
              <div className="text-xs text-[#707070] mt-0.5">المملكة العربية السعودية | المركز الرئيسي - الرياض</div>
            </div>
            <div className="text-left font-mono text-xs text-zinc-600">
              <div><strong>الرقم الإشاري:</strong> {selectedMemo.memo_no}</div>
              <div><strong>التاريخ:</strong> {selectedMemo.created_at}</div>
              <div><strong>التصنيف:</strong> {selectedMemo.category}</div>
            </div>
          </div>

          {/* Memo Title & Recipient */}
          <div className="mb-5">
            <div className="text-sm font-bold text-[#141414]">
              السادة / {selectedMemo.recipient_entity} المحترمون
            </div>
            <div className="text-xs text-[#707070] mt-1">
              السلام عليكم ورحمة الله وبركاته،،
            </div>
          </div>

          <div className="bg-zinc-50 p-3 rounded-2xl text-xs font-bold text-[#141414] mb-5 border border-zinc-200">
            الموضوع: {selectedMemo.subject}
          </div>

          {/* Memo Body */}
          <div className="text-xs text-zinc-800 leading-relaxed min-h-[140px] whitespace-pre-wrap">
            {selectedMemo.body}
          </div>

          {/* Signatures & Seal */}
          <div className="flex justify-between items-end mt-10 border-t border-zinc-200 pt-5">
            <div>
              <div className="text-xs text-[#707070]">الختم والتصديق الرقمي:</div>
              <div className="inline-flex items-center gap-1.5 bg-[#f3f3f3] text-[#141414] px-3 py-1 rounded-full text-xs font-bold mt-1 border border-[#e0e0e0]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#141414]" />
                <span>موثق إلكترونياً (ALSULAIM VERIFIED)</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <CorporateAvatar name={selectedMemo.approved_by || 'الإدارة التنفيذية للمجموعة'} size="sm" status="verified" />
              <div className="text-right">
                <div className="text-xs text-[#707070]">المعتمد:</div>
                <div className="text-sm font-bold text-[#141414] mt-0.5">{selectedMemo.approved_by || 'الإدارة التنفيذية للمجموعة'}</div>
              </div>
            </div>
          </div>

          {/* Print/Download Bar */}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-zinc-100">
            <button
              className="button-outline-on-light"
              onClick={() => window.print()}
              style={{ padding: '6px 16px', fontSize: '12.5px', minHeight: '34px' }}
            >
              <Printer className="w-3.5 h-3.5 ml-1" />
              <span>طباعة الخطاب</span>
            </button>
            <button
              className="button-primary-pill"
              onClick={() => exportData('unified_correspondence', [selectedMemo], 'pdf')}
              style={{ padding: '6px 18px', fontSize: '12.5px', minHeight: '34px' }}
            >
              <FileText className="w-3.5 h-3.5 ml-1" />
              <span>تحميل PDF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedCommunicationCenterPage;
