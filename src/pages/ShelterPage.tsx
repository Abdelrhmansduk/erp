import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { useShelterRecords, useTableMutation } from '../hooks/queries/useErpQueries';
import { useCompany } from '../contexts/CompanyContext';
import { useAppStore } from '../stores/appStore';
import { realErpDataStore } from '../services/realErpDataStore';
import { Hotel, Plus, FileSpreadsheet, FileText, Search, Utensils, X, Trash2, Bed, CheckCircle2 } from 'lucide-react';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

export interface ShelterRecordItem {
  id: string;
  company_id: string;
  maid_name: string;
  nationality: string;
  passport: string;
  client_name?: string;
  contract_ref?: string;
  shelter_location: string;
  days_in_shelter: number;
  catering_meals_count: number;
  work_willingness: 'ترغب بالعمل' | 'لا ترغب بالعمل' | 'غير محدد';
  status: 'داخل الإيواء' | 'متاح للنقل' | 'مرحلة الترحيل' | 'خارج الإيواء' | 'تم الترحيل';
  created_at: string;
}

export interface ShelterRoom {
  id: string;
  room: string;
  beds: string;
  totalBeds: number;
  occupied: number;
  status: string;
  type: string;
  clean: string;
}

export interface ShelterCateringMeal {
  id: string;
  date: string;
  place: string;
  meal: string;
  count: number;
  vendor: string;
  cost: number;
  sup: string;
  status: string;
}

const DEFAULT_MOCK_SHELTER: ShelterRecordItem[] = [
  {
    id: 'SH-2026-001',
    company_id: 'SAF',
    maid_name: 'سارة أديسي (Sara Ethiopian)',
    nationality: 'إثيوبيا',
    passport: 'EP9827341',
    client_name: 'شركة توباز للتأجير',
    contract_ref: 'RC-2026-0014',
    shelter_location: 'مقر الإيواء الرئيسي - الرياض',
    days_in_shelter: 12,
    catering_meals_count: 36,
    work_willingness: 'ترغب بالعمل',
    status: 'داخل الإيواء',
    created_at: new Date().toISOString(),
  },
  {
    id: 'SH-2026-002',
    company_id: 'SAF',
    maid_name: 'ماري جين سانتوس (Mary Jane Santos)',
    nationality: 'الفلبين',
    passport: 'PH8849201',
    client_name: 'دار الرواد للمقاولات',
    contract_ref: 'RC-2026-0012',
    shelter_location: 'مقر الإيواء - جدة',
    days_in_shelter: 4,
    catering_meals_count: 12,
    work_willingness: 'ترغب بالعمل',
    status: 'متاح للنقل',
    created_at: new Date().toISOString(),
  },
  {
    id: 'SH-2026-003',
    company_id: 'SAF',
    maid_name: 'فلورنس ناباتانزي (Florence Nabatanzi)',
    nationality: 'أوغندا',
    passport: 'UG1102938',
    client_name: 'السفير للخدمات',
    contract_ref: 'RC-2026-0009',
    shelter_location: 'مقر الإيواء - الخبر',
    days_in_shelter: 28,
    catering_meals_count: 84,
    work_willingness: 'لا ترغب بالعمل',
    status: 'مرحلة الترحيل',
    created_at: new Date().toISOString(),
  },
];

const INITIAL_ROOMS: ShelterRoom[] = [
  { id: 'RM-101', room: 'جناح أ - غرفة 101', beds: '4 أسرة', totalBeds: 4, occupied: 3, status: 'متاح سرير 1', type: 'نزيلات الفلبين', clean: 'تم التعقيم' },
  { id: 'RM-102', room: 'جناح أ - غرفة 102', beds: '4 أسرة', totalBeds: 4, occupied: 4, status: 'مكتمل الإشغال', type: 'نزيلات إندونيسيا', clean: 'تم التعقيم' },
  { id: 'RM-201', room: 'جناح ب - غرفة 201', beds: '6 أسرة', totalBeds: 6, occupied: 4, status: 'متاح سريرين', type: 'نزيلات إثيوبيا', clean: 'تم التعقيم' },
  { id: 'RM-202', room: 'جناح ب - غرفة 202', beds: '6 أسرة', totalBeds: 6, occupied: 2, status: 'متاح 4 أسرة', type: 'نزيلات أوغندا وكينيا', clean: 'تم التعقيم' },
  { id: 'RM-301', room: 'جناح ج - غرفة 301', beds: '4 أسرة', totalBeds: 4, occupied: 0, status: 'شاغر بالكامل', type: 'غرفة عزل صحي مؤقت', clean: 'جاهز للاستقبال' },
  { id: 'RM-302', room: 'جناح ج - غرفة 302', beds: '4 أسرة', totalBeds: 4, occupied: 1, status: 'متاح 3 أسرة', type: 'مرحلة الترحيل العاجل', clean: 'تم التعقيم' },
  { id: 'RM-JED', room: 'فرع جدة - غرفة 1', beds: '8 أسرة', totalBeds: 8, occupied: 5, status: 'متاح 3 أسرة', type: 'استقبال مطار وترانزيت', clean: 'تم التعقيم' },
  { id: 'RM-DMM', room: 'فرع الدمام - غرفة 1', beds: '6 أسرة', totalBeds: 6, occupied: 3, status: 'متاح 3 أسرة', type: 'تسكين المنطقة الشرقية', clean: 'تم التعقيم' },
];

const INITIAL_CATERING: ShelterCateringMeal[] = [
  { id: 'CAT-01', date: '2026-08-31', place: 'مقر الرياض الرئيسي', meal: 'وجبة غداء', count: 18, vendor: 'مطابخ ومطاعم السليم للإعاشة', cost: 360, sup: 'أميرة الشمري', status: 'تم الاستلام والتوزيع' },
  { id: 'CAT-02', date: '2026-08-31', place: 'مقر الرياض الرئيسي', meal: 'وجبة إفطار', count: 18, vendor: 'مخابز وحلويات الريان', cost: 180, sup: 'أميرة الشمري', status: 'تم الاستلام والتوزيع' },
  { id: 'CAT-03', date: '2026-08-31', place: 'فرع ترانزيت جدة', meal: 'وجبة غداء', count: 5, vendor: 'شركة ضيافة الحجاز', cost: 125, sup: 'خالد باوزير', status: 'تم الاستلام والتوزيع' },
];

export const ShelterPage: React.FC = () => {
  const { activeCompanyId, activeCompany } = useCompany();
  const { data: rawShelter = [], isLoading } = useShelterRecords();
  const { createItem, updateItem, deleteItem } = useTableMutation('shelter_records');
  const { addNotification } = useAppStore();

  const shelterItems: ShelterRecordItem[] = rawShelter.length > 0 ? (rawShelter as ShelterRecordItem[]) : DEFAULT_MOCK_SHELTER;

  const storeActiveTab = useAppStore(state => state.activeTab);

  const getMappedTab = (tabKey: string): string => {
    switch (tabKey) {
      case 'inside-shelter': return 'inside';
      case 'outside-shelter': return 'outside';
      case 'available-transfer': return 'transfer';
      case 'deportation-stage': return 'deportation';
      case 'room-management': return 'rooms';
      case 'food-catering': return 'catering';
      case 'shelter-places': return 'places';
      default: return 'all';
    }
  };

  const [activeSubTab, setActiveSubTab] = useState<string>(() => getMappedTab(storeActiveTab));

  useEffect(() => {
    setActiveSubTab(getMappedTab(storeActiveTab));
    if (storeActiveTab === 'create-shelter') {
      setShowAddModal(true);
    }
  }, [storeActiveTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(() => storeActiveTab === 'create-shelter');

  // Rooms and Catering Real Database State
  const [rooms, setRooms] = useState<ShelterRoom[]>([]);
  const [cateringMeals, setCateringMeals] = useState<ShelterCateringMeal[]>([]);

  // Modals
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [selectedRoomForCheckin, setSelectedRoomForCheckin] = useState<ShelterRoom | null>(null);
  const [showAddMealModal, setShowAddMealModal] = useState(false);

  // Forms
  const [newRoomForm, setNewRoomForm] = useState({
    room: '',
    totalBeds: '4',
    type: 'نزيلات الفلبين',
    clean: 'تم التعقيم'
  });

  const [checkinForm, setCheckinForm] = useState({
    inmateName: '',
    inmatePassport: ''
  });

  const [newMealForm, setNewMealForm] = useState({
    place: 'مقر الرياض الرئيسي',
    meal: 'وجبة غداء',
    count: '18',
    vendor: 'مطابخ ومطاعم السليم للإعاشة',
    cost: '360',
    sup: 'أميرة الشمري'
  });

  // Add Inmate Form State
  const [maidName, setMaidName] = useState('');
  const [nationality, setNationality] = useState('إثيوبيا');
  const [passport, setPassport] = useState('');
  const [clientName, setClientName] = useState('');
  const [shelterLocation, setShelterLocation] = useState('مقر الإيواء الرئيسي - الرياض');
  const [workWillingness, setWorkWillingness] = useState<'ترغب بالعمل' | 'لا ترغب بالعمل' | 'غير محدد'>('ترغب بالعمل');

  // Load Rooms & Catering from realErpDataStore
  useEffect(() => {
    realErpDataStore.getRecords<ShelterRoom>('shelter_rooms', INITIAL_ROOMS).then(setRooms);
    realErpDataStore.getRecords<ShelterCateringMeal>('shelter_catering_logs', INITIAL_CATERING).then(setCateringMeals);
  }, []);

  const handleAddShelter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maidName || !passport) return;

    const companyCode = activeCompanyId !== 'all' ? activeCompanyId : 'SAF';
    const newRecord: Partial<ShelterRecordItem> = {
      id: `SH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      company_id: companyCode,
      maid_name: maidName,
      nationality,
      passport,
      client_name: clientName || undefined,
      shelter_location: shelterLocation,
      days_in_shelter: 1,
      catering_meals_count: 3,
      work_willingness: workWillingness,
      status: 'داخل الإيواء',
      created_at: new Date().toISOString(),
    };

    await createItem.mutateAsync(newRecord);
    addNotification({
      title: 'تسجيل نزيلة جديدة',
      message: `تم تسكين العاملة (${maidName}) بمركز الإيواء بنجاح.`,
      type: 'success',
    });

    setShowAddModal(false);
    setMaidName('');
    setPassport('');
    setClientName('');
  };

  // Add Room Handler
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomForm.room.trim()) return;

    const totalBeds = Number(newRoomForm.totalBeds) || 4;
    const roomRecord: ShelterRoom = {
      id: `RM-${Date.now().toString().slice(-4)}`,
      room: newRoomForm.room.trim(),
      beds: `${totalBeds} أسرة`,
      totalBeds,
      occupied: 0,
      status: `شاغر بالكامل (متاح ${totalBeds} أسرة)`,
      type: newRoomForm.type,
      clean: newRoomForm.clean
    };

    const updated = await realErpDataStore.addRecord<ShelterRoom>('shelter_rooms', roomRecord, INITIAL_ROOMS);
    setRooms(updated);
    setShowAddRoomModal(false);
    setNewRoomForm({ room: '', totalBeds: '4', type: 'نزيلات الفلبين', clean: 'تم التعقيم' });

    addNotification({
      title: 'إضافة غرفة إيواء',
      message: `تم تسجيل (${roomRecord.room}) بسعة (${totalBeds} أسرة) بنجاح.`,
      type: 'success',
    });
  };

  // Checkin Inmate to Room
  const handleConfirmCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomForCheckin) return;

    const newOcc = selectedRoomForCheckin.occupied + 1;
    const remaining = selectedRoomForCheckin.totalBeds - newOcc;
    const newStatus = remaining <= 0 ? 'مكتمل الإشغال' : `متاح ${remaining} ${remaining === 1 ? 'سرير' : 'أسرة'}`;

    const updatedRooms = rooms.map(r => r.id === selectedRoomForCheckin.id ? { ...r, occupied: newOcc, status: newStatus } : r);
    setRooms(updatedRooms);
    await realErpDataStore.importRealRecordsBatch('shelter_rooms', updatedRooms);

    setShowCheckinModal(false);
    setSelectedRoomForCheckin(null);

    addNotification({
      title: 'تسكين نزيلة في الغرفة',
      message: `تم تسكين النزيلة (${checkinForm.inmateName || 'نزيلة جديدة'}) في (${selectedRoomForCheckin.room}) بنجاح. الإشغال الحالي: ${newOcc}/${selectedRoomForCheckin.totalBeds}.`,
      type: 'success',
    });
  };

  // Add Catering Meal Handler
  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = Number(newMealForm.count) || 1;
    const cost = Number(newMealForm.cost) || 0;

    const mealRecord: ShelterCateringMeal = {
      id: `CAT-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().slice(0, 10),
      place: newMealForm.place,
      meal: newMealForm.meal,
      count,
      vendor: newMealForm.vendor,
      cost,
      sup: newMealForm.sup,
      status: 'تم الاستلام والتوزيع'
    };

    const updated = await realErpDataStore.addRecord<ShelterCateringMeal>('shelter_catering_logs', mealRecord, INITIAL_CATERING);
    setCateringMeals(updated);
    setShowAddMealModal(false);

    addNotification({
      title: 'تسجيل وجبة جماعية',
      message: `تم توثيق ${mealRecord.meal} لعدد (${count} نزيلة) بـ ${mealRecord.place} بنجاح.`,
      type: 'success',
    });
  };

  const handleUpdateStatus = async (item: ShelterRecordItem, newStatus: ShelterRecordItem['status']) => {
    await updateItem.mutateAsync({ id: item.id, data: { status: newStatus } });
    addNotification({
      title: 'تحديث حالة النزيلة',
      message: `تم تحديث حالة (${item.maid_name}) إلى (${newStatus}).`,
      type: 'info',
    });
  };

  const handleDeleteShelter = async (item: ShelterRecordItem) => {
    if (confirm(`هل أنت متأكد من حذف سجل النزيلة (${item.maid_name})؟`)) {
      await deleteItem.mutateAsync(item.id);
      addNotification({
        title: 'حذف سجل الإيواء',
        message: `تم حذف ملف (${item.maid_name}) من سجلات الإيواء.`,
        type: 'warning',
      });
    }
  };

  const handleAddMeal = async (item: ShelterRecordItem) => {
    const updatedCount = (item.catering_meals_count || 0) + 1;
    await updateItem.mutateAsync({ id: item.id, data: { catering_meals_count: updatedCount } });
    addNotification({
      title: 'توثيق وجبة غذائية',
      message: `تم تسجيل وجبة إضافية للنزيلة (${item.maid_name}) - الإجمالي: ${updatedCount} وجبة.`,
      type: 'success',
    });
  };

  // Filtered Inmates
  const filteredItems = useMemo(() => {
    return shelterItems.filter((item) => {
      if (activeCompanyId !== 'all' && item.company_id && item.company_id !== activeCompanyId) {
        return false;
      }
      if (activeSubTab === 'inside' && item.status !== 'داخل الإيواء') return false;
      if (activeSubTab === 'outside' && item.status !== 'خارج الإيواء' && item.status !== 'تم الترحيل') return false;
      if (activeSubTab === 'transfer' && item.status !== 'متاح للنقل') return false;
      if (activeSubTab === 'deportation' && item.status !== 'مرحلة الترحيل') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.maid_name.toLowerCase().includes(q) ||
        item.passport.toLowerCase().includes(q) ||
        (item.client_name && item.client_name.toLowerCase().includes(q)) ||
        (item.contract_ref && item.contract_ref.toLowerCase().includes(q))
      );
    });
  }, [shelterItems, activeCompanyId, activeSubTab, searchQuery]);

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
          <div className="flex items-center gap-3">
            <BusinessIllustration type="shelter-care" size="sm" />
            <div style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <Hotel className="w-5 h-5 text-champagne-light" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  {activeCompany ? activeCompany.name : 'مجموعة السليم الموحدة'}
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>مجمع الإيواء والرعاية</span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                إدارة مراكز الإيواء، التسكين والإعاشة
              </h1>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                متابعة حركة النزيلات، توزيع الغرف والأسرة، توثيق الإعاشة، وحالات النقل والترحيل مربوطة بقاعدة البيانات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => useAppStore.getState().setActiveTab('shelter-suite', 'منظومة مراكز الإيواء المستقلة')}
              className="button-white-pill shadow-sm"
              style={{
                fontSize: '12px',
                padding: '6px 16px',
                minHeight: '38px',
                background: '#10b981',
                borderColor: '#10b981',
                color: '#ffffff',
              }}
              title="الانتقال إلى واجهة منظومة الإيواء والسكن المستقلة بكامل شاشتها"
            >
              <Hotel className="w-3.5 h-3.5 ml-1 text-white" />
              <span>البوابة المستقلة للإيواء والسكن 🡵</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="button-white-pill"
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px' }}
            >
              <Plus className="w-3.5 h-3.5 ml-1 text-black" />
              <span>تسكين نزيلة جديدة</span>
            </button>
            <button
              onClick={() => setShowAddRoomModal(true)}
              className="button-white-pill"
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px' }}
            >
              <Bed className="w-3.5 h-3.5 ml-1 text-black" />
              <span>+ إضافة غرفة</span>
            </button>
            <ExportDropdown
              sectionKey="shelter"
              data={activeSubTab === 'rooms' ? rooms : activeSubTab === 'catering' ? cateringMeals : filteredItems}
              customTitle="سجل مراكز الإيواء والتسكين والإعاشة"
              variant="outline-dark"
              buttonLabel="تصدير كشوفات الإيواء (10 صيغ)"
            />
          </div>
        </div>
      </div>

      {/* Navigation SubTabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { id: 'all', label: 'كافة النزيلات', count: shelterItems.length },
          { id: 'inside', label: 'داخل الإيواء', count: shelterItems.filter(i => i.status === 'داخل الإيواء').length },
          { id: 'transfer', label: 'متاح للنقل والتأجير', count: shelterItems.filter(i => i.status === 'متاح للنقل').length },
          { id: 'deportation', label: 'مرحلة الترحيل', count: shelterItems.filter(i => i.status === 'مرحلة الترحيل').length },
          { id: 'rooms', label: `إدارة الغرف والأسرة (${rooms.length})`, count: rooms.length },
          { id: 'catering', label: `التغذية والإعاشة (${cateringMeals.length})`, count: cateringMeals.length },
          { id: 'places', label: 'مقرات الإيواء والفروع', count: 3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              padding: '6px 16px',
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: activeSubTab === tab.id ? '#000000' : '#e4e4e7',
              backgroundColor: activeSubTab === tab.id ? '#000000' : '#ffffff',
              color: activeSubTab === tab.id ? '#ffffff' : '#27272a',
              fontWeight: activeSubTab === tab.id ? 550 : 420,
              fontSize: '12.5px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{tab.label}</span>
            <span className={activeSubTab === tab.id ? "pill-tag-mint" : "pill-tag-shade"} style={{ fontSize: '10px' }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 1. Room Management View */}
      {activeSubTab === 'rooms' && (
        <div className="space-y-6">
          <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4 flex-wrap gap-2">
              <div>
                <h2 className="display-sm" style={{ fontSize: '18px', fontWeight: 330, color: '#000000', margin: 0 }}>
                  إدارة غرف الإيواء وتوزيع الأسرة والمهاجع
                </h2>
                <p className="text-xs text-zinc-400 mt-1">تتبع الطاقة الاستيعابية، الأسرة المشغولة والشاغرة، ونظافة وتعقيم الغرف</p>
              </div>
              <button
                onClick={() => setShowAddRoomModal(true)}
                className="button-primary-pill"
                style={{ fontSize: '11.5px', padding: '6px 16px', minHeight: '34px' }}
              >
                + إضافة غرفة / جناح
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {rooms.map((r) => (
                <div key={r.id} className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50 flex flex-col justify-between hover:border-black transition-colors">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-black text-sm">{r.room}</span>
                      <Badge text={r.status} type={r.status.includes('شاغر') || r.status.includes('متاح') ? 'success' : 'danger'} />
                    </div>
                    <p className="text-xs text-zinc-500 mb-1">{r.type}</p>
                    <div className="text-xs font-mono font-bold text-black mb-2">السعة: {r.beds} (مشغول {r.occupied})</div>
                  </div>
                  <div className="pt-2 border-t border-zinc-200 flex justify-between items-center text-[11px]">
                    <span className="text-champagne-dark font-semibold">{r.clean}</span>
                    <button
                      onClick={() => {
                        setSelectedRoomForCheckin(r);
                        setShowCheckinModal(true);
                      }}
                      className="button-outline-on-light"
                      style={{ fontSize: '10.5px', padding: '2px 10px', minHeight: '26px' }}
                    >
                      تسكين
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Food Catering Full View */}
      {activeSubTab === 'catering' && (
        <div className="space-y-6">
          <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4 flex-wrap gap-2">
              <div>
                <h2 className="display-sm" style={{ fontSize: '18px', fontWeight: 330, color: '#000000', margin: 0 }}>
                  سجل التغذية والإعاشة والوجبات اليومية للنزيلات
                </h2>
                <p className="text-xs text-zinc-400 mt-1">سجل الوجبات الغذائية الثلاث (فطور، غداء، عشاء) ومراقبة المعايير الصحية</p>
              </div>
              <button
                onClick={() => setShowAddMealModal(true)}
                className="button-primary-pill"
                style={{ fontSize: '11.5px', padding: '6px 16px', minHeight: '34px' }}
              >
                + تسجيل وجبة جماعية
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-xs text-zinc-500 font-semibold block">وجبة الإفطار (07:30 AM)</span>
                <span className="text-sm font-bold text-champagne-dark block mt-1">تم التوزيع المعتمد</span>
                <span className="text-[11px] text-zinc-400">فطور متكامل + حليب وعصائر</span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-xs text-zinc-500 font-semibold block">وجبة الغداء (01:30 PM)</span>
                <span className="text-sm font-bold text-champagne-dark block mt-1">تم التوزيع المعتمد</span>
                <span className="text-[11px] text-zinc-400">أرز ولحوم وخضار طازجة</span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-xs text-zinc-500 font-semibold block">وجبة العشاء (08:00 PM)</span>
                <span className="text-sm font-bold text-black block mt-1">مجدولة وجاهزة للتوزيع</span>
                <span className="text-[11px] text-zinc-400">وجبة خفيفة ومخبوزات وفاكهة</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">مقر الإيواء</th>
                    <th className="p-3">الوجبة</th>
                    <th className="p-3">عدد الوجبات</th>
                    <th className="p-3">المطعم / المورد المعتمد</th>
                    <th className="p-3">التكلفة الإجمالية</th>
                    <th className="p-3">المشرف المسؤول</th>
                    <th className="p-3">حالة الاستلام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {cateringMeals.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50">
                      <td className="p-3 font-mono text-black">{row.date}</td>
                      <td className="p-3 font-bold text-black">{row.place}</td>
                      <td className="p-3 font-semibold text-black">{row.meal}</td>
                      <td className="p-3 font-mono font-bold text-black">{row.count} وجبة</td>
                      <td className="p-3 text-zinc-600">{row.vendor}</td>
                      <td className="p-3 font-mono font-bold text-champagne-dark">{row.cost.toLocaleString()} ⃁</td>
                      <td className="p-3 text-zinc-700">{row.sup}</td>
                      <td className="p-3"><Badge text={row.status} type="success" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Shelter Places Full View */}
      {activeSubTab === 'places' && (
        <div className="space-y-6">
          <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
            <div className="border-b border-zinc-100 pb-4 mb-4">
              <h2 className="display-sm" style={{ fontSize: '18px', fontWeight: 330, color: '#000000', margin: 0 }}>
                مقرات وفروع مراكز الإيواء المعتمدة للمجموعة
              </h2>
              <p className="text-xs text-zinc-400 mt-1">المراكز المعتمدة والمرخصة من وزارة الموارد البشرية للتسكين والإعاشة</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'مركز إيواء الرياض الرئيسي', city: 'الرياض - حي الياسمين', cap: '40 نزيلة', occ: '18 نزيلة', sup: 'أ. سارة القحطاني', phone: '+966114889201', license: 'MOL-SH-2024-0012' },
                { name: 'مركز استقبال وترانزيت جدة', city: 'جدة - حي النزهة (قرب المطار)', cap: '25 نزيلة', occ: '5 نزيلات', sup: 'أ. خالد باوزير', phone: '+966126543201', license: 'MOL-SH-2024-0019' },
                { name: 'مركز إيواء المنطقة الشرقية', city: 'الدمام - حي الشاطئ', cap: '20 نزيلة', occ: '3 نزيلات', sup: 'أ. فهد الدوسري', phone: '+966138901234', license: 'MOL-SH-2025-0044' },
              ].map((p, i) => (
                <div key={i} className="p-5 rounded-2xl border border-zinc-200 bg-zinc-50 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-black text-sm mb-1">{p.name}</h3>
                    <p className="text-xs text-zinc-500 mb-3">{p.city}</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-zinc-500">الطاقة الاستيعابية:</span><span className="font-bold text-black">{p.cap}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">الإشغال الحالي:</span><span className="font-bold text-amber-700">{p.occ}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">المشرف:</span><span className="text-black font-semibold">{p.sup}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">الترخيص:</span><span className="font-mono text-zinc-600">{p.license}</span></div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-zinc-200 mt-4 flex justify-between items-center text-xs">
                    <span className="font-mono text-zinc-600">{p.phone}</span>
                    <Badge text="مرخص ونشط" type="success" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table Card */}
      {['all', 'inside', 'transfer', 'deportation'].includes(activeSubTab) && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3 top-3 text-zinc-400" />
              <input
                type="text"
                placeholder="ابحث باسم العاملة، رقم الجواز، أو اسم العميل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-input"
                style={{ width: '100%', height: '36px', minHeight: '36px', borderRadius: '9999px', paddingRight: '36px', fontSize: '12px' }}
              />
            </div>
            <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
              العدد المعروض: {filteredItems.length} نزيلة
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">كود النزيلة / الجواز</th>
                  <th className="p-3.5">اسم العاملة والجنسية</th>
                  <th className="p-3.5">العميل / مرجع العقد</th>
                  <th className="p-3.5">مقر الإيواء</th>
                  <th className="p-3.5">أيام الإقامة والوجبات</th>
                  <th className="p-3.5">الرغبة في العمل</th>
                  <th className="p-3.5">الحالة الحالية</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-zinc-400">
                      جاري استرجاع سجلات الإيواء...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-zinc-400">
                      لا توجد سجلات مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-black">{item.id}</div>
                        <div className="text-[11px] font-mono text-zinc-400">{item.passport}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <CorporateAvatar name={item.maid_name} profession="عاملة منزلية" isCandidate size="sm" />
                          <div>
                            <div className="font-bold text-black">{item.maid_name}</div>
                            <div className="text-zinc-500">{item.nationality}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-xs">
                        <div className="font-bold text-black">{item.client_name || 'تسكين عام'}</div>
                        <div className="text-zinc-400">{item.contract_ref || 'بدون عقد'}</div>
                      </td>
                      <td className="p-3.5 font-bold text-zinc-700">
                        {item.shelter_location}
                      </td>
                      <td className="p-3.5 text-xs">
                        <div className="font-bold text-black">{item.days_in_shelter} يوم</div>
                        <div className="text-champagne-dark font-bold flex items-center gap-1.5 mt-0.5">
                          <span>{item.catering_meals_count} وجبة</span>
                          <button
                            onClick={() => handleAddMeal(item)}
                            className="button-outline-on-light"
                            style={{ padding: '1px 8px', fontSize: '10px', minHeight: '22px' }}
                            title="تسجيل وجبة إضافية"
                          >
                            <Utensils className="w-2.5 h-2.5 ml-1" />
                            <span>+ وجبة</span>
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          item.work_willingness === 'ترغب بالعمل' ? 'bg-champagne-pale text-champagne-dark border border-champagne/30' : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {item.work_willingness}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <Badge
                          text={item.status}
                          type={item.status === 'داخل الإيواء' ? 'purple' : item.status === 'متاح للنقل' ? 'success' : 'danger'}
                        />
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <select
                            value={item.status}
                            onChange={(e) => handleUpdateStatus(item, e.target.value as any)}
                            className="bg-zinc-50 border border-zinc-200 rounded-2xl py-1 px-2.5 text-xs font-bold text-black focus:border-black focus:outline-none"
                          >
                            <option value="داخل الإيواء">داخل الإيواء</option>
                            <option value="متاح للنقل">متاح للنقل</option>
                            <option value="مرحلة الترحيل">مرحلة الترحيل</option>
                            <option value="خارج الإيواء">خارج الإيواء (تسليم)</option>
                            <option value="تم الترحيل">تم الترحيل</option>
                          </select>
                          <button
                            onClick={() => handleDeleteShelter(item)}
                            className="p-1 rounded-full hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors"
                            title="حذف السجل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Add Room */}
      {showAddRoomModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-black text-white flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Bed className="w-4 h-4 text-champagne-light" />
                <span>إضافة غرفة / جناح إيواء جديد</span>
              </h3>
              <button onClick={() => setShowAddRoomModal(false)} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="p-6 space-y-4 bg-white text-black">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم الجناح / الغرفة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: جناح د - غرفة 401"
                  value={newRoomForm.room}
                  onChange={(e) => setNewRoomForm({ ...newRoomForm, room: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">عدد الأسرة *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newRoomForm.totalBeds}
                    onChange={(e) => setNewRoomForm({ ...newRoomForm, totalBeds: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-bold focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">حالة التعقيم</label>
                  <select
                    value={newRoomForm.clean}
                    onChange={(e) => setNewRoomForm({ ...newRoomForm, clean: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value="تم التعقيم">تم التعقيم</option>
                    <option value="جاهز للاستقبال">جاهز للاستقبال</option>
                    <option value="قيد الصيانة والتعقيم">قيد الصيانة والتعقيم</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">التصنيف أو الفئة</label>
                <input
                  type="text"
                  placeholder="مثال: نزيلات الفلبين / غرف عزل"
                  value={newRoomForm.type}
                  onChange={(e) => setNewRoomForm({ ...newRoomForm, type: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
                  حفظ الغرفة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Checkin to Room */}
      {showCheckinModal && selectedRoomForCheckin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-black text-white flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Hotel className="w-4 h-4 text-champagne-light" />
                <span>تسكين في ({selectedRoomForCheckin.room})</span>
              </h3>
              <button onClick={() => setShowCheckinModal(false)} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCheckin} className="p-6 space-y-4 bg-white text-black">
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs">
                <span className="text-zinc-500 block">الغرفة المختارة:</span>
                <span className="font-bold text-black block mt-0.5">{selectedRoomForCheckin.room} - {selectedRoomForCheckin.type}</span>
                <span className="text-champagne-dark font-mono font-bold mt-1 block">
                  السعة: {selectedRoomForCheckin.beds} (المشغول حالياً: {selectedRoomForCheckin.occupied})
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم النزيلة المراد تسكينها *</label>
                {shelterItems.length > 0 ? (
                  <select
                    value={checkinForm.inmateName}
                    onChange={(e) => setCheckinForm({ ...checkinForm, inmateName: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                    required
                  >
                    <option value="">-- اختر نزيلة من السجل --</option>
                    {shelterItems.map(it => (
                      <option key={it.id} value={it.maid_name}>{it.maid_name} ({it.nationality}) - {it.passport}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="اسم النزيلة..."
                    value={checkinForm.inmateName}
                    onChange={(e) => setCheckinForm({ ...checkinForm, inmateName: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCheckinModal(false)}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
                  تأكيد التسكين في الغرفة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Catering Meal */}
      {showAddMealModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-black text-white flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Utensils className="w-4 h-4 text-champagne-light" />
                <span>تسجيل وجبة غذائية جماعية</span>
              </h3>
              <button onClick={() => setShowAddMealModal(false)} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMeal} className="p-6 space-y-4 bg-white text-black">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">نوع الوجبة *</label>
                <select
                  value={newMealForm.meal}
                  onChange={(e) => setNewMealForm({ ...newMealForm, meal: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                >
                  <option value="وجبة إفطار">وجبة إفطار (07:30 AM)</option>
                  <option value="وجبة غداء">وجبة غداء (01:30 PM)</option>
                  <option value="وجبة عشاء">وجبة عشاء (08:00 PM)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">مقر الإيواء</label>
                  <select
                    value={newMealForm.place}
                    onChange={(e) => setNewMealForm({ ...newMealForm, place: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value="مقر الرياض الرئيسي">مقر الرياض الرئيسي</option>
                    <option value="فرع ترانزيت جدة">فرع ترانزيت جدة</option>
                    <option value="مركز إيواء الشرقية">مركز إيواء الشرقية</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">عدد الوجبات *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newMealForm.count}
                    onChange={(e) => setNewMealForm({ ...newMealForm, count: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-bold focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">المورد / المطعم</label>
                  <input
                    type="text"
                    value={newMealForm.vendor}
                    onChange={(e) => setNewMealForm({ ...newMealForm, vendor: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">التكلفة (⃁)</label>
                  <input
                    type="number"
                    value={newMealForm.cost}
                    onChange={(e) => setNewMealForm({ ...newMealForm, cost: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-bold focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">المشرف المسؤول المستلم</label>
                <input
                  type="text"
                  value={newMealForm.sup}
                  onChange={(e) => setNewMealForm({ ...newMealForm, sup: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddMealModal(false)}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
                  توثيق الوجبة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Inmate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-black text-white flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Hotel className="w-4 h-4 text-champagne-light" />
                <span>تسكين عاملة جديدة بمركز الإيواء</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddShelter} className="p-6 space-y-4 bg-white text-black">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم العاملة بالكامل *</label>
                <input
                  type="text"
                  value={maidName}
                  onChange={(e) => setMaidName(e.target.value)}
                  placeholder="اسم العاملة حسب الجواز..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الجنسية *</label>
                  <select
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option>إثيوبيا</option>
                    <option>الفلبين</option>
                    <option>إندونيسيا</option>
                    <option>أوغندا</option>
                    <option>كينيا</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم جواز السفر *</label>
                  <input
                    type="text"
                    value={passport}
                    onChange={(e) => setPassport(e.target.value)}
                    placeholder="Passport..."
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono font-bold focus:border-black focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">مقر مركز الإيواء *</label>
                <select
                  value={shelterLocation}
                  onChange={(e) => setShelterLocation(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                >
                  <option>مقر الإيواء الرئيسي - الرياض</option>
                  <option>مقر الإيواء - جدة</option>
                  <option>مقر الإيواء - الخبر والدمام</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">الرغبة في العمل</label>
                <select
                  value={workWillingness}
                  onChange={(e) => setWorkWillingness(e.target.value as any)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                >
                  <option value="ترغب بالعمل">ترغب بالعمل (متاحة لنقل الكفالة والتأجير)</option>
                  <option value="لا ترغب بالعمل">لا ترغب بالعمل (مرحلة الترحيل)</option>
                  <option value="غير محدد">غير محدد (تحت الفحص)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
                  تأكيد التسكين
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShelterPage;
