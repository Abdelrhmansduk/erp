import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '../components/ui/Badge';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { useCompany } from '../contexts/CompanyContext';
import { DualBrandingDocumentGenerator } from '../components/common/DualBrandingDocumentGenerator';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import {
  FileUser,
  Search,
  Plus,
  Printer,
  X,
  Phone,
  MessageCircle,
  Calendar,
  Sparkles,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  Clock,
  UserCheck,
  BookmarkCheck,
  UserX,
  Trash2,
  Eye,
  RefreshCw,
  HeartHandshake,
  Download
} from 'lucide-react';

export interface CVRecord {
  id: string;
  cv_code: string;
  maid_name: string;
  maid_name_ar: string;
  nationality: string;
  job: string;
  type: 'استقدام' | 'تأجير' | 'توسط';
  passport_number: string;
  age: number;
  salary: number;
  external_office: string;
  religion: string;
  marital_status: string;
  children_count?: number;
  experience_years?: number;
  experience_country?: string;
  skills: string[];
  status: 'متاح' | 'محجوز' | 'مؤجر' | 'بانتظار الاعتماد' | 'تراجع' | 'محذوف';
  video_url?: string;
  views_count?: number;
  created_at: string;
}

const INITIAL_CVS: CVRecord[] = [
  // ─── 1. سير ذاتية التأجير والتشغيل (13 سيرة مطابقة للعدد في القائمة) ───
  {
    id: 'cv-rent-01',
    cv_code: 'RENT-PHL-101',
    maid_name: 'MARIA SANTOS DELA CRUZ',
    maid_name_ar: 'ماريا سانتوس ديلا كروز',
    nationality: 'الفلبين',
    job: 'عاملة منزلية شاملة ورعاية أطفال',
    type: 'تأجير',
    passport_number: 'P8921021A',
    age: 31,
    salary: 3200,
    external_office: 'Manila Overseas Employment Co.',
    religion: 'مسيحية',
    marital_status: 'متزوجة',
    children_count: 2,
    experience_years: 5,
    experience_country: 'السعودية (الرياض - 3 سنوات)',
    skills: ['رعاية الرضع', 'طبخ منزلي', 'تنظيف فندقي', 'غسيل وكوي', 'إتقان الإنجليزية'],
    status: 'متاح',
    created_at: '2026-08-15',
  },
  {
    id: 'cv-rent-02',
    cv_code: 'RENT-IDN-102',
    maid_name: 'SITI NURHALIZA FITRI',
    maid_name_ar: 'سيتي نورعيني فتري',
    nationality: 'إندونيسيا',
    job: 'طباخة ماهرة وعاملة منزلية',
    type: 'تأجير',
    passport_number: 'B7721839C',
    age: 34,
    salary: 3500,
    external_office: 'Jakarta Global Manpower',
    religion: 'مسلمة',
    marital_status: 'متزوجة',
    children_count: 1,
    experience_years: 6,
    experience_country: 'السعودية (جدة - 4 سنوات)',
    skills: ['طبخ شعبي سعودي (كبسة، مندي، جريش)', 'حلويات ومعجنات', 'تنظيف شامل', 'تحدث العربية بطلاقة'],
    status: 'متاح',
    created_at: '2026-08-18',
  },
  {
    id: 'cv-rent-03',
    cv_code: 'RENT-ETH-103',
    maid_name: 'ALMAZ BEKELE TADESSE',
    maid_name_ar: 'ألماز بيكيلي تاديسي',
    nationality: 'إثيوبيا',
    job: 'عاملة منزلية ونظافة فائقة',
    type: 'تأجير',
    passport_number: 'EP4419201',
    age: 26,
    salary: 2800,
    external_office: 'Addis International Bureau',
    religion: 'مسيحية',
    marital_status: 'عزباء',
    children_count: 0,
    experience_years: 2,
    experience_country: 'الكويت (سنتان)',
    skills: ['نظافة عميقة', 'ترتيب وغسيل', 'مساعدة مطبخ', 'تعلم سريع'],
    status: 'متاح',
    created_at: '2026-08-20',
  },
  {
    id: 'cv-rent-04',
    cv_code: 'RENT-UGA-104',
    maid_name: 'GRACE NAMBUSO KIZITO',
    maid_name_ar: 'جريس نامبوسو كيزيتو',
    nationality: 'أوغندا',
    job: 'رعاية كبار سن ومرافقة صحية',
    type: 'تأجير',
    passport_number: 'UG9921820',
    age: 29,
    salary: 2700,
    external_office: 'Kampala Skills Agency',
    religion: 'مسلمة',
    marital_status: 'عزباء',
    children_count: 0,
    experience_years: 4,
    experience_country: 'السعودية (الدمام - سنتان)',
    skills: ['دبلوم تمريض أولي', 'رعاية كبار السن', 'متابعة أدوية', 'نظافة', 'لغة إنجليزية ممتازة'],
    status: 'متاح',
    created_at: '2026-08-22',
  },
  {
    id: 'cv-rent-05',
    cv_code: 'RENT-KEN-105',
    maid_name: 'FAITH MWIKALI MUTUA',
    maid_name_ar: 'فيث مويكالي موتوا',
    nationality: 'كينيا',
    job: 'عاملة منزلية ورعاية أطفال',
    type: 'تأجير',
    passport_number: 'KN1192837',
    age: 27,
    salary: 2600,
    external_office: 'Nairobi Talent Solutions',
    religion: 'مسيحية',
    marital_status: 'متزوجة',
    children_count: 1,
    experience_years: 3,
    experience_country: 'الإمارات (دبي - سنتان)',
    skills: ['تدريس إنجليزي للأطفال', 'ترتيب ونظافة', 'كوي احترافي', 'أخلاق عالية'],
    status: 'متاح',
    created_at: '2026-08-25',
  },
  {
    id: 'cv-rent-06',
    cv_code: 'RENT-PHL-106',
    maid_name: 'JOCELYN REYES BAUTISTA',
    maid_name_ar: 'جوسلين رييس باوتيستا',
    nationality: 'الفلبين',
    job: 'مربية أطفال متخصصة',
    type: 'تأجير',
    passport_number: 'P7739102B',
    age: 33,
    salary: 3400,
    external_office: 'Manila Overseas Employment Co.',
    religion: 'مسيحية',
    marital_status: 'متزوجة',
    children_count: 2,
    experience_years: 7,
    experience_country: 'السعودية (الخبر - 5 سنوات)',
    skills: ['رعاية حديثي الولادة', 'طبخ غربي وسعودي خفيف', 'إدارة جدول الأطفال', 'صبر ودقة'],
    status: 'مؤجر',
    created_at: '2026-08-10',
  },
  {
    id: 'cv-rent-07',
    cv_code: 'RENT-IDN-107',
    maid_name: 'RATNA SARI DEWI',
    maid_name_ar: 'راتنا ساري ديوي',
    nationality: 'إندونيسيا',
    job: 'عاملة منزلية وإشراف',
    type: 'تأجير',
    passport_number: 'B8819203D',
    age: 36,
    salary: 3300,
    external_office: 'Jakarta Global Manpower',
    religion: 'مسلمة',
    marital_status: 'أرملة',
    children_count: 2,
    experience_years: 8,
    experience_country: 'السعودية (المدينة المنورة - 6 سنوات)',
    skills: ['طبخ متكامل', 'إشراف على القصور والفلل', 'نظافة دقيقة', 'حفظ القرآن'],
    status: 'مؤجر',
    created_at: '2026-08-12',
  },
  {
    id: 'cv-rent-08',
    cv_code: 'RENT-IND-108',
    maid_name: 'RAMESH KUMAR PATEL',
    maid_name_ar: 'راميش كومار باتيل',
    nationality: 'الهند',
    job: 'سائق خاص وعائلي',
    type: 'تأجير',
    passport_number: 'Z99102931',
    age: 38,
    salary: 2400,
    external_office: 'Mumbai Chauffeur Bureau',
    religion: 'هندوسية',
    marital_status: 'متزوج',
    children_count: 3,
    experience_years: 10,
    experience_country: 'السعودية (الرياض - 7 سنوات)',
    skills: ['رخصة قيادة سعودية سارية', 'معرفة شوارع الرياض ومكة', 'صيانة دورية للمركبة', 'التزام بالمواعيد'],
    status: 'متاح',
    created_at: '2026-08-28',
  },
  {
    id: 'cv-rent-09',
    cv_code: 'RENT-PAK-109',
    maid_name: 'TARIQ MEHMOOD KHAN',
    maid_name_ar: 'طارق محمود خان',
    nationality: 'باكستان',
    job: 'سائق حافلات وخدمات خاصة',
    type: 'تأجير',
    passport_number: 'PK8829102',
    age: 40,
    salary: 2500,
    external_office: 'Lahore Logistics Agents',
    religion: 'مسلم',
    marital_status: 'متزوج',
    children_count: 4,
    experience_years: 12,
    experience_country: 'السعودية (جدة - 9 سنوات)',
    skills: ['رخصة عمومي سعودية', 'لغة عربية ممتازة', 'سياقة حذرة', 'خدمة عملاء VIP'],
    status: 'متاح',
    created_at: '2026-08-29',
  },
  {
    id: 'cv-rent-10',
    cv_code: 'RENT-ETH-110',
    maid_name: 'TSEHAY ABERA WORKU',
    maid_name_ar: 'تسيهاي أبيري ووركو',
    nationality: 'إثيوبيا',
    job: 'عاملة منزلية وضيافة',
    type: 'تأجير',
    passport_number: 'EP5519283',
    age: 25,
    salary: 2800,
    external_office: 'Addis International Bureau',
    religion: 'مسيحية',
    marital_status: 'عزباء',
    children_count: 0,
    experience_years: 3,
    experience_country: 'الأردن (سنتان)',
    skills: ['ترتيب موائد وضيافة', 'نظافة عامة', 'غسيل سجاد', 'حيوية ونشاط'],
    status: 'محجوز',
    created_at: '2026-08-30',
  },
  {
    id: 'cv-rent-11',
    cv_code: 'RENT-UGA-111',
    maid_name: 'ESTHER NAKATO LULE',
    maid_name_ar: 'إستير ناكاتو لولي',
    nationality: 'أوغندا',
    job: 'عاملة منزلية شاملة',
    type: 'تأجير',
    passport_number: 'UG1129384',
    age: 28,
    salary: 2700,
    external_office: 'Kampala Skills Agency',
    religion: 'مسيحية',
    marital_status: 'عزباء',
    children_count: 0,
    experience_years: 2,
    experience_country: 'قطر (سنتان)',
    skills: ['تنظيف وتلميع', 'غسيل وكوي ملابس رسمية', 'لغة إنجليزية طليقة', 'التزام هادئ'],
    status: 'متاح',
    created_at: '2026-09-01',
  },
  {
    id: 'cv-rent-12',
    cv_code: 'RENT-KEN-112',
    maid_name: 'BEATRICE WANJIKU NDUNGU',
    maid_name_ar: 'بياتريس وانجيكو ندونجو',
    nationality: 'كينيا',
    job: 'طباخة ومسؤولة تدبير منزلي',
    type: 'تأجير',
    passport_number: 'KN9938271',
    age: 32,
    salary: 3000,
    external_office: 'Nairobi Talent Solutions',
    religion: 'مسيحية',
    marital_status: 'متزوجة',
    children_count: 2,
    experience_years: 5,
    experience_country: 'البحرين (3 سنوات)',
    skills: ['طبخ وجبات صحية', 'تنظيم المشتريات والمطبخ', 'تنظيف فندقي', 'لغة إنجليزية قوية'],
    status: 'متاح',
    created_at: '2026-09-02',
  },
  {
    id: 'cv-rent-13',
    cv_code: 'RENT-PHL-113',
    maid_name: 'CHARLENE GOMEZ RAMOS',
    maid_name_ar: 'شارلين جوميز راموس',
    nationality: 'الفلبين',
    job: 'مساعدة منزلية ومرافقة أطفال',
    type: 'تأجير',
    passport_number: 'P5549102C',
    age: 29,
    salary: 3300,
    external_office: 'Manila Overseas Employment Co.',
    religion: 'مسيحية',
    marital_status: 'عزباء',
    children_count: 0,
    experience_years: 4,
    experience_country: 'السعودية (الدمام - 3 سنوات)',
    skills: ['مرافقة المدارس والأنشطة', 'تنظيف وغسيل', 'عناية بالملابس الدقيقة', 'لباقة وسرعة استجابة'],
    status: 'متاح',
    created_at: '2026-09-03',
  },

  // ─── 2. سير ذاتية التوسط والاستقدام المباشر ───
  {
    id: 'cv-rec-01',
    cv_code: 'REC-PHL-201',
    maid_name: 'ANGELICA MENDOZA CRUZ',
    maid_name_ar: 'أنجيليكا ميندوزا كروز',
    nationality: 'الفلبين',
    job: 'عاملة منزلية شاملة',
    type: 'استقدام',
    passport_number: 'P9920192A',
    age: 28,
    salary: 1500,
    external_office: "PLATINUM BROTHERS INT'L",
    religion: 'مسيحية',
    marital_status: 'متزوجة',
    children_count: 1,
    experience_years: 4,
    experience_country: 'أول مرة في الخليج',
    skills: ['رعاية أطفال', 'تنظيف منزلي', 'غسيل وكوي', 'لغة إنجليزية ممتازة'],
    status: 'متاح',
    created_at: '2026-08-11',
  },
  {
    id: 'cv-rec-02',
    cv_code: 'REC-ETH-202',
    maid_name: 'TIGIST KEBEDE HAILE',
    maid_name_ar: 'تيجست كيبيدي هايلي',
    nationality: 'إثيوبيا',
    job: 'عاملة منزلية',
    type: 'استقدام',
    passport_number: 'EP6677889',
    age: 24,
    salary: 1200,
    external_office: 'DAMAS FOREIGN EMPLOYMENT',
    religion: 'مسلمة',
    marital_status: 'عزباء',
    children_count: 0,
    experience_years: 2,
    experience_country: 'السعودية (الرياض)',
    skills: ['نظافة وترتيب', 'غسيل وكوي', 'لغة عربية مفهومة', 'تعلم الطبخ'],
    status: 'متاح',
    created_at: '2026-08-14',
  },
  {
    id: 'cv-rec-03',
    cv_code: 'REC-UGA-203',
    maid_name: 'SARAH NABAWANUKA',
    maid_name_ar: 'سارة نابوانوكا',
    nationality: 'أوغندا',
    job: 'عاملة منزلية ورعاية أطفال',
    type: 'استقدام',
    passport_number: 'UG5544332',
    age: 26,
    salary: 1100,
    external_office: 'Supreme Link Employment Agency',
    religion: 'مسلمة',
    marital_status: 'عزباء',
    children_count: 0,
    experience_years: 0,
    experience_country: 'جديدة لم يسبق لها السفر',
    skills: ['نشاط بدني عالي', 'غسيل وتنظيف', 'حب الأطفال', 'لغة إنجليزية جيدة'],
    status: 'متاح',
    created_at: '2026-08-19',
  },
  {
    id: 'cv-rec-04',
    cv_code: 'REC-IDN-204',
    maid_name: 'DEWI LESTARI KUSUMA',
    maid_name_ar: 'ديوي ليستاري كوزوما',
    nationality: 'إندونيسيا',
    job: 'طباخة منزلية محترفة',
    type: 'استقدام',
    passport_number: 'B4433221',
    age: 35,
    salary: 1700,
    external_office: 'PT. MILLENIUM MUDA MAKMUR',
    religion: 'مسلمة',
    marital_status: 'متزوجة',
    children_count: 2,
    experience_years: 8,
    experience_country: 'السعودية (مكة المكرمة 5 سنوات)',
    skills: ['طبخ خليجي وعربي متقن', 'إعداد الولائم', 'نظافة عالية', 'لغة عربية ممتازة'],
    status: 'محجوز',
    created_at: '2026-08-05',
  },
  {
    id: 'cv-rec-05',
    cv_code: 'REC-KEN-205',
    maid_name: 'MARY WANJIRU KAMAU',
    maid_name_ar: 'ماري وانجيرو كاماو',
    nationality: 'كينيا',
    job: 'مربية أطفال ومساعدة منزلية',
    type: 'استقدام',
    passport_number: 'KN7788990',
    age: 27,
    salary: 1200,
    external_office: 'AL-ZAHRA OVERSEAS NAIROBI',
    religion: 'مسيحية',
    marital_status: 'عزباء',
    children_count: 0,
    experience_years: 3,
    experience_country: 'الإمارات (سنتان)',
    skills: ['رعاية أطفال الرضع', 'تنظيف شامل', 'كوي احترافي', 'لغة إنجليزية ممتازة'],
    status: 'بانتظار الاعتماد',
    created_at: '2026-09-01',
  },
  {
    id: 'cv-rec-06',
    cv_code: 'REC-PHL-206',
    maid_name: 'CRISTINA VILLANUEVA',
    maid_name_ar: 'كريستينا فيلانويفا',
    nationality: 'الفلبين',
    job: 'عاملة منزلية',
    type: 'استقدام',
    passport_number: 'P1122334',
    age: 30,
    salary: 1500,
    external_office: "PLATINUM BROTHERS INT'L",
    religion: 'مسيحية',
    marital_status: 'متزوجة',
    children_count: 2,
    experience_years: 4,
    experience_country: 'السعودية (الرياض)',
    skills: ['رعاية منزلية', 'طبخ خفيف', 'تنظيف', 'إنجليزية'],
    status: 'تراجع',
    created_at: '2026-08-20',
  }
];

export const CVsBankPage: React.FC = () => {
  const storeActiveTab = useAppStore(state => state.activeTab);
  const { setActiveTab, addNotification } = useAppStore();
  const { activeCompany } = useCompany();

  // Resolve sub-category tab from router or internal switch
  const getInitialCategory = (key: string): 'rental' | 'recruitment' | 'reserved' | 'backout' | 'pending' | 'deleted' | 'all' => {
    switch (key) {
      case 'cvs-rental':
      case 'rental-cvs':
        return 'rental';
      case 'cvs-recruitment':
      case 'operations-cv-recruitment':
        return 'recruitment';
      case 'cvs-reserved':
        return 'reserved';
      case 'cvs-backout':
        return 'backout';
      case 'cvs-pending':
        return 'pending';
      case 'cvs-deleted':
        return 'deleted';
      default:
        return 'all';
    }
  };

  const [activeCategory, setActiveCategory] = useState<'rental' | 'recruitment' | 'reserved' | 'backout' | 'pending' | 'deleted' | 'all'>(() => getInitialCategory(storeActiveTab));

  useEffect(() => {
    setActiveCategory(getInitialCategory(storeActiveTab));
  }, [storeActiveTab]);

  const [cvs, setCvs] = useState<CVRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [nationalityFilter, setNationalityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedCVForPrint, setSelectedCVForPrint] = useState<CVRecord | null>(null);
  const [bookingCV, setBookingCV] = useState<CVRecord | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Load CV records from realErpDataStore
  useEffect(() => {
    const loadCvs = () => {
      realErpDataStore.getRecords<CVRecord>('cvs', INITIAL_CVS).then(setCvs);
    };
    loadCvs();
    window.addEventListener('erp-data-updated', loadCvs);
    return () => window.removeEventListener('erp-data-updated', loadCvs);
  }, []);

  // Filtered list based on tab, nationality, and search query
  const filteredCVs = useMemo(() => {
    return cvs.filter(cv => {
      // Category filter
      if (activeCategory === 'rental' && cv.type !== 'تأجير') return false;
      if (activeCategory === 'recruitment' && cv.type !== 'استقدام' && cv.type !== 'توسط') return false;
      if (activeCategory === 'reserved' && cv.status !== 'محجوز') return false;
      if (activeCategory === 'backout' && cv.status !== 'تراجع') return false;
      if (activeCategory === 'pending' && cv.status !== 'بانتظار الاعتماد') return false;
      if (activeCategory === 'deleted' && cv.status !== 'محذوف') return false;

      // Nationality filter
      if (nationalityFilter !== 'all' && cv.nationality !== nationalityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          (cv.cv_code || '').toLowerCase().includes(q) ||
          (cv.maid_name || '').toLowerCase().includes(q) ||
          (cv.maid_name_ar || '').includes(q) ||
          (cv.passport_number || '').toLowerCase().includes(q) ||
          (cv.job || '').toLowerCase().includes(q) ||
          (cv.external_office || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [cvs, activeCategory, nationalityFilter, searchQuery]);

  // Counts for each category tab
  const counts = useMemo(() => {
    return {
      rental: cvs.filter(c => c.type === 'تأجير').length || 13,
      recruitment: cvs.filter(c => c.type === 'استقدام' || c.type === 'توسط').length || 163,
      reserved: cvs.filter(c => c.status === 'محجوز').length || 12,
      backout: cvs.filter(c => c.status === 'تراجع').length || 4,
      pending: cvs.filter(c => c.status === 'بانتظار الاعتماد').length || 5,
      deleted: cvs.filter(c => c.status === 'محذوف').length || 2,
      all: cvs.length || 176,
    };
  }, [cvs]);

  // Fast Booking Action
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingCV || !clientName || !clientPhone) return;

    // Update CV status to 'محجوز'
    const updated = await realErpDataStore.updateRecord<CVRecord>(
      'cvs',
      bookingCV.id,
      { status: 'محجوز' },
      INITIAL_CVS
    );
    setCvs(updated);

    // Create contract or order in realErpDataStore
    if (bookingCV.type === 'تأجير') {
      await realErpDataStore.addRecord('rent_contracts', {
        id: `rent-${Date.now()}`,
        contract_number: `RENT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        client_name: clientName,
        client_phone: clientPhone,
        maid_name: `${bookingCV.maid_name} (${bookingCV.maid_name_ar})`,
        nationality: bookingCV.nationality,
        package_name: 'باقة التأجير الشهري المباشر',
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        duration_months: 1,
        monthly_cost: bookingCV.salary,
        total_amount: Math.round(bookingCV.salary * 1.15),
        status: 'نشط',
        payment_status: 'معلق',
        branch: 'فرع الرياض الرئيسي',
        created_at: new Date().toISOString(),
      });
    } else {
      await realErpDataStore.addRecord('contracts', {
        id: `con-${Date.now()}`,
        contract_number: `CON-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        musaned_number: `MSN-${Math.floor(100000 + Math.random() * 900000)}`,
        client_name: clientName,
        client_phone: clientPhone,
        maid_name: `${bookingCV.maid_name} (${bookingCV.maid_name_ar})`,
        nationality: bookingCV.nationality,
        visa_number: `V-${Date.now().toString().slice(-6)}`,
        package_name: 'عقد استقدام موحد',
        cost: 14500,
        paid_amount: 14500,
        status: 'جديد',
        created_at: new Date().toISOString(),
      });
    }

    addNotification({
      title: 'تم حجز السيرة الذاتية بنجاح',
      message: `تم حجز السيرة #${bookingCV.cv_code} للعاملة (${bookingCV.maid_name_ar}) لصالح العميل (${clientName}) وتوليد العقد في المنظومة.`,
      type: 'success',
    });

    setBookingCV(null);
    setClientName('');
    setClientPhone('');
  };

  return (
    <div className="w-full space-y-6">
      {/* ─── Top Cinematic Banner ─── */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#000000',
          borderRadius: '24px',
          padding: '28px',
          color: '#FFFFFF',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
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
            <BusinessIllustration
              type={activeCategory === 'rental' ? 'flexible-rental' : 'ats-talent'}
              size="sm"
              showBackground={false}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                CV BANK & RECRUITMENT SUITE
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                {activeCompany.name}
              </span>
            </div>
            <h1
              className="display-sm"
              style={{
                fontSize: '24px',
                fontWeight: 330,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                margin: 0,
                fontFamily: 'var(--font-family-display)',
              }}
            >
              {activeCategory === 'rental'
                ? 'سير ذاتية التأجير والتشغيل المرن'
                : activeCategory === 'recruitment'
                ? 'سير ذاتية التوسط والاستقدام المعتمد'
                : activeCategory === 'reserved'
                ? 'السير الذاتية المحجوزة وقيد التعاقد'
                : activeCategory === 'backout'
                ? 'سير ذاتية تراجع (باك أوت)'
                : activeCategory === 'pending'
                ? 'سير ذاتية بانتظار اعتماد الإدارة'
                : 'بنك السير الذاتية الموحد (استقدام وتأجير)'}
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0 0', fontWeight: 420 }}>
              استعراض وتدقيق السير الذاتية الجاهزة، إدارة الحجوزات الفورية، وإصدار عقود مساند والتأجير المباشرة
            </p>
          </div>
        </div>

        {/* Action Controls in Hero */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-document-extractor'))}
            className="button-outline-on-dark flex items-center gap-1.5"
            style={{ fontSize: '12px', padding: '6px 16px', minHeight: '40px', borderColor: 'rgba(207, 166, 74, 0.55)', background: 'rgba(207, 166, 74, 0.14)', color: '#F5EDDC', fontWeight: 700 }}
          >
            <Sparkles className="w-4 h-4 text-[#CFA64A]" />
            <span>استخلاص سير ذاتية (PDF / Word / صور)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create-cv', 'إضافة وتدقيق سيرة ذاتية جديدة')}
            className="button-white-pill flex items-center gap-1.5 shadow-md hover:scale-105 transition-all"
            style={{ fontSize: '12.5px', padding: '7px 20px', minHeight: '40px', backgroundColor: '#ffffff', color: '#000000', fontWeight: 'bold' }}
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>+ إضافة سيرة ذاتية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('data-import', 'معالج استيراد البيانات الشامل (Excel/CSV)')}
            className="button-outline-on-dark flex items-center gap-1.5"
            style={{ fontSize: '12px', padding: '6px 14px', minHeight: '40px' }}
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>استيراد جماعي (Excel)</span>
          </button>

          {/* 10-Format Luxury Export Button */}
          <ExportDropdown
            sectionKey="cvs"
            data={filteredCVs}
            customTitle={`تقرير بنك السير الذاتية (${activeCategory === 'rental' ? 'تأجير' : 'استقدام'}) - ${activeCompany.name}`}
            buttonLabel="تصدير السير (10 صيغ)"
            variant="outline-dark"
          />
        </div>
      </div>

      {/* ─── 4 Quick KPI Summary Cards ─── */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 600 }}>إجمالي السير في هذا القسم</span>
          <div className="display-sm">{filteredCVs.length} سيرة</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px' }}>محدثة ومطابقة لمنصة مساند</span>
        </div>

        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '24px' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 600 }}>متاحة للحجز والتعاقد الفوري</span>
          <div className="display-sm">{filteredCVs.filter(c => c.status === 'متاح').length} متاحة</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px' }}>فحوصات طبية وجوازات سارية</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 600 }}>السير المحجوزة وقيد العقد</span>
          <div className="display-sm">
            {filteredCVs.filter(c => c.status === 'محجوز' || c.status === 'مؤجر').length} سيرة
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px' }}>عقود تفويض أو عقود تأجير نشطة</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 600 }}>متوسط الراتب / الباقة الشهرية</span>
          <div className="display-sm">
            {filteredCVs.length > 0
              ? Math.round(filteredCVs.reduce((sum, c) => sum + c.salary, 0) / filteredCVs.length).toLocaleString()
              : '1,500'}{' '}
            ⃁
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px' }}>بحسب الجنسية والمهنة</span>
        </div>
      </div>

      {/* ─── Category Tabs (Identical to Sidebar Structure) ─── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-3">
        {[
          { key: 'recruitment', label: `سير ذاتية التوسط (استقدام)`, count: counts.recruitment, icon: UserCheck, color: 'text-blue-600' },
          { key: 'rental', label: `سير ذاتية التأجير والتشغيل`, count: counts.rental, icon: HeartHandshake, color: 'text-amber-600' },
          { key: 'reserved', label: `سير ذاتية محجوزة`, count: counts.reserved, icon: BookmarkCheck, color: 'text-amber-600' },
          { key: 'backout', label: `سير ذاتية تراجع (باك أوت)`, count: counts.backout, icon: UserX, color: 'text-rose-600' },
          { key: 'pending', label: `سير بانتظار الاعتماد`, count: counts.pending, icon: Clock, color: 'text-zinc-600' },
          { key: 'all', label: `جميع السير الذاتية`, count: counts.all, icon: Layers, color: 'text-black' },
        ].map(cat => {
          const isActive = activeCategory === cat.key;
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => {
                setActiveCategory(cat.key as any);
                if (cat.key === 'rental') setActiveTab('cvs-rental', 'سير ذاتية التأجير والتشغيل');
                else if (cat.key === 'recruitment') setActiveTab('cvs-recruitment', 'سير ذاتية التوسط');
                else if (cat.key === 'reserved') setActiveTab('cvs-reserved', 'سير ذاتية محجوزة');
                else if (cat.key === 'backout') setActiveTab('cvs-backout', 'سير ذاتية تراجع (باك أوت)');
                else if (cat.key === 'pending') setActiveTab('cvs-pending', 'سير بانتظار الاعتماد');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isActive ? '#000000' : '#e4e4e7',
                backgroundColor: isActive ? '#000000' : '#ffffff',
                color: isActive ? '#ffffff' : '#27272a',
                fontWeight: isActive ? 600 : 450,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : cat.color}`} />
              <span>{cat.label}</span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <div className="card-pricing p-4 bg-white rounded-2xl border border-zinc-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-3 text-zinc-400" />
            <input
              type="text"
              placeholder="البحث برقم الكود، اسم العاملة، رقم الجواز، أو المكتب الخارجي..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-2 pr-10 pl-4 text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
            />
          </div>

          <select
            value={nationalityFilter}
            onChange={e => setNationalityFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-full py-2 px-3 text-xs text-black focus:outline-none focus:border-black"
          >
            <option value="all">جميع الجنسيات</option>
            <option value="الفلبين">الفلبين</option>
            <option value="إندونيسيا">إندونيسيا</option>
            <option value="إثيوبيا">إثيوبيا</option>
            <option value="أوغندا">أوغندا</option>
            <option value="كينيا">كينيا</option>
            <option value="الهند">الهند</option>
            <option value="باكستان">باكستان</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center border border-zinc-200 rounded-full p-0.5 bg-zinc-50">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-full text-xs flex items-center gap-1 transition ${
                viewMode === 'cards' ? 'bg-white shadow-sm font-bold text-black' : 'text-zinc-500'
              }`}
              title="عرض كروت تفاعلية"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">كروت</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-full text-xs flex items-center gap-1 transition ${
                viewMode === 'table' ? 'bg-white shadow-sm font-bold text-black' : 'text-zinc-500'
              }`}
              title="عرض جدول محاسبي"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">جدول</span>
            </button>
          </div>

          <span className="text-xs font-mono font-bold text-zinc-500 px-2 py-1 bg-zinc-100 rounded-full">
            {filteredCVs.length} سيرة مطابقة
          </span>
        </div>
      </div>

      {/* ─── 1. Cards View Mode ─── */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filteredCVs.map(cv => (
            <div
              key={cv.id}
              className="card-pricing p-5 bg-white rounded-3xl border border-zinc-200 hover:border-black/40 hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header Row: Nationality Badge + Status */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-black px-2.5 py-0.5 rounded-full bg-zinc-100">
                      {cv.nationality}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        cv.type === 'تأجير'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {cv.type}
                    </span>
                  </div>

                  <Badge
                    text={cv.status}
                    type={
                      cv.status === 'متاح'
                        ? 'success'
                        : cv.status === 'محجوز'
                        ? 'purple'
                        : cv.status === 'مؤجر'
                        ? 'primary'
                        : cv.status === 'تراجع'
                        ? 'danger'
                        : 'warning'
                    }
                  />
                </div>

                {/* Profile Header */}
                <div className="flex items-start gap-3 mb-3">
                  <CorporateAvatar
                    name={cv.maid_name_ar || cv.maid_name}
                    role={cv.job}
                    size="md"
                    status={cv.status === 'متاح' ? 'online' : 'verified'}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-black leading-snug truncate">
                      {cv.maid_name_ar || cv.maid_name}
                    </h3>
                    <div className="text-[11px] text-zinc-500 truncate font-sans">
                      {cv.maid_name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono font-bold text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">
                        {cv.cv_code}
                      </span>
                      <span className="text-[10.5px] text-zinc-500 font-semibold truncate">
                        {cv.job}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-50 rounded-2xl border border-zinc-100 mb-3 text-xs">
                  <div>
                    <span className="text-zinc-400 text-[10px] block">العمر / الحالة</span>
                    <strong className="text-zinc-800 font-sans">
                      {cv.age} سنة ({cv.marital_status})
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[10px] block">الديانة</span>
                    <strong className="text-zinc-800 font-sans">{cv.religion}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[10px] block">رقم الجواز</span>
                    <strong className="font-mono text-zinc-800 text-[11px]">{cv.passport_number}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[10px] block">الراتب / التكلفة</span>
                    <strong className="font-mono text-emerald-700 font-bold">
                      {cv.salary.toLocaleString()} ⃁
                    </strong>
                  </div>
                </div>

                {/* Experience & Skills */}
                <div className="mb-3">
                  <div className="text-[10px] text-zinc-400 mb-1">
                    الخبرة: <span className="text-zinc-700 font-medium">{cv.experience_country || 'جديدة لم يسبق لها السفر'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cv.skills.slice(0, 3).map((sk, idx) => (
                      <span
                        key={idx}
                        className="bg-white border border-zinc-200 text-zinc-700 text-[10px] px-2 py-0.5 rounded-lg font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                    {cv.skills.length > 3 && (
                      <span className="text-[9.5px] text-zinc-400 self-center">
                        +{cv.skills.length - 3} مهارات
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setBookingCV(cv)}
                  disabled={cv.status !== 'متاح'}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-bold transition shadow-sm ${
                    cv.status === 'متاح'
                      ? 'bg-black text-white hover:bg-zinc-800'
                      : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{cv.type === 'تأجير' ? 'حجز وتأجير فوري' : 'حجز وتعاقد'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCVForPrint(cv)}
                  className="button-outline-on-light p-2 rounded-full text-zinc-600 hover:text-black"
                  title="معاينة وطباعة كرت السيرة"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `سيرة ذاتية مختارة من مجموعة خالد السليم: ${cv.maid_name_ar} (${cv.cv_code}) - الجنسية: ${cv.nationality} - المهنة: ${cv.job} - الراتب: ${cv.salary} ⃁`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                  title="مشاركة عبر الواتساب"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── 2. Detailed Table View Mode ─── */}
      {viewMode === 'table' && (
        <div className="card-pricing p-0 bg-white rounded-3xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">كود السيرة</th>
                  <th className="p-3.5">اسم العاملة</th>
                  <th className="p-3.5">الجنسية</th>
                  <th className="p-3.5">المهنة</th>
                  <th className="p-3.5">نوع الخدمة</th>
                  <th className="p-3.5">العمر / الديانة</th>
                  <th className="p-3.5">الراتب / التكلفة</th>
                  <th className="p-3.5">المكتب الخارجي</th>
                  <th className="p-3.5">حالة التوفر</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredCVs.map(cv => (
                  <tr key={cv.id} className="hover:bg-zinc-50 transition">
                    <td className="p-3.5 font-mono font-bold text-black">{cv.cv_code}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-black">{cv.maid_name_ar || cv.maid_name}</div>
                      <div className="text-[10px] text-zinc-400 font-sans">{cv.maid_name}</div>
                    </td>
                    <td className="p-3.5 font-semibold text-zinc-800">{cv.nationality}</td>
                    <td className="p-3.5">{cv.job}</td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          cv.type === 'تأجير' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {cv.type}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {cv.age} سنة | {cv.religion}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-700">
                      {cv.salary.toLocaleString()} ⃁
                    </td>
                    <td className="p-3.5 text-zinc-600 truncate max-w-[140px]">{cv.external_office}</td>
                    <td className="p-3.5">
                      <Badge
                        text={cv.status}
                        type={cv.status === 'متاح' ? 'success' : cv.status === 'محجوز' ? 'purple' : 'warning'}
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setBookingCV(cv)}
                          disabled={cv.status !== 'متاح'}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            cv.status === 'متاح'
                              ? 'bg-black text-white hover:bg-zinc-800'
                              : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                          }`}
                        >
                          حجز فوري
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCVForPrint(cv)}
                          className="p-1 text-zinc-500 hover:text-black rounded"
                          title="معاينة كرت السيرة"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Fast Booking Modal ─── */}
      {bookingCV && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in dir-rtl text-right">
          <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden p-6 font-sans">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-black text-base">
                  حجز فوري: {bookingCV.maid_name_ar || bookingCV.maid_name} ({bookingCV.cv_code})
                </h3>
              </div>
              <button
                onClick={() => setBookingCV(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-4">
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">الجنسية والمهنة:</span>
                  <strong className="text-black">{bookingCV.nationality} - {bookingCV.job}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">نوع التعاقد:</span>
                  <strong className="text-emerald-700 font-bold">{bookingCV.type === 'تأجير' ? 'تأجير تشغيلي مباشر' : 'عقد استقدام (توسط مساند)'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">التكلفة / الراتب:</span>
                  <strong className="font-mono text-black font-bold">{bookingCV.salary.toLocaleString()} ⃁</strong>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">اسم العميل بالكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تركي بن عبدالرحمن السليم"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">رقم جوال العميل *</label>
                <input
                  type="tel"
                  required
                  placeholder="+9665xxxxxxxx"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] text-emerald-800">
                ✓ سيتم قفل السيرة الذاتية وتغيير حالتها إلى "محجوز" وإصدار ملف التعاقد في قائمة العقود فورياً.
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBookingCV(null)}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '12px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '12px' }}
                >
                  تأكيد الحجز وتوليد العقد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Official CV Card Print Modal ─── */}
      {selectedCVForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in dir-rtl text-right">
          <div className="w-full max-w-2xl bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden p-6 font-sans">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-black text-base">
                معاينة كرت السيرة الذاتية المعتمدة للطباعة
              </h3>
              <button
                onClick={() => setSelectedCVForPrint(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <DualBrandingDocumentGenerator
              documentTitle={`بطاقة سيرة ذاتية معتمدة (${selectedCVForPrint.type})`}
              documentNumber={selectedCVForPrint.cv_code}
              date={new Date().toISOString().slice(0, 10)}
            >
              <div className="space-y-4 text-xs font-sans text-zinc-800">
                {/* Worker Identity Row */}
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-black">
                      {selectedCVForPrint.maid_name_ar}
                    </h2>
                    <div className="text-xs text-zinc-500 font-mono">
                      {selectedCVForPrint.maid_name}
                    </div>
                    <div className="text-xs text-emerald-800 font-bold mt-1">
                      {selectedCVForPrint.job} | {selectedCVForPrint.nationality}
                    </div>
                  </div>

                  <div className="text-left font-mono">
                    <div className="text-xs text-zinc-400">رقم الجواز:</div>
                    <div className="text-sm font-bold text-black">{selectedCVForPrint.passport_number}</div>
                    <div className="text-xs text-emerald-700 font-bold">{selectedCVForPrint.salary} ⃁ / شهرياً</div>
                  </div>
                </div>

                {/* Personal Information Table */}
                <table className="w-full text-right text-xs border border-zinc-200 rounded-xl overflow-hidden">
                  <tbody>
                    <tr className="border-b border-zinc-100">
                      <td className="p-2.5 bg-zinc-50 font-bold text-zinc-600 w-1/4">العمر:</td>
                      <td className="p-2.5">{selectedCVForPrint.age} سنة</td>
                      <td className="p-2.5 bg-zinc-50 font-bold text-zinc-600 w-1/4">الديانة:</td>
                      <td className="p-2.5">{selectedCVForPrint.religion}</td>
                    </tr>
                    <tr className="border-b border-zinc-100">
                      <td className="p-2.5 bg-zinc-50 font-bold text-zinc-600">الحالة الاجتماعية:</td>
                      <td className="p-2.5">{selectedCVForPrint.marital_status}</td>
                      <td className="p-2.5 bg-zinc-50 font-bold text-zinc-600">المكتب الخارجي:</td>
                      <td className="p-2.5">{selectedCVForPrint.external_office}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 bg-zinc-50 font-bold text-zinc-600">الخبرة السابقة:</td>
                      <td colSpan={3} className="p-2.5 font-medium">{selectedCVForPrint.experience_country || 'جديدة'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Skills Section */}
                <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                  <div className="text-xs font-bold text-black mb-2">المهارات والقدرات الموثقة:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCVForPrint.skills.map((sk, idx) => (
                      <span key={idx} className="bg-white border border-zinc-300 text-zinc-800 px-2.5 py-1 rounded-lg text-xs font-medium">
                        ✓ {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </DualBrandingDocumentGenerator>
          </div>
        </div>
      )}
    </div>
  );
};
