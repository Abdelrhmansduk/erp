import React, { useState } from 'react';
import {
  Home,
  Settings,
  DollarSign,
  Building2,
  Package,
  Users,
  ChevronDown,
  ChevronLeft,
  Search,
  FileText,
  CreditCard,
  PieChart,
  UserCheck,
  TrendingUp,
  Receipt,
  Globe,
  Sliders,
  ShieldCheck,
  Briefcase,
  Layers,
  ArrowLeftRight
} from 'lucide-react';

export interface SmaccMenuItem {
  id: string;
  title: string;
  icon: React.ElementType;
  badge?: string;
  children?: { id: string; title: string; route: string; badge?: string }[];
}

interface SmaccNavigationSidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

export const SMACC_MENU_STRUCTURE: SmaccMenuItem[] = [
  {
    id: 'dashboard',
    title: 'الرئيسية',
    icon: Home,
  },
  {
    id: 'settings',
    title: 'الأعدادات',
    icon: Settings,
    children: [
      { id: 'general-settings', title: 'إعدادات النظام العامة', route: 'smacc-hr-settings' },
      { id: 'numbering-settings', title: 'الترقيم التلقائي والتفويضات', route: 'smacc-hr-settings' },
      { id: 'branch-settings', title: 'الفروع والشركات التابعة', route: 'branch-departments' },
      { id: 'users-permissions', title: 'إدارة المستخدمين والصلاحيات', route: 'users' },
      { id: 'master-constants', title: 'الثوابت والقواميس الموحدة', route: 'master-constants' },
    ]
  },
  {
    id: 'financial-accounting',
    title: 'المحاسبه الماليه',
    icon: DollarSign,
    children: [
      { id: 'chart-of-accounts', title: '1. دليل الحسابات الشجري', route: 'smacc-accounting' },
      { id: 'cost-centers', title: '2. شجرة ودليل مراكز التكلفة', route: 'smacc-accounting' },
      { id: 'journal-entries', title: '3. قيود اليومية العامة والاعتماد', route: 'smacc-accounting' },
      { id: 'receipt-vouchers', title: '4. سندات القبض (نقدي/بنكي)', route: 'smacc-accounting' },
      { id: 'payment-vouchers', title: '5. سندات الصرف والتحويلات', route: 'smacc-accounting' },
      { id: 'account-ledger', title: '6. كشف حساب تفصيلي', route: 'smacc-accounting' },
      { id: 'trial-balance', title: '7. ميزان المراجعة بالأرصدة', route: 'smacc-accounting' },
      { id: 'income-statement', title: '8. قائمة الدخل والأرباح والخسائر', route: 'smacc-accounting' },
      { id: 'balance-sheet', title: '9. قائمة المركز المالي (الميزانية)', route: 'smacc-accounting' },
      { id: 'fiscal-closing', title: '10. إقفال السنـة والربط المالي', route: 'smacc-accounting' },
    ]
  },
  {
    id: 'fixed-assets',
    title: 'الأصول الثابته',
    icon: Building2,
    children: [
      { id: 'assets-register', title: 'سجل ومستندات الأصول الثابتة', route: 'smacc-inventory-assets' },
      { id: 'depreciation-schedule', title: 'جدول إهلاكات الأصول الدورية', route: 'smacc-inventory-assets' },
      { id: 'asset-disposals', title: 'إضافات واستبعادات الأصول', route: 'smacc-inventory-assets' },
    ]
  },
  {
    id: 'inventory-control',
    title: 'المخزون',
    icon: Package,
    children: [
      { id: 'item-catalog', title: 'دليل الأصناف والمنتجات', route: 'smacc-inventory-assets' },
      { id: 'stock-movements', title: 'حركات المخزون والتحويلات', route: 'smacc-inventory-assets' },
      { id: 'inventory-audit', title: 'تسويات وقوائم الجرد الدوري', route: 'smacc-inventory-assets' },
      { id: 'stock-vouchers', title: 'أذونات الصرف والإضافة', route: 'smacc-inventory-assets' },
    ]
  },
  {
    id: 'employees-hr',
    title: 'الموظفين',
    icon: Users,
    children: [
      { id: 'employee-directory', title: 'سجل الموظفين والملفات الإدارية', route: 'smacc-hr-settings' },
      { id: 'payroll-processing', title: 'مسير الرواتب والمستحقات', route: 'smacc-hr-settings' },
      { id: 'attendance-leaves', title: 'الحضور والانصراف والإجازات', route: 'attendances' },
      { id: 'advances-custodies', title: 'السلفيات والعهد المالية', route: 'custodies' },
      { id: 'eosb-calc', title: 'مكافأة نهاية الخدمة والتسويات', route: 'smacc-hr-settings' },
    ]
  },
  {
    id: 'external-integrations',
    title: 'الأقسام الخارجية والربط',
    icon: Globe,
    children: [
      { id: 'zatca-phase2', title: 'فواتير ZATCA الإلكترونية (الربط والتكامل)', route: 'zatca' },
      { id: 'external-agencies', title: 'مكاتب ووكلاء الاستقدام الخارجي', route: 'external-offices' },
      { id: 'musaned-portal', title: 'بوابة عقود منصة مساند', route: 'recruitment-contracts' },
      { id: 'clients-suppliers', title: 'دليل العملاء والموردين', route: 'clients' },
      { id: 'sales-reps', title: 'إدارة البائعين ومحصلي المبيعات', route: 'smacc-modules' },
    ]
  }
];

export const SmaccNavigationSidebar: React.FC<SmaccNavigationSidebarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    'financial-accounting': true,
    'settings': false,
    'fixed-assets': false,
    'inventory-control': false,
    'employees-hr': false,
    'external-integrations': false,
  });
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSubmenu = (menuId: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const filteredMenuItems = SMACC_MENU_STRUCTURE.filter(item => {
    if (!searchQuery) return true;
    const matchParent = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchChild = item.children?.some(child => child.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchParent || matchChild;
  });

  return (
    <aside className="w-64 bg-white text-zinc-900 border-l border-zinc-200 flex flex-col h-full select-none shadow-sm">
      {/* Brand Header */}
      <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center font-bold text-white shadow-sm text-sm tracking-wider">
            FIN
          </div>
          <div>
            <h2 className="font-bold text-xs text-zinc-900 leading-tight">نظام المحاسبة الشامل</h2>
            <p className="text-[10.5px] text-zinc-500">الإصدار المؤسسي الحديث</p>
          </div>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" title="النظام متصل" />
      </div>

      {/* Menu Quick Search Input */}
      <div className="p-3 border-b border-zinc-200 bg-white">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="البحث في القائمة المالية..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#fbfbf5] border border-zinc-200 rounded-full py-1 pr-8 pl-3 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-black transition-all"
          />
        </div>
      </div>

      {/* Main Navigation Items */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1 custom-scrollbar">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = openSubmenus[item.id] || searchQuery.length > 0;
          const isActive = activeTab === item.id;

          return (
            <div key={item.id} className="rounded-full overflow-hidden">
              <button
                onClick={() => {
                  if (hasChildren) {
                    toggleSubmenu(item.id);
                  } else {
                    onSelectTab(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-full text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-black text-white shadow-sm font-semibold'
                    : 'text-zinc-700 hover:bg-zinc-100 hover:text-black'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#c1fbd4]' : 'text-zinc-500'}`} />
                  <span>{item.title}</span>
                </div>
                {hasChildren && (
                  <span className="text-zinc-400 hover:text-zinc-600">
                    {isOpen ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronLeft className="w-3 h-3" />
                    )}
                  </span>
                )}
              </button>

              {/* Child Menu Tree */}
              {hasChildren && isOpen && (
                <div className="mr-3 mt-1 mb-1 pl-2 border-r border-zinc-200 space-y-1">
                  {item.children?.map((child) => {
                    const isChildActive = activeTab === child.id || activeTab === child.route;
                    return (
                      <button
                        key={child.id}
                        onClick={() => onSelectTab(child.route)}
                        className={`w-full text-right px-3 py-1.5 rounded-full text-[11.5px] transition-all flex items-center justify-between ${
                          isChildActive
                            ? 'bg-black text-white font-semibold'
                            : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
                        }`}
                      >
                        <span>{child.title}</span>
                        {child.badge && (
                          <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-[#c1fbd4] text-black font-semibold">
                            {child.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-zinc-50 border-t border-zinc-200 text-[11px] text-zinc-500 flex flex-col gap-1">
        <div className="flex items-center justify-between text-zinc-700">
          <span>حالة النظام:</span>
          <span className="font-semibold text-emerald-600">جاهز ومطابق 100%</span>
        </div>
        <div className="text-[10px] text-zinc-400 text-center mt-1">
          حقوق الطبع © 2026 بحر العرب لأنظمة المعلومات
        </div>
      </div>
    </aside>
  );
};
