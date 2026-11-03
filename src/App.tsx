import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AppShell } from './components/layout/AppShell';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { IamSessionProvider } from './contexts/IamSessionContext';
import { CompanyId } from './types';
import { ImpersonationProvider } from './contexts/ImpersonationContext';
import { RBACProvider } from './contexts/RBACContext';

import { useAppStore } from './stores/appStore';
import {
  authService,
  resolveDepartmentAndCompany,
  CORPORATE_DEPARTMENTS,
  DepartmentId,
} from './services/authService';
import { legalService } from './services/legalService';
import { useAuthContext } from './contexts/AuthContext';
import { QuickSearchModal } from './components/common/QuickSearchModal';
import { UniversalNotificationToaster } from './components/common/UniversalNotificationToaster';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';
import { AICopilotWidget } from './components/common/AICopilotWidget';
import { ExecutiveWelcomeScreen } from './components/auth/ExecutiveWelcomeScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LegalDisclaimerModal } from './components/legal/LegalDisclaimerModal';
import { employeeMonitoringService } from './services/employeeMonitoringService';
import { backgroundExecutionService } from './services/backgroundExecutionService';
import { realtimeSubscriptionService } from './services/realtimeSubscriptionService';
import { notificationPopupEngine } from './services/notificationPopupEngine';

import './styles/index.css';
import './styles/layout.css';
import './styles/components.css';

// Resilient Lazy Import with Auto-Recovery on Deployment Cache Mismatch
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | any>
) {
  return lazy(() =>
    factory().catch((error: any) => {
      console.warn('Chunk import failed, attempting self-healing reload:', error);
      const isChunkError =
        error?.name === 'ChunkLoadError' ||
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Expected a JavaScript-or-Wasm module script') ||
        error?.message?.includes('Importing a module script failed');

      if (isChunkError) {
        const reloadKey = 'erp_lazy_retry_lock';
        const last = sessionStorage.getItem(reloadKey);
        if (!last || Date.now() - Number(last) > 10000) {
          sessionStorage.setItem(reloadKey, String(Date.now()));
          window.location.reload();
          return new Promise(() => {}); // prevent further error cascade during reload
        }
      }
      throw error;
    })
  );
}

// Dynamic Lazy Imports for Enterprise Modules
const DashboardPage = lazyWithRetry(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const GroupCommandCenterPage = lazyWithRetry(() => import('./pages/GroupCommandCenterPage').then(m => ({ default: m.GroupCommandCenterPage })));
const CompanySelectorPortal = lazyWithRetry(() => import('./components/portal/CompanySelectorPortal').then(m => ({ default: m.CompanySelectorPortal })));
const EnterpriseATSPipelinePage = lazyWithRetry(() => import('./pages/EnterpriseATSPipelinePage').then(m => ({ default: m.EnterpriseATSPipelinePage })));
const ExternalOfficesAgentsPage = lazyWithRetry(() => import('./pages/ExternalOfficesAgentsPage').then(m => ({ default: m.ExternalOfficesAgentsPage })));
const UnifiedCommunicationCenterPage = lazyWithRetry(() => import('./pages/UnifiedCommunicationCenterPage').then(m => ({ default: m.UnifiedCommunicationCenterPage })));
const MicrosoftIntegrationCenterPage = lazyWithRetry(() => import('./pages/MicrosoftIntegrationCenterPage').then(m => ({ default: m.MicrosoftIntegrationCenterPage })));

const RecruitmentContractsPage = lazyWithRetry(() => import('./pages/RecruitmentContractsPage').then(m => ({ default: m.RecruitmentContractsPage })));
const MusanedIntegrationPlanPage = lazyWithRetry(() => import('./pages/MusanedIntegrationPlanPage').then(m => ({ default: m.MusanedIntegrationPlanPage })));
const RentContractsPage = lazyWithRetry(() => import('./pages/RentContractsPage').then(m => ({ default: m.RentContractsPage })));
const CreateCVPage = lazyWithRetry(() => import('./pages/CreateCVPage').then(m => ({ default: m.CreateCVPage })));
const CVsBankPage = lazyWithRetry(() => import('./pages/CVsBankPage').then(m => ({ default: m.CVsBankPage })));
const OrdersPage = lazyWithRetry(() => import('./pages/OrdersPage').then(m => ({ default: m.OrdersPage })));
const ShelterPage = lazyWithRetry(() => import('./pages/ShelterPage').then(m => ({ default: m.ShelterPage })));
const ShelterSuitePortalPage = lazyWithRetry(() => import('./pages/ShelterSuitePortalPage').then(m => ({ default: m.ShelterSuitePortalPage })));
const SponsorshipTransferPage = lazyWithRetry(() => import('./pages/SponsorshipTransferPage').then(m => ({ default: m.SponsorshipTransferPage })));
const TravelPage = lazyWithRetry(() => import('./pages/TravelPage').then(m => ({ default: m.TravelPage })));
const ComplaintsPage = lazyWithRetry(() => import('./pages/ComplaintsPage').then(m => ({ default: m.ComplaintsPage })));
const OfficesPage = lazyWithRetry(() => import('./pages/OfficesPage').then(m => ({ default: m.OfficesPage })));
const FinancialRequestsPage = lazyWithRetry(() => import('./pages/FinancialRequestsPage').then(m => ({ default: m.FinancialRequestsPage })));
const FinancePage = lazyWithRetry(() => import('./pages/FinancePage').then(m => ({ default: m.FinancePage })));
const ClientsPage = lazyWithRetry(() => import('./pages/ClientsPage').then(m => ({ default: m.ClientsPage })));
const HRPage = lazyWithRetry(() => import('./pages/HRPage').then(m => ({ default: m.HRPage })));
const ReportsPage = lazyWithRetry(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazyWithRetry(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const UsersPage = lazyWithRetry(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })));
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const WhatsAppInboxPage = lazyWithRetry(() => import('./pages/WhatsAppInboxPage').then(m => ({ default: m.WhatsAppInboxPage })));
const AgentImportsPage = lazyWithRetry(() => import('./pages/AgentImportsPage').then(m => ({ default: m.AgentImportsPage })));
const ZATCAPage = lazyWithRetry(() => import('./pages/ZATCAPage').then(m => ({ default: m.ZATCAPage })));
const AttendancesPage = lazyWithRetry(() => import('./pages/AttendancesPage').then(m => ({ default: m.AttendancesPage })));
const RentPackagesPage = lazyWithRetry(() => import('./pages/RentPackagesPage').then(m => ({ default: m.RentPackagesPage })));
const ActivityLogPage = lazyWithRetry(() => import('./pages/ActivityLogPage').then(m => ({ default: m.ActivityLogPage })));
const WebsiteVisitorsPage = lazyWithRetry(() => import('./pages/WebsiteVisitorsPage').then(m => ({ default: m.WebsiteVisitorsPage })));
const SentMessagesPage = lazyWithRetry(() => import('./pages/SentMessagesPage').then(m => ({ default: m.SentMessagesPage })));
const CustodiesPage = lazyWithRetry(() => import('./pages/CustodiesPage').then(m => ({ default: m.CustodiesPage })));
const CostCentersPage = lazyWithRetry(() => import('./pages/CostCentersPage').then(m => ({ default: m.CostCentersPage })));
const JournalsPage = lazyWithRetry(() => import('./pages/JournalsPage').then(m => ({ default: m.JournalsPage })));
const MasterConstantsPage = lazyWithRetry(() => import('./pages/MasterConstantsPage').then(m => ({ default: m.MasterConstantsPage })));
const AppLauncherPage = lazyWithRetry(() => import('./pages/AppLauncherPage').then(m => ({ default: m.AppLauncherPage })));
const IngazPage = lazyWithRetry(() => import('./pages/IngazPage').then(m => ({ default: m.IngazPage })));
const AdminDashboardPage = lazyWithRetry(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const BranchCommunicationPage = lazyWithRetry(() => import('./pages/BranchCommunicationPage').then(m => ({ default: m.BranchCommunicationPage })));
const GroupDispatchPage = lazyWithRetry(() => import('./pages/GroupDispatchPage').then(m => ({ default: m.GroupDispatchPage })));
const BranchDepartmentsPage = lazyWithRetry(() => import('./pages/BranchDepartmentsPage').then(m => ({ default: m.BranchDepartmentsPage })));
const DataImportWizardPage = lazyWithRetry(() => import('./pages/DataImportWizardPage').then(m => ({ default: m.DataImportWizardPage })));
const SmaccModulesPage = lazyWithRetry(() => import('./pages/SmaccModulesPage').then(m => ({ default: m.SmaccModulesPage })));
const SmaccAccountingPage = lazyWithRetry(() => import('./pages/SmaccAccountingPage').then(m => ({ default: m.SmaccAccountingPage })));
const SmaccInventoryAssetsPage = lazyWithRetry(() => import('./pages/SmaccInventoryAssetsPage').then(m => ({ default: m.SmaccInventoryAssetsPage })));
const SmaccEmployeesSettingsPage = lazyWithRetry(() => import('./pages/SmaccEmployeesSettingsPage').then(m => ({ default: m.SmaccEmployeesSettingsPage })));
const LegalCompliancePage = lazyWithRetry(() => import('./pages/LegalCompliancePage').then(m => ({ default: m.LegalCompliancePage })));
const TendersBOQPage = lazyWithRetry(() => import('./pages/TendersBOQPage').then(m => ({ default: m.TendersBOQPage })));
const KasEtimadCloudPage = lazyWithRetry(() => import('./pages/KasEtimadCloudPage').then(m => ({ default: m.KasEtimadCloudPage })));
const KasSuitePortalPage = lazyWithRetry(() => import('./pages/KasSuitePortalPage').then(m => ({ default: m.KasSuitePortalPage })));
const IdentityAccessManagementPage = lazyWithRetry(() => import('./pages/IdentityAccessManagementPage').then(m => ({ default: m.IdentityAccessManagementPage })));
const ClientPortalPage = lazyWithRetry(() => import('./pages/ClientPortalPage').then(m => ({ default: m.ClientPortalPage })));
const ForeignAgencyPortalPage = lazyWithRetry(() => import('./pages/ForeignAgencyPortalPage').then(m => ({ default: m.ForeignAgencyPortalPage })));
const EmployeeMonitoringPage = lazyWithRetry(() => import('./pages/EmployeeMonitoringPage').then(m => ({ default: m.EmployeeMonitoringPage })));

const PageFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8">
    <Loader2 className="w-10 h-10 animate-spin text-[#8C6239] mb-3" />
    <span className="text-sm font-medium text-zinc-600 animate-pulse">جاري تحميل النظام المؤسسي...</span>
  </div>
);

const MainContent: React.FC = () => {
  const {
    flowState,
    setFlowState,
    loginPortalCode,
    navigateToCompanyLogin,
    activeTab,
    activeTabTitle,
    setActiveTab,
    syncFromUrlLocation,
  } = useAppStore();
  const { user, session, loading: authLoading, isAuthenticated, mfaRequirement, signOut } = useAuthContext();

  const [showLegalModal, setShowLegalModal] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      syncFromUrlLocation();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [syncFromUrlLocation]);

  // Display-only profile for the legal modal / telemetry. Never used for access decisions.
  const currentUserForLegal = useMemo(() => {
    const scope = resolveDepartmentAndCompany(
      user?.email || user?.username || '',
      user?.role,
      user?.company_id,
      user?.department_id
    );
    const deptMeta = CORPORATE_DEPARTMENTS[scope.departmentId as DepartmentId];
    return {
      name: user?.full_name || '',
      username: user?.username || '',
      department: deptMeta?.nameAr || 'الإدارة التشغيلية',
      job_title: user?.role || '',
      branch: user?.branch || '',
      national_id: '',
      role: user?.role || '',
    };
  }, [user]);

  const isProtectedFlow = flowState === 'workspace' || flowState === 'launcher';

  // SECURITY GATE: launcher/workspace require a real session with MFA satisfied.
  useEffect(() => {
    if (authLoading || !isProtectedFlow) return;
    const hasCachedSession = Boolean(authService.getCurrentUser());
    if (!isAuthenticated && !hasCachedSession) {
      setFlowState('login');
    }
  }, [authLoading, isProtectedFlow, isAuthenticated, session, mfaRequirement, setFlowState]);

  // Legal acknowledgement is verified against the database / corporate session.
  useEffect(() => {
    if (authLoading || !isProtectedFlow || (!isAuthenticated && !authService.getCurrentUser())) return;
    let cancelled = false;
    legalService.hasSigned().then(signed => {
      if (!cancelled) setShowLegalModal(!signed);
    });
    return () => { cancelled = true; };
  }, [authLoading, isProtectedFlow, isAuthenticated]);

  const handleLogout = async () => {
    const returnPortalCode =
      loginPortalCode ||
      localStorage.getItem('ALSULAIM_TARGET_SYSTEM') ||
      (user?.company_id && user.company_id !== 'all' ? user.company_id.toLowerCase() : null);

    try {
      await signOut();
    } catch (e) {
      console.warn('Sign-out failed:', e);
    }
    setShowLegalModal(false);
    if (returnPortalCode) {
      navigateToCompanyLogin(returnPortalCode);
    } else {
      setFlowState('login');
    }
  };

  // SECURITY: Enforce per-department and per-company workspace boundaries on every tab navigation
  const handleSelectTab = (href: string, title: string = '') => {
    if (href === 'logout') {
      void handleLogout();
      return;
    }
    const currentUser = authService.getCurrentUser() || user;
    if (!isAuthenticatedRef.current && !currentUser) {
      console.warn('[SECURITY] Navigation blocked — no authenticated session.');
      setFlowState('login');
      return;
    }

    if (!authService.isTabAuthorizedForUser(currentUser, href)) {
      const scope = resolveDepartmentAndCompany(
        currentUser?.email || currentUser?.username || '',
        currentUser?.role,
        currentUser?.company_id,
        currentUser?.department_id
      );
      const deptMeta = CORPORATE_DEPARTMENTS[scope.departmentId as DepartmentId];
      console.warn(
        `[DEPARTMENT ISOLATION] Blocked access to unauthorized module (${href}) for department (${scope.departmentId}).`
      );
      notificationPopupEngine.warning(
        'عزل الصلاحيات المؤسسي (RBAC)',
        `حسابك مقيد حصرياً على (${deptMeta?.nameAr || scope.departmentId}) ولا يملك صلاحية الدخول إلى هذا القسم.`
      );
      if (deptMeta) {
        setFlowState('workspace');
        setActiveTab(deptMeta.defaultTab, deptMeta.defaultTabTitle);
      }
      return;
    }

    setFlowState('workspace');
    setActiveTab(href, title || href);
  };

  // Keep the latest auth flag available to long-lived event listeners.
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  useEffect(() => {
    const handleNav = (e: any) => {
      if (e.detail?.tab) {
        handleSelectTab(e.detail.tab, e.detail.title || e.detail.tab);
      }
    };
    window.addEventListener('alsulaim_navigate', handleNav);
    return () => window.removeEventListener('alsulaim_navigate', handleNav);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize Global Clickstream, Rage Click & Activity Telemetry (authenticated users only)
  useEffect(() => {
    if (!isAuthenticated) return;
    const cleanup = employeeMonitoringService.initGlobalTelemetry(() => {
      const current = authService.getCurrentUser();
      return current ? {
        id: current.id,
        name: current.full_name,
        role: current.role,
        branch: current.branch
      } : null as any;
    });
    return cleanup;
  }, [isAuthenticated]);

  // Initialize Mobile Background Execution Engine, ServiceWorker Sync & Realtime Order Notifications
  useEffect(() => {
    const stopBackgroundEngine = backgroundExecutionService.start();
    return () => {
      stopBackgroundEngine();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const targetCompany = user?.company_id || useAppStore.getState().activeCompanyId || 'SAF';
    const unsubscribeRealtime = realtimeSubscriptionService.subscribeTenantOrders(
      targetCompany,
      (payload) => {
        notificationPopupEngine.info(
          'تحديث فوري على الطلبات (Realtime)',
          `تم تحديث حالة الطلب #${payload.id} إلى (${payload.status}) في الكيان [${payload.company_id || targetCompany}].`,
          { label: 'عرض الطلبات', tabKey: 'orders' }
        );
      }
    );
    return () => {
      unsubscribeRealtime();
    };
  }, [isAuthenticated, user?.company_id]);

  // Router Page Content Resolver
  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleSelectTab} />;

      case 'group-command-center':
        return <GroupCommandCenterPage />;

      case 'company-selector':
        return (
          <CompanySelectorPortal 
            onSelectCompany={(companyId: CompanyId) => {
              if (companyId === 'KAS' || companyId === 'kas') {
                handleSelectTab('kas-suite', 'البوابة المستقلة لشركة كاس (KAS Suite)');
              } else {
                handleSelectTab('dashboard', 'الرئيسية والمؤشرات التشغيلية');
              }
            }} 
          />
        );

      case 'ats-pipeline':
        return <EnterpriseATSPipelinePage />;

      case 'external-offices':
        return <ExternalOfficesAgentsPage />;

      case 'unified-communication':
        return <UnifiedCommunicationCenterPage />;

      case 'microsoft-center':
        return <MicrosoftIntegrationCenterPage />;

      case 'admin-dashboard':
        return <AdminDashboardPage onNavigate={handleSelectTab} />;

      case 'branch-communication':
        return <BranchCommunicationPage />;

      case 'group-dispatch':
        return <GroupDispatchPage />;

      case 'branch-departments':
      case 'branches':
        return <BranchDepartmentsPage />;

      case 'recruitment-contracts':
      case 'create-contract':
      case 'current-contracts':
      case 'completed-contracts':
      case 'returned-contracts':
      case 'dispatches':
      case 'contract-extension-requests':
      case 'contract-return-requests':
      case 'musaned-pipeline':
      case 'musaned-sync':
      case 'contract-insurance':
        return <RecruitmentContractsPage />;

      case 'musaned-master-plan':
      case 'musaned-plan':
      case 'musaned-integration-plan':
        return <MusanedIntegrationPlanPage />;

      case 'rent-contracts':
      case 'create-rent':
      case 'all-rent-contracts':
      case 'rental-orders':
      case 'active-rent':
      case 'transferred-rent':
      case 'completed-rent':
      case 'rent-contract-terms':
      case 'rental-drivers':
      case 'rental-domestic':
        return <RentContractsPage />;

      case 'rent-packages':
        return <RentPackagesPage />;

      case 'create-cv':
        return <CreateCVPage />;

      case 'cvs-recruitment':
      case 'cvs-rental':
      case 'rental-cvs':
      case 'cvs-backout':
      case 'cvs-deleted':
      case 'cvs-pending':
      case 'cvs-reserved':
      case 'cvs':
        return <CVsBankPage />;

      case 'orders':
      case 'all-orders':
      case 'new-orders':
      case 'in-progress-orders':
      case 'contracted-orders':
      case 'incomplete-orders':
      case 'urgent-orders':
      case 'create-order':
      case 'professional-requests':
      case 'special-requests':
      case 'renew-contracts':
      case 'known-service':
      case 'contact-requests':
        return <OrdersPage />;

      case 'ingaz':
      case 'create-ingaz':
      case 'ingaz-delegations':
      case 'chamber-commerce':
      case 'visa-issuance':
        return <IngazPage />;

      case 'shelter':
      case 'create-shelter':
      case 'inside-shelter':
      case 'outside-shelter':
      case 'available-transfer':
      case 'deportation-stage':
      case 'shelter-places':
      case 'room-management':
      case 'food-catering':
      case 'shelter-suite':
      case 'shelter-portal':
      case 'shelter-housing-suite':
        return <ShelterSuitePortalPage />;

      case 'sponsorship-transfer':
      case 'transfer-requests':
      case 'web-transfer-requests':
      case 'trial-period':
      case 'transferred-done':
      case 'transfer-contract-terms':
        return <SponsorshipTransferPage />;

      case 'travel':
      case 'arrival-flights':
      case 'deportation-flights':
      case 'deportation-travel':
      case 'logistics':
      case 'airport-reception':
        return <TravelPage />;

      case 'complaints':
      case 'complaints-list':
      case 'create-complaint':
      case 'complaint-types':
      case 'compensation-claims':
        return <ComplaintsPage />;

      case 'offices':
      case 'offices-list':
      case 'office-list':
      case 'add-office':
      case 'office-transfers':
      case 'agent-accounts':
        return <OfficesPage />;

      case 'financial-requests':
      case 'cash-custody':
      case 'all-fin-requests':
      case 'create-fin-request':
      case 'petty-cash':
        return <FinancialRequestsPage />;

      case 'finance-home':
      case 'finance':
      case 'finance-erp':
      case 'general-ledger':
      case 'trial-balance':
      case 'income-statement':
      case 'balance-sheet':
      case 'cash-flow-statement':
      case 'account-statements':
      case 'opening-balances':
      case 'period-closing':
      case 'ar-aging':
      case 'ap-aging':
      case 'credit-debit-notes':
      case 'receipts':
      case 'vouchers':
      case 'receipt-vouchers':
      case 'payment-vouchers':
      case 'banks-boxes':
      case 'bank-reconciliation':
      case 'vat-declaration':
      case 'tax-returns':
      case 'chart-accounts':
        return <FinancePage />;

      case 'cost-centers':
        return <CostCentersPage />;

      case 'journals':
        return <JournalsPage />;

      case 'smacc-accounting':
      case 'smacc-gl':
      case 'smacc-cash':
      case 'smacc-ar':
      case 'smacc-ap':
      case 'smacc-cost':
      case 'smacc-reports':
      case 'finance-smacc-gl':
      case 'finance-smacc-cash':
      case 'finance-smacc-ar':
      case 'finance-smacc-ap':
      case 'finance-smacc-cost':
      case 'finance-smacc-reports':
        return <SmaccAccountingPage />;

      case 'smacc-inventory':
      case 'smacc-inventory-assets':
        return <SmaccInventoryAssetsPage />;

      case 'smacc-hr-settings':
      case 'smacc-employees':
        return <SmaccEmployeesSettingsPage />;

      case 'smacc-modules':
      case 'sales-collectors':
        return <SmaccModulesPage />;

      case 'clients':
      case 'client-list':
      case 'new-client':
      case 'black-list':
      case 'client-blacklist':
      case 'client-categories':
      case 'crm':
        return <ClientsPage />;

      case 'employees':
      case 'employee-list':
      case 'add-employee':
      case 'maids-hr':
      case 'payroll':
      case 'payrolls':
      case 'wps':
      case 'wps-generator':
      case 'salary':
      case 'leave-requests':
      case 'employee-advances':
      case 'employee-sanctions':
      case 'employee-permissions':
      case 'employee-rewards':
      case 'employee-promotions':
      case 'end-of-service':
      case 'gosi-insurance':
      case 'salaries':
      case 'hr':
        return <HRPage />;

      case 'reports':
      case 'reports-hub':
      case 'executive-summary':
      case 'sales-reports':
      case 'recruitment-reports':
      case 'financial-reports':
        return <ReportsPage />;

      case 'profile':
      case 'settings':
      case 'general-settings':
      case 'company-profile':
      case 'integrations':
      case 'quick-links-settings':
      case 'system-backup':
        return <SettingsPage />;

      case 'master-constants':
      case 'nationalities-jobs':
        return <MasterConstantsPage />;

      case 'users':
      case 'users-list':
      case 'roles-permissions':
      case 'iam-matrix':
      case 'users-access':
      case 'iam':
      case 'identity-access':
      case 'access-control':
      case 'iam-control':
      case 'multi-company-iam':
        return <IdentityAccessManagementPage />;

      case 'whatsapp-inbox':
        return <WhatsAppInboxPage />;

      case 'whatsapp-dispatch':
      case 'messages':
      case 'sent-messages':
      case 'sms-dispatch':
        return <SentMessagesPage />;

      case 'visitors':
      case 'website-visitors':
        return <WebsiteVisitorsPage />;

      case 'agent-imports':
        return <AgentImportsPage />;

      case 'data-import':
      case 'import-wizard':
        return <DataImportWizardPage />;

      case 'zatca':
      case 'zatca-phase2':
      case 'zatca-settings':
      case 'shared-bills':
      case 'invoices':
      case 'universal-extractor':
        return <ZATCAPage />;

      case 'attendances':
      case 'daily-work-reports':
        return <AttendancesPage />;

      case 'employee-monitoring':
      case 'monitoring':
      case 'mood-pulse':
      case 'telemetry':
      case 'employee-pulse':
        return <EmployeeMonitoringPage />;

      case 'activity-logs':
      case 'activity-log':
        return <ActivityLogPage />;

      case 'legal-compliance':
      case 'legal-disclaimers':
      case 'legal-policies':
        return <LegalCompliancePage />;

      case 'tenders-boq':
      case 'tenders':
      case 'boq':
      case 'kas-tenders':
      case 'boq-analytics':
        return <TendersBOQPage />;

      case 'kas-suite':
      case 'kas-portal':
      case 'kas-standalone':
      case 'kas-company':
        return (
          <KasSuitePortalPage 
            onReturnToErp={() => handleSelectTab('dashboard', 'الرئيسية والمؤشرات التشغيلية')} 
          />
        );

      case 'kas-etmad':
      case 'kas-etmad-cloud':
      case 'etmad-cloud':
      case 'etmad':
      case 'kas-cloud-suite':
        return <KasEtimadCloudPage />;

      case 'custodies':
        return <CustodiesPage />;

      case 'client-portal':
      case 'clients-portal':
        return <ClientPortalPage />;

      case 'foreign-agency-portal':
      case 'agency-portal':
      case 'agent-portal':
        return <ForeignAgencyPortalPage />;

      default:
        return <DashboardPage onNavigate={handleSelectTab} />;
    }
  };

  return (
    <>
      {flowState === 'landing' && (
        <Suspense fallback={<PageFallback />}>
          <LandingPage onSelectCompany={(companyId: string) => {
            navigateToCompanyLogin(companyId);
          }} />
        </Suspense>
      )}

      {flowState === 'login' && (
        <Suspense fallback={<PageFallback />}>
          <LoginPage onLoginSuccess={(targetTab?: string, targetTitle?: string) => {
            if (targetTab) {
              useAppStore.setState({
                activeTab: targetTab,
                activeTabTitle: targetTitle || targetTab,
              });
            }
            setFlowState('welcome');
          }} />
        </Suspense>
      )}

      {flowState === 'welcome' && (
        <ExecutiveWelcomeScreen
          durationMs={3000}
          onComplete={() => {
            setFlowState('launcher');
          }}
        />
      )}

      {flowState === 'launcher' && (
        <Suspense fallback={<PageFallback />}>
          <AppLauncherPage onSelectApp={handleSelectTab} />
        </Suspense>
      )}

      {flowState === 'workspace' && (
        <>
          <AppShell
            activeTab={activeTab}
            activeTabTitle={activeTabTitle}
            onSelectTab={handleSelectTab}
            onOpenAppLauncher={() => setFlowState('launcher')}
            onLogout={handleLogout}
          >
            <ErrorBoundary resetKey={activeTab}>
              <Suspense fallback={<PageFallback />}>
                {renderPage()}
              </Suspense>
            </ErrorBoundary>
          </AppShell>
          <QuickSearchModal onNavigate={handleSelectTab} />
        </>
      )}

      {(flowState === 'workspace' || flowState === 'launcher') && (
        <AICopilotWidget
          onNavigate={(tabKey, title) => {
            if (flowState !== 'workspace') {
              setFlowState('workspace');
            }
            handleSelectTab(tabKey, title || '');
          }}
        />
      )}
      <UniversalNotificationToaster onNavigate={(tabKey, title) => handleSelectTab(tabKey, title || '')} />
      {(flowState === 'workspace' || flowState === 'launcher') && <PwaInstallPrompt />}
      {showLegalModal && (
        <LegalDisclaimerModal
          user={currentUserForLegal}
          onAcceptAndContinue={() => setShowLegalModal(false)}
          onLogout={handleLogout}
        />
      )}
    </>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CompanyProvider>
          <IamSessionProvider>
            <RBACProvider>
              <ImpersonationProvider>
                <MainContent />
              </ImpersonationProvider>
            </RBACProvider>
          </IamSessionProvider>
        </CompanyProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
