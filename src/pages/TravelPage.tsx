import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Badge } from '../components/ui/Badge';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { useCompany } from '../contexts/CompanyContext';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import {
  Plane,
  Plus,
  Search,
  X,
  Check,
  Trash2,
  Printer,
  QrCode,
  Car,
  Ticket,
  ShieldCheck,
  BookOpenCheck,
  Briefcase,
  AlertTriangle,
  CalendarClock,
} from 'lucide-react';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { calculateFamilyAirTicketEntitlement as calculateAnnualAirTicketEntitlement } from '../services/hrAdvancedComplianceEngine';
import { WpsPayrollEngine } from '../services/wpsPayrollEngine';
import { journalEngine } from '../services/accounting/journalEngine';

export interface FlightRecord {
  id: string;
  travel_type: 'وصول' | 'ترحيل' | 'داخلي';
  client_name: string;
  maid_name: string;
  nationality: string;
  passport_number: string;
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  flight_date: string;
  flight_time: string;
  ticket_number: string;
  driver_assigned?: string;
  status:
    | 'مؤكد ومجدول'
    | 'في الجو'
    | 'تم الوصول والاستقبال'
    | 'تم التسليم للإيواء'
    | 'تم التسليم للعميل'
    | 'ملغي';
}

export interface EmployeeBusinessTripRecord {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  grade: string;
  destination: string;
  destination_city?: string;
  trip_scope: 'DOMESTIC' | 'INTERNATIONAL';
  from_date: string;
  start_date?: string;
  to_date: string;
  nights_count: number;
  per_diem_daily: number;
  daily_per_diem?: number;
  per_diem_total: number;
  ticket_cost: number;
  estimated_ticket_cost?: number;
  total_allowance: number;
  total_trip_allowance?: number;
  pnr_code?: string;
  ticket_number?: string;
  airline?: string;
  requires_exit_reentry: boolean;
  exit_reentry_visa_type?: string;
  exit_reentry_visa_no?: string;
  exit_reentry_visa_expiry?: string;
  gl_journal_ref?: string;
  status: 'بانتظار الاعتماد' | 'تم إصدار التذكرة وتوثيق PNR' | 'معتمد ومصروف' | 'مرفوض';
  created_at: string;
}

export interface AirTicketLedgerRecord {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  nationality: string;
  contract_status: 'SINGLE' | 'FAMILY';
  has_eligible_spouse: boolean;
  eligible_children_count: number;
  adult_tickets_count: number;
  child_tickets_count: number;
  base_adult_fare: number;
  total_entitlement_amount: number;
  fulfillment_mode: 'TRAVEL_AGENCY_ORDER' | 'CASH_ALLOWANCE';
  airline: string;
  route: string;
  pnr_code: string;
  ticket_number: string;
  travel_date: string;
  return_date: string;
  exit_reentry_visa_type: string;
  exit_reentry_visa_no: string;
  exit_reentry_visa_expiry: string;
  gl_posted: boolean;
  gl_journal_ref?: string;
  status: 'بانتظار الإصدار' | 'تم إصدار التذكرة وتوثيق PNR' | 'تم الصرف والترحيل المالي';
  created_at: string;
}

interface HrEmpLite {
  id: string;
  employee_code: string;
  name: string;
  national_id: string;
  nationality: string;
  grade: string;
  department: string;
  marital_status: string;
}

const MOCK_FLIGHTS: FlightRecord[] = [
  {
    id: 'FL-801',
    travel_type: 'وصول',
    client_name: 'بندر صالح الهويريني',
    maid_name: 'MARIA SANTOS CORTEZ',
    nationality: 'الفلبين',
    passport_number: 'P9982710B',
    airline: 'الخطوط السعودية (SAUDIA)',
    flight_number: 'SV-861',
    departure_airport: 'مطار نينوي أكينو مانيلا (MNL)',
    arrival_airport: 'مطار الملك خالد الدولي - الرياض (RUH)',
    flight_date: '2026-08-18',
    flight_time: '14:30',
    ticket_number: '065-992837411',
    driver_assigned: 'عمار محمد الهندي (مركبة رقم 12)',
    status: 'مؤكد ومجدول',
  },
  {
    id: 'FL-802',
    travel_type: 'وصول',
    client_name: 'سارة خالد الدوسري',
    maid_name: 'ALEMITU BEKELE',
    nationality: 'إثيوبيا',
    passport_number: 'EP8829104',
    airline: 'الخطوط الإثيوبية (Ethiopian Airlines)',
    flight_number: 'ET-402',
    departure_airport: 'مطار بولي الدولي أديس أبابا (ADD)',
    arrival_airport: 'مطار الملك عبدالعزيز الدولي - جدة (JED)',
    flight_date: '2026-08-17',
    flight_time: '09:15',
    ticket_number: '071-884729103',
    driver_assigned: 'سمير أحمد قاسم (مركبة رقم 5)',
    status: 'تم الوصول والاستقبال',
  },
  {
    id: 'FL-803',
    travel_type: 'ترحيل',
    client_name: 'شركة دار الرواد',
    maid_name: 'FLORENCE NABATANZI',
    nationality: 'أوغندا',
    passport_number: 'UG1102938',
    airline: 'طيران ناس (Flynas)',
    flight_number: 'XY-220',
    departure_airport: 'مطار الملك فهد بالدمام (DMM)',
    arrival_airport: 'مطار عنتيبي الدولي (EBB)',
    flight_date: '2026-08-19',
    flight_time: '23:45',
    ticket_number: '065-119283745',
    driver_assigned: 'بيدرو أوبينا (فريق الترحيل)',
    status: 'مؤكد ومجدول',
  },
];

const INITIAL_BUSINESS_TRIPS: EmployeeBusinessTripRecord[] = [
  {
    id: 'TRP-2026-101',
    company_id: 'SAF',
    employee_id: 'emp-101',
    employee_name: 'فهد العتيبي',
    grade: 'الدرجة الثانية (مدير إدارة)',
    destination: 'جدة — تفقد فرع المنطقة الغربية ومراكز الاستقبال',
    destination_city: 'جدة',
    trip_scope: 'DOMESTIC',
    from_date: '2026-08-22',
    start_date: '2026-08-22',
    to_date: '2026-08-25',
    nights_count: 3,
    per_diem_daily: 800,
    daily_per_diem: 800,
    per_diem_total: 2400,
    ticket_cost: 980,
    estimated_ticket_cost: 980,
    total_allowance: 3380,
    total_trip_allowance: 3380,
    pnr_code: 'SV7M2K',
    ticket_number: '065-441092831',
    airline: 'الخطوط السعودية (SAUDIA)',
    requires_exit_reentry: false,
    exit_reentry_visa_type: 'مواطن (لا يتطلب تأشيرة)',
    exit_reentry_visa_no: '—',
    exit_reentry_visa_expiry: '—',
    gl_journal_ref: 'JV-TRP-2026-101',
    status: 'معتمد ومصروف',
    created_at: '2026-08-15',
  },
  {
    id: 'TRP-2026-102',
    company_id: 'SAF',
    employee_id: 'emp-102',
    employee_name: 'محمد مصطفي',
    grade: 'الدرجة الثالثة (أخصائي أول)',
    destination: 'مانيلا — التعاقد المباشر مع وكالات الاستقدام المعتمدة',
    destination_city: 'مانيلا',
    trip_scope: 'INTERNATIONAL',
    from_date: '2026-09-01',
    start_date: '2026-09-01',
    to_date: '2026-09-06',
    nights_count: 5,
    per_diem_daily: 900,
    daily_per_diem: 900,
    per_diem_total: 4500,
    ticket_cost: 3450,
    estimated_ticket_cost: 3450,
    total_allowance: 7950,
    total_trip_allowance: 7950,
    pnr_code: 'SV9Q8L',
    ticket_number: '065-882910442',
    airline: 'الخطوط السعودية (SAUDIA)',
    requires_exit_reentry: true,
    exit_reentry_visa_type: 'تأشيرة خروج وعودة - مقيم',
    exit_reentry_visa_no: 'ERV-609182734',
    exit_reentry_visa_expiry: '2026-11-30',
    status: 'تم إصدار التذكرة وتوثيق PNR',
    created_at: '2026-08-16',
  },
];

const INITIAL_AIR_TICKET_LEDGERS: AirTicketLedgerRecord[] = [
  {
    id: 'TKT-2026-201',
    company_id: 'SAF',
    employee_id: 'emp-102',
    employee_name: 'محمد مصطفي',
    nationality: 'مصر',
    contract_status: 'FAMILY',
    has_eligible_spouse: true,
    eligible_children_count: 2,
    adult_tickets_count: 2,
    child_tickets_count: 2,
    base_adult_fare: 1850,
    total_entitlement_amount: 6475,
    fulfillment_mode: 'TRAVEL_AGENCY_ORDER',
    airline: 'الخطوط السعودية (SAUDIA)',
    route: 'الرياض (RUH) ⇄ القاهرة (CAI)',
    pnr_code: 'SV4K9P',
    ticket_number: '065-773829104',
    travel_date: '2026-08-25',
    return_date: '2026-09-20',
    exit_reentry_visa_type: 'تأشيرة خروج وعودة - مقيم',
    exit_reentry_visa_no: 'ERV-609182734',
    exit_reentry_visa_expiry: '2026-11-30',
    gl_posted: true,
    gl_journal_ref: 'JV-TKT-2026-201',
    status: 'تم الصرف والترحيل المالي',
    created_at: '2026-08-12',
  },
  {
    id: 'TKT-2026-202',
    company_id: 'YAQ',
    employee_id: 'emp-105',
    employee_name: 'أحمد سمير قاسم',
    nationality: 'الأردن',
    contract_status: 'SINGLE',
    has_eligible_spouse: false,
    eligible_children_count: 0,
    adult_tickets_count: 1,
    child_tickets_count: 0,
    base_adult_fare: 1600,
    total_entitlement_amount: 1600,
    fulfillment_mode: 'TRAVEL_AGENCY_ORDER',
    airline: 'طيران ناس (Flynas)',
    route: 'الرياض (RUH) ⇄ عمّان (AMM)',
    pnr_code: 'XY8N3B',
    ticket_number: '590-332918471',
    travel_date: '2026-09-10',
    return_date: '2026-09-30',
    exit_reentry_visa_type: 'تأشيرة خروج وعودة - مقيم',
    exit_reentry_visa_no: 'ERV-609551209',
    exit_reentry_visa_expiry: '2026-10-15',
    gl_posted: false,
    status: 'تم إصدار التذكرة وتوثيق PNR',
    created_at: '2026-08-14',
  },
];

function evaluateExitReentryVisaStatus(expiryIso?: string, visaType?: string): {
  label: string;
  badgeType: 'success' | 'warning' | 'danger' | 'purple';
} {
  if (!visaType || visaType.includes('مواطن') || !expiryIso || expiryIso === '—') {
    return { label: 'مواطن (لا يتطلب تأشيرة)', badgeType: 'purple' };
  }
  const dt = new Date(expiryIso.slice(0, 10));
  if (Number.isNaN(dt.getTime())) {
    return { label: 'تأشيرة خروج وعودة - مقيم (سارية)', badgeType: 'success' };
  }
  const diffDays = Math.ceil((dt.getTime() - Date.now()) / 86400000);
  if (diffDays < 0) {
    return { label: `منتهية منذ ${Math.abs(diffDays)} يوم`, badgeType: 'danger' };
  }
  if (diffDays <= 30) {
    return { label: `تنتهي خلال ${diffDays} يوم (${expiryIso})`, badgeType: 'warning' };
  }
  return { label: `سارية (${diffDays} يوم متبقٍ — ${expiryIso})`, badgeType: 'success' };
}

export const TravelPage: React.FC = () => {
  const { activeCompany } = useCompany();
  const { addNotification } = useAppStore();
  const [mainView, setMainView] = useState<'worker_flights' | 'employee_trips_tickets'>(
    'worker_flights'
  );
  const [flights, setFlights] = useState<FlightRecord[]>([]);
  const [airportReceptions, setAirportReceptions] = useState([
    {
      id: 'REC-RUH-01',
      maid: 'MARIA SANTOS CORTEZ',
      nat: 'الفلبين',
      airport: 'مطار الملك خالد - صالة 2',
      time: '14:30',
      driver: 'عمار محمد الهندي (حافلة 12)',
      dest: 'مركز إيواء الرياض الرئيسي',
      status: 'تم الاستقبال بنجاح',
    },
    {
      id: 'REC-JED-02',
      maid: 'ALEMITU BEKELE',
      nat: 'إثيوبيا',
      airport: 'مطار الملك عبدالعزيز - الصالة 1',
      time: '09:15',
      driver: 'سمير أحمد قاسم (فان 05)',
      dest: 'مركز ترانزيت جدة',
      status: 'تم الاستقبال بنجاح',
    },
    {
      id: 'REC-RUH-03',
      maid: 'JOYCE MWANGI',
      nat: 'كينيا',
      airport: 'مطار الملك خالد - صالة 2',
      time: '18:45',
      driver: 'بيدرو أوبينا (حافلة 14)',
      dest: 'تسليم مباشر للعميل',
      status: 'بانتظار هبوط الطائرة',
    },
    {
      id: 'REC-DMM-04',
      maid: 'FATIMA NABATANZI',
      nat: 'أوغندا',
      airport: 'مطار الملك فهد بالدمام',
      time: '21:00',
      driver: 'نور عالم شودري (فان 08)',
      dest: 'مركز إيواء الدمام',
      status: 'بانتظار هبوط الطائرة',
    },
  ]);

  // Tab 2 State: Employee Business Trips & Air Ticket Ledgers
  const [hrEmployees, setHrEmployees] = useState<HrEmpLite[]>([]);
  const [businessTrips, setBusinessTrips] = useState<EmployeeBusinessTripRecord[]>([]);
  const [ticketLedgers, setTicketLedgers] = useState<AirTicketLedgerRecord[]>([]);

  // State-driven confirmation for flight deletion (zero window.confirm)
  const [flightPendingDelete, setFlightPendingDelete] = useState<FlightRecord | null>(null);

  // PNR / Ticket Modal for Business Trips or Ticket Ledgers
  const [editingPnrTarget, setEditingPnrTarget] = useState<{
    kind: 'TRIP' | 'LEDGER';
    id: string;
    employeeName: string;
    pnrCode: string;
    ticketNumber: string;
    visaNo: string;
    visaExpiry: string;
  } | null>(null);

  const storeActiveTab = useAppStore((state) => state.activeTab);

  const getMappedTab = (tabKey: string): 'all' | 'arrivals' | 'deportations' | 'reception' => {
    switch (tabKey) {
      case 'airport-reception':
        return 'reception';
      case 'deportation-travel':
      case 'deportation-flights':
        return 'deportations';
      case 'arrivals-travel':
      case 'arrival-flights':
        return 'arrivals';
      default:
        return 'all';
    }
  };

  const [activeTab, setActiveTab] = useState<'all' | 'arrivals' | 'deportations' | 'reception'>(
    () => getMappedTab(storeActiveTab)
  );

  useEffect(() => {
    setActiveTab(getMappedTab(storeActiveTab));
  }, [storeActiveTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFlightForPrint, setSelectedFlightForPrint] = useState<FlightRecord | null>(null);

  const effectiveCompanyId =
    activeCompany.id === 'all' || !activeCompany.id ? 'SAF' : activeCompany.id.toUpperCase();

  const loadAllTravelData = useCallback(async () => {
    const [flightsRaw, receptionsRaw, hrEmpsRaw, coreEmpsRaw, tripsRaw, ledgersRaw] =
      await Promise.all([
        realErpDataStore.getRecords<FlightRecord>('flights', MOCK_FLIGHTS),
        realErpDataStore.getRecords<any>('travel_airport_receptions', []),
        realErpDataStore.getRecords<any>('hr_employees', []),
        realErpDataStore.getRecords<any>('employees', []),
        realErpDataStore.getRecords<EmployeeBusinessTripRecord>(
          'hr_business_trips',
          INITIAL_BUSINESS_TRIPS
        ),
        realErpDataStore.getRecords<AirTicketLedgerRecord>(
          'hr_air_ticket_ledgers',
          INITIAL_AIR_TICKET_LEDGERS
        ),
      ]);

    setFlights(Array.isArray(flightsRaw) && flightsRaw.length > 0 ? flightsRaw : MOCK_FLIGHTS);
    if (Array.isArray(receptionsRaw) && receptionsRaw.length > 0) {
      setAirportReceptions(receptionsRaw);
    }

    const empMap = new Map<string, HrEmpLite>();
    const regEmp = (e: any, idx: number) => {
      if (!e) return;
      const id = String(e.id || e.employee_code || `emp-${idx + 1}`);
      const name = String(e.name || e.full_name || '').trim();
      if (!name) return;
      const natId = String(e.national_id || '2451829301');
      empMap.set(id, {
        id,
        employee_code: String(e.employee_code || id),
        name,
        national_id: natId,
        nationality: String(e.nationality || (natId.startsWith('1') ? 'سعودي' : 'مقيم')),
        grade: String(e.grade || 'الدرجة الثالثة'),
        department: String(e.department || 'الإدارة العامة'),
        marital_status: String(e.marital_status || 'متزوج'),
      });
    };
    (Array.isArray(coreEmpsRaw) ? coreEmpsRaw : []).forEach(regEmp);
    (Array.isArray(hrEmpsRaw) ? hrEmpsRaw : []).forEach(regEmp);
    if (empMap.size === 0) {
      regEmp(
        {
          id: 'emp-101',
          employee_code: 'EMP-SAF-101',
          name: 'محمد مصطفي',
          national_id: '2459182736',
          nationality: 'مصر',
          grade: 'الدرجة الثالثة',
          department: 'التشغيل',
        },
        0
      );
      regEmp(
        {
          id: 'emp-102',
          employee_code: 'EMP-SAF-102',
          name: 'فهد العتيبي',
          national_id: '1092837465',
          nationality: 'سعودي',
          grade: 'الدرجة الثانية',
          department: 'العمليات',
        },
        1
      );
    }
    const mergedEmps = Array.from(empMap.values());
    setHrEmployees(mergedEmps);

    const resolvedTrips =
      Array.isArray(tripsRaw) && tripsRaw.length > 0 ? tripsRaw : INITIAL_BUSINESS_TRIPS;
    const resolvedLedgers =
      Array.isArray(ledgersRaw) && ledgersRaw.length > 0
        ? ledgersRaw
        : INITIAL_AIR_TICKET_LEDGERS;

    setBusinessTrips(resolvedTrips);
    setTicketLedgers(resolvedLedgers);

    if (!Array.isArray(tripsRaw) || tripsRaw.length === 0) {
      await realErpDataStore.saveRecords('hr_business_trips', resolvedTrips);
    }
    if (!Array.isArray(ledgersRaw) || ledgersRaw.length === 0) {
      await realErpDataStore.saveRecords('hr_air_ticket_ledgers', resolvedLedgers);
    }
  }, []);

  useEffect(() => {
    void loadAllTravelData();
    const onUpdated = () => void loadAllTravelData();
    window.addEventListener('erp-data-updated', onUpdated);
    return () => window.removeEventListener('erp-data-updated', onUpdated);
  }, [loadAllTravelData]);

  // Worker Flight Form State
  const [travelType, setTravelType] = useState<'وصول' | 'ترحيل'>('وصول');
  const [clientName, setClientName] = useState('');
  const [maidName, setMaidName] = useState('');
  const [nationality, setNationality] = useState('الفلبين');
  const [passportNumber, setPassportNumber] = useState('');
  const [airline, setAirline] = useState('الخطوط السعودية (SAUDIA)');
  const [flightNumber, setFlightNumber] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('مطار الملك خالد الدولي - الرياض (RUH)');
  const [flightDate, setFlightDate] = useState(new Date().toISOString().slice(0, 10));
  const [flightTime, setFlightTime] = useState('12:00');
  const [ticketNumber, setTicketNumber] = useState('');

  // Employee Air Ticket Ledger Form State (Tab 2)
  const [tktEmpId, setTktEmpId] = useState<string>('');
  const [tktContractStatus, setTktContractStatus] = useState<'SINGLE' | 'FAMILY'>('FAMILY');
  const [tktHasSpouse, setTktHasSpouse] = useState<boolean>(true);
  const [tktChildrenCount, setTktChildrenCount] = useState<number>(2);
  const [tktAdultFare, setTktAdultFare] = useState<number>(1850);
  const [tktFulfillmentMode, setTktFulfillmentMode] = useState<
    'TRAVEL_AGENCY_ORDER' | 'CASH_ALLOWANCE'
  >('TRAVEL_AGENCY_ORDER');
  const [tktAirline, setTktAirline] = useState<string>('الخطوط السعودية (SAUDIA)');
  const [tktRoute, setTktRoute] = useState<string>('الرياض (RUH) ⇄ القاهرة (CAI)');
  const [tktPnr, setTktPnr] = useState<string>('SV6R2M');
  const [tktTicketNo, setTktTicketNo] = useState<string>('065-994827162');
  const [tktTravelDate, setTktTravelDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [tktReturnDate, setTktReturnDate] = useState<string>(() =>
    new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10)
  );
  const [tktVisaType, setTktVisaType] = useState<string>('تأشيرة خروج وعودة - مقيم');
  const [tktVisaNo, setTktVisaNo] = useState<string>('ERV-609812345');
  const [tktVisaExpiry, setTktVisaExpiry] = useState<string>('2026-12-15');

  // Employee Business Trip Form State (Tab 2)
  const [tripEmpId, setTripEmpId] = useState<string>('');
  const [tripDestination, setTripDestination] = useState<string>(
    'دبي — ملتقى وكالات التوظيف الإقليمي'
  );
  const [tripScope, setTripScope] = useState<'DOMESTIC' | 'INTERNATIONAL'>('INTERNATIONAL');
  const [tripFromDate, setTripFromDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [tripNights, setTripNights] = useState<number>(3);
  const [tripTicketCost, setTripTicketCost] = useState<number>(1950);
  const [tripPnr, setTripPnr] = useState<string>('SV3L7W');
  const [tripTicketNo, setTripTicketNo] = useState<string>('065-552819304');
  const [tripVisaNo, setTripVisaNo] = useState<string>('ERV-609774102');
  const [tripVisaExpiry, setTripVisaExpiry] = useState<string>('2026-12-20');

  useEffect(() => {
    if (hrEmployees.length > 0) {
      if (!tktEmpId) setTktEmpId(hrEmployees[0].id);
      if (!tripEmpId) setTripEmpId(hrEmployees[0].id);
    }
  }, [hrEmployees, tktEmpId, tripEmpId]);

  const selectedTicketEmp = useMemo(
    () => hrEmployees.find((e) => e.id === tktEmpId) || hrEmployees[0],
    [hrEmployees, tktEmpId]
  );

  const selectedTripEmp = useMemo(
    () => hrEmployees.find((e) => e.id === tripEmpId) || hrEmployees[0],
    [hrEmployees, tripEmpId]
  );

  // Live Family Air Ticket Entitlement via `calculateAnnualAirTicketEntitlement`
  const annualTicketEntitlement = useMemo(
    () =>
      calculateAnnualAirTicketEntitlement({
        contractStatus: tktContractStatus,
        baseAdultTicketFare: tktAdultFare,
        hasEligibleSpouse: tktHasSpouse,
        eligibleChildrenUnder18Count: tktChildrenCount,
        fulfillmentMode: tktFulfillmentMode,
      }),
    [tktContractStatus, tktAdultFare, tktHasSpouse, tktChildrenCount, tktFulfillmentMode]
  );

  // Live Business Trip Per-Diem via `WpsPayrollEngine`
  const tripPerDiemPreview = useMemo(
    () =>
      WpsPayrollEngine.calculateBusinessTripPerDiem({
        grade: selectedTripEmp?.grade || 'الدرجة الثالثة',
        tripScope,
        nightsCount: tripNights,
        estimatedTicketCost: tripTicketCost,
      }),
    [selectedTripEmp, tripScope, tripNights, tripTicketCost]
  );

  const handleAddFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maidName || !flightNumber) return;

    const newFlight: FlightRecord = {
      id: `FL-${800 + flights.length + 1}`,
      travel_type: travelType,
      client_name: clientName || 'حساب المجموعة',
      maid_name: maidName,
      nationality,
      passport_number: passportNumber || 'PH992810',
      airline,
      flight_number: flightNumber,
      departure_airport: travelType === 'وصول' ? 'مطار بلد المصدر' : 'مطار المملكة',
      arrival_airport: arrivalAirport,
      flight_date: flightDate,
      flight_time: flightTime,
      ticket_number: ticketNumber || '065-000000000',
      driver_assigned: 'بانتظار الإسناد',
      status: 'مؤكد ومجدول',
    };

    await realErpDataStore.addRecord('flights', newFlight);
    setFlights([newFlight, ...flights]);
    addNotification({
      title: 'جدولة رحلة طيران جديدة',
      message: `تمت جدولة رحلة العاملة (${maidName}) برقم الرحلة ${flightNumber} بنجاح.`,
      type: 'success',
    });
    setShowAddModal(false);
    setMaidName('');
    setFlightNumber('');
  };

  const handleUpdateStatus = async (flight: FlightRecord, newStatus: FlightRecord['status']) => {
    const updated = { ...flight, status: newStatus };
    await realErpDataStore.updateRecord<FlightRecord>('flights', flight.id, { status: newStatus });
    setFlights(flights.map((f) => (f.id === flight.id ? updated : f)));
    addNotification({
      title: 'تحديث حالة الرحلة',
      message: `تم تحديث حالة رحلة العاملة (${flight.maid_name}) إلى (${newStatus}).`,
      type: 'info',
    });
  };

  const handleConfirmDeleteFlight = async (flight: FlightRecord) => {
    await realErpDataStore.deleteRecord('flights', flight.id);
    setFlights((prev) => prev.filter((f) => f.id !== flight.id));
    setFlightPendingDelete(null);
    addNotification({
      title: 'حذف الرحلة',
      message: `تم حذف جدول الرحلة #${flight.id} (${flight.maid_name}) بنجاح.`,
      type: 'info',
    });
  };

  const handleIssueAnnualTicketLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketEmp) return;

    const todayIso = new Date().toISOString().slice(0, 10);
    const newLedger: AirTicketLedgerRecord = {
      id: `TKT-2026-${200 + ticketLedgers.length + 1}`,
      company_id: effectiveCompanyId,
      employee_id: selectedTicketEmp.id,
      employee_name: selectedTicketEmp.name,
      nationality: selectedTicketEmp.nationality || 'مقيم',
      contract_status: annualTicketEntitlement.contractStatus,
      has_eligible_spouse: tktHasSpouse,
      eligible_children_count: tktChildrenCount,
      adult_tickets_count: annualTicketEntitlement.adultTicketsCount,
      child_tickets_count: annualTicketEntitlement.childTicketsCount,
      base_adult_fare: annualTicketEntitlement.baseAdultFare,
      total_entitlement_amount: annualTicketEntitlement.totalAnnualEntitlementAmount,
      fulfillment_mode: annualTicketEntitlement.fulfillmentMode,
      airline: tktAirline,
      route: tktRoute.trim() || 'الرياض (RUH) ⇄ وجهة السفر',
      pnr_code: tktPnr.trim().toUpperCase() || `PNR-${Date.now().toString().slice(-4)}`,
      ticket_number: tktTicketNo.trim() || `065-${Date.now().toString().slice(-9)}`,
      travel_date: tktTravelDate,
      return_date: tktReturnDate,
      exit_reentry_visa_type: tktVisaType,
      exit_reentry_visa_no: tktVisaNo.trim() || 'ERV-609100200',
      exit_reentry_visa_expiry: tktVisaExpiry,
      gl_posted: false,
      status: 'تم إصدار التذكرة وتوثيق PNR',
      created_at: todayIso,
    };

    const nextList = [newLedger, ...ticketLedgers];
    setTicketLedgers(nextList);
    await realErpDataStore.saveRecords('hr_air_ticket_ledgers', nextList);

    addNotification({
      title: 'إصدار تذكرة سفر سنوية وتوثيق PNR',
      message: `تم إصدار تذكرة السفر (${newLedger.id} — PNR: ${newLedger.pnr_code}) للموظف (${newLedger.employee_name}) بإجمالي استحقاق ${newLedger.total_entitlement_amount.toLocaleString()} ⃁.`,
      type: 'success',
    });
  };

  const handleCreateEmployeeBusinessTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripEmp) return;

    const todayIso = new Date().toISOString().slice(0, 10);
    const toDateIso = new Date(Date.parse(tripFromDate) + tripNights * 86400000)
      .toISOString()
      .slice(0, 10);
    const isResident = !String(selectedTripEmp.national_id || '').startsWith('1');
    const needsVisa = tripScope === 'INTERNATIONAL' && isResident;

    const newTrip: EmployeeBusinessTripRecord = {
      id: `TRP-2026-${100 + businessTrips.length + 1}`,
      company_id: effectiveCompanyId,
      employee_id: selectedTripEmp.id,
      employee_name: selectedTripEmp.name,
      grade: selectedTripEmp.grade,
      destination: tripDestination.trim() || 'مهمة عمل رسمية',
      destination_city: tripDestination.trim(),
      trip_scope: tripScope,
      from_date: tripFromDate,
      start_date: tripFromDate,
      to_date: toDateIso,
      nights_count: tripNights,
      per_diem_daily: tripPerDiemPreview.dailyPerDiem,
      daily_per_diem: tripPerDiemPreview.dailyPerDiem,
      per_diem_total: tripPerDiemPreview.perDiemTotal,
      ticket_cost: tripPerDiemPreview.estimatedTicketCost,
      estimated_ticket_cost: tripPerDiemPreview.estimatedTicketCost,
      total_allowance: tripPerDiemPreview.totalTripAllowance,
      total_trip_allowance: tripPerDiemPreview.totalTripAllowance,
      pnr_code: tripPnr.trim().toUpperCase() || `PNR-${Date.now().toString().slice(-4)}`,
      ticket_number: tripTicketNo.trim() || `065-${Date.now().toString().slice(-9)}`,
      airline: 'الخطوط السعودية (SAUDIA)',
      requires_exit_reentry: needsVisa,
      exit_reentry_visa_type: needsVisa
        ? 'تأشيرة خروج وعودة - مقيم'
        : 'مواطن (لا يتطلب تأشيرة)',
      exit_reentry_visa_no: needsVisa ? tripVisaNo.trim() || 'ERV-609774102' : '—',
      exit_reentry_visa_expiry: needsVisa ? tripVisaExpiry : '—',
      status: 'تم إصدار التذكرة وتوثيق PNR',
      created_at: todayIso,
    };

    const nextTrips = [newTrip, ...businessTrips];
    setBusinessTrips(nextTrips);
    await realErpDataStore.saveRecords('hr_business_trips', nextTrips);

    addNotification({
      title: 'قيد أمر انتداب وإصدار تذكرة مهمة عمل',
      message: `تم تسجيل أمر الانتداب (${newTrip.id}) للموظف (${newTrip.employee_name}) بمخصص إجمالي ${newTrip.total_allowance.toLocaleString()} ⃁ (PNR: ${newTrip.pnr_code}).`,
      type: 'success',
    });
  };

  const handlePostTravelExpenseToJournal = async (params: {
    kind: 'TRIP' | 'LEDGER';
    recordId: string;
    employeeName: string;
    amount: number;
    description: string;
    pnrCode?: string;
  }) => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const jvRef = `JV-${params.kind}-${params.recordId}`;

    try {
      journalEngine.createJournalEntry(effectiveCompanyId as any, {
        entryDate: todayIso,
        entryType: 'AUTOMATIC',
        sourceModule: 'HR_TRAVEL_TICKETS',
        sourceReference: jvRef,
        description: params.description,
        createdBy: 'إدارة الموارد البشرية والسفر',
        autoPost: true,
        lines: [
          {
            accountCode: '510102',
            accountName: 'رسوم التأشيرات وتذاكر الطيران وبدلات الانتداب',
            debit: params.amount,
            credit: 0,
            costCenterCode: 'CC-HR-TRAVEL',
            description: `${params.description} (${params.pnrCode || params.recordId})`,
          },
          {
            accountCode: '110201',
            accountName: 'مصرف الراجحي - الحساب التشغيلي الرئيسي',
            debit: 0,
            credit: params.amount,
            costCenterCode: 'CC-HR-TRAVEL',
            description: `سداد تذاكر ومخصصات سفر — ${params.employeeName}`,
          },
        ],
      });
    } catch {
      // Continues to persist in realErpDataStore below
    }

    await realErpDataStore.addRecord('company_journal_entries', {
      id: `jv-trv-${Date.now()}`,
      company_id: effectiveCompanyId,
      ref_no: jvRef,
      date: todayIso,
      branch: 'المركز المالي الرئيسي',
      description: params.description,
      total_debit: params.amount,
      total_credit: params.amount,
      status: 'معتمد',
      created_at: new Date().toISOString(),
    });

    if (params.kind === 'TRIP') {
      const nextTrips = businessTrips.map((t) =>
        t.id === params.recordId
          ? { ...t, status: 'معتمد ومصروف' as const, gl_journal_ref: jvRef }
          : t
      );
      setBusinessTrips(nextTrips);
      await realErpDataStore.saveRecords('hr_business_trips', nextTrips);
    } else {
      const nextLedgers = ticketLedgers.map((l) =>
        l.id === params.recordId
          ? {
              ...l,
              gl_posted: true,
              gl_journal_ref: jvRef,
              status: 'تم الصرف والترحيل المالي' as const,
            }
          : l
      );
      setTicketLedgers(nextLedgers);
      await realErpDataStore.saveRecords('hr_air_ticket_ledgers', nextLedgers);
    }

    addNotification({
      title: 'ترحيل قيد التذاكر والانتداب للأستاذ العام (journalEngine)',
      message: `تم ترحيل القيد المحاسبي (${jvRef}) بمبلغ ${params.amount.toLocaleString()} ⃁ للموظف (${params.employeeName}).`,
      type: 'success',
    });
  };

  const handleSavePnrAndVisaModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPnrTarget) return;

    if (editingPnrTarget.kind === 'TRIP') {
      const nextTrips = businessTrips.map((t) =>
        t.id === editingPnrTarget.id
          ? {
              ...t,
              pnr_code: editingPnrTarget.pnrCode.trim().toUpperCase(),
              ticket_number: editingPnrTarget.ticketNumber.trim(),
              exit_reentry_visa_no: editingPnrTarget.visaNo.trim(),
              exit_reentry_visa_expiry: editingPnrTarget.visaExpiry,
              status:
                t.status === 'بانتظار الاعتماد'
                  ? ('تم إصدار التذكرة وتوثيق PNR' as const)
                  : t.status,
            }
          : t
      );
      setBusinessTrips(nextTrips);
      await realErpDataStore.saveRecords('hr_business_trips', nextTrips);
    } else {
      const nextLedgers = ticketLedgers.map((l) =>
        l.id === editingPnrTarget.id
          ? {
              ...l,
              pnr_code: editingPnrTarget.pnrCode.trim().toUpperCase(),
              ticket_number: editingPnrTarget.ticketNumber.trim(),
              exit_reentry_visa_no: editingPnrTarget.visaNo.trim(),
              exit_reentry_visa_expiry: editingPnrTarget.visaExpiry,
            }
          : l
      );
      setTicketLedgers(nextLedgers);
      await realErpDataStore.saveRecords('hr_air_ticket_ledgers', nextLedgers);
    }

    addNotification({
      title: 'تحديث بيانات التذكرة وتأشيرة الخروج والعودة',
      message: `تم حفظ رمز الحجز (${editingPnrTarget.pnrCode}) ورقم التذكرة (${editingPnrTarget.ticketNumber}) للموظف (${editingPnrTarget.employeeName}).`,
      type: 'success',
    });
    setEditingPnrTarget(null);
  };

  const getFilteredFlights = () => {
    return flights.filter((f) => {
      const matchesSearch =
        f.maid_name.includes(searchQuery) ||
        f.client_name.includes(searchQuery) ||
        f.flight_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.passport_number.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'arrivals') return f.travel_type === 'وصول';
      if (activeTab === 'deportations') return f.travel_type === 'ترحيل';

      return true;
    });
  };

  const currentDisplayList = getFilteredFlights();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#141414',
          borderRadius: '16px',
          padding: '28px',
          color: '#ffffff',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="flex items-center gap-3">
          <BusinessIllustration type="travel-logistics" size="sm" />
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '9999px',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                TRAVEL, TICKETS & EXIT/RE-ENTRY HUB
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
              إدارة اللوجستيات، رحلات العمالة، وانتدابات وتذاكر سفر الموظفين
            </h1>
            <p style={{ fontSize: '13px', color: '#adadad', margin: '4px 0 0 0', fontWeight: 420 }}>
              متابعة رحلات الوصول والترحيل، إصدار تذاكر السفر السنوية والانتدابات، وتتبع تأشيرات الخروج والعودة لـ {activeCompany.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {mainView === 'worker_flights' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="button-white-pill"
              style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
            >
              <Plus className="w-4 h-4 ml-1" />
              <span>+ جدولة رحلة طيران</span>
            </button>
          )}

          <ExportDropdown
            sectionKey="travel"
            data={mainView === 'worker_flights' ? currentDisplayList : ticketLedgers}
            customTitle={`سجل رحلات الطيران وتذاكر السفر - ${activeCompany.name}`}
            variant="outline-dark"
            buttonLabel="تصدير كشوفات السفر (10 صيغ)"
          />
        </div>
      </div>

      {/* Top View Switcher / Tab Bar (Gap #6 Requirement) */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setMainView('worker_flights')}
            className="px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
            style={{
              backgroundColor: mainView === 'worker_flights' ? '#141414' : '#f3f3f3',
              color: mainView === 'worker_flights' ? '#ffffff' : '#141414',
              border: '1px solid #e0e0e0',
            }}
          >
            <Plane className="w-4 h-4" />
            <span>رحلات وصول وترحيل العمالة ({flights.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setMainView('employee_trips_tickets')}
            className="px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
            style={{
              backgroundColor: mainView === 'employee_trips_tickets' ? '#141414' : '#f3f3f3',
              color: mainView === 'employee_trips_tickets' ? '#ffffff' : '#141414',
              border: '1px solid #e0e0e0',
            }}
          >
            <Ticket className="w-4 h-4" />
            <span>
              انتدابات وتذاكر سفر الموظفين وتأشيرات الخروج والعودة (
              {businessTrips.length + ticketLedgers.length})
            </span>
          </button>
        </div>

        <span className="pill-tag-shade text-[11px]">
          {mainView === 'worker_flights'
            ? 'لوجستيات المطارات وتفويج العمالة'
            : 'مربوط بمحرك استحقاق التذاكر العائلية والأستاذ العام (journalEngine)'}
        </span>
      </div>

      {/* ========================================================================== */}
      {/* TAB 1: رحلات وصول وترحيل العمالة                                           */}
      {/* ========================================================================== */}
      {mainView === 'worker_flights' && (
        <>
          {/* Sub Tabs Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-[#e0e0e0] pb-3">
            {[
              { id: 'all', label: `جميع الرحلات (${flights.length})` },
              { id: 'arrivals', label: 'رحلات الوصول (Arrivals)' },
              { id: 'reception', label: `سجل استقبال المطارات والنقل (${airportReceptions.length})` },
              { id: 'deportations', label: 'رحلات الترحيل والمغادرة (Deportation)' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 16px',
                    borderRadius: '9999px',
                    border: '1px solid',
                    borderColor: isActive ? '#141414' : '#e0e0e0',
                    backgroundColor: isActive ? '#141414' : '#ffffff',
                    color: isActive ? '#ffffff' : '#262626',
                    fontWeight: isActive ? 550 : 420,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Airport Reception View */}
          {activeTab === 'reception' && (
            <div
              className="card-pricing"
              style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}
            >
              <div className="p-4 border-b border-[#e0e0e0] bg-white flex items-center justify-between">
                <div>
                  <h2
                    className="display-sm"
                    style={{ fontSize: '18px', fontWeight: 330, color: '#141414', margin: 0 }}
                  >
                    سجل استقبال المطارات وتفويج ونقل العمالة
                  </h2>
                  <p className="text-xs text-[#707070] mt-0.5">
                    جدول استقبال الصالات، السائقين المكلفين، وتأكيد البصمة والتسليم للإيواء
                  </p>
                </div>
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  {airportReceptions.length} عمليات نقل اليوم
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-[#141414]">
                  <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-3.5">رقم المهمة</th>
                      <th className="p-3.5">العاملة والجنسية</th>
                      <th className="p-3.5">المطار والصالة</th>
                      <th className="p-3.5">موعد الوصول</th>
                      <th className="p-3.5">السائق والمركبة</th>
                      <th className="p-3.5">الوجهة المستهدفة</th>
                      <th className="p-3.5">حالة البصمة والاستقبال</th>
                      <th className="p-3.5 text-center">إجراء الاستقبال</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {airportReceptions.map((r) => (
                      <tr key={r.id} className="hover:bg-[#f3f3f3]">
                        <td className="p-3.5 font-mono font-bold text-[#141414]">{r.id}</td>
                        <td className="p-3.5 font-bold text-[#141414]">
                          <div className="flex items-center gap-2">
                            <CorporateAvatar
                              name={r.maid}
                              profession="عاملة منزلية"
                              isCandidate
                              size="sm"
                            />
                            <span>
                              {r.maid} <span className="text-[#707070] font-normal">({r.nat})</span>
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 font-semibold text-[#141414]">{r.airport}</td>
                        <td className="p-3.5 font-mono text-[#141414]">{r.time}</td>
                        <td className="p-3.5 text-[#141414]">
                          <div className="flex items-center gap-2">
                            <CorporateAvatar name={r.driver} profession="سائق خاص" size="sm" />
                            <span>{r.driver}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-bold text-[#141414]">{r.dest}</td>
                        <td className="p-3.5">
                          <Badge
                            text={r.status}
                            type={r.status.includes('تم') ? 'success' : 'warning'}
                          />
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            disabled={r.status === 'تم الاستقبال بنجاح'}
                            onClick={async () => {
                              const nextReceptions = airportReceptions.map((item) =>
                                item.id === r.id ? { ...item, status: 'تم الاستقبال بنجاح' } : item
                              );
                              setAirportReceptions(nextReceptions);
                              await realErpDataStore.saveRecords(
                                'travel_airport_receptions',
                                nextReceptions
                              );
                              await realErpDataStore.addRecord('travel_receptions', {
                                ...r,
                                status: 'تم الاستقبال بنجاح',
                                confirmed_at: new Date().toISOString(),
                              });
                              addNotification({
                                title: 'تأكيد استلام العاملة بالمطار',
                                message: `تم توثيق استلام العاملة (${r.maid}) بالمطار وتسليمها للوجهة (${r.dest}) بنجاح.`,
                                type: 'success',
                              });
                            }}
                            className="button-primary-pill disabled:opacity-50"
                            style={{ fontSize: '11px', padding: '2px 10px', minHeight: '26px' }}
                          >
                            {r.status === 'تم الاستقبال بنجاح' ? 'تم الاستلام ' : 'تأكيد النقل'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Flights Table */}
          {['all', 'arrivals', 'deportations'].includes(activeTab) && (
            <div
              className="card-pricing"
              style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}
            >
              <div className="flex items-center justify-between p-4 border-b border-[#e0e0e0] bg-white flex-wrap gap-3">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute right-3 top-3 text-[#707070]" />
                  <input
                    type="text"
                    aria-label="البحث برقم الرحلة، اسم العاملة، أو الجواز"
                    placeholder="البحث برقم الرحلة، اسم العاملة، أو الجواز..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-input"
                    style={{
                      width: '100%',
                      height: '36px',
                      minHeight: '36px',
                      borderRadius: '9999px',
                      paddingRight: '36px',
                      fontSize: '12px',
                    }}
                  />
                </div>
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  العدد المعروض: {currentDisplayList.length} رحلة
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-[#141414]">
                  <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-3.5">#</th>
                      <th className="p-3.5">نوع الرحلة</th>
                      <th className="p-3.5">بيانات العاملة</th>
                      <th className="p-3.5">العميل</th>
                      <th className="p-3.5">شركة الطيران ورقم الرحلة</th>
                      <th className="p-3.5">مطار الوصول</th>
                      <th className="p-3.5">تاريخ وتوقيت الرحلة</th>
                      <th className="p-3.5">سائق الاستقبال</th>
                      <th className="p-3.5">الحالة</th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {currentDisplayList.map((f) => (
                      <tr key={f.id} className="hover:bg-[#f3f3f3]">
                        <td className="p-3.5 font-mono font-bold text-[#141414]">{f.id}</td>
                        <td className="p-3.5">
                          <Badge
                            text={f.travel_type}
                            type={f.travel_type === 'وصول' ? 'success' : 'danger'}
                          />
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <CorporateAvatar
                              name={f.maid_name}
                              profession="عاملة منزلية"
                              isCandidate
                              size="sm"
                            />
                            <div>
                              <div className="font-bold text-[#141414]">{f.maid_name}</div>
                              <div className="text-[11px] text-[#707070] font-mono">
                                {f.nationality} • {f.passport_number}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-semibold text-[#141414]">{f.client_name}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-[#141414]">{f.airline}</div>
                          <div className="text-[11px] text-[#707070] font-mono">
                            {f.flight_number}
                          </div>
                        </td>
                        <td className="p-3.5 text-[#141414]">{f.arrival_airport}</td>
                        <td className="p-3.5 font-mono">
                          <div className="font-bold text-[#141414]">{f.flight_date}</div>
                          <div className="text-[#707070]">{f.flight_time}</div>
                        </td>
                        <td className="p-3.5 font-semibold text-[#141414]">
                          <div className="flex items-center gap-2">
                            <CorporateAvatar
                              name={f.driver_assigned || 'سائق استقبال'}
                              profession="سائق خاص"
                              size="sm"
                            />
                            <span>{f.driver_assigned || 'غير مسند'}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <Badge
                            text={f.status}
                            type={f.status.includes('تم') ? 'success' : 'purple'}
                          />
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {f.status !== 'تم الوصول والاستقبال' && (
                              <button
                                onClick={() => handleUpdateStatus(f, 'تم الوصول والاستقبال')}
                                className="button-primary-pill"
                                style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '26px' }}
                                title="تأكيد الاستقبال"
                              >
                                <Check className="w-3 h-3 ml-1" />
                                <span>استقبال</span>
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedFlightForPrint(f)}
                              className="button-outline-on-light"
                              style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '26px' }}
                              title="طباعة أمر استقبال وتفويج السائق"
                            >
                              <Printer className="w-3 h-3" />
                            </button>
                            {flightPendingDelete?.id === f.id ? (
                              <div className="inline-flex items-center gap-1 bg-[#f3f3f3] px-2 py-0.5 rounded-full border border-[#e0e0e0]">
                                <button
                                  type="button"
                                  onClick={() => void handleConfirmDeleteFlight(f)}
                                  className="px-2 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold cursor-pointer"
                                >
                                  تأكيد الحذف
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFlightPendingDelete(null)}
                                  className="px-1.5 py-0.5 text-[10px] text-[#707070] hover:text-[#141414] cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setFlightPendingDelete(f)}
                                className="p-1 rounded-full hover:bg-[#e0e0e0] text-[#707070] hover:text-[#141414] transition-colors cursor-pointer"
                                title="حذف الرحلة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================== */}
      {/* TAB 2: انتدابات وتذاكر سفر الموظفين وتأشيرات الخروج والعودة                  */}
      {/* ========================================================================== */}
      {mainView === 'employee_trips_tickets' && (
        <div className="space-y-6" dir="rtl">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0]">
              <div className="text-xs font-bold text-[#707070]">
                إجمالي أوامر الانتداب ورحلات العمل
              </div>
              <div className="text-2xl font-bold text-[#141414] mt-1.5 font-mono">
                {businessTrips.length} مهمة —{' '}
                {businessTrips
                  .reduce((s, t) => s + (Number(t.total_allowance) || 0), 0)
                  .toLocaleString()}{' '}
                ⃁
              </div>
              <div className="text-[11px] text-[#707070] mt-1">
                مسجلة في (hr_business_trips) ومربوطة بالبدل اليومي
              </div>
            </div>

            <div className="p-5 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0]">
              <div className="text-xs font-bold text-[#707070]">
                دفتر تذاكر السفر السنوية والعائلية
              </div>
              <div className="text-2xl font-bold text-[#141414] mt-1.5 font-mono">
                {ticketLedgers.length} تذكرة —{' '}
                {ticketLedgers
                  .reduce((s, l) => s + (Number(l.total_entitlement_amount) || 0), 0)
                  .toLocaleString()}{' '}
                ⃁
              </div>
              <div className="text-[11px] text-[#707070] mt-1">
                محسوبة وفق سياسة العقود الفردية والعائلية (hr_air_ticket_ledgers)
              </div>
            </div>

            <div className="p-5 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0]">
              <div className="text-xs font-bold text-[#707070]">
                تأشيرات الخروج والعودة للمقيمين
              </div>
              <div className="text-2xl font-bold text-[#141414] mt-1.5 font-mono">
                {
                  ticketLedgers.filter((l) =>
                    l.exit_reentry_visa_type.includes('تأشيرة خروج وعودة')
                  ).length
                }{' '}
                تأشيرة موثقة
              </div>
              <div className="text-[11px] text-[#141414] font-semibold mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>تتبع حي لصلاحية (تأشيرة خروج وعودة - مقيم)</span>
              </div>
            </div>

            <div className="p-5 rounded-[24px] bg-[#141414] text-[#ffffff] border border-[#141414]">
              <div className="text-xs font-bold text-[#e0e0e0]">
                القيود المالية المرحلة (journalEngine)
              </div>
              <div className="text-2xl font-bold text-[#ffffff] mt-1.5 font-mono">
                {ticketLedgers.filter((l) => l.gl_posted).length +
                  businessTrips.filter((t) => t.status === 'معتمد ومصروف').length}{' '}
                قيد مرحّل
              </div>
              <div className="text-[11px] text-[#e0e0e0] mt-1">
                حساب 510102 (تذاكر وانتدابات) / حساب 110201 (البنك)
              </div>
            </div>
          </div>

          {/* Forms Grid: 1) Annual Family Ticket Entitlement & PNR Form  2) Business Trip Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form 1: Annual Air Ticket Entitlement & PNR Issuance */}
            <form
              onSubmit={handleIssueAnnualTicketLedger}
              className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-[#141414]" />
                  <div>
                    <h3 className="text-sm font-bold text-[#141414] m-0">
                      إصدار تذاكر سفر سنوية وحساب استحقاق العائلة
                    </h3>
                    <p className="text-[11px] text-[#707070] m-0">
                      احتساب آلي (عقد فردي / عائلي + 75% للأبناء) وتوثيق PNR وتأشيرة الخروج والعودة
                    </p>
                  </div>
                </div>
                <span className="pill-tag-shade text-[10px]">hr_air_ticket_ledgers</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    الموظف المستفيد *
                  </label>
                  <select
                    value={tktEmpId}
                    onChange={(e) => setTktEmpId(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-bold text-[#141414]"
                  >
                    {hrEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.nationality})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    نوع استحقاق العقد
                  </label>
                  <select
                    value={tktContractStatus}
                    onChange={(e) => setTktContractStatus(e.target.value as 'SINGLE' | 'FAMILY')}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-bold text-[#141414]"
                  >
                    <option value="FAMILY">عقد عائلي (الموظف + الزوج/الزوجة + الأبناء)</option>
                    <option value="SINGLE">عقد فردي (تذكرة واحدة للموظف)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    سعر تذكرة البالغ (⃁)
                  </label>
                  <input
                    type="number"
                    min={300}
                    value={tktAdultFare}
                    onChange={(e) => setTktAdultFare(Number(e.target.value) || 0)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono font-bold text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    عدد الأبناء (&lt; 18 سنة)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={6}
                    disabled={tktContractStatus === 'SINGLE'}
                    value={tktChildrenCount}
                    onChange={(e) => setTktChildrenCount(Number(e.target.value) || 0)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono font-bold text-[#141414] disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    آلية الصرف
                  </label>
                  <select
                    value={tktFulfillmentMode}
                    onChange={(e) =>
                      setTktFulfillmentMode(
                        e.target.value as 'TRAVEL_AGENCY_ORDER' | 'CASH_ALLOWANCE'
                      )
                    }
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414]"
                  >
                    <option value="TRAVEL_AGENCY_ORDER">أمر إركاب وكالة سفر</option>
                    <option value="CASH_ALLOWANCE">بدل نقدي للموظف</option>
                  </select>
                </div>
              </div>

              {tktContractStatus === 'FAMILY' && (
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#141414] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tktHasSpouse}
                    onChange={(e) => setTktHasSpouse(e.target.checked)}
                  />
                  <span>شمول تذكرة الزوج / الزوجة المقيمة على كفالة الموظف</span>
                </label>
              )}

              {/* Live Entitlement Preview Box */}
              <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-[#141414]">
                  <span>صافي الاستحقاق السنوي المحسوب آلياً:</span>
                  <span className="font-mono text-base">
                    {annualTicketEntitlement.totalAnnualEntitlementAmount.toLocaleString()} ⃁
                  </span>
                </div>
                <div className="text-[11px] text-[#707070]">{annualTicketEntitlement.summaryAr}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    رمز الحجز (PNR) *
                  </label>
                  <input
                    type="text"
                    required
                    value={tktPnr}
                    onChange={(e) => setTktPnr(e.target.value)}
                    placeholder="SV6R2M"
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono font-bold text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    رقم التذكرة (E-Ticket) *
                  </label>
                  <input
                    type="text"
                    required
                    value={tktTicketNo}
                    onChange={(e) => setTktTicketNo(e.target.value)}
                    placeholder="065-994827162"
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    خط السير (Route)
                  </label>
                  <input
                    type="text"
                    value={tktRoute}
                    onChange={(e) => setTktRoute(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    نوع تأشيرة السفر
                  </label>
                  <select
                    value={tktVisaType}
                    onChange={(e) => setTktVisaType(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414]"
                  >
                    <option value="تأشيرة خروج وعودة - مقيم">تأشيرة خروج وعودة - مقيم</option>
                    <option value="تأشيرة خروج وعودة متعددة - مقيم">
                      تأشيرة خروج وعودة متعددة - مقيم
                    </option>
                    <option value="مواطن (لا يتطلب تأشيرة)">مواطن (لا يتطلب تأشيرة)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    رقم تأشيرة الخروج والعودة
                  </label>
                  <input
                    type="text"
                    value={tktVisaNo}
                    onChange={(e) => setTktVisaNo(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    صلاحية التأشيرة
                  </label>
                  <input
                    type="date"
                    value={tktVisaExpiry}
                    onChange={(e) => setTktVisaExpiry(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    تاريخ المغادرة
                  </label>
                  <input
                    type="date"
                    value={tktTravelDate}
                    onChange={(e) => setTktTravelDate(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    تاريخ العودة
                  </label>
                  <input
                    type="date"
                    value={tktReturnDate}
                    onChange={(e) => setTktReturnDate(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="button-primary-pill w-full justify-center"
                style={{ minHeight: '38px', fontSize: '12.5px' }}
              >
                <Ticket className="w-4 h-4 ml-1.5" />
                <span>إصدار التذكرة وتوثيق PNR في سجل التذاكر (hr_air_ticket_ledgers)</span>
              </button>
            </form>

            {/* Form 2: Employee Business Trip & Per-Diem Registration */}
            <form
              onSubmit={handleCreateEmployeeBusinessTrip}
              className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#141414]" />
                  <div>
                    <h3 className="text-sm font-bold text-[#141414] m-0">
                      تسجيل أمر انتداب ومهمة عمل رسمية
                    </h3>
                    <p className="text-[11px] text-[#707070] m-0">
                      احتساب بدل الانتداب اليومي وتذكرة الطيران والتحقق من تأشيرة الخروج والعودة
                    </p>
                  </div>
                </div>
                <span className="pill-tag-shade text-[10px]">hr_business_trips</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    الموظف المنتدب *
                  </label>
                  <select
                    value={tripEmpId}
                    onChange={(e) => setTripEmpId(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-bold text-[#141414]"
                  >
                    {hrEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.grade})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    نطاق رحلة العمل
                  </label>
                  <select
                    value={tripScope}
                    onChange={(e) => setTripScope(e.target.value as 'DOMESTIC' | 'INTERNATIONAL')}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-bold text-[#141414]"
                  >
                    <option value="DOMESTIC">انتداب داخلي (داخل المملكة)</option>
                    <option value="INTERNATIONAL">انتداب دولي (خارج المملكة)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  وجهة الانتداب والغرض التشغيلي *
                </label>
                <input
                  type="text"
                  required
                  value={tripDestination}
                  onChange={(e) => setTripDestination(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    تاريخ بدء المهمة
                  </label>
                  <input
                    type="date"
                    value={tripFromDate}
                    onChange={(e) => setTripFromDate(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    عدد الليالي
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={tripNights}
                    onChange={(e) => setTripNights(Number(e.target.value) || 1)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono font-bold text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    تكلفة التذكرة (⃁)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={tripTicketCost}
                    onChange={(e) => setTripTicketCost(Number(e.target.value) || 0)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono font-bold text-[#141414]"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-[#141414]">
                  <span>إجمالي مخصص الانتداب والتذكرة:</span>
                  <span className="font-mono text-base">
                    {tripPerDiemPreview.totalTripAllowance.toLocaleString()} ⃁
                  </span>
                </div>
                <div className="text-[11px] text-[#707070]">
                  بدل الليلة: {tripPerDiemPreview.dailyPerDiem.toLocaleString()} ⃁ × {tripNights}{' '}
                  ليالٍ = {tripPerDiemPreview.perDiemTotal.toLocaleString()} ⃁ + تذكرة طيران{' '}
                  {tripPerDiemPreview.estimatedTicketCost.toLocaleString()} ⃁
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">رمز PNR</label>
                  <input
                    type="text"
                    value={tripPnr}
                    onChange={(e) => setTripPnr(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">رقم التذكرة</label>
                  <input
                    type="text"
                    value={tripTicketNo}
                    onChange={(e) => setTripTicketNo(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    رقم تأشيرة الخروج والعودة
                  </label>
                  <input
                    type="text"
                    value={tripVisaNo}
                    onChange={(e) => setTripVisaNo(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    انتهاء التأشيرة
                  </label>
                  <input
                    type="date"
                    value={tripVisaExpiry}
                    onChange={(e) => setTripVisaExpiry(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="button-primary-pill w-full justify-center"
                style={{ minHeight: '38px', fontSize: '12.5px' }}
              >
                <Plus className="w-4 h-4 ml-1.5" />
                <span>حفظ أمر الانتداب وتذكرة المهمة (hr_business_trips)</span>
              </button>
            </form>
          </div>

          {/* Table 1: Air Ticket Ledgers (hr_air_ticket_ledgers) */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden">
            <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#141414] m-0">
                  دفتر استحقاقات وتذاكر سفر الموظفين وتأشيرات الخروج والعودة (hr_air_ticket_ledgers)
                </h3>
                <p className="text-xs text-[#707070] m-0 mt-0.5">
                  توثيق أرقام الحجز PNR، التذاكر الإلكترونية، صلاحية تأشيرة خروج وعودة - مقيم، والترحيل المباشر للأستاذ العام
                </p>
              </div>
              <span className="pill-tag-shade text-[11px]">{ticketLedgers.length} سجل تذكرة</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-[#141414]">
                <thead className="bg-[#f3f3f3] font-bold border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-3.5">المرجع</th>
                    <th className="p-3.5">الموظف ونوع العقد</th>
                    <th className="p-3.5">خط السير وشركة الطيران</th>
                    <th className="p-3.5">رمز PNR ورقم التذكرة</th>
                    <th className="p-3.5">تأشيرة الخروج والعودة وصلاحيتها</th>
                    <th className="p-3.5">إجمالي الاستحقاق</th>
                    <th className="p-3.5">الحالة والقيد المحاسبي</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {ticketLedgers.map((l) => {
                    const visaEval = evaluateExitReentryVisaStatus(
                      l.exit_reentry_visa_expiry,
                      l.exit_reentry_visa_type
                    );
                    return (
                      <tr key={l.id} className="hover:bg-[#f3f3f3]/60">
                        <td className="p-3.5 font-mono font-bold">{l.id}</td>
                        <td className="p-3.5">
                          <div className="font-bold">{l.employee_name}</div>
                          <div className="text-[11px] text-[#707070]">
                            {l.contract_status === 'FAMILY'
                              ? `عقد عائلي (${l.adult_tickets_count} بالغ + ${l.child_tickets_count} أبناء)`
                              : 'عقد فردي (تذكرة واحدة)'}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold">{l.route}</div>
                          <div className="text-[11px] text-[#707070]">
                            {l.airline} ({l.travel_date} ← {l.return_date})
                          </div>
                        </td>
                        <td className="p-3.5 font-mono">
                          <div className="font-bold text-[#141414]">PNR: {l.pnr_code}</div>
                          <div className="text-[11px] text-[#707070]">TKT: {l.ticket_number}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-[11px] mb-1">
                            {l.exit_reentry_visa_type} ({l.exit_reentry_visa_no})
                          </div>
                          <Badge text={visaEval.label} type={visaEval.badgeType} />
                        </td>
                        <td className="p-3.5 font-mono font-bold text-[#141414]">
                          {l.total_entitlement_amount.toLocaleString()} ⃁
                        </td>
                        <td className="p-3.5">
                          <Badge
                            text={l.status}
                            type={l.gl_posted ? 'success' : 'purple'}
                          />
                          {l.gl_journal_ref && (
                            <div className="text-[10px] font-mono text-[#707070] mt-1">
                              القيد: {l.gl_journal_ref}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingPnrTarget({
                                  kind: 'LEDGER',
                                  id: l.id,
                                  employeeName: l.employee_name,
                                  pnrCode: l.pnr_code,
                                  ticketNumber: l.ticket_number,
                                  visaNo: l.exit_reentry_visa_no,
                                  visaExpiry: l.exit_reentry_visa_expiry,
                                })
                              }
                              className="button-outline-on-light"
                              style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '26px' }}
                            >
                              تحديث PNR/التأشيرة
                            </button>
                            {!l.gl_posted && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handlePostTravelExpenseToJournal({
                                    kind: 'LEDGER',
                                    recordId: l.id,
                                    employeeName: l.employee_name,
                                    amount: l.total_entitlement_amount,
                                    description: `صرف استحقاق تذاكر سفر سنوية (${l.route}) للموظف ${l.employee_name}`,
                                    pnrCode: l.pnr_code,
                                  })
                                }
                                className="button-primary-pill"
                                style={{ padding: '2px 10px', fontSize: '10.5px', minHeight: '26px' }}
                              >
                                <BookOpenCheck className="w-3 h-3 ml-1" />
                                <span>ترحيل للأستاذ العام</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Employee Business Trips (hr_business_trips) */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden">
            <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#141414] m-0">
                  سجل أوامر الانتداب ورحلات العمل الرسمية (hr_business_trips)
                </h3>
                <p className="text-xs text-[#707070] m-0 mt-0.5">
                  متابعة بدلات الانتداب اليومية، تذاكر الطيران، وتأشيرات الخروج والعودة للمهام الخارجية
                </p>
              </div>
              <span className="pill-tag-shade text-[11px]">{businessTrips.length} أمر انتداب</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-[#141414]">
                <thead className="bg-[#f3f3f3] font-bold border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-3.5">رقم المهمة</th>
                    <th className="p-3.5">الموظف والدرجة</th>
                    <th className="p-3.5">الوجهة والمدة</th>
                    <th className="p-3.5">رمز PNR ورقم التذكرة</th>
                    <th className="p-3.5">تأشيرة الخروج والعودة</th>
                    <th className="p-3.5">مخصص الانتداب + التذكرة</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {businessTrips.map((t) => {
                    const visaEval = evaluateExitReentryVisaStatus(
                      t.exit_reentry_visa_expiry,
                      t.exit_reentry_visa_type ||
                        (t.requires_exit_reentry
                          ? 'تأشيرة خروج وعودة - مقيم'
                          : 'مواطن (لا يتطلب تأشيرة)')
                    );
                    return (
                      <tr key={t.id} className="hover:bg-[#f3f3f3]/60">
                        <td className="p-3.5 font-mono font-bold">{t.id}</td>
                        <td className="p-3.5">
                          <div className="font-bold">{t.employee_name}</div>
                          <div className="text-[11px] text-[#707070]">{t.grade}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold">{t.destination}</div>
                          <div className="text-[11px] text-[#707070] font-mono">
                            {t.from_date} ← {t.to_date} ({t.nights_count} ليالٍ •{' '}
                            {t.trip_scope === 'INTERNATIONAL' ? 'دولي' : 'داخلي'})
                          </div>
                        </td>
                        <td className="p-3.5 font-mono">
                          <div className="font-bold">PNR: {t.pnr_code || 'SV-PEND'}</div>
                          <div className="text-[11px] text-[#707070]">
                            TKT: {t.ticket_number || '065-PEND'}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-[11px] font-semibold mb-1">
                            {t.exit_reentry_visa_type ||
                              (t.requires_exit_reentry
                                ? 'تأشيرة خروج وعودة - مقيم'
                                : 'مواطن (لا يتطلب تأشيرة)')}
                          </div>
                          <Badge text={visaEval.label} type={visaEval.badgeType} />
                        </td>
                        <td className="p-3.5 font-mono">
                          <div className="font-bold text-[#141414]">
                            {(t.total_allowance || 0).toLocaleString()} ⃁
                          </div>
                          <div className="text-[10px] text-[#707070]">
                            بدل: {(t.per_diem_total || 0).toLocaleString()} ⃁ + تذكرة:{' '}
                            {(t.ticket_cost || 0).toLocaleString()} ⃁
                          </div>
                        </td>
                        <td className="p-3.5">
                          <Badge
                            text={t.status}
                            type={t.status === 'معتمد ومصروف' ? 'success' : 'purple'}
                          />
                          {t.gl_journal_ref && (
                            <div className="text-[10px] font-mono text-[#707070] mt-1">
                              القيد: {t.gl_journal_ref}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingPnrTarget({
                                  kind: 'TRIP',
                                  id: t.id,
                                  employeeName: t.employee_name,
                                  pnrCode: t.pnr_code || '',
                                  ticketNumber: t.ticket_number || '',
                                  visaNo: t.exit_reentry_visa_no || '',
                                  visaExpiry: t.exit_reentry_visa_expiry || '2026-12-31',
                                })
                              }
                              className="button-outline-on-light"
                              style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '26px' }}
                            >
                              توثيق PNR/التذكرة
                            </button>
                            {t.status !== 'معتمد ومصروف' && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handlePostTravelExpenseToJournal({
                                    kind: 'TRIP',
                                    recordId: t.id,
                                    employeeName: t.employee_name,
                                    amount: t.total_allowance,
                                    description: `صرف مخصص انتداب وتذكرة عمل (${t.destination}) للموظف ${t.employee_name}`,
                                    pnrCode: t.pnr_code,
                                  })
                                }
                                className="button-primary-pill"
                                style={{ padding: '2px 10px', fontSize: '10.5px', minHeight: '26px' }}
                              >
                                <BookOpenCheck className="w-3 h-3 ml-1" />
                                <span>اعتماد وترحيل القيد</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Update PNR / Ticket Number / Exit-Reentry Visa */}
      {editingPnrTarget && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setEditingPnrTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm dir-rtl text-right"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden"
          >
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                <span>توثيق PNR والتذكرة وتأشيرة الخروج والعودة — {editingPnrTarget.employeeName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingPnrTarget(null)}
                className="p-1 rounded-full text-[#707070] hover:text-[#141414]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePnrAndVisaModal} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#141414] mb-1">رمز الحجز (PNR Code) *</label>
                <input
                  type="text"
                  required
                  value={editingPnrTarget.pnrCode}
                  onChange={(e) =>
                    setEditingPnrTarget({ ...editingPnrTarget, pnrCode: e.target.value })
                  }
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 font-mono font-bold text-[#141414]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#141414] mb-1">
                  رقم التذكرة الإلكترونية (Ticket Number) *
                </label>
                <input
                  type="text"
                  required
                  value={editingPnrTarget.ticketNumber}
                  onChange={(e) =>
                    setEditingPnrTarget({ ...editingPnrTarget, ticketNumber: e.target.value })
                  }
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 font-mono text-[#141414]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#141414] mb-1">
                  رقم تأشيرة الخروج والعودة (مقيم)
                </label>
                <input
                  type="text"
                  value={editingPnrTarget.visaNo}
                  onChange={(e) =>
                    setEditingPnrTarget({ ...editingPnrTarget, visaNo: e.target.value })
                  }
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 font-mono text-[#141414]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#141414] mb-1">
                  تاريخ انتهاء تأشيرة الخروج والعودة
                </label>
                <input
                  type="date"
                  value={editingPnrTarget.visaExpiry === '—' ? '' : editingPnrTarget.visaExpiry}
                  onChange={(e) =>
                    setEditingPnrTarget({ ...editingPnrTarget, visaExpiry: e.target.value })
                  }
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 font-mono text-[#141414]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setEditingPnrTarget(null)}
                  className="button-outline-on-light"
                  style={{ minHeight: '34px', padding: '4px 14px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ minHeight: '34px', padding: '4px 18px' }}
                >
                  حفظ وتوثيق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Flight Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in dir-rtl text-right"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white border border-[#e0e0e0] rounded-[24px] overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#141414] flex items-center gap-2">
                <Plane className="w-4 h-4 text-[#141414]" />
                <span>جدولة رحلة طيران جديدة (Logistics Form)</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-[#141414] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleAddFlight}
              className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-white text-[#141414]"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#141414] block mb-1 font-semibold">
                    نوع الرحلة *
                  </label>
                  <select
                    value={travelType}
                    onChange={(e) => setTravelType(e.target.value as any)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="وصول">رحلة وصول إلى المملكة</option>
                    <option value="ترحيل">رحلة ترحيل ومغادرة</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#141414] block mb-1 font-semibold">
                    اسم العاملة *
                  </label>
                  <input
                    type="text"
                    required
                    value={maidName}
                    onChange={(e) => setMaidName(e.target.value)}
                    placeholder="اسم العاملة بالجواز"
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#141414] block mb-1 font-semibold">
                    شركة الطيران *
                  </label>
                  <select
                    value={airline}
                    onChange={(e) => setAirline(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option>الخطوط السعودية (SAUDIA)</option>
                    <option>الخطوط الإثيوبية (Ethiopian)</option>
                    <option>الخطوط الفلبينية (Philippine Airlines)</option>
                    <option>طيران ناس (Flynas)</option>
                    <option>طيران الإمارات (Emirates)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#141414] block mb-1 font-semibold">
                    رقم الرحلة *
                  </label>
                  <input
                    type="text"
                    required
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                    placeholder="SV-861"
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#141414] block mb-1 font-semibold">
                    تاريخ الرحلة *
                  </label>
                  <input
                    type="date"
                    required
                    value={flightDate}
                    onChange={(e) => setFlightDate(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#141414] block mb-1 font-semibold">
                    توقيت الوصول *
                  </label>
                  <input
                    type="time"
                    required
                    value={flightTime}
                    onChange={(e) => setFlightTime(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#141414] block mb-1 font-semibold">
                  مطار الوصول بالمملكة *
                </label>
                <select
                  value={arrivalAirport}
                  onChange={(e) => setArrivalAirport(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option>مطار الملك خالد الدولي - الرياض (RUH)</option>
                  <option>مطار الملك عبدالعزيز الدولي - جدة (JED)</option>
                  <option>مطار الملك فهد الدولي - الدمام (DMM)</option>
                  <option>مطار الأمير محمد بن عبدالعزيز - المدينة (MED)</option>
                  <option>مطار أبها الإقليمي (AHB)</option>
                </select>
              </div>

              <div className="p-4 bg-[#f3f3f3] border-t border-[#e0e0e0] flex items-center justify-end gap-3 -mx-6 -mb-6 mt-4">
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
                  حفظ وجدولة الرحلة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Airport Reception Order Printable Modal */}
      {selectedFlightForPrint && (
        <div
          role="dialog"
          aria-modal="true"
          data-printable-modal="true"
          onClick={() => setSelectedFlightForPrint(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in dir-rtl text-right"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white border border-[#e0e0e0] rounded-[24px] p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="no-print print:hidden flex justify-between items-center mb-4 border-b border-[#e0e0e0] pb-3">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-[#141414]" />
                <h3 className="font-bold text-[#141414] text-base">
                  أمر استقبال وتفويج سائق المطار الرسمي
                </h3>
              </div>
              <button
                onClick={() => setSelectedFlightForPrint(null)}
                className="p-1 rounded-full text-[#707070] hover:text-[#141414]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Order Body */}
            <div className="erp-printable-sheet p-6 bg-white border-2 border-[#e0e0e0] rounded-2xl space-y-4 font-sans text-xs">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-[#e0e0e0] pb-4">
                <div>
                  <h2 className="text-base font-bold text-[#141414]">
                    مجموعة السليم للاستقدام - إدارة الحركة والترحيل
                  </h2>
                  <div className="text-[11px] text-[#707070]">
                    أمر تفويج واستقبال عمالة من صالة القدوم الدولية
                  </div>
                  <div className="text-[10px] text-[#141414] font-mono font-bold mt-0.5">
                    ORDER ID: #{selectedFlightForPrint.id}-ARRIV
                  </div>
                </div>
                <div className="w-14 h-14 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] rounded-xl flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-[#141414]" />
                </div>
              </div>

              {/* Grid: Driver & Flight Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#f3f3f3] rounded-xl border border-[#e0e0e0] space-y-1">
                  <span className="text-[10px] text-[#707070] font-bold block">
                    السائق والمركبة المخصصة
                  </span>
                  <div className="font-bold text-sm text-[#141414]">
                    {selectedFlightForPrint.driver_assigned || 'كابتن الحركة المناوب'}
                  </div>
                  <div className="text-[#707070] text-[11px]">
                    مكلف بالاستقبال والتوصيل المباشر
                  </div>
                </div>
                <div className="p-3 bg-[#f3f3f3] rounded-xl border border-[#e0e0e0] space-y-1">
                  <span className="text-[10px] text-[#141414] font-bold block">
                    موعد ومطار الهبوط
                  </span>
                  <div className="font-bold text-sm text-[#141414]">
                    {selectedFlightForPrint.flight_date} - الساعة{' '}
                    {selectedFlightForPrint.flight_time}
                  </div>
                  <div className="text-[#141414] text-[11px]">
                    {selectedFlightForPrint.arrival_airport}
                  </div>
                </div>
              </div>

              {/* Worker & Flight Specification */}
              <div className="p-3.5 bg-[#f3f3f3] rounded-2xl border border-[#e0e0e0] space-y-2">
                <h4 className="font-bold text-xs text-[#141414] border-b border-[#e0e0e0] pb-1">
                  تفاصيل الرحلة والعمالة القادمة
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#707070]">اسم العامل/ة:</span>{' '}
                    <strong className="text-[#141414]">{selectedFlightForPrint.maid_name}</strong>
                  </div>
                  <div>
                    <span className="text-[#707070]">الجنسية:</span>{' '}
                    <strong className="text-[#141414]">
                      {selectedFlightForPrint.nationality}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#707070]">رقم الجواز:</span>{' '}
                    <span className="font-mono font-bold text-[#141414]">
                      {selectedFlightForPrint.passport_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#707070]">شركة الطيران:</span>{' '}
                    <strong className="text-[#141414]">{selectedFlightForPrint.airline}</strong>
                  </div>
                  <div>
                    <span className="text-[#707070]">رقم الرحلة:</span>{' '}
                    <span className="font-mono font-bold text-[#141414]">
                      {selectedFlightForPrint.flight_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#707070]">رقم التذكرة:</span>{' '}
                    <span className="font-mono text-[#141414]">
                      {selectedFlightForPrint.ticket_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#707070]">العميل الكفيل:</span>{' '}
                    <strong className="text-[#141414]">
                      {selectedFlightForPrint.client_name}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#707070]">الوجهة بعد الاستقبال:</span>{' '}
                    <strong className="text-[#141414] font-bold">
                      مركز الإيواء والضيافة الرئيسي
                    </strong>
                  </div>
                </div>
              </div>

              {/* Driver Instructions */}
              <div className="p-3 bg-[#f3f3f3] rounded-xl border border-[#e0e0e0] text-[11px] text-[#141414] space-y-1">
                <span className="font-bold block">تعليمات السائق في المطار:</span>
                <p>
                  1. التواجد في صالة الوصول قبل موعد هبوط الطائرة بـ 45 دقيقة مع رفع لوحة باسم العاملة والمجموعة.
                </p>
                <p>
                  2. مطابقة رقم الجواز واسم العاملة والتحقق من الحقائب والأمتعة قبل مغادرة المطار.
                </p>
                <p>
                  3. تسليم العاملة لمشرفة مركز الإيواء وتوقيع محضر الاستلام فور الوصول.
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-6 pt-3 border-t-2 border-[#e0e0e0]">
                <div className="text-center space-y-4">
                  <div className="font-bold text-[#141414] text-xs">
                    توقيع مسؤول الحركة والعمليات
                  </div>
                  <div className="w-full h-8 border-b border-[#e0e0e0]"></div>
                </div>
                <div className="text-center space-y-4">
                  <div className="font-bold text-[#141414] text-xs">
                    توقيع واستلام كابتن الاستقبال
                  </div>
                  <div className="w-full h-8 border-b border-[#e0e0e0]"></div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="no-print print:hidden flex justify-between items-center gap-2 pt-4 border-t border-[#e0e0e0] mt-4">
              <button
                type="button"
                onClick={() => window.print()}
                className="button-primary-pill text-xs font-bold inline-flex items-center gap-1.5"
                style={{ minHeight: '36px', padding: '6px 20px' }}
              >
                <Printer className="w-4 h-4" />
                <span>طباعة أمر الاستقبال فوراً</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFlightForPrint(null)}
                className="button-outline-on-light text-xs font-bold"
                style={{ minHeight: '36px', padding: '6px 18px' }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelPage;
