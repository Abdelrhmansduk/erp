import React, { createContext, useContext, useState, useEffect } from 'react';
import { CompanyId, CompanyEntity } from '../types';

export const GROUP_MASTER_ENTITY: CompanyEntity = {
  id: 'all' as CompanyId,
  code: 'GRP',
  name: 'مجموعة السليم القابضة للاستقدام والخدمات التشغيلية',
  nameEn: 'Al-Sulaim Holding Group for Recruitment & Operations',
  logo: '/logos/group-logo.png',
  taxNumber: '310099887766003',
  crNumber: '1010998877',
  address: 'الرياض - طريق الملك فهد - البرج الموحد للمجموعة',
  phone: '920001234',
  email: 'group@alsulaim.com.sa',
  branchesCount: 18,
  employeesCount: 450,
  activeOrdersCount: 1240,
  revenueYTD: 28500000,
  vatRate: 0.15,
  currency: '⃁',
  branding: {
    primaryColor: '#141414',
    secondaryColor: '#141414',
    accentColor: '#141414',
    logoUrl: '/logos/group-logo.png',
    headerLogoUrl: '/logos/group-logo.png',
    reportHeaderTemplate: 'MEMBER OF KHALID AL-SULAIM GROUP',
  },
};

export const COMPANIES_LIST: CompanyEntity[] = [
  {
    id: 'SAF',
    code: 'SAF',
    name: 'شركة السفير الماسي للاستقدام',
    nameEn: 'Alsafeer Almassy Recruitment Company (SAF RC01)',
    logo: '/logos/saf.png',
    taxNumber: '310123456700003',
    crNumber: '1010123456',
    address: 'الرياض - حي الملز - شارع الستين',
    phone: '0114001122',
    email: 'info@saf-rec.sa',
    branchesCount: 5,
    employeesCount: 120,
    activeOrdersCount: 380,
    revenueYTD: 8900000,
    vatRate: 0.15,
    currency: '⃁',
    branding: {
      primaryColor: '#0284c7',
      secondaryColor: '#0369a1',
      accentColor: '#38bdf8',
      logoUrl: '/logos/saf.png',
      headerLogoUrl: '/logos/saf.png',
      reportHeaderTemplate: 'شركة السفير الماسي للاستقدام (SAF RC01) - سجل تجاري 1010123456',
    },
  },
  {
    id: 'YAQ',
    code: 'YAQ',
    name: 'شركة ياقوت نجد لتشغيل الكوادر والتأجير',
    nameEn: 'Yaqout Najed Operations & Staffing (YAQ RC02)',
    logo: '/logos/yaqoot.png',
    taxNumber: '310234567800003',
    crNumber: '1010234567',
    address: 'جدة - طريق المدينة المنورة',
    phone: '0126002233',
    email: 'contact@yaqoot-ops.sa',
    branchesCount: 4,
    employeesCount: 95,
    activeOrdersCount: 290,
    revenueYTD: 6700000,
    vatRate: 0.15,
    currency: '⃁',
    branding: {
      primaryColor: '#141414',
      secondaryColor: '#262626',
      accentColor: '#141414',
      logoUrl: '/logos/yaqoot.png',
      headerLogoUrl: '/logos/yaqoot.png',
      reportHeaderTemplate: 'شركة ياقوت نجد لتشغيل الكوادر والتأجير (YAQ RC02) - سجل تجاري 1010234567',
    },
  },
  {
    id: 'TOP',
    code: 'TOP',
    name: 'شركة توباز للاستقدام',
    nameEn: 'Topaz Recruitment Company (TOP RC03)',
    logo: '/logos/topaz.png',
    taxNumber: '310345678900003',
    crNumber: '1010345678',
    address: 'الدمام - شارع الأشرعة',
    phone: '0138003344',
    email: 'recruitment@topaz-rec.sa',
    branchesCount: 6,
    employeesCount: 160,
    activeOrdersCount: 420,
    revenueYTD: 9800000,
    vatRate: 0.15,
    currency: '⃁',
    branding: {
      primaryColor: '#0d9488',
      secondaryColor: '#0f766e',
      accentColor: '#2dd4bf',
      logoUrl: '/logos/topaz.png',
      headerLogoUrl: '/logos/topaz.png',
      reportHeaderTemplate: 'شركة توباز للاستقدام (TOP RC03) - سجل تجاري 1010345678',
    },
  },
  {
    id: 'DAR',
    code: 'DAR',
    name: 'دار الرواد لمراكز الإيواء والخدمات اللوجستية',
    nameEn: 'Dar Al-Ruwad Shelter & Logistics (DAR RC05)',
    logo: '/logos/ruwad.png',
    taxNumber: '310456789000003',
    crNumber: '1010642918',
    address: 'الرياض - حي الرمال - مجمع الإيواء المعتمد',
    phone: '0114889900',
    email: 'shelter@alruwad.sa',
    branchesCount: 4,
    employeesCount: 75,
    activeOrdersCount: 185,
    revenueYTD: 4200000,
    vatRate: 0.15,
    currency: '⃁',
    branding: {
      primaryColor: '#1e40af',
      secondaryColor: '#1d4ed8',
      accentColor: '#60a5fa',
      logoUrl: '/logos/ruwad.png',
      headerLogoUrl: '/logos/ruwad.png',
      reportHeaderTemplate: 'دار الرواد لمراكز الإيواء والخدمات اللوجستية (DAR RC05) - سجل تجاري 1010642918',
    },
  },
  {
    id: 'KAS',
    code: 'KAS',
    name: 'شركة كاس للتجارة والمنافسات',
    nameEn: 'KAS Trading & Commercial Company (Standalone System)',
    logo: '/logo.png',
    taxNumber: '310284759200003',
    crNumber: '1010789234',
    address: 'الرياض - طريق الملك فهد - مجمع شركة كاس للتجارة',
    phone: '0114995566',
    email: 'info@kas.sa',
    branchesCount: 4,
    employeesCount: 85,
    activeOrdersCount: 210,
    revenueYTD: 5400000,
    vatRate: 0.15,
    currency: '⃁',
    branding: {
      primaryColor: '#141414',
      secondaryColor: '#141414',
      accentColor: '#141414',
      logoUrl: '/logo.png',
      headerLogoUrl: '/logo.png',
      reportHeaderTemplate: 'شركة كاس للتجارة والمنافسات (نظام تجاري مستقل) - سجل تجاري 1010789234',
    },
  },
];

// Helper to normalize legacy IDs (masi, yaqoot, topaz, ruwad, kas) to official codes
export const normalizeCompanyId = (id: CompanyId | string): CompanyId => {
  switch (id) {
    case 'masi':
      return 'SAF';
    case 'yaqoot':
      return 'YAQ';
    case 'topaz':
      return 'TOP';
    case 'ruwad':
      return 'DAR';
    case 'kas':
      return 'KAS';
    default:
      return id as CompanyId;
  }
};

interface CompanyContextType {
  activeCompanyId: CompanyId;
  activeCompany: CompanyEntity;
  activeBranch: string;
  setActiveCompanyId: (id: CompanyId) => void;
  setActiveBranch: (branch: string) => void;
  companies: CompanyEntity[];
  isGroupAdminView: boolean;
  isSessionCompanyLocked: boolean;
  getCompanyByCode: (code: string) => CompanyEntity | undefined;
}

import { authService, getLockedSessionCompany } from '../services/authService';

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCompanyId, setActiveCompanyIdState] = useState<CompanyId>(() => {
    // Synchronous init from the locked session so isolated companies (e.g. KAS Trade)
    // never render a single frame with another company's defaults.
    try {
      const currentUser = authService.getCurrentUser();
      if (currentUser && authService.isAdmin(currentUser)) return 'all';
      const locked = getLockedSessionCompany();
      if (locked) return normalizeCompanyId(locked as CompanyId);
      if (currentUser?.company_id && currentUser.company_id !== 'all') {
        return normalizeCompanyId(currentUser.company_id as CompanyId);
      }
    } catch {
      /* fall through to default */
    }
    return 'SAF';
  });
  const [activeBranch, setActiveBranch] = useState<string>('الفرع الرئيسي');

  const setActiveCompanyId = (id: CompanyId) => {
    const normalized = normalizeCompanyId(id);
    const currentUser = authService.getCurrentUser();
    const isGroupAdmin = authService.isAdmin(currentUser);
    const sessionLocked = getLockedSessionCompany();

    // Enforce strict per-company session lock for non-Group-Admin sessions
    if (sessionLocked && currentUser && !isGroupAdmin) {
      const enforcedCompany = normalizeCompanyId(sessionLocked);
      setActiveCompanyIdState(enforcedCompany);
      localStorage.setItem('alsulaim_active_company', enforcedCompany);
      return;
    }

    if (normalized === 'all' && currentUser && !isGroupAdmin) {
      const assigned = normalizeCompanyId((currentUser.company_id as CompanyId) || 'SAF');
      setActiveCompanyIdState(assigned);
      localStorage.setItem('alsulaim_active_company', assigned);
      return;
    }

    setActiveCompanyIdState(normalized);
    localStorage.setItem('alsulaim_active_company', normalized);
  };

  useEffect(() => {
    const syncCompanyFromAuth = () => {
      const currentUser = authService.getCurrentUser();
      const isGroupAdmin = authService.isAdmin(currentUser);
      const sessionLocked = getLockedSessionCompany();
      const saved = localStorage.getItem('alsulaim_active_company') as CompanyId | null;

      if (sessionLocked && !isGroupAdmin) {
        const lockedCompany = normalizeCompanyId(sessionLocked);
        setActiveCompanyIdState(lockedCompany);
        localStorage.setItem('alsulaim_active_company', lockedCompany);
        if (currentUser?.branch) setActiveBranch(currentUser.branch);
        return;
      }

      if (currentUser && !isGroupAdmin && currentUser.company_id && currentUser.company_id !== 'all') {
        const lockedCompany = normalizeCompanyId(currentUser.company_id);
        setActiveCompanyIdState(lockedCompany);
        localStorage.setItem('alsulaim_active_company', lockedCompany);
        if (currentUser.branch) setActiveBranch(currentUser.branch);
        return;
      }

      if (currentUser && isGroupAdmin) {
        setActiveCompanyIdState('all');
        localStorage.setItem('alsulaim_active_company', 'all');
        if (currentUser.branch) setActiveBranch(currentUser.branch);
        return;
      }

      if (saved) {
        const normSaved = normalizeCompanyId(saved);
        if (normSaved === 'all' && !isGroupAdmin) {
          setActiveCompanyIdState('SAF');
        } else {
          setActiveCompanyIdState(normSaved);
        }
      }
    };

    syncCompanyFromAuth();
    window.addEventListener('alsulaim-auth-updated', syncCompanyFromAuth);
    return () => window.removeEventListener('alsulaim-auth-updated', syncCompanyFromAuth);
  }, []);

  const normalizedId = normalizeCompanyId(activeCompanyId);

  const activeCompany =
    normalizedId === 'all'
      ? GROUP_MASTER_ENTITY
      : COMPANIES_LIST.find((c) => c.id === normalizedId || c.code === normalizedId) || GROUP_MASTER_ENTITY;

  const isGroupAdminView = normalizedId === 'all';
  const isSessionCompanyLocked = Boolean(getLockedSessionCompany()) && !authService.isAdmin(authService.getCurrentUser());

  const getCompanyByCode = (code: string): CompanyEntity | undefined => {
    const norm = normalizeCompanyId(code);
    return COMPANIES_LIST.find((c) => c.id === norm || c.code === norm);
  };

  return (
    <CompanyContext.Provider
      value={{
        activeCompanyId: normalizedId,
        activeCompany,
        activeBranch,
        setActiveCompanyId,
        setActiveBranch,
        companies: COMPANIES_LIST,
        isGroupAdminView,
        isSessionCompanyLocked,
        getCompanyByCode,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

