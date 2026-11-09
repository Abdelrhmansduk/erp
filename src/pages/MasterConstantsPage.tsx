import i18n from '../i18n/config';
import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { exportData } from '../services/exportService';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { 
  Sliders, Plus, FileSpreadsheet, FileText, Globe, UserCheck, 
  Moon, Star, Plane, Heart, GitCommit, Trash2, X, Check, Search
} from 'lucide-react';

interface ConstantItem {
  id: string;
  title: string;
  code?: string;
  subtext?: string;
  status: 'نشط' | 'معطل';
  icon?: string;
}

const INITIAL_NATIONALITIES: ConstantItem[] = [
  { id: '1', title: 'إثيوبيا', code: 'ETH', subtext: 'متاحة للاستقدام والتأجير', status: 'نشط', icon: '🇪🇹' },
  { id: '2', title: 'الفلبين', code: 'PHL', subtext: 'متاحة للاستقدام والتأجير', status: 'نشط', icon: '🇵🇭' },
  { id: '3', title: 'الهند', code: 'IND', subtext: 'متاحة للاستقدام', status: 'نشط', icon: '🇮🇳' },
  { id: '4', title: 'أوغندا', code: 'UGA', subtext: 'متاحة للاستقدام والتأجير', status: 'نشط', icon: '🇺🇬' },
  { id: '5', title: 'بنغلاديش', code: 'BGD', subtext: 'متاحة للاستقدام', status: 'نشط', icon: '🇧🇩' },
  { id: '6', title: 'كينيا', code: 'KEN', subtext: 'متاحة للاستقدام والتأجير', status: 'نشط', icon: '🇰🇪' },
  { id: '7', title: 'سيريلانكا', code: 'LKA', subtext: 'متاحة للاستقدام', status: 'نشط', icon: '🇱🇰' },
  { id: '8', title: 'ألبانيا', code: 'ALB', subtext: 'متاحة للاستقدام والتنازل', status: 'نشط', icon: '🇦🇱' },
];

const INITIAL_PROFESSIONS: ConstantItem[] = [
  { id: 'p1', title: 'عاملة منزلية', code: 'DOMESTIC', subtext: 'عمالة منزلية أفراد', status: 'نشط' },
  { id: 'p2', title: 'سائق خاص', code: 'DRIVER', subtext: 'عمالة منزلية أفراد', status: 'نشط' },
  { id: 'p3', title: 'طباخ منزلي / طباخة', code: 'COOK', subtext: 'عمالة منزلية أفراد', status: 'نشط' },
  { id: 'p4', title: 'مربية أطفال', code: 'NANNY', subtext: 'رعاية أطفال', status: 'نشط' },
  { id: 'p5', title: 'ممرض منزلي / ممرضة', code: 'NURSE', subtext: 'رعاية طبية', status: 'نشط' },
  { id: 'p6', title: 'حارس منزلي', code: 'GUARD', subtext: 'أمن وحراسة', status: 'نشط' },
  { id: 'p7', title: 'عامل مهني', code: 'PROFESSIONAL', subtext: 'عمالة مهنية مؤسسات', status: 'نشط' },
];

const INITIAL_RELIGIONS: ConstantItem[] = [
  { id: 'r1', title: 'الإسلام', code: 'MUSLIM', subtext: 'مسلم / مسلمة', status: 'نشط' },
  { id: 'r2', title: 'المسيحية', code: 'CHRISTIAN', subtext: 'مسيحي / مسيحية', status: 'نشط' },
  { id: 'r3', title: 'أخرى / غير محدد', code: 'OTHER', subtext: 'ديانات أخرى', status: 'نشط' },
];

const INITIAL_SKILLS: ConstantItem[] = [
  { id: 's1', title: 'رعاية الأطفال والرضع', code: 'CHILD_CARE', subtext: 'خبرة متقدمة', status: 'نشط' },
  { id: 's2', title: 'رعاية كبار السن وذوي الاحتياجات', code: 'ELDER_CARE', subtext: 'مهارة معتمدة', status: 'نشط' },
  { id: 's3', title: 'الطبخ الخليجي والعربي', code: 'COOKING_ARABIC', subtext: 'إجادة الأكلات الشعبية', status: 'نشط' },
  { id: 's4', title: 'التنظيف والترتيب الفندقي', code: 'CLEANING', subtext: 'إتقان عالي', status: 'نشط' },
  { id: 's5', title: 'الغسيل وكي الملابس الدقيقة', code: 'LAUNDRY', subtext: 'إتقان', status: 'نشط' },
  { id: 's6', title: 'التحدث باللغة العربية', code: 'ARABIC_LANG', subtext: 'مستوى جيد فما فوق', status: 'نشط' },
  { id: 's7', title: 'التحدث باللغة الإنجليزية', code: 'ENGLISH_LANG', subtext: 'مستوى محادثة', status: 'نشط' },
  { id: 's8', title: 'قيادة السيارات (رخصة سارية)', code: 'DRIVING', subtext: 'رخصة سعودية / دولية', status: 'نشط' },
];

const INITIAL_AIRPORTS: ConstantItem[] = [
  { id: 'a1', title: 'مطار الملك خالد الدولي (RUH)', code: 'RUH', subtext: 'السعودية - الرياض', status: 'نشط' },
  { id: 'a2', title: 'مطار الملك عبدالعزيز الدولي (JED)', code: 'JED', subtext: 'السعودية - جدة', status: 'نشط' },
  { id: 'a3', title: 'مطار الملك فهد الدولي (DMM)', code: 'DMM', subtext: 'السعودية - الدمام', status: 'نشط' },
  { id: 'a4', title: 'مطار الأمير محمد بن عبدالعزيز (MED)', code: 'MED', subtext: 'السعودية - المدينة المنورة', status: 'نشط' },
  { id: 'a5', title: 'مطار أبها الإقليمي (AHB)', code: 'AHB', subtext: 'السعودية - أبها / خميس مشيط', status: 'نشط' },
  { id: 'a6', title: 'مطار نينوي أكينو الدولي - مانيلا (MNL)', code: 'MNL', subtext: 'الفلبين - مانيلا', status: 'نشط' },
  { id: 'a7', title: 'مطار بولي الدولي - أديس أبابا (ADD)', code: 'ADD', subtext: 'إثيوبيا - أديس أبابا', status: 'نشط' },
  { id: 'a8', title: 'مطار باندارانايكي - كولمبو (CMB)', code: 'CMB', subtext: 'سريلانكا - كولمبو', status: 'نشط' },
  { id: 'a9', title: 'مطار جومو كينياتا - نيروبي (NBO)', code: 'NBO', subtext: 'كينيا - نيروبي', status: 'نشط' },
  { id: 'a10', title: 'مطار عنتيبي الدولي (EBB)', code: 'EBB', subtext: 'أوغندا - كامبالا', status: 'نشط' },
  { id: 'a11', title: 'مطار حضرة شاه جلال - دكا (DAC)', code: 'DAC', subtext: 'بنغلاديش - دكا', status: 'نشط' },
];

const INITIAL_SOCIAL_STATUSES: ConstantItem[] = [
  { id: 'soc1', title: 'عزباء / أعزب', code: 'SINGLE', subtext: 'غير متزوج/ة', status: 'نشط' },
  { id: 'soc2', title: 'متزوجة / متزوج', code: 'MARRIED', subtext: 'لديه/ا عائلة', status: 'نشط' },
  { id: 'soc3', title: 'مطلقة / مطلق', code: 'DIVORCED', subtext: 'منفصل/ة', status: 'نشط' },
  { id: 'soc4', title: 'أرملة / أرمل', code: 'WIDOWED', subtext: 'أرمل/ة', status: 'نشط' },
];

const INITIAL_STAGES: ConstantItem[] = [
  { id: 'stg1', title: 'عقود جديدة (بانتظار مساند)', code: 'NEW', subtext: 'المرحلة 1', status: 'نشط' },
  { id: 'stg2', title: 'توثيق مساند والتفويض الإلكتروني', code: 'MUSANED', subtext: 'المرحلة 2', status: 'نشط' },
  { id: 'stg3', title: 'حجز تساهيل والفحص الطبي الخارجي', code: 'MEDICAL_EXT', subtext: 'المرحلة 3', status: 'نشط' },
  { id: 'stg4', title: 'إصدار التأشيرة والتفييز بالسفارة', code: 'VISA_ISSUED', subtext: 'المرحلة 4', status: 'نشط' },
  { id: 'stg5', title: 'تصريح العمل وتذكرة الطيران', code: 'TICKET_BOOKED', subtext: 'المرحلة 5', status: 'نشط' },
  { id: 'stg6', title: 'الوصول للمملكة والفحص الطبي الداخلي', code: 'ARRIVED_KSA', subtext: 'المرحلة 6', status: 'نشط' },
  { id: 'stg7', title: 'التسليم النهائي وبدء فترة الضمان', code: 'DELIVERED', subtext: 'المرحلة 7', status: 'نشط' },
];

export const MasterConstantsPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const [activeTab, setActiveTab] = useState<
    'nationalities' | 'professions' | 'religions' | 'skills' | 'airports' | 'social_statuses' | 'stages'
  >('nationalities');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [nationalities, setNationalities] = useState<ConstantItem[]>(INITIAL_NATIONALITIES);
  const [professions, setProfessions] = useState<ConstantItem[]>(INITIAL_PROFESSIONS);
  const [religions, setReligions] = useState<ConstantItem[]>(INITIAL_RELIGIONS);
  const [skills, setSkills] = useState<ConstantItem[]>(INITIAL_SKILLS);
  const [airports, setAirports] = useState<ConstantItem[]>(INITIAL_AIRPORTS);
  const [socialStatuses, setSocialStatuses] = useState<ConstantItem[]>(INITIAL_SOCIAL_STATUSES);
  const [stages, setStages] = useState<ConstantItem[]>(INITIAL_STAGES);

  useEffect(() => {
    realErpDataStore.getRecords<ConstantItem>('constants_nationalities', INITIAL_NATIONALITIES).then(d => setNationalities(d));
    realErpDataStore.getRecords<ConstantItem>('constants_professions', INITIAL_PROFESSIONS).then(d => setProfessions(d));
    realErpDataStore.getRecords<ConstantItem>('constants_religions', INITIAL_RELIGIONS).then(d => setReligions(d));
    realErpDataStore.getRecords<ConstantItem>('constants_skills', INITIAL_SKILLS).then(d => setSkills(d));
    realErpDataStore.getRecords<ConstantItem>('constants_airports', INITIAL_AIRPORTS).then(d => setAirports(d));
    realErpDataStore.getRecords<ConstantItem>('constants_social_statuses', INITIAL_SOCIAL_STATUSES).then(d => setSocialStatuses(d));
    realErpDataStore.getRecords<ConstantItem>('constants_stages', INITIAL_STAGES).then(d => setStages(d));
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const newItem: ConstantItem = {
      id: `item-${Date.now()}`,
      title: newTitle,
      code: newCode || 'CUSTOM',
      status: 'نشط',
    };

    const storeKey = `constants_${activeTab}`;
    let currentList: ConstantItem[] = [];

    if (activeTab === 'nationalities') { currentList = [...nationalities, newItem]; setNationalities(currentList); }
    if (activeTab === 'professions') { currentList = [...professions, newItem]; setProfessions(currentList); }
    if (activeTab === 'religions') { currentList = [...religions, newItem]; setReligions(currentList); }
    if (activeTab === 'skills') { currentList = [...skills, newItem]; setSkills(currentList); }
    if (activeTab === 'airports') { currentList = [...airports, newItem]; setAirports(currentList); }
    if (activeTab === 'social_statuses') { currentList = [...socialStatuses, newItem]; setSocialStatuses(currentList); }
    if (activeTab === 'stages') { currentList = [...stages, newItem]; setStages(currentList); }

    await realErpDataStore.addRecord(storeKey, newItem);

    addNotification({
      title: 'إضافة بند ثوابت جديد',
      message: `تمت إضافة (${newTitle}) إلى ثوابت النظام بنجاح.`,
      type: 'success',
    });

    setNewTitle('');
    setNewCode('');
    setShowAddModal(false);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا البند من الثوابت؟')) return;
    const storeKey = `constants_${activeTab}`;

    if (activeTab === 'nationalities') setNationalities(nationalities.filter(i => i.id !== id));
    if (activeTab === 'professions') setProfessions(professions.filter(i => i.id !== id));
    if (activeTab === 'religions') setReligions(religions.filter(i => i.id !== id));
    if (activeTab === 'skills') setSkills(skills.filter(i => i.id !== id));
    if (activeTab === 'airports') setAirports(airports.filter(i => i.id !== id));
    if (activeTab === 'social_statuses') setSocialStatuses(socialStatuses.filter(i => i.id !== id));
    if (activeTab === 'stages') setStages(stages.filter(i => i.id !== id));

    await realErpDataStore.deleteRecord(storeKey, id);

    addNotification({
      title: 'حذف البند',
      message: 'تم حذف البند من قائمة الثوابت بنجاح.',
      type: 'error',
    });
  };

  const handleToggleStatus = async (id: string) => {
    const toggle = (list: ConstantItem[]) =>
      list.map(i => i.id === id ? { ...i, status: (i.status === 'نشط' ? 'معطل' : 'نشط') as any } : i);

    const storeKey = `constants_${activeTab}`;
    let targetItem: ConstantItem | undefined;

    if (activeTab === 'nationalities') { const u = toggle(nationalities); setNationalities(u); targetItem = u.find(i => i.id === id); }
    if (activeTab === 'professions') { const u = toggle(professions); setProfessions(u); targetItem = u.find(i => i.id === id); }
    if (activeTab === 'religions') { const u = toggle(religions); setReligions(u); targetItem = u.find(i => i.id === id); }
    if (activeTab === 'skills') { const u = toggle(skills); setSkills(u); targetItem = u.find(i => i.id === id); }
    if (activeTab === 'airports') { const u = toggle(airports); setAirports(u); targetItem = u.find(i => i.id === id); }
    if (activeTab === 'social_statuses') { const u = toggle(socialStatuses); setSocialStatuses(u); targetItem = u.find(i => i.id === id); }
    if (activeTab === 'stages') { const u = toggle(stages); setStages(u); targetItem = u.find(i => i.id === id); }

    if (targetItem) {
      await realErpDataStore.updateRecord<ConstantItem>(storeKey, id, { status: targetItem.status });
      addNotification({
        title: 'تحديث حالة البند',
        message: `تم تغيير حالة (${targetItem.title}) إلى (${targetItem.status}).`,
        type: 'info',
      });
    }
  };

  const getActiveList = () => {
    let list: ConstantItem[] = [];
    switch (activeTab) {
      case 'nationalities': list = nationalities; break;
      case 'professions': list = professions; break;
      case 'religions': list = religions; break;
      case 'skills': list = skills; break;
      case 'airports': list = airports; break;
      case 'social_statuses': list = socialStatuses; break;
      case 'stages': list = stages; break;
    }
    if (!searchTerm) return list;
    return list.filter(i => i.title.toLowerCase().includes(searchTerm.toLowerCase()) || i.code?.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  const activeList = getActiveList();

  return (
    <div className="space-y-6">
      {/* Header */}
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
              <BusinessIllustration type="master-constants" size="sm" showBackground={true} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>{i18n.t("exec.masterConstants", "الثوابت والبيانات الأساسية")}</span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>القاموس والمحددات الشاملة</span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                ثوابت وإعدادات الاستقدام والتشغيل
              </h1>
              <p className="text-xs text-[#707070] mt-1 font-sans">
                إدارة الجنسيات والدول، المهن المعتمدة، الأديان، المهارات، المطارات، الحالات الاجتماعية، ومراحل العقود
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 bg-[#f3f3f3] border border-[#e0e0e0] rounded-full px-3 py-1">
              <CorporateAvatar
                departmentId="executive"
                name="أمين حوكمة الثوابت"
                role="Data Governance Lead"
                size="sm"
                status="verified"
              />
              <div className="text-right">
                <div className="text-[11px] font-bold text-[#141414]">حوكمة القاموس الموحد</div>
                <div className="text-[9.5px] text-[#141414]">معتمد عبر الشركات الخمس</div>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="button-white-pill"
              style={{ fontSize: '12px', padding: '6px 18px', minHeight: '38px' }}
            >
              <Plus className="w-4 h-4 ml-1 text-[#141414]" />
              <span>+ إضافة بند جديد</span>
            </button>
            <ExportDropdown
              sectionKey={`master_constants_${activeTab}`}
              data={activeList}
              customTitle={`ثوابت ومحددات النظام (${activeTab}) - مجموعة السليم`}
              variant="outline-dark"
            />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { id: 'nationalities', label: `الجنسيات (${nationalities.length})`, icon: Globe },
          { id: 'professions', label: `المهن (${professions.length})`, icon: UserCheck },
          { id: 'religions', label: `الأديان (${religions.length})`, icon: Moon },
          { id: 'skills', label: `المهارات (${skills.length})`, icon: Star },
          { id: 'airports', label: `المطارات (${airports.length})`, icon: Plane },
          { id: 'social_statuses', label: `الحالات الاجتماعية (${socialStatuses.length})`, icon: Heart },
          { id: 'stages', label: `مراحل العقود (${stages.length})`, icon: GitCommit },
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

      {/* Search Input */}
      <div className="max-w-xs">
        <input
          type="text"
          aria-label="بحث سريع في القائمة الحالية"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="بحث سريع في القائمة الحالية..."
          className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-4 text-xs text-[#141414] focus:outline-none focus:border-[#141414]"
        />
      </div>

      {/* Constants Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {activeList.map((item) => (
          <div
            key={item.id}
            className={`p-4 bg-white rounded-2xl border border-zinc-200 flex items-center justify-between transition-opacity ${item.status === 'معطل' ? 'opacity-50' : 'opacity-100'}`}
          >
            <div className="flex items-center gap-3">
              {item.icon ? (
                <span className="text-2xl">{item.icon}</span>
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#141414] text-white flex items-center justify-center text-xs font-bold">
                  <Check className="w-4 h-4" />
                </div>
              )}
              <div>
                <h2 className="text-xs font-bold text-[#141414] m-0">{item.title}</h2>
                {item.subtext && <p className="text-[11px] text-[#707070] m-0 mt-0.5">{item.subtext}</p>}
                {item.code && (
                  <span className="text-[10px] text-[#707070] font-mono block mt-0.5">
                    كود: {item.code}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleStatus(item.id)}
                className="cursor-pointer"
              >
                <Badge text={item.status} type={item.status === 'نشط' ? 'success' : 'danger'} />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteItem(item.id)}
                className="p-1 rounded-full text-[#707070] hover:text-[#141414] transition-colors"
                title="حذف"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#141414]" />
                <span>إضافة بند جديد في القاموس</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-6 space-y-4 bg-white text-[#141414]">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم البند / العنوان *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: إندونيسيا، رعاية صحية، مطار دبي"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">الكود الإنجليزي / الرمز (اختياري)</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="مثال: IDN, HEALTH_CARE, DXB"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="button-outline-on-light"
                  style={{ padding: '6px 16px', fontSize: '13px', minHeight: '36px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ padding: '6px 20px', fontSize: '13px', minHeight: '36px' }}
                >
                  <Check className="w-4 h-4 ml-1" />
                  <span>حفظ البند</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterConstantsPage;
