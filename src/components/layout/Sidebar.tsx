import React, { useState, useMemo, useEffect } from 'react';
import { SIDEBAR_MENU } from '../../data/sidebarMenu';
import { NavItem } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { useIamSession } from '../../contexts/IamSessionContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuthContext } from '../../contexts/AuthContext';
import {
  authService,
  CORPORATE_DEPARTMENTS,
  COMPANY_AUTH_METADATA,
  resolveDepartmentAndCompany,
} from '../../services/authService';
import { EmployeePhotoAvatar } from '../auth/EmployeePhotoAvatar';
import { useModuleVisibility } from '../../hooks/useModuleVisibility';
import {
  X, Search, ChevronDown, ChevronLeft, ChevronRight,
  ListTree, Columns, LayoutGrid, CircleDot, Folder,
  LayoutDashboard, Contact, Users, Activity, MessageCircle,
  Send, MailCheck, Layers, FileText, UserPlus, UserCheck,
  Handshake, UserX, Trash2, Clock, ShoppingCart, ListOrdered,
  FileCheck, AlertTriangle, Briefcase, Star, RefreshCw,
  HelpingHand, Headphones, FileSignature, FilePlus, CheckCircle2,
  RotateCcw, Truck, Clock3, Receipt, Zap, ArrowRightLeft,
  ClipboardCheck, Package, Scale, Stamp, ShieldCheck, Hotel,
  Home, Building2, LogOut, Plane, MapPin, Repeat,
  Hourglass, CheckCheck, ScrollText, PlaneLanding, PlaneTakeoff,
  AlertCircle, PlusCircle, Tags, Globe2, Building, FileDown,
  BadgeDollarSign, Plus, BarChart3, Network, CalendarDays, Coins,
  Vault, ShieldAlert, DoorOpen, FileSpreadsheet, CreditCard, Award,
  Wallet, BarChart4, FolderTree, Landmark, FolderKanban, BookOpen,
  MessageSquare, Smartphone, MessagesSquare, Megaphone, Radio,
  GitPullRequest, Globe, FolderSync, UploadCloud, Settings, Sliders,
  History, Settings2, Lock, TrendingUp, PanelRightClose, PanelRightOpen,
  ChevronsDownUp, ChevronsUpDown,
} from 'lucide-react';

const LUCIDE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  LayoutDashboard, Contact, Users, Activity, MessageCircle,
  Send, MailCheck, Layers, FileText, UserPlus, UserCheck,
  Handshake, UserX, Trash2, Clock, ShoppingCart, ListOrdered,
  FileCheck, AlertTriangle, Briefcase, Star, RefreshCw,
  HelpingHand, Headphones, FileSignature, FilePlus, CheckCircle2,
  RotateCcw, Truck, Clock3, Receipt, Zap, ArrowRightLeft,
  ClipboardCheck, Package, Scale, Stamp, ShieldCheck, Hotel,
  Home, Building2, LogOut, Plane, MapPin, Repeat,
  Hourglass, CheckCheck, ScrollText, PlaneLanding, PlaneTakeoff,
  AlertCircle, PlusCircle, Tags, Globe2, Building, FileDown,
  BadgeDollarSign, Plus, BarChart3, Network, CalendarDays, Coins,
  Vault, ShieldAlert, DoorOpen, FileSpreadsheet, CreditCard, Award,
  Wallet, BarChart4, FolderTree, Landmark, FolderKanban, BookOpen,
  MessageSquare, Smartphone, MessagesSquare, Megaphone, Radio,
  GitPullRequest, Globe, FolderSync, UploadCloud, Settings, Sliders,
  History, Settings2, Folder, CircleDot, TrendingUp,
};

interface SidebarProps {
  activeTab: string;
  onSelectTab: (href: string, title: string) => void;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export type SidebarDisplayMode = 'tree' | 'compact' | 'cards';

function findFirstLeaf(item: NavItem): { href: string; title: string } | null {
  if (item.children && item.children.length > 0) {
    for (const child of item.children) {
      const found = findFirstLeaf(child);
      if (found) return found;
    }
  }
  if (item.href) return { href: item.href, title: item.title };
  return null;
}

function collectLeafItems(item: NavItem): NavItem[] {
  if (item.href && (!item.children || item.children.length === 0)) {
    return [item];
  }
  if (!item.children) return [];
  return item.children.flatMap((c) => collectLeafItems(c));
}

function itemContainsTab(item: NavItem, targetTab: string): boolean {
  if (item.href === targetTab) return true;
  if (!item.children) return false;
  return item.children.some((c) => itemContainsTab(c, targetTab));
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { currentLanguage } = useLanguage();
  const { isSuperAdmin, activeCompany } = useIamSession();
  const { activeCompanyId } = useCompany();
  const { user: authUser } = useAuthContext();
  const { visibleMenu } = useModuleVisibility();
  const isRtl = currentLanguage.dir === 'rtl';

  const [displayMode, setDisplayMode] = useState<SidebarDisplayMode>('tree');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Keep displayMode synchronized with parent collapse prop
  const effectiveMode: SidebarDisplayMode = isCollapsed ? 'compact' : displayMode;

  const effectiveProfile = authUser || authService.getCurrentUser();
  const resolvedScope = useMemo(() => {
    if (!effectiveProfile) {
      return resolveDepartmentAndCompany('chairman@alsulaim.sa');
    }
    return resolveDepartmentAndCompany(
      effectiveProfile.email,
      effectiveProfile.role,
      effectiveProfile.company_id,
      effectiveProfile.department_id
    );
  }, [effectiveProfile]);

  const companyMeta = useMemo(() => {
    const key = resolvedScope.companyId === 'all' ? 'ALL' : resolvedScope.companyId.toUpperCase();
    return COMPANY_AUTH_METADATA[key] || COMPANY_AUTH_METADATA.SAF;
  }, [resolvedScope.companyId]);

  const departmentDef = CORPORATE_DEPARTMENTS[resolvedScope.departmentId];

  // Initialize expanded state so ONLY the active department is open by default (clean accordion)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of SIDEBAR_MENU) {
      if (section.children && section.children.length > 0) {
        initial[section.id] = itemContainsTab(section, activeTab);
      }
    }
    // If on dashboard, keep all 9 departments neatly folded so user sees all 9 at a glance
    return initial;
  });

  // Automatically expand ONLY the department containing activeTab (clean single-open accordion)
  useEffect(() => {
    if (!activeTab || activeTab === 'dashboard') {
      setExpandedItems({});
      return;
    }
    const matchingSection = SIDEBAR_MENU.find(
      (section) => section.children && itemContainsTab(section, activeTab)
    );
    if (matchingSection) {
      setExpandedItems({
        [matchingSection.id]: true,
      });
    }
  }, [activeTab]);

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedItems((prev) => {
      const isCurrentlyOpen = Boolean(prev[id]);
      if (isCurrentlyOpen) {
        return { ...prev, [id]: false };
      }
      // Accordion mode: opening a department folds other departments so all 9 remain accessible
      return { [id]: true };
    });
  };

  const anyExpanded = useMemo(
    () => SIDEBAR_MENU.some((s) => s.children && expandedItems[s.id]),
    [expandedItems]
  );

  const handleToggleAllSections = () => {
    if (anyExpanded) {
      // Collapse all 9 departments
      setExpandedItems({});
    } else {
      // Expand all 9 departments
      const allOpen: Record<string, boolean> = {};
      for (const s of SIDEBAR_MENU) {
        if (s.children) allOpen[s.id] = true;
      }
      setExpandedItems(allOpen);
    }
  };

  const handleModeSwitch = (mode: SidebarDisplayMode) => {
    if (mode === 'compact') {
      if (!isCollapsed && onToggleCollapse) {
        onToggleCollapse();
      } else {
        setDisplayMode('compact');
      }
    } else {
      setDisplayMode(mode);
      if (isCollapsed && onToggleCollapse) {
        onToggleCollapse();
      }
    }
  };

  const renderIcon = (iconName?: string, className = 'w-4 h-4') => {
    if (!iconName) return <CircleDot className={className} />;
    const Component = LUCIDE_ICONS[iconName];
    if (Component) return <Component className={className} />;
    return <CircleDot className={className} />;
  };

  const filteredMenu = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    const filterItem = (item: NavItem): NavItem | null => {
      if (item.children && item.children.length > 0) {
        const selfMatches = query ? item.title.toLowerCase().includes(query) : false;
        const authorizedChildren = item.children
          .map((child) => (selfMatches ? child : filterItem(child)))
          .filter((child): child is NavItem => child !== null);

        if (authorizedChildren.length === 0) return null;
        return { ...item, children: authorizedChildren };
      }

      if (!item.href) return null;
      if (query && !item.title.toLowerCase().includes(query)) {
        return null;
      }
      return item;
    };

    return visibleMenu.map(filterItem).filter((item): item is NavItem => item !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, visibleMenu, effectiveProfile, resolvedScope, activeCompany, activeCompanyId, isSuperAdmin]);

  const hasActiveChild = (item: NavItem): boolean => {
    if (item.href === activeTab) return true;
    if (!item.children) return false;
    return item.children.some((c) => hasActiveChild(c));
  };

  const getBadgeStyle = (type?: string, isSelected?: boolean) => {
    if (isSelected) {
      return 'bg-[#0066ff] text-[#ffffff]';
    }
    switch (type) {
      case 'success':
        return 'bg-[#f3f3f3] text-[#141414] font-semibold';
      case 'danger':
        return 'bg-[#141414] text-[#ffffff] font-semibold';
      default:
        return 'bg-[#f3f3f3] text-[#707070]';
    }
  };

  const renderTreeItem = (item: NavItem, depth = 0) => {
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const isExpanded = Boolean(expandedItems[item.id]) || searchQuery.trim().length > 0;
    const isDirectActive = !hasChildren && item.href === activeTab;
    const isBranchActive = hasChildren && hasActiveChild(item);

    if (depth === 0 && hasChildren) {
      const childCount = item.children?.length || 0;
      return (
        <div key={item.id} className="mb-1.5">
          <button
            type="button"
            onClick={(e) => toggleExpand(item.id, e)}
            aria-expanded={isExpanded}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-[16px] text-xs font-semibold transition-colors cursor-pointer ${
              isBranchActive
                ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                : isExpanded
                ? 'bg-[#f8f8f8] text-[#141414]'
                : 'text-[#141414] hover:bg-[#f3f3f3]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 app-icon-squircle flex items-center justify-center shrink-0 transition-colors ${
                  isBranchActive || isExpanded
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                }`}
              >
                {renderIcon(item.icon, 'w-3.5 h-3.5')}
              </div>
              <span className="truncate text-right">{item.title}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-[#f3f3f3] text-[#707070]">
                {childCount}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[#707070] transition-transform duration-200 shrink-0 ${
                  isExpanded ? 'rotate-180 text-[#141414]' : ''
                }`}
              />
            </div>
          </button>

          {isExpanded && (
            <div
              className={`mt-1 space-y-0.5 ${
                isRtl ? 'pr-2.5 mr-3 border-r' : 'pl-2.5 ml-3 border-l'
              } border-[#e0e0e0]`}
            >
              {item.children!.map((child) => renderTreeItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const handleLeafOrSubClick = (e: React.MouseEvent) => {
      if (hasChildren) {
        toggleExpand(item.id, e);
      } else if (item.href) {
        onSelectTab(item.href, item.title);
        if (onClose && window.innerWidth < 1024) onClose();
      }
    };

    return (
      <div key={item.id} className="my-0.5">
        <button
          type="button"
          onClick={handleLeafOrSubClick}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-full text-xs transition-colors cursor-pointer ${
            isDirectActive
              ? 'bg-[#141414] text-[#ffffff] font-semibold'
              : isBranchActive
              ? 'bg-[#f3f3f3] text-[#141414] font-semibold'
              : 'text-[#707070] hover:bg-[#f3f3f3] hover:text-[#141414]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className={`shrink-0 ${isDirectActive ? 'text-[#ffffff]' : 'text-[#707070]'}`}>
              {renderIcon(item.icon, 'w-3.5 h-3.5')}
            </span>
            <span className="truncate text-right">{item.title}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {item.badge !== undefined && (
              <span
                className={`px-2 py-0.5 text-[10px] rounded-full ${getBadgeStyle(
                  item.badgeType,
                  isDirectActive
                )}`}
              >
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <span className="text-[#adadad]">
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : isRtl ? (
                  <ChevronLeft className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </span>
            )}
          </div>
        </button>

        {hasChildren && isExpanded && (
          <div
            className={`mt-1 space-y-0.5 ${
              isRtl ? 'pr-3 mr-2.5 border-r' : 'pl-3 ml-2.5 border-l'
            } border-[#f0f0f0]`}
          >
            {item.children!.map((subChild) => renderTreeItem(subChild, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`h-full w-full flex flex-col bg-[#ffffff] border-[#f0f0f0] select-none transition-all duration-200 ${
        isRtl ? 'border-l' : 'border-r'
      }`}
    >
      {/* 1. Top Corporate Brand & Collapse Controller Header */}
      <div className={`${effectiveMode === 'compact' ? 'p-2.5' : 'p-3.5'} border-b border-[#f0f0f0] space-y-2.5`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 app-icon-squircle bg-[#141414] text-[#ffffff] flex items-center justify-center font-bold text-xs shrink-0">
              KS
            </div>
            {effectiveMode !== 'compact' && (
              <div className="min-w-0">
                <div className="font-semibold text-xs text-[#141414] truncate">
                  {companyMeta.nameAr}
                </div>
                <div className="text-[11px] font-medium text-[#707070] truncate">
                  الأقسام الإدارية الـ 9
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:inline-flex w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] items-center justify-center transition-colors cursor-pointer"
                title={effectiveMode === 'compact' ? 'توسيع القائمة الجانبية (Alt+B)' : 'طي القائمة الجانبية (Alt+B)'}
                aria-label={effectiveMode === 'compact' ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
              >
                {effectiveMode === 'compact' ? (
                  <PanelRightOpen className="w-4 h-4" />
                ) : (
                  <PanelRightClose className="w-4 h-4" />
                )}
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-[#f3f3f3] cursor-pointer"
                aria-label="إغلاق القائمة"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Locked Department Security Badge */}
        {effectiveMode !== 'compact' && (
          <div className="px-3 py-1.5 rounded-[14px] bg-[#f3f3f3] flex items-center justify-between text-[11px]">
            <span className="font-semibold text-[#141414] flex items-center gap-1.5 truncate">
              <Lock className="w-3.5 h-3.5 text-[#707070] shrink-0" />
              <span className="truncate">{departmentDef.nameAr}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold font-mono shrink-0">
              {companyMeta.code === 'all' ? 'GROUP' : companyMeta.code}
            </span>
          </div>
        )}

        {/* Display Mode Switcher (Mobbin Segmented Control) */}
        {effectiveMode !== 'compact' && (
          <div className="grid grid-cols-3 gap-1 bg-[#f3f3f3] p-1 rounded-full">
            <button
              type="button"
              onClick={() => handleModeSwitch('tree')}
              className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-full text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                effectiveMode === 'tree'
                  ? 'bg-[#ffffff] text-[#141414] border border-[#e0e0e0]'
                  : 'text-[#707070] hover:text-[#141414]'
              }`}
              title="عرض شجري للأقسام الـ 9"
            >
              <ListTree className="w-3.5 h-3.5 shrink-0" />
              <span>الأقسام</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeSwitch('cards')}
              className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-full text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                effectiveMode === 'cards'
                  ? 'bg-[#ffffff] text-[#141414] border border-[#e0e0e0]'
                  : 'text-[#707070] hover:text-[#141414]'
              }`}
              title="عرض بطاقات"
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span>بطاقات</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeSwitch('compact')}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-full text-[11px] font-semibold text-[#707070] hover:text-[#141414] transition-all cursor-pointer whitespace-nowrap"
              title="طي القائمة الجانبية"
            >
              <Columns className="w-3.5 h-3.5 shrink-0" />
              <span>طي</span>
            </button>
          </div>
        )}

        {/* Quick Menu Search + Collapse/Expand All 9 Departments Button */}
        {effectiveMode !== 'compact' && (
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center gap-2 bg-[#f0f0f0] rounded-[14px] px-3 py-1.5 text-xs">
              <Search className="w-3.5 h-3.5 text-[#707070] shrink-0" />
              <input
                type="text"
                placeholder="بحث في الأقسام الـ 9..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs text-[#141414] placeholder-[#707070]"
              />
              {searchQuery && (
                <X
                  className="w-3.5 h-3.5 text-[#707070] cursor-pointer hover:text-[#141414]"
                  onClick={() => setSearchQuery('')}
                />
              )}
            </div>

            {effectiveMode === 'tree' && (
              <button
                type="button"
                onClick={handleToggleAllSections}
                className="px-2.5 py-1.5 rounded-[14px] bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[10.5px] font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                title={anyExpanded ? 'طي جميع الأقسام الـ 9' : 'توسيع جميع الأقسام الـ 9'}
              >
                {anyExpanded ? (
                  <>
                    <ChevronsDownUp className="w-3.5 h-3.5" />
                    <span>طي الكل</span>
                  </>
                ) : (
                  <>
                    <ChevronsUpDown className="w-3.5 h-3.5" />
                    <span>فتح الكل</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Navigation Content */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {effectiveMode === 'tree' && filteredMenu.map((item) => renderTreeItem(item, 0))}

        {effectiveMode === 'compact' && (
          <div className="flex flex-col items-center gap-2 py-1">
            {filteredMenu.map((item, idx) => {
              const isActive = item.href === activeTab || hasActiveChild(item);
              const deptNum = idx > 0 ? idx : null;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    const target = findFirstLeaf(item);
                    if (target) {
                      onSelectTab(target.href, target.title);
                      if (onClose && window.innerWidth < 1024) onClose();
                    }
                  }}
                  title={item.title}
                  className={`relative w-11 h-11 app-icon-squircle flex items-center justify-center transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#141414] text-[#ffffff]'
                      : 'bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414]'
                  }`}
                >
                  {renderIcon(item.icon, 'w-4 h-4')}
                  {deptNum && (
                    <span
                      className={`absolute -top-1 -left-1 w-4 h-4 rounded-full text-[9px] font-mono font-bold flex items-center justify-center border ${
                        isActive
                          ? 'bg-[#0066ff] text-[#ffffff] border-[#ffffff]'
                          : 'bg-[#ffffff] text-[#141414] border-[#e0e0e0]'
                      }`}
                    >
                      {deptNum}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {effectiveMode === 'cards' && (
          <div className="space-y-2.5 p-1">
            {filteredMenu.map((item) => {
              const leaves = collectLeafItems(item);
              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-[#f3f3f3] rounded-[24px] space-y-2.5 border border-[#e0e0e0]"
                >
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-[#141414]">
                    <div className="w-7 h-7 app-icon-squircle bg-[#141414] text-[#ffffff] flex items-center justify-center">
                      {renderIcon(item.icon, 'w-3.5 h-3.5 text-[#ffffff]')}
                    </div>
                    <span>{item.title}</span>
                  </div>

                  {leaves.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {leaves.map((leaf) => {
                        const isChildActive = leaf.href === activeTab;
                        return (
                          <button
                            key={leaf.id}
                            type="button"
                            onClick={() => {
                              if (leaf.href) {
                                onSelectTab(leaf.href, leaf.title);
                                if (onClose && window.innerWidth < 1024) onClose();
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                              isChildActive
                                ? 'bg-[#141414] text-[#ffffff]'
                                : 'bg-[#ffffff] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0]'
                            }`}
                          >
                            {leaf.title}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Sticky Institutional Footer with Direct Logout Button */}
      <div className="p-3 border-t border-[#f0f0f0] bg-[#ffffff]">
        {effectiveMode === 'compact' ? (
          <button
            type="button"
            onClick={() => onSelectTab('logout', 'تسجيل الخروج')}
            title="تسجيل الخروج من القسم"
            className="w-full h-10 app-icon-squircle bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] flex items-center justify-center cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        ) : (
          <div className="space-y-2">
            <div className="px-1.5 flex items-center gap-2.5 text-right">
              <EmployeePhotoAvatar
                name={effectiveProfile?.full_name || 'موظف القسم'}
                email={effectiveProfile?.email}
                role={effectiveProfile?.role}
                departmentId={resolvedScope.departmentId}
                size="sm"
                status="online"
              />
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="font-bold text-xs text-[#141414] leading-snug truncate">
                  {effectiveProfile?.full_name || 'موظف القسم'}
                </div>
                <div className="text-[11px] font-medium text-[#707070] leading-snug truncate">
                  {effectiveProfile?.branch || 'المقر الرئيسي للمجموعة - الرياض'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('logout', 'تسجيل الخروج')}
              className="w-full py-2 px-3 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج من القسم</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
