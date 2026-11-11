import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { useCompany } from '../contexts/CompanyContext';
import { useTableMutation, useCostCenters } from '../hooks/queries/useErpQueries';
import { chartOfAccountsService, AccountItem } from '../services/accounting/chartOfAccountsService';
import { journalEngine } from '../services/accounting/journalEngine';
import { getCompanyIfrsClassifications } from '../services/accounting/ifrsExtendedReferenceData';
import { enterpriseAccountingSuiteService } from '../services/accounting/enterpriseAccountingSuiteService';
import { useAppStore } from '../stores/appStore';
import { realErpDataStore } from '../services/realErpDataStore';
import { BudgetVsActualWidget } from '../components/finance/BudgetVsActualWidget';
import { IfrsFinancialEngineWorkspace } from '../components/finance/IfrsFinancialEngineWorkspace';
import { OdooAccountingConfigWorkspace } from '../components/accounting/OdooAccountingConfigWorkspace';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { 
  Scale, Plus, FileSpreadsheet, FileText, Printer, FileCheck, 
  TrendingUp, TrendingDown, ShieldCheck, Lock, Unlock, Search, 
  Eye, EyeOff, X, ArrowLeft, ArrowRight, FolderTree, Receipt, PieChart, 
  Building2, Globe, DollarSign, Calculator, ChevronRight, Check,
  BookOpen, Landmark, Coins, AlertCircle, Clock, BarChart3, AlertTriangle,
  CheckCircle2, ArrowUpRight, ArrowDownLeft, Edit3, Trash2
} from 'lucide-react';

export interface JournalEntry {
  id: string;
  ref_no: string;
  date: string;
  description: string;
  amount: number;
  status: 'معتمد' | 'بانتظار الاعتماد' | 'مسودة';
  branch: string;
}

export interface Voucher {
  id: string;
  voucher_no: string;
  type: 'قبض' | 'صرف';
  date: string;
  payee_payer: string;
  treasury: string;
  amount: number;
  status: 'معتمد' | 'بانتظار الاعتماد';
}

const MOCK_JOURNALS: JournalEntry[] = [
  { id: 'j-282', ref_no: 'قيد #282', date: '2026-07-31', description: 'قيد فاتورة عقد تأجير رقم RC-2026-0014 / الفاتورة #12 / العميل ابو اياد', amount: 1150.0, status: 'معتمد', branch: 'فرع الرياض الرئيسي' },
  { id: 'j-281', ref_no: 'قيد #281', date: '2026-07-31', description: 'سند قبض عقد تأجير رقم RC-2026-0013 / إيداع بنك الراجحي', amount: 138.0, status: 'معتمد', branch: 'فرع الرياض الرئيسي' },
  { id: 'j-280', ref_no: 'قيد #280', date: '2026-07-31', description: 'قيد إثبات إيراد وساطة استقدام مساند - عقد رقم REC-2026-0594', amount: 14500.0, status: 'معتمد', branch: 'فرع الرياض الرئيسي' },
  { id: 'j-279', ref_no: 'قيد #279', date: '2026-07-30', description: 'إثبات مصاريف عاملة تأجير #2213 - سارة / المكتب الخارجي DAMAS AGENCY', amount: 2133.0, status: 'معتمد', branch: 'مركز الإيواء' },
  { id: 'j-278', ref_no: 'قيد #278', date: '2026-07-30', description: 'تحويل بنكي لحساب الضمان مساند بدون مرجع من الحساب البنكي الرئيسي', amount: 3700.0, status: 'معتمد', branch: 'الإدارة العامة' },
];

const MOCK_VOUCHERS: Voucher[] = [
  { id: 'v-59', voucher_no: 'قبض #59', type: 'قبض', date: '2026-07-31', payee_payer: 'العميل بندر صالح الهويريني', treasury: 'بنك الراجحي', amount: 13800.0, status: 'معتمد' },
  { id: 'v-58', voucher_no: 'قبض #58', type: 'قبض', date: '2026-07-31', payee_payer: 'عميل مساند (سداد إلكتروني)', treasury: 'بنك مساند الموحد', amount: 3786.3, status: 'معتمد' },
  { id: 'v-57', voucher_no: 'قبض #57', type: 'قبض', date: '2026-07-31', payee_payer: 'شركة دار الرواد للمقاولات', treasury: 'بنك الرياض', amount: 28750.0, status: 'معتمد' },
  { id: 'v-1', voucher_no: 'صرف #1', type: 'صرف', date: '2026-07-30', payee_payer: 'مكتب بلاتينيوم مانيلا (تأشيرات)', treasury: 'الصندوق الرئيسي', amount: 5000.0, status: 'معتمد' },
];

const RECRUITMENT_TRIAL_BALANCE_DATA = [
  { code: '1101', name: 'الصندوق الرئيسي (Cash)', type: 'أصول', ifrsCode: 'A-10', ifrsSubCode: 'A-10-01', ifrsItemName: 'النقد وما في حكمه', ifrsSubItemName: 'النقد في الصناديق الرئيسية', ifrsSection: 'مركز مالي - أصول متداولة', ifrsRef: 'IAS 7', cashFlowType: 'نقد وما في حكمه', opening_debit: 150000, opening_credit: 0, period_debit: 45000, period_credit: 40800, balance: 154200 },
  { code: '1102', name: 'بنك الرياض - حساب الاستقدام', type: 'أصول', ifrsCode: 'A-10', ifrsSubCode: 'A-10-08', ifrsItemName: 'النقد وما في حكمه', ifrsSubItemName: 'حسابات جارية تشغيلية لدى البنوك المحلية', ifrsSection: 'مركز مالي - أصول متداولة', ifrsRef: 'IAS 7', cashFlowType: 'نقد وما في حكمه', opening_debit: 380000, opening_credit: 0, period_debit: 82000, period_credit: 41500, balance: 420500 },
  { code: '1103', name: 'بنك الراجحي - الحساب التشغيلي', type: 'أصول', ifrsCode: 'A-10', ifrsSubCode: 'A-10-08', ifrsItemName: 'النقد وما في حكمه', ifrsSubItemName: 'حسابات جارية تشغيلية لدى البنوك المحلية', ifrsSection: 'مركز مالي - أصول متداولة', ifrsRef: 'IAS 7', cashFlowType: 'نقد وما في حكمه', opening_debit: 220000, opening_credit: 0, period_debit: 110300, period_credit: 55000, balance: 275300 },
  { code: '1104', name: 'أمانات مساند المعلقة (90 يوماً)', type: 'أصول', ifrsCode: 'A-07', ifrsSubCode: 'A-07-05', ifrsItemName: 'ذمم مدينة تجارية', ifrsSubItemName: 'ذمم مدينة من عقود خدمات التوسط والعمالة (مساند)', ifrsSection: 'مركز مالي - أصول متداولة', ifrsRef: 'IFRS 9 / IFRS 15', cashFlowType: 'تشغيلي - رأس مال عامل', opening_debit: 160000, opening_credit: 0, period_debit: 54500, period_credit: 30000, balance: 184500 },
  { code: '1201', name: 'الأصول الثابتة (مباني وسيارات)', type: 'أصول', ifrsCode: 'A-01', ifrsSubCode: 'A-01-04', ifrsItemName: 'ممتلكات وآلات ومعدات (إجمالي)', ifrsSubItemName: 'وسائل نقل وانتقال وأسطول مركبات', ifrsSection: 'مركز مالي - أصول غير متداولة', ifrsRef: 'IAS 16', cashFlowType: 'استثماري', opening_debit: 888000, opening_credit: 0, period_debit: 0, period_credit: 0, balance: 888000 },
  { code: '2101', name: 'مستحقات الموردين والوكلاء الخارجيين', type: 'خصوم', ifrsCode: 'L-04', ifrsSubCode: 'L-04-02', ifrsItemName: 'ذمم دائنة تجارية', ifrsSubItemName: 'موردون خارجيون ووكالات توظيف خارجية', ifrsSection: 'مركز مالي - التزامات', ifrsRef: 'IAS 1.69', cashFlowType: 'تشغيلي - رأس مال عامل', opening_debit: 0, opening_credit: 175000, period_debit: 25000, period_credit: 39375, balance: -189375 },
  { code: '2102', name: 'مخصص مكافأة نهاية الخدمة (EOSB)', type: 'خصوم', ifrsCode: 'L-03', ifrsSubCode: 'L-03-01', ifrsItemName: 'مخصص مكافأة نهاية الخدمة', ifrsSubItemName: 'مخصص مكافأة نهاية الخدمة للموظفين (EOSB)', ifrsSection: 'مركز مالي - التزامات', ifrsRef: 'IAS 19', cashFlowType: 'تشغيلي', opening_debit: 0, opening_credit: 88000, period_debit: 0, period_credit: 6200, balance: -94200 },
  { code: '2103', name: 'أمانات ضريبة القيمة المضافة (ZATCA 15%)', type: 'خصوم', ifrsCode: 'L-05', ifrsSubCode: 'L-05-09', ifrsItemName: 'مصروفات مستحقة وأرصدة دائنة أخرى', ifrsSubItemName: 'ضريبة القيمة المضافة المستحقة للهيئة (VAT Output)', ifrsSection: 'مركز مالي - التزامات', ifrsRef: 'IAS 37 / ZATCA', cashFlowType: 'تشغيلي - رأس مال عامل', opening_debit: 0, opening_credit: 110000, period_debit: 12000, period_credit: 26000, balance: -124000 },
  { code: '3101', name: 'رأس المال المدفوع', type: 'حقوق ملكية', ifrsCode: 'E-01', ifrsSubCode: 'E-01-01', ifrsItemName: 'رأس المال', ifrsSubItemName: 'رأس المال المدفوع', ifrsSection: 'مركز مالي - حقوق الملكية', ifrsRef: 'IAS 1.78(e)', cashFlowType: 'تمويلي', opening_debit: 0, opening_credit: 1205000, period_debit: 0, period_credit: 0, balance: -1205000 },
  { code: '4101', name: 'إيرادات وساطة عقود الاستقدام', type: 'إيرادات', ifrsCode: 'R-01', ifrsSubCode: 'R-01-07', ifrsItemName: 'الإيرادات التشغيلية', ifrsSubItemName: 'إيرادات خدمات التوسط في الاستقدام (مساند)', ifrsSection: 'قائمة الدخل', ifrsRef: 'IFRS 15', cashFlowType: 'تشغيلي', opening_debit: 0, opening_credit: 320000, period_debit: 0, period_credit: 90000, balance: -410000 },
  { code: '4102', name: 'إيرادات عقود التأجير والتشغيل', type: 'إيرادات', ifrsCode: 'R-01', ifrsSubCode: 'R-01-15', ifrsItemName: 'الإيرادات التشغيلية', ifrsSubItemName: 'إيرادات تأجير الموارد البشرية وتشغيل الكوادر', ifrsSection: 'قائمة الدخل', ifrsRef: 'IFRS 15', cashFlowType: 'تشغيلي', opening_debit: 0, opening_credit: 85000, period_debit: 0, period_credit: 35425, balance: -120425 },
  { code: '5101', name: 'مصروفات تشغيل ومراكز إيواء', type: 'مصروفات', ifrsCode: 'R-02', ifrsSubCode: 'R-02-07', ifrsItemName: 'تكلفة الإيرادات', ifrsSubItemName: 'تكلفة عقود التوسط والاستقدام المباشرة', ifrsSection: 'قائمة الدخل', ifrsRef: 'IAS 2 / IAS 1.99', cashFlowType: 'تشغيلي', opening_debit: 75000, opening_credit: 0, period_debit: 15000, period_credit: 0, balance: 90000 },
  { code: '5102', name: 'رواتب وأجور الكوادر الإدارية', type: 'مصروفات', ifrsCode: 'R-04', ifrsSubCode: 'R-04-01', ifrsItemName: 'مصروفات عمومية وإدارية', ifrsSubItemName: 'رواتب وأجور الإدارة والموظفين الإداريين', ifrsSection: 'قائمة الدخل', ifrsRef: 'IAS 1.99', cashFlowType: 'تشغيلي', opening_debit: 110000, opening_credit: 0, period_debit: 20500, period_credit: 0, balance: 130500 },
];

const KAS_TRADE_MOCK_JOURNALS: JournalEntry[] = [
  { id: 'kas-j-401', ref_no: 'KAS-JV #401', date: '2026-08-18', description: 'قيد مبيعات المعرض التجاري الرئيسي — دفعة نقاط البيع والفواتير الضريبية', amount: 96600.0, status: 'معتمد', branch: 'المعرض التجاري الرئيسي' },
  { id: 'kas-j-400', ref_no: 'KAS-JV #400', date: '2026-08-17', description: 'قيد استحقاق مستخلص توريدات منصة اعتماد #ETM-2026-88991', amount: 145000.0, status: 'معتمد', branch: 'المقر الرئيسي لشركة كاس للتجارة' },
  { id: 'kas-j-399', ref_no: 'KAS-JV #399', date: '2026-08-16', description: 'قيد مبيعات وتوريدات قطاع الأميال التجاري — عقد شركة المدار للتجهيزات', amount: 64400.0, status: 'معتمد', branch: 'فرع قطاع الأميال التجاري' },
  { id: 'kas-j-398', ref_no: 'KAS-JV #398', date: '2026-08-15', description: 'إثبات مشتريات بضائع وتجهيزات لمستودعات كاس المركزية #PO-KAS-2026-881', amount: 38500.0, status: 'معتمد', branch: 'مستودعات كاس المركزية' },
];

const KAS_TRADE_MOCK_VOUCHERS: Voucher[] = [
  { id: 'kas-v-91', voucher_no: 'قبض تجاري #91', type: 'قبض', date: '2026-08-18', payee_payer: 'مجموعة النخبة للتجهيزات التجارية (قطاع الأميال)', treasury: 'بنك الرياض - حساب التجارة والمنافسات', amount: 64400.0, status: 'معتمد' },
  { id: 'kas-v-90', voucher_no: 'قبض تجاري #90', type: 'قبض', date: '2026-08-17', payee_payer: 'الهيئة العامة للموانئ (مستخلص توريد أجهزة)', treasury: 'مصرف الراجحي التجاري', amount: 95018.75, status: 'معتمد' },
  { id: 'kas-v-21', voucher_no: 'صرف تجاري #21', type: 'صرف', date: '2026-08-16', payee_payer: 'شركة التوريدات الصناعية المتحدة', treasury: 'مصرف الراجحي التجاري', amount: 38500.0, status: 'معتمد' },
];

const KAS_TRADE_TRIAL_BALANCE_DATA = [
  { code: '1101', name: 'خزينة المعارض والصندوق التجاري الرئيسي', type: 'أصول', ifrsCode: 'A-10', ifrsSubCode: 'A-10-01', ifrsItemName: 'النقد وما في حكمه', ifrsSubItemName: 'النقد في الصناديق الرئيسية', ifrsSection: 'مركز مالي - أصول متداولة', ifrsRef: 'IAS 7', cashFlowType: 'نقد وما في حكمه', opening_debit: 150000, opening_credit: 0, period_debit: 45000, period_credit: 40800, balance: 154200 },
  { code: '1102', name: 'بنك الرياض - حساب التجارة والمنافسات الحكومية', type: 'أصول', ifrsCode: 'A-10', ifrsSubCode: 'A-10-08', ifrsItemName: 'النقد وما في حكمه', ifrsSubItemName: 'حسابات جارية تشغيلية لدى البنوك المحلية', ifrsSection: 'مركز مالي - أصول متداولة', ifrsRef: 'IAS 7', cashFlowType: 'نقد وما في حكمه', opening_debit: 380000, opening_credit: 0, period_debit: 82000, period_credit: 41500, balance: 420500 },
  { code: '1103', name: 'مصرف الراجحي - حساب مبيعات المعارض والأميال', type: 'أصول', ifrsCode: 'A-10', ifrsSubCode: 'A-10-08', ifrsItemName: 'النقد وما في حكمه', ifrsSubItemName: 'حسابات جارية تشغيلية لدى البنوك المحلية', ifrsSection: 'مركز مالي - أصول متداولة', ifrsRef: 'IAS 7', cashFlowType: 'نقد وما في حكمه', opening_debit: 220000, opening_credit: 0, period_debit: 110300, period_credit: 55000, balance: 275300 },
  { code: '1104', name: 'الضمانات البنكية ومستخلصات منصة اعتماد التجارية', type: 'أصول', ifrsCode: 'A-07', ifrsSubCode: 'A-07-01', ifrsItemName: 'ذمم مدينة تجارية', ifrsSubItemName: 'ذمم عملاء المنافسات والتوريدات التجارية', ifrsSection: 'مركز مالي - أصول متداولة', ifrsRef: 'IFRS 9 / IFRS 15', cashFlowType: 'تشغيلي - رأس مال عامل', opening_debit: 160000, opening_credit: 0, period_debit: 54500, period_credit: 30000, balance: 184500 },
  { code: '1201', name: 'تجهيزات المعارض والمستودعات وأسطول التوزيع', type: 'أصول', ifrsCode: 'A-01', ifrsSubCode: 'A-01-04', ifrsItemName: 'ممتلكات وآلات ومعدات (إجمالي)', ifrsSubItemName: 'معارض تجارية ومستودعات وأسطول توزيع', ifrsSection: 'مركز مالي - أصول غير متداولة', ifrsRef: 'IAS 16', cashFlowType: 'استثماري', opening_debit: 888000, opening_credit: 0, period_debit: 0, period_credit: 0, balance: 888000 },
  { code: '2101', name: 'مستحقات المصانع وموردي البضائع والتوريدات', type: 'خصوم', ifrsCode: 'L-04', ifrsSubCode: 'L-04-01', ifrsItemName: 'ذمم دائنة تجارية', ifrsSubItemName: 'موردو البضائع والتوريدات التجارية', ifrsSection: 'مركز مالي - التزامات', ifrsRef: 'IAS 1.69', cashFlowType: 'تشغيلي - رأس مال عامل', opening_debit: 0, opening_credit: 175000, period_debit: 25000, period_credit: 39375, balance: -189375 },
  { code: '2102', name: 'مخصص مكافأة نهاية الخدمة (EOSB)', type: 'خصوم', ifrsCode: 'L-03', ifrsSubCode: 'L-03-01', ifrsItemName: 'مخصص مكافأة نهاية الخدمة', ifrsSubItemName: 'مخصص مكافأة نهاية الخدمة للموظفين (EOSB)', ifrsSection: 'مركز مالي - التزامات', ifrsRef: 'IAS 19', cashFlowType: 'تشغيلي', opening_debit: 0, opening_credit: 88000, period_debit: 0, period_credit: 6200, balance: -94200 },
  { code: '2103', name: 'ضريبة القيمة المضافة للمبيعات التجارية (ZATCA 15%)', type: 'خصوم', ifrsCode: 'L-05', ifrsSubCode: 'L-05-09', ifrsItemName: 'مصروفات مستحقة وأرصدة دائنة أخرى', ifrsSubItemName: 'ضريبة القيمة المضافة المستحقة للهيئة (VAT Output)', ifrsSection: 'مركز مالي - التزامات', ifrsRef: 'IAS 37 / ZATCA', cashFlowType: 'تشغيلي - رأس مال عامل', opening_debit: 0, opening_credit: 110000, period_debit: 12000, period_credit: 26000, balance: -124000 },
  { code: '3101', name: 'رأس المال المدفوع — شركة كاس للتجارة', type: 'حقوق ملكية', ifrsCode: 'E-01', ifrsSubCode: 'E-01-01', ifrsItemName: 'رأس المال', ifrsSubItemName: 'رأس المال المدفوع', ifrsSection: 'مركز مالي - حقوق الملكية', ifrsRef: 'IAS 1.78(e)', cashFlowType: 'تمويلي', opening_debit: 0, opening_credit: 1205000, period_debit: 0, period_credit: 0, balance: -1205000 },
  { code: '4101', name: 'إيرادات مبيعات المعارض التجارية وقطاع الأميال', type: 'إيرادات', ifrsCode: 'R-01', ifrsSubCode: 'R-01-01', ifrsItemName: 'الإيرادات التشغيلية', ifrsSubItemName: 'مبيعات البضائع والمعارض التجارية والأميال', ifrsSection: 'قائمة الدخل', ifrsRef: 'IFRS 15', cashFlowType: 'تشغيلي', opening_debit: 0, opening_credit: 320000, period_debit: 0, period_credit: 90000, balance: -410000 },
  { code: '4102', name: 'إيرادات عقود التوريدات والمنافسات الحكومية (اعتماد)', type: 'إيرادات', ifrsCode: 'R-01', ifrsSubCode: 'R-01-01', ifrsItemName: 'الإيرادات التشغيلية', ifrsSubItemName: 'إيرادات عقود التوريد والمشاريع التجارية', ifrsSection: 'قائمة الدخل', ifrsRef: 'IFRS 15', cashFlowType: 'تشغيلي', opening_debit: 0, opening_credit: 85000, period_debit: 0, period_credit: 35425, balance: -120425 },
  { code: '5101', name: 'تكلفة البضاعة المباعة والتوريدات المباشرة (COGS)', type: 'مصروفات', ifrsCode: 'R-02', ifrsSubCode: 'R-02-01', ifrsItemName: 'تكلفة الإيرادات', ifrsSubItemName: 'تكلفة البضائع المبيعة ومشتريات التوريدات', ifrsSection: 'قائمة الدخل', ifrsRef: 'IAS 2 / IAS 1.99', cashFlowType: 'تشغيلي', opening_debit: 75000, opening_credit: 0, period_debit: 15000, period_credit: 0, balance: 90000 },
  { code: '5102', name: 'رواتب ومصروفات المعارض والمستودعات والإدارة', type: 'مصروفات', ifrsCode: 'R-04', ifrsSubCode: 'R-04-01', ifrsItemName: 'مصروفات عمومية وإدارية', ifrsSubItemName: 'رواتب وأجور الإدارة والموظفين الإداريين', ifrsSection: 'قائمة الدخل', ifrsRef: 'IAS 1.99', cashFlowType: 'تشغيلي', opening_debit: 110000, opening_credit: 0, period_debit: 20500, period_credit: 0, balance: 130500 },
];

const SUPPLIERS_ACCOUNTS = [
  { id: '1', name: "PLATINUM BROTHERS INT'L", country: 'الفلبين - مانيلا', cv_count: 158, balance_usd: 34500, balance_sar: 129375, status: 'مطابق وموثق' },
  { id: '2', name: 'DAMAS FOREIGN EMPLOYMENT', country: 'إثيوبيا - أديس أبابا', cv_count: 42, balance_usd: 4200, balance_sar: 15750, status: 'مطابق' },
  { id: '3', name: 'Supreme Link Employment Agency', country: 'أوغندا - كمبالا', cv_count: 38, balance_usd: 11800, balance_sar: 44250, status: 'مطابق وموثق' },
];

export type FinanceTab = 
  | 'overview' 
  | 'financial-position' 
  | 'trial-balance' 
  | 'income-statement' 
  | 'cash-flow'
  | 'journals' 
  | 'vouchers' 
  | 'bank-reconciliation'
  | 'vat-declaration'
  | 'transfers' 
  | 'suppliers-agents' 
  | 'aging'
  | 'musaned-escrow' 
  | 'eosb-zakat' 
  | 'chart-of-accounts' 
  | 'budget'
  | 'period-closing' 
  | 'ifrs-engine' 
  | 'financial-ratios' 
  | 'odoo-accounting'
  | 'tax';

export const FinancePage: React.FC = () => {
  const { activeCompany } = useCompany();
  const isKasTrade = activeCompany.id === 'KAS';
  const TRIAL_BALANCE_DATA = isKasTrade ? KAS_TRADE_TRIAL_BALANCE_DATA : RECRUITMENT_TRIAL_BALANCE_DATA;
  const financeJournalsStorageKey = isKasTrade ? 'kas_finance_journals' : 'finance_journals';
  const financeVouchersStorageKey = isKasTrade ? 'kas_finance_vouchers' : 'finance_vouchers';
  const { addNotification } = useAppStore();
  const storeActiveTab = useAppStore(state => state.activeTab);

  const getMappedTab = (tabKey: string): FinanceTab => {
    switch (tabKey) {
      case 'chart-accounts':
      case 'chart-of-accounts':
        return 'chart-of-accounts';
      case 'journals':
        return 'journals';
      case 'receipt-vouchers':
      case 'payment-vouchers':
      case 'vouchers':
        return 'vouchers';
      case 'bank-reconciliation':
      case 'banks-reconciliation':
        return 'bank-reconciliation';
      case 'banks-boxes':
      case 'transfers':
        return 'transfers';
      case 'vat-declaration':
      case 'invoices':
      case 'zatca':
      case 'tax':
        return 'vat-declaration';
      case 'trial-balance':
        return 'trial-balance';
      case 'income-statement':
        return 'income-statement';
      case 'balance-sheet':
      case 'financial-position':
        return 'financial-position';
      case 'cash-flow':
      case 'cash-flow-statement':
        return 'cash-flow';
      case 'aging':
      case 'ar-aging':
      case 'ap-aging':
        return 'aging';
      case 'budget':
        return 'budget';
      case 'period-closing':
        return 'period-closing';
      case 'musaned-escrow':
        return 'musaned-escrow';
      case 'suppliers-agents':
        return 'suppliers-agents';
      case 'eosb-zakat':
        return 'eosb-zakat';
      case 'ifrs-engine':
      case 'group-consolidation':
        return 'ifrs-engine';
      case 'financial-ratios':
        return 'financial-ratios';
      case 'odoo-accounting':
      case 'payment-terms':
      case 'fiscal-positions':
      case 'reconciliation-models':
        return 'odoo-accounting';
      default:
        return 'overview';
    }
  };

  const [activeTab, setActiveTab] = useState<FinanceTab>(() => getMappedTab(storeActiveTab));
  const [voucherFilterType, setVoucherFilterType] = useState<'all' | 'قبض' | 'صرف'>(() => {
    if (storeActiveTab === 'receipt-vouchers') return 'قبض';
    if (storeActiveTab === 'payment-vouchers') return 'صرف';
    return 'all';
  });

  useEffect(() => {
    setActiveTab(getMappedTab(storeActiveTab));
    if (storeActiveTab === 'receipt-vouchers') {
      setVoucherFilterType('قبض');
    } else if (storeActiveTab === 'payment-vouchers') {
      setVoucherFilterType('صرف');
    }
  }, [storeActiveTab]);

  // Bank Reconciliation state
  const [selectedBankCode, setSelectedBankCode] = useState<string>('1102');
  const [bankStatementBalance, setBankStatementBalance] = useState<string>('420500');
  const [reconciliationDate, setReconciliationDate] = useState<string>('2026-08-18');
  const [clearedTransactions, setClearedTransactions] = useState<string[]>(['chk-1', 'dep-1']);
  const [bankAdjustments, setBankAdjustments] = useState<Array<{ id: string; desc: string; amount: number; type: 'fee' | 'interest' }>>([
    { id: 'adj-1', desc: 'رسوم خدمة الصيانة البنكية الشهرية', amount: 57.50, type: 'fee' }
  ]);
  const [showAddAdjustmentModal, setShowAddAdjustmentModal] = useState(false);
  const [newAdjustment, setNewAdjustment] = useState({ desc: '', amount: '', type: 'fee' as 'fee' | 'interest' });

  // VAT Declaration state
  const [vatPeriod, setVatPeriod] = useState<string>('Q2-2026');

  // Printable Vouchers & Journals
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<Voucher | null>(null);
  const [selectedJournalForPrint, setSelectedJournalForPrint] = useState<JournalEntry | null>(null);

  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  useEffect(() => {
    const loadFinanceRecords = () => {
      Promise.all([
        realErpDataStore.getRecords<JournalEntry>(
          financeJournalsStorageKey,
          isKasTrade ? KAS_TRADE_MOCK_JOURNALS : MOCK_JOURNALS,
          isKasTrade ? 'KAS' : undefined
        ),
        realErpDataStore.getRecords<Voucher>(
          financeVouchersStorageKey,
          isKasTrade ? KAS_TRADE_MOCK_VOUCHERS : MOCK_VOUCHERS,
          isKasTrade ? 'KAS' : undefined
        ),
      ]).then(([j, v]) => {
        const liveEngineJournals: JournalEntry[] = journalEngine
          .getJournalsByCompany(activeCompany.id)
          .map((ej) => ({
            id: ej.id,
            ref_no: ej.entryNumber,
            date: ej.date || ej.entryDate,
            description: ej.description,
            amount: ej.totalDebit,
            status: ej.status === 'POSTED' ? 'معتمد' : ej.status === 'DRAFT' ? 'مسودة' : 'بانتظار الاعتماد',
            branch: ej.lines[0]?.costCenterName || (isKasTrade ? 'المعرض التجاري الرئيسي' : 'فرع الرياض الرئيسي'),
          }));
        const existingRefs = new Set(liveEngineJournals.map((x) => x.ref_no));
        setJournals([...liveEngineJournals, ...j.filter((x) => !existingRefs.has(x.ref_no))]);
        setVouchers(v);
      });
    };
    loadFinanceRecords();
    window.addEventListener('erp-data-updated', loadFinanceRecords);
    return () => window.removeEventListener('erp-data-updated', loadFinanceRecords);
  }, [activeCompany.id, isKasTrade, financeJournalsStorageKey, financeVouchersStorageKey]);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  
  // Drill-down and Chart of Accounts state
  const [selectedAccountForDrilldown, setSelectedAccountForDrilldown] = useState<any | null>(null);
  const [coaCategoryFilter, setCoaCategoryFilter] = useState<string>('ALL');
  const [coaSearchQuery, setCoaSearchQuery] = useState<string>('');
  const [showTbClosingCols, setShowTbClosingCols] = useState<boolean>(true);
  const [closedPeriods, setClosedPeriods] = useState<number[]>(() => {
    const locked = journalEngine.getLockedPeriods(activeCompany.id);
    return locked
      .filter((p) => p.startsWith('2026-'))
      .map((p) => parseInt(p.split('-')[1], 10))
      .filter((n) => !isNaN(n));
  });
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    code: '',
    nameAr: '',
    nameEn: '',
    category: 'أصول' as const,
    balance: '0',
  });

  // Editable Chart of Accounts, Assets/Balance Sheet & Income Statement State
  const [finCoaAccounts, setFinCoaAccounts] = useState<AccountItem[]>(() =>
    chartOfAccountsService.getAccountsByCompany(activeCompany.id as any)
  );
  useEffect(() => {
    setFinCoaAccounts(chartOfAccountsService.getAccountsByCompany(activeCompany.id as any));
  }, [activeCompany.id]);

  const handleUpdateFinCoa = (code: string, patch: Partial<AccountItem>) => {
    chartOfAccountsService.updateAccount(activeCompany.id as any, code, patch);
    setFinCoaAccounts(chartOfAccountsService.getAccountsByCompany(activeCompany.id as any));
  };

  const handleAddQuickFinCoaAccount = () => {
    const nextNum = finCoaAccounts.length + 1101;
    chartOfAccountsService.addAccount(activeCompany.id as any, {
      code: `${nextNum}`,
      nameAr: `حساب جديد في الدليل #${finCoaAccounts.length + 1}`,
      nameEn: `New Account #${finCoaAccounts.length + 1}`,
      category: coaCategoryFilter !== 'ALL' ? (coaCategoryFilter as any) : 'أصول',
      nature: coaCategoryFilter === 'خصوم' || coaCategoryFilter === 'حقوق ملكية' || coaCategoryFilter === 'إيرادات' ? 'دائن' : 'مدين',
      statementType: coaCategoryFilter === 'إيرادات' || coaCategoryFilter === 'مصروفات' ? 'قائمة الدخل (أرباح وخسائر)' : 'قائمة المركز المالي (ميزانية)',
      level: 3,
      openingBalance: 0,
      balance: 0,
      currency: 'SAR',
      isActive: true,
      ifrsSubCode: 'A-10-01',
    });
    setFinCoaAccounts(chartOfAccountsService.getAccountsByCompany(activeCompany.id as any));
    addNotification({
      title: 'إضافة حساب جديد للشجرة',
      message: `تمت إضافة الحساب (${nextNum}) ويمكنك تعديل اسمه وتصنيفه ورصيده مباشرة.`,
      type: 'success',
    });
  };

  const handleDeleteFinCoaAccount = (code: string, nameAr: string) => {
    const next = finCoaAccounts.filter((a) => a.code !== code);
    chartOfAccountsService.saveAccountsForCompany(activeCompany.id as any, next);
    setFinCoaAccounts(next);
    addNotification({
      title: 'حذف حساب من الدليل',
      message: `تم حذف الحساب (${code} - ${nameAr}) من الشجرة.`,
      type: 'info',
    });
  };

  const [finPosData, setFinPosData] = useState({
    cash: 850000,
    musanedEscrow: 184500,
    receivables: 215971.2,
    ppeNet: 882500,
    payables: 189375,
    eosb: 94200,
    vatZakat: 124000,
    shareCapital: 1205000,
    retainedEarnings: 520396.2,
  });

  const [finIncData, setFinIncData] = useState({
    musanedRev: 410000,
    rentalRev: 115471.2,
    directCostAgency: 112500,
    shelterCost: 46000,
    sellingExp: 14500,
    adminExp: 35000,
    depreciationExp: 12500,
  });

  const { createItem: createJournalEntry } = useTableMutation('company_journal_entries');

  // Modals
  const [showAddVoucherModal, setShowAddVoucherModal] = useState(false);
  const [showAddJournalModal, setShowAddJournalModal] = useState(false);

  // Forms
  const [voucherForm, setVoucherForm] = useState({
    type: 'قبض' as 'قبض' | 'صرف',
    payee_payer: '',
    treasury: 'بنك الراجحي',
    amount: '',
  });
  const [voucherSearchQuery, setVoucherSearchQuery] = useState('');

  const [journalForm, setJournalForm] = useState({
    description: '',
    amount: '',
    branch: 'فرع الرياض الرئيسي',
  });

  // EOSB Calculator
  const [eosbCalc, setEosbCalc] = useState({
    salary: '8500',
    years: '3.5',
    reason: 'resignation' as 'resignation' | 'termination',
  });

  const calculateEOSBResult = () => {
    const sal = parseFloat(eosbCalc.salary) || 0;
    const yrs = parseFloat(eosbCalc.years) || 0;
    const base = yrs <= 5 ? yrs * (sal / 2) : 5 * (sal / 2) + (yrs - 5) * sal;
    let rawBenefit = base;
    if (eosbCalc.reason === 'resignation') {
      if (yrs < 2) rawBenefit = 0;
      else if (yrs >= 2 && yrs < 5) rawBenefit = base * (1 / 3);
      else if (yrs >= 5 && yrs < 10) rawBenefit = base * (2 / 3);
    }
    return Math.round(rawBenefit * 100) / 100;
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherForm.payee_payer || !voucherForm.amount) return;

    const newV: Voucher = {
      id: `v-${Date.now()}`,
      voucher_no: `${voucherForm.type} #${60 + vouchers.length}`,
      type: voucherForm.type,
      date: new Date().toISOString().slice(0, 10),
      payee_payer: voucherForm.payee_payer,
      treasury: voucherForm.treasury,
      amount: parseFloat(voucherForm.amount) || 0,
      status: 'معتمد',
    };

    try {
      journalEngine.autoPostOperationalTransaction({
        companyId: activeCompany.id,
        transactionType: newV.type === 'قبض' ? 'RECEIPT_VOUCHER' : 'PAYMENT_VOUCHER',
        referenceId: newV.voucher_no,
        partyName: newV.payee_payer,
        amount: newV.amount,
        paymentMethod: newV.treasury.includes('الصندوق') ? 'CASH' : 'BANK',
        description: `سند ${newV.type} — ${newV.payee_payer} (${newV.treasury})`,
        createdBy: 'المحاسب المالي',
      });
    } catch (err: any) {
      addNotification({
        title: 'تعذر ترحيل السند',
        message: err?.message || 'الفترة المالية مقفلة أو حدث خطأ في الترحيل',
        type: 'warning',
      });
      return;
    }

    const updated = await realErpDataStore.addRecord<Voucher>(
      financeVouchersStorageKey,
      newV,
      vouchers
    );
    setVouchers(updated);

    enterpriseAccountingSuiteService.postJournalToLiveTrialBalance(activeCompany.id, {
      description: `سند ${newV.type} — ${newV.payee_payer} (${newV.treasury})`,
      sourceModule: 'سند قبض / صرف',
      referenceDoc: newV.voucher_no,
      lines:
        newV.type === 'قبض'
          ? [
              { ifrsTargetCode: 'A-10', fallbackAccountName: newV.treasury, debit: newV.amount, credit: 0 },
              { ifrsTargetCode: 'R-01', fallbackAccountName: newV.payee_payer, debit: 0, credit: newV.amount },
            ]
          : [
              { ifrsTargetCode: 'R-04', fallbackAccountName: newV.payee_payer, debit: newV.amount, credit: 0 },
              { ifrsTargetCode: 'A-10', fallbackAccountName: newV.treasury, debit: 0, credit: newV.amount },
            ],
    });

    setShowAddVoucherModal(false);
    setVoucherForm({ type: 'قبض', payee_payer: '', treasury: 'بنك الراجحي', amount: '' });
  };

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalForm.description || !journalForm.amount) return;

    const amt = parseFloat(journalForm.amount) || 0;
    const newJ: JournalEntry = {
      id: `j-${Date.now()}`,
      ref_no: `قيد #${283 + journals.length}`,
      date: new Date().toISOString().slice(0, 10),
      description: journalForm.description,
      amount: amt,
      status: 'معتمد',
      branch: journalForm.branch,
    };

    try {
      const created = journalEngine.createJournalEntry(activeCompany.id, {
        entryDate: newJ.date,
        description: newJ.description,
        entryType: 'MANUAL',
        sourceReference: newJ.ref_no,
        branchName: newJ.branch,
        createdBy: 'المحاسب المالي',
        autoPost: true,
        lines: [
          { accountCode: '110201', debit: amt, credit: 0, description: newJ.description, costCenterName: newJ.branch },
          { accountCode: '410101', debit: 0, credit: amt, description: newJ.description, costCenterName: newJ.branch },
        ],
      });
      if (created.error) {
        addNotification({
          title: 'تعذر ترحيل القيد',
          message: created.error,
          type: 'warning',
        });
        return;
      }
    } catch (err: any) {
      addNotification({
        title: 'تعذر ترحيل القيد',
        message: err?.message || 'الفترة المالية مقفلة أو القيد غير متوازن',
        type: 'warning',
      });
      return;
    }

    await createJournalEntry.mutateAsync({
      company_id: activeCompany.code || 'SAF',
      entry_number: newJ.ref_no,
      entry_date: newJ.date,
      narration: newJ.description,
      total_debit: amt,
      total_credit: amt,
      status: 'POSTED',
      branch: newJ.branch,
    });

    const updated = await realErpDataStore.addRecord<JournalEntry>(
      financeJournalsStorageKey,
      newJ,
      journals
    );
    setJournals(updated);

    enterpriseAccountingSuiteService.postJournalToLiveTrialBalance(activeCompany.id, {
      description: newJ.description,
      sourceModule: 'قيد يومية يدوي',
      referenceDoc: newJ.ref_no,
      lines: [
        { ifrsTargetCode: 'A-10', fallbackAccountName: 'البنك / الحساب المدين', debit: amt, credit: 0, costCenter: newJ.branch },
        { ifrsTargetCode: 'R-01', fallbackAccountName: 'الإيرادات / الحساب الدائن', debit: 0, credit: amt, costCenter: newJ.branch },
      ],
    });

    setShowAddJournalModal(false);
    setJournalForm({ description: '', amount: '', branch: 'فرع الرياض الرئيسي' });
  };

  const filteredJournals = selectedBranch === 'ALL' ? journals : journals.filter(j => (j.branch || '').includes(selectedBranch));

  return (
    <div className="space-y-6">
      {/* Top Gallery-White Header Banner */}
      <div
        className="bg-white rounded-3xl p-6 border border-[#e0e0e0]"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <BusinessIllustration
              type="smacc-finance"
              size="sm"
              showBackground={false}
              className="!w-16 !h-14 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>FINANCIAL & ACCOUNTING SUITE</span>
                <span className="pill-tag-shade" style={{ fontSize: '11px' }}>المعايير المحاسبية SOCPA / IFRS</span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0]">
                  <CorporateAvatar name="إبراهيم الشمري" role="المدير المالي المعتمد" departmentId="finance" size="xs" status="verified" />
                  <span className="text-[10.5px] font-bold text-[#141414]">الاعتماد المالي: إبراهيم الشمري</span>
                </div>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 650, letterSpacing: '-0.02em', color: '#141414', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                {isKasTrade ? 'الإدارة المالية والمحاسبة التجارية — شركة كاس' : 'الإدارة المالية والقوائم الختامية'}
              </h1>
              <p className="text-xs text-[#707070] mt-1 font-sans">
                {isKasTrade
                  ? <>المركز المالي، ميزان المراجعة، مبيعات المعارض وقطاع الأميال، ومستخلصات المنافسات التجارية لـ <strong className="text-[#141414]">{activeCompany.name}</strong></>
                  : <>المركز المالي، ميزان المراجعة، قائمة الدخل، قيود اليومية، وتسويات مساند لـ <strong className="text-[#141414]">{activeCompany.name}</strong></>}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-document-extractor'))}
              className="button-outline-on-light"
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px', fontWeight: 700 }}
              title="رفع واستخلاص آلي لـ 100+ فاتورة أو مستندات PDF / Word / Excel أو قيود نظام محاسبي منفصل"
            >
              <FileCheck className="w-3.5 h-3.5 ml-1 text-[#141414]" />
              <span>رفع واستخلاص فواتير / مستندات (100+ فاتورة / PDF / Word / Excel)</span>
            </button>
            <button
              onClick={() => setShowAddJournalModal(true)}
              className="button-primary-pill"
              style={{ fontSize: '12px', padding: '6px 18px', minHeight: '38px' }}
            >
              <Plus className="w-4 h-4 ml-1 text-[#ffffff]" />
              <span>قيد يومية جديد</span>
            </button>
            <button
              onClick={() => setShowAddVoucherModal(true)}
              className="button-outline-on-light"
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px' }}
            >
              <Receipt className="w-3.5 h-3.5 ml-1 text-[#141414]" />
              <span>سند قبض / صرف</span>
            </button>

            <button
              onClick={() => exportData('trial-balance', TRIAL_BALANCE_DATA, 'excel', `ميزان المراجعة - ${activeCompany.name}`)}
              className="button-outline-on-light"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 ml-1 text-[#141414]" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => exportData('trial-balance', TRIAL_BALANCE_DATA, 'pdf', `ميزان المراجعة - ${activeCompany.name}`)}
              className="button-outline-on-light"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
            >
              <FileText className="w-3.5 h-3.5 ml-1 text-[#141414]" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Category Accounting Sequence Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Category 1: القوائم والمركز المالي */}
        <div className="card-pricing p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-100">
            <PieChart className="w-4 h-4 text-[#141414]" />
            <span className="text-xs font-bold text-zinc-900">1. القوائم والمركز المالي</span>
          </div>
          <div className="space-y-1.5">
            {[
              { id: 'overview', label: 'اللوحة المالية العامة', icon: PieChart },
              { id: 'trial-balance', label: 'ميزان المراجعة (Trial Balance)', icon: Scale },
              { id: 'income-statement', label: 'قائمة الدخل والأرباح (P&L)', icon: TrendingUp },
              { id: 'financial-position', label: 'قائمة المركز المالي (Balance Sheet)', icon: Landmark },
              { id: 'cash-flow', label: 'قائمة التدفقات النقدية (Cash Flow)', icon: Coins },
              { id: 'financial-ratios', label: 'النسب المالية وخطة التحسين (16 نسبة)', icon: BarChart3 },
              { id: 'ifrs-engine', label: 'محرك وفحوصات IFRS (211 حساباً / 34 فحصاً)', icon: ShieldCheck },
            ].map(t => {
              const isActive = activeTab === t.id;
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-full text-xs transition-all ${
                    isActive
                      ? 'bg-[#141414] text-white font-bold shadow-sm'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-medium'
                  }`}
                >
                  <span>{t.label}</span>
                  <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#707070]'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Category 2: القيود والعمليات اليومية */}
        <div className="card-pricing p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-100">
            <Receipt className="w-4 h-4 text-[#141414]" />
            <span className="text-xs font-bold text-zinc-900">2. القيود والعمليات اليومية</span>
          </div>
          <div className="space-y-1.5">
            {[
              { id: 'journals', label: 'دفتر القيود المحاسبية', icon: BookOpen },
              { id: 'vouchers', label: 'سندات القبض والصرف', icon: Receipt },
              { id: 'bank-reconciliation', label: 'التسوية والمطابقة البنكية', icon: Landmark },
              { id: 'transfers', label: 'التحويلات البنكية والصناديق', icon: Coins },
            ].map(t => {
              const isActive = activeTab === t.id;
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-full text-xs transition-all ${
                    isActive
                      ? 'bg-[#141414] text-white font-bold shadow-sm'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-medium'
                  }`}
                >
                  <span>{t.label}</span>
                  <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#707070]'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Category 3: الذمم التجارية / الاستقدام والزكاة */}
        <div className="card-pricing p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-100">
            <Globe className="w-4 h-4 text-[#141414]" />
            <span className="text-xs font-bold text-zinc-900">
              {isKasTrade ? '3. الذمم التجارية والموردين والزكاة' : '3. الاستقدام والشركاء والزكاة'}
            </span>
          </div>
          <div className="space-y-1.5">
            {(isKasTrade
              ? [
                  { id: 'aging', label: 'أعمار الذمم التجارية والتقادم (Aging)', icon: Clock },
                  { id: 'eosb-zakat', label: 'نهاية الخدمة والزكاة الشرعية', icon: Calculator },
                  { id: 'vat-declaration', label: 'فواتير وضريبة المبيعات التجارية (ZATCA)', icon: Receipt },
                  { id: 'budget', label: 'موازنة المعارض والمنافسات التجارية', icon: BarChart3 },
                ]
              : [
                  { id: 'musaned-escrow', label: 'أمانات مساند (90 يوماً)', icon: ShieldCheck },
                  { id: 'suppliers-agents', label: 'حسابات الوكلاء (⃁ / $)', icon: Globe },
                  { id: 'aging', label: 'أعمار الذمم والتقادم (Aging)', icon: Clock },
                  { id: 'eosb-zakat', label: 'نهاية الخدمة والزكاة', icon: Calculator },
                ]
            ).map(t => {
              const isActive = activeTab === t.id;
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-full text-xs transition-all ${
                    isActive
                      ? 'bg-[#141414] text-white font-bold shadow-sm'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-medium'
                  }`}
                >
                  <span>{t.label}</span>
                  <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#707070]'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Category 4: الهيكل المحاسبي والإقفال */}
        <div className="card-pricing p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-100">
            <FolderTree className="w-4 h-4 text-[#141414]" />
            <span className="text-xs font-bold text-zinc-900">4. الهيكل المحاسبي والضرائب</span>
          </div>
          <div className="space-y-1.5">
            {[
              { id: 'chart-of-accounts', label: 'شجرة الحسابات والدليل', icon: FolderTree },
              { id: 'vat-declaration', label: 'الإقرار الضريبي (ZATCA 15%)', icon: Receipt },
              { id: 'odoo-accounting', label: 'أتمتة Odoo (شروط السداد والضرائب)', icon: ShieldCheck },
              { id: 'budget', label: 'الميزانية التقديرية vs الفعلي', icon: BarChart3 },
              { id: 'period-closing', label: 'إقفال الفترات والسنوات', icon: Lock },
            ].map(t => {
              const isActive = activeTab === t.id;
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-full text-xs transition-all ${
                    isActive
                      ? 'bg-[#141414] text-white font-bold shadow-sm'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-medium'
                  }`}
                >
                  <span>{t.label}</span>
                  <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#707070]'}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: '13px', fontWeight: 550, color: '#141414' }}>إجمالي الإيرادات المحققة</span>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#141414]">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#141414', letterSpacing: '-0.02em' }}>525,471.20 ⃁</div>
              <div className="flex items-center justify-between mt-3">
                <span className="pill-tag-mint">نمو شهري +14.8%</span>
                <span className="text-[11px] text-zinc-600">{isKasTrade ? 'مبيعات المعارض والأميال والمنافسات' : 'عقود استقدام وتأجير'}</span>
              </div>
            </div>

            <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: '13px', fontWeight: 550, color: '#71717a' }}>إجمالي المصروفات والتشغيل</span>
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#141414', letterSpacing: '-0.02em' }}>220,500.00 ⃁</div>
              <div className="flex items-center justify-between mt-3">
                <span className="pill-tag-shade">مصاريف الفترة</span>
                <span className="text-[11px] text-[#707070]">{isKasTrade ? 'مشتريات بضائع، شحن، معارض' : 'تأشيرات، رواتب، إعاشة'}</span>
              </div>
            </div>

            <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#f3f3f3', color: '#141414', border: '1px solid #e0e0e0' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: '13px', fontWeight: 550, color: '#707070' }}>صافي الأرباح التشغيلية</span>
                <div className="w-8 h-8 rounded-full bg-white border border-[#e0e0e0] flex items-center justify-center text-[#141414]">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#141414', letterSpacing: '-0.02em' }}>304,971.20 ⃁</div>
              <div className="flex items-center justify-between mt-3">
                <span className="pill-tag-mint">هامش ربح 58%</span>
                <span className="text-[11px] text-[#707070]">أداء مالي قياسي</span>
              </div>
            </div>

            <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: '13px', fontWeight: 550, color: '#71717a' }}>
                  {isKasTrade ? 'الضمانات البنكية ومستخلصات اعتماد' : 'أمانات مساند المعلقة (90 يوماً)'}
                </span>
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#141414', letterSpacing: '-0.02em' }}>184,500.00 ⃁</div>
              <div className="flex items-center justify-between mt-3">
                <span className="pill-tag-shade">{isKasTrade ? 'ضمانات جارية' : 'فترة الضمان'}</span>
                <span className="text-[11px] text-[#707070]">{isKasTrade ? 'مشاريع وتوريدات معتمدة' : 'حساب وسيط محمي'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRIAL BALANCE */}
      {activeTab === 'trial-balance' && (
        <div className="space-y-6">
          <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#141414]" />
                  <span>ميزان المراجعة بالأرصدة والمجاميع (الرصيد النهائي مدين ودائن مع إمكانية الإخفاء)</span>
                </h3>
                <p className="text-xs text-[#707070] mt-1">
                  مطابقة الأرصدة الافتتاحية وحركات الفترة والرصيد النهائي (مدين / دائن) لجميع الحسابات
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowTbClosingCols((v) => !v)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    showTbClosingCols
                      ? 'bg-[#141414] text-[#ffffff]'
                      : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                  }`}
                >
                  {showTbClosingCols ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>
                    {showTbClosingCols
                      ? 'إخفاء الرصيد النهائي (مدين / دائن)'
                      : 'إظهار الرصيد النهائي (مدين / دائن)'}
                  </span>
                </button>
                <button
                  onClick={() => exportData('trial-balance', TRIAL_BALANCE_DATA, 'excel', `ميزان المراجعة - ${activeCompany.name}`)}
                  className="button-outline-on-light"
                  style={{ padding: '4px 12px', fontSize: '11px', minHeight: '30px' }}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={() => exportData('trial-balance', TRIAL_BALANCE_DATA, 'pdf', `ميزان المراجعة - ${activeCompany.name}`)}
                  className="button-outline-on-light"
                  style={{ padding: '4px 12px', fontSize: '11px', minHeight: '30px' }}
                >
                  <FileText className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => exportData('trial-balance', TRIAL_BALANCE_DATA, 'print', `ميزان المراجعة - ${activeCompany.name}`)}
                  className="button-primary-pill"
                  style={{ padding: '4px 14px', fontSize: '11px', minHeight: '30px' }}
                >
                  <Printer className="w-3.5 h-3.5 ml-1" />
                  <span>طباعة</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3">رمز الحساب</th>
                    <th className="p-3">اسم الحساب المحاسبي</th>
                    <th className="p-3">النوع</th>
                    <th className="p-3">التصنيف المعتمد (Excel IFRS 34 / 314)</th>
                    <th className="p-3">المعيار والتدفق</th>
                    <th className="p-3 font-mono">افتتاحي مدين</th>
                    <th className="p-3 font-mono">افتتاحي دائن</th>
                    <th className="p-3 font-mono">حركة مدين</th>
                    <th className="p-3 font-mono">حركة دائن</th>
                    {showTbClosingCols && (
                      <th className="p-3 font-mono font-bold bg-[#f3f3f3] text-[#141414] border-x border-[#e0e0e0]">الرصيد النهائي مدين</th>
                    )}
                    {showTbClosingCols && (
                      <th className="p-3 font-mono font-bold bg-[#f3f3f3] text-[#141414] border-x border-[#e0e0e0]">الرصيد النهائي دائن</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {TRIAL_BALANCE_DATA.map((row) => {
                    const closingDebit = row.balance > 0 ? row.balance : 0;
                    const closingCredit = row.balance < 0 ? Math.abs(row.balance) : 0;
                    return (
                      <tr
                        key={row.code}
                        onClick={() => setSelectedAccountForDrilldown(row)}
                        className="hover:bg-zinc-50 cursor-pointer transition-colors"
                      >
                        <td className="p-3 font-mono font-bold text-[#141414]">{row.code}</td>
                        <td className="p-3 font-bold text-[#141414]">{row.name}</td>
                        <td className="p-3">
                          <Badge text={row.type} type="purple" />
                        </td>
                        <td className="p-3">
                          <div className="font-mono font-bold text-[11px] text-[#141414]">
                            {row.ifrsSubCode} — {row.ifrsSubItemName}
                          </div>
                          <div className="text-[10.5px] text-[#707070] mt-0.5">
                            {row.ifrsCode} ({row.ifrsItemName}) • {row.ifrsSection}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-[11px] font-bold text-[#141414] block">{row.ifrsRef}</span>
                          <span className="text-[10px] text-[#707070]">{row.cashFlowType}</span>
                        </td>
                        <td className="p-3 font-mono">{row.opening_debit.toLocaleString()}</td>
                        <td className="p-3 font-mono">{row.opening_credit.toLocaleString()}</td>
                        <td className="p-3 font-mono text-[#141414] font-bold">{row.period_debit.toLocaleString()}</td>
                        <td className="p-3 font-mono text-[#141414] font-bold">{row.period_credit.toLocaleString()}</td>
                        {showTbClosingCols && (
                          <td className="p-3 font-mono font-bold text-[#141414] bg-[#fafafa]">
                            {closingDebit > 0 ? `${closingDebit.toLocaleString()} ⃁` : '-'}
                          </td>
                        )}
                        {showTbClosingCols && (
                          <td className="p-3 font-mono font-bold text-[#141414] bg-[#fafafa]">
                            {closingCredit > 0 ? `${closingCredit.toLocaleString()} ⃁` : '-'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#f3f3f3] text-[#141414] font-bold border-t-2 border-[#141414]">
                  <tr>
                    <td colSpan={5} className="p-3">الإجمالي الكلي لميزان المراجعة (متزن ✔)</td>
                    <td className="p-3 font-mono">
                      {TRIAL_BALANCE_DATA.reduce((s, r) => s + r.opening_debit, 0).toLocaleString()} ⃁
                    </td>
                    <td className="p-3 font-mono">
                      {TRIAL_BALANCE_DATA.reduce((s, r) => s + r.opening_credit, 0).toLocaleString()} ⃁
                    </td>
                    <td className="p-3 font-mono">
                      {TRIAL_BALANCE_DATA.reduce((s, r) => s + r.period_debit, 0).toLocaleString()} ⃁
                    </td>
                    <td className="p-3 font-mono">
                      {TRIAL_BALANCE_DATA.reduce((s, r) => s + r.period_credit, 0).toLocaleString()} ⃁
                    </td>
                    {showTbClosingCols && (
                      <td className="p-3 font-mono">
                        {TRIAL_BALANCE_DATA.reduce((s, r) => s + (r.balance > 0 ? r.balance : 0), 0).toLocaleString()} ⃁
                      </td>
                    )}
                    {showTbClosingCols && (
                      <td className="p-3 font-mono">
                        {TRIAL_BALANCE_DATA.reduce((s, r) => s + (r.balance < 0 ? Math.abs(r.balance) : 0), 0).toLocaleString()} ⃁
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Complete 211-Account IFRS Smart Trial Balance with Extended 314 Classifications */}
          <IfrsFinancialEngineWorkspace initialSection="trial-balance" />
        </div>
      )}

      {/* TAB 3: BALANCE SHEET */}
      {activeTab === 'financial-position' && (
        <div className="space-y-6">
          <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#141414]" />
                  <span>قائمة المركز المالي الموحدة القابلة للتوسع وإضافة حقول الأصول (IAS 1 Balance Sheet)</span>
                </h3>
                <p className="text-xs text-[#707070] mt-1">
                  مطابقة الأصول مع الخصوم وحقوق الملكية مع إمكانية إضافة حقول جديدة للأصول وتعديل وتوسيع كافة الأقسام
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() =>
                    exportData(
                      'balance-sheet',
                      TRIAL_BALANCE_DATA.filter(
                        (r) => r.type === 'أصول' || r.type === 'خصوم' || r.type === 'حقوق ملكية'
                      ),
                      'excel',
                      `المركز المالي - ${activeCompany.name}`
                    )
                  }
                  className="button-outline-on-light"
                  style={{ padding: '4px 12px', fontSize: '11px', minHeight: '30px' }}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={() =>
                    exportData(
                      'balance-sheet',
                      TRIAL_BALANCE_DATA.filter(
                        (r) => r.type === 'أصول' || r.type === 'خصوم' || r.type === 'حقوق ملكية'
                      ),
                      'pdf',
                      `المركز المالي - ${activeCompany.name}`
                    )
                  }
                  className="button-outline-on-light"
                  style={{ padding: '4px 12px', fontSize: '11px', minHeight: '30px' }}
                >
                  <FileText className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                  <span>PDF</span>
                </button>
                <ExportDropdown
                  sectionKey="balance-sheet"
                  data={TRIAL_BALANCE_DATA.filter(
                    (r) => r.type === 'أصول' || r.type === 'خصوم' || r.type === 'حقوق ملكية'
                  )}
                  customTitle={`قائمة المركز المالي - ${activeCompany.name}`}
                  buttonLabel="خيارات التصدير"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex justify-between items-center font-bold text-[#141414] border-b border-zinc-200 pb-2 text-sm">
                  <span>1. الأصول (Assets — IAS 1 / IAS 16 / IFRS 16) — قابلة للتعديل المباشر</span>
                  <span className="font-mono">
                    {(finPosData.cash + finPosData.musanedEscrow + finPosData.receivables + finPosData.ppeNet).toLocaleString()} ⃁
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="font-bold text-zinc-700">الأصول المتداولة (Current Assets):</div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 text-zinc-600">
                    <span>النقدية والصناديق والبنوك (A-10 | IAS 7):</span>
                    <input
                      type="number"
                      value={finPosData.cash}
                      onChange={(e) => setFinPosData({ ...finPosData, cash: parseFloat(e.target.value) || 0 })}
                      className="w-32 bg-white border border-zinc-300 rounded-lg py-1 px-2 font-bold font-mono text-[#141414] text-left"
                    />
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 text-zinc-600">
                    <span>{isKasTrade ? 'الضمانات البنكية ومستخلصات اعتماد (A-07 | IFRS 15):' : 'أمانات مساند المعلقة (A-07 | IFRS 15):'}</span>
                    <input
                      type="number"
                      value={finPosData.musanedEscrow}
                      onChange={(e) => setFinPosData({ ...finPosData, musanedEscrow: parseFloat(e.target.value) || 0 })}
                      className="w-32 bg-white border border-zinc-300 rounded-lg py-1 px-2 font-bold font-mono text-[#141414] text-left"
                    />
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 text-zinc-600">
                    <span>المدينون وأرصدة العملاء بالصافي (A-07 | IFRS 9):</span>
                    <input
                      type="number"
                      value={finPosData.receivables}
                      onChange={(e) => setFinPosData({ ...finPosData, receivables: parseFloat(e.target.value) || 0 })}
                      className="w-32 bg-white border border-zinc-300 rounded-lg py-1 px-2 font-bold font-mono text-[#141414] text-left"
                    />
                  </div>
                  <div className="font-bold text-zinc-700 pt-2">الأصول غير المتداولة (Non-Current Assets):</div>
                  <div className="flex justify-between items-center py-1 text-zinc-600">
                    <span>صافي الممتلكات والآلات والمعدات وحق الاستخدام (A-01/A-02 | IAS 16):</span>
                    <input
                      type="number"
                      value={finPosData.ppeNet}
                      onChange={(e) => setFinPosData({ ...finPosData, ppeNet: parseFloat(e.target.value) || 0 })}
                      className="w-32 bg-white border border-zinc-300 rounded-lg py-1 px-2 font-bold font-mono text-[#141414] text-left"
                    />
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex justify-between items-center font-bold text-[#141414] border-b border-zinc-200 pb-2 text-sm">
                  <span>2. الخصوم وحقوق الملكية (Liabilities & Equity — IAS 1) — قابلة للتعديل</span>
                  <span className="font-mono">
                    {(finPosData.payables + finPosData.eosb + finPosData.vatZakat + finPosData.shareCapital + finPosData.retainedEarnings).toLocaleString()} ⃁
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="font-bold text-zinc-700">الخصوم والالتزامات (Liabilities):</div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 text-zinc-600">
                    <span>مستحقات الموردين والوكلاء الخارجيين (L-04 | IAS 1.69):</span>
                    <input
                      type="number"
                      value={finPosData.payables}
                      onChange={(e) => setFinPosData({ ...finPosData, payables: parseFloat(e.target.value) || 0 })}
                      className="w-32 bg-white border border-zinc-300 rounded-lg py-1 px-2 font-bold font-mono text-[#141414] text-left"
                    />
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 text-zinc-600">
                    <span>مخصص مكافأة نهاية الخدمة للموظفين (L-03 | IAS 19):</span>
                    <input
                      type="number"
                      value={finPosData.eosb}
                      onChange={(e) => setFinPosData({ ...finPosData, eosb: parseFloat(e.target.value) || 0 })}
                      className="w-32 bg-white border border-zinc-300 rounded-lg py-1 px-2 font-bold font-mono text-[#141414] text-left"
                    />
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 text-zinc-600">
                    <span>ضريبة القيمة المضافة ومستحقات الزكاة (L-05/L-08 | ZATCA):</span>
                    <input
                      type="number"
                      value={finPosData.vatZakat}
                      onChange={(e) => setFinPosData({ ...finPosData, vatZakat: parseFloat(e.target.value) || 0 })}
                      className="w-32 bg-white border border-zinc-300 rounded-lg py-1 px-2 font-bold font-mono text-[#141414] text-left"
                    />
                  </div>
                  <div className="font-bold text-zinc-700 pt-2">حقوق الملكية (Equity):</div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 text-zinc-600">
                    <span>رأس المال المدفوع والاحتياطي النظامي (E-01/E-02 | IAS 1.78):</span>
                    <input
                      type="number"
                      value={finPosData.shareCapital}
                      onChange={(e) => setFinPosData({ ...finPosData, shareCapital: parseFloat(e.target.value) || 0 })}
                      className="w-32 bg-white border border-zinc-300 rounded-lg py-1 px-2 font-bold font-mono text-[#141414] text-left"
                    />
                  </div>
                  <div className="flex justify-between items-center py-1 text-zinc-600">
                    <span>الأرباح المبقاة وصافي ربح السنة (E-03 | IAS 1.106):</span>
                    <input
                      type="number"
                      value={finPosData.retainedEarnings}
                      onChange={(e) => setFinPosData({ ...finPosData, retainedEarnings: parseFloat(e.target.value) || 0 })}
                      className="w-32 bg-white border border-zinc-300 rounded-lg py-1 px-2 font-bold font-mono text-[#141414] text-left"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Expandable IFRS Balance Sheet with Custom Asset Fields & Inline Add/Edit */}
          <IfrsFinancialEngineWorkspace initialSection="statements" initialStatementView="balance-sheet" />
        </div>
      )}

      {/* TAB 4: INCOME STATEMENT */}
      {activeTab === 'income-statement' && (
        <div className="space-y-6">
          <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#141414]" />
                  <span>قائمة الدخل الشاملة والأرباح والخسائر القابلة للتعديل المباشر (IAS 1 / IFRS 18 Income Statement & OCI)</span>
                </h3>
                <p className="text-xs text-[#707070] mt-1">
                  عدّل أي بند إيراد أو تكلفة أو مصروف مباشرة ليتم إعادة احتساب مجمل الربح، EBITDA، وصافي الربح تلقائياً
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() =>
                    exportData(
                      'income-statement',
                      TRIAL_BALANCE_DATA.filter((r) => r.type === 'إيرادات' || r.type === 'مصروفات'),
                      'excel',
                      `قائمة الدخل - ${activeCompany.name}`
                    )
                  }
                  className="button-outline-on-light"
                  style={{ padding: '4px 12px', fontSize: '11px', minHeight: '30px' }}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={() =>
                    exportData(
                      'income-statement',
                      TRIAL_BALANCE_DATA.filter((r) => r.type === 'إيرادات' || r.type === 'مصروفات'),
                      'pdf',
                      `قائمة الدخل - ${activeCompany.name}`
                    )
                  }
                  className="button-outline-on-light"
                  style={{ padding: '4px 12px', fontSize: '11px', minHeight: '30px' }}
                >
                  <FileText className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                  <span>PDF</span>
                </button>
                <ExportDropdown
                  sectionKey="income-statement"
                  data={TRIAL_BALANCE_DATA.filter((r) => r.type === 'إيرادات' || r.type === 'مصروفات')}
                  customTitle={`قائمة الدخل الشاملة - ${activeCompany.name}`}
                  buttonLabel="خيارات التصدير"
                />
              </div>
            </div>

            {(() => {
              const totalRev = finIncData.musanedRev + finIncData.rentalRev;
              const grossProfit = totalRev - finIncData.directCostAgency - finIncData.shelterCost;
              const ebitda = grossProfit - finIncData.sellingExp - finIncData.adminExp;
              const netProfit = ebitda - finIncData.depreciationExp;
              const gpMargin = totalRev > 0 ? ((grossProfit / totalRev) * 100).toFixed(1) : '0.0';
              const netMargin = totalRev > 0 ? ((netProfit / totalRev) * 100).toFixed(1) : '0.0';
              return (
                <div className="max-w-4xl mx-auto p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-200 font-bold text-zinc-900">
                    <span>
                      {isKasTrade
                        ? '1. صافي مبيعات المعارض التجارية وقطاع الأميال (R-01 | IFRS 15):'
                        : '1. إيرادات خدمات التوسط في الاستقدام (مساند — R-01 | IFRS 15):'}
                    </span>
                    <input
                      type="number"
                      value={finIncData.musanedRev}
                      onChange={(e) => setFinIncData({ ...finIncData, musanedRev: parseFloat(e.target.value) || 0 })}
                      className="w-36 bg-white border border-zinc-300 rounded-lg py-1 px-2 font-bold font-mono text-[#141414] text-left"
                    />
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-200 font-bold text-zinc-900">
                    <span>
                      {isKasTrade
                        ? '2. إيرادات مستخلصات وأوامر توريد المنافسات الحكومية (R-01 | IFRS 15):'
                        : '2. إيرادات عقود التأجير والتشغيل ونقل الكفالة (R-01 | IFRS 15):'}
                    </span>
                    <input
                      type="number"
                      value={finIncData.rentalRev}
                      onChange={(e) => setFinIncData({ ...finIncData, rentalRev: parseFloat(e.target.value) || 0 })}
                      className="w-36 bg-white border border-zinc-300 rounded-lg py-1 px-2 font-bold font-mono text-[#141414] text-left"
                    />
                  </div>
                  <div className="flex justify-between py-2.5 bg-[#f3f3f3] px-3 rounded-xl font-bold text-[#141414] border border-[#e0e0e0]">
                    <span>= إجمالي الإيرادات التشغيلية (Total Revenues — 100%):</span>
                    <span className="font-mono">{totalRev.toLocaleString()} ⃁</span>
                  </div>

                  <div className="pt-2 text-[#141414] space-y-1">
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-200">
                      <span>
                        {isKasTrade
                          ? '3. (-) تكلفة البضاعة المباعة والتوريدات المباشرة (COGS — R-02 | IAS 2):'
                          : '3. (-) تكلفة المكاتب الخارجية والتأشيرات وتذاكر السفر (R-02 | IAS 1.99):'}
                      </span>
                      <input
                        type="number"
                        value={finIncData.directCostAgency}
                        onChange={(e) => setFinIncData({ ...finIncData, directCostAgency: parseFloat(e.target.value) || 0 })}
                        className="w-36 bg-white border border-zinc-300 rounded-lg py-1 px-2 font-bold font-mono text-[#141414] text-left"
                      />
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-200">
                      <span>
                        {isKasTrade
                          ? '4. (-) مصاريف الشحن والتخليص الجمركي والمستودعات (R-02 | IAS 1.99):'
                          : '4. (-) مصاريف الإعاشة والإيواء والفحص الطبي والتأمين (R-02 | IAS 1.99):'}
                      </span>
                      <input
                        type="number"
                        value={finIncData.shelterCost}
                        onChange={(e) => setFinIncData({ ...finIncData, shelterCost: parseFloat(e.target.value) || 0 })}
                        className="w-36 bg-white border border-zinc-300 rounded-lg py-1 px-2 font-bold font-mono text-[#141414] text-left"
                      />
                    </div>
                    <div className="flex justify-between py-2 bg-[#f3f3f3] px-3 rounded-xl font-bold text-[#141414] border border-[#e0e0e0]">
                      <span>= مجمل الربح (Gross Profit — هامش {gpMargin}%):</span>
                      <span className="font-mono">{grossProfit.toLocaleString()} ⃁</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-200">
                      <span>5. (-) مصروفات البيع والتسويق وعمولات المبيعات (R-03 | IAS 1.99):</span>
                      <input
                        type="number"
                        value={finIncData.sellingExp}
                        onChange={(e) => setFinIncData({ ...finIncData, sellingExp: parseFloat(e.target.value) || 0 })}
                        className="w-36 bg-white border border-zinc-300 rounded-lg py-1 px-2 font-bold font-mono text-[#141414] text-left"
                      />
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-200">
                      <span>6. (-) الرواتب والأجور والمصروفات العمومية والإدارية (R-04 | IAS 1.99):</span>
                      <input
                        type="number"
                        value={finIncData.adminExp}
                        onChange={(e) => setFinIncData({ ...finIncData, adminExp: parseFloat(e.target.value) || 0 })}
                        className="w-36 bg-white border border-zinc-300 rounded-lg py-1 px-2 font-bold font-mono text-[#141414] text-left"
                      />
                    </div>
                    <div className="flex justify-between py-2 bg-[#f3f3f3] px-3 rounded-xl font-bold text-[#141414] border border-[#e0e0e0]">
                      <span>= الربح قبل الفوائد والضرائب والإهلاك والإطفاء (EBITDA — IFRS 18):</span>
                      <span className="font-mono">{ebitda.toLocaleString()} ⃁</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-200">
                      <span>7. (-) مصروف الإهلاك والإطفاء للأصول الثابتة وحق الاستخدام (R-10 | IAS 16):</span>
                      <input
                        type="number"
                        value={finIncData.depreciationExp}
                        onChange={(e) => setFinIncData({ ...finIncData, depreciationExp: parseFloat(e.target.value) || 0 })}
                        className="w-36 bg-white border border-zinc-300 rounded-lg py-1 px-2 font-bold font-mono text-[#141414] text-left"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between py-3.5 bg-[#f3f3f3] text-[#141414] border-2 border-[#141414] px-5 rounded-2xl font-bold text-sm">
                    <span>= صافي ربح السنة والربح التشغيلي (Net Profit / Total Comprehensive Income — هامش {netMargin}%):</span>
                    <span className="font-mono text-[#141414]">{netProfit.toLocaleString()} ⃁</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Complete Multi-Step IFRS 18 / IAS 1 Expandable Income Statement */}
          <IfrsFinancialEngineWorkspace initialSection="statements" initialStatementView="income-statement" />
        </div>
      )}

      {/* TAB: CASH FLOW STATEMENT */}
      {activeTab === 'cash-flow' && (
        <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#141414]" />
                <span>قائمة التدفقات النقدية بالطريقة غير المباشرة (IAS 7 Cash Flow Statement)</span>
              </h3>
              <p className="text-xs text-[#707070] mt-1">
                حركة السيولة النقدية من الأنشطة التشغيلية والاستثمارية والتمويلية لـ {activeCompany.name}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="pill-tag-mint text-xs font-bold">
                صافي التغير النقدي: +155,000.00 ⃁ (متزن ✔)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
              <div className="text-xs font-bold text-[#141414] mb-1">صافي التدفقات التشغيلية</div>
              <div className="text-xl font-bold font-mono text-[#141414]">+200,000.00 ⃁</div>
              <div className="text-[10px] text-[#141414] mt-1">مقبوضات العقود ناقص الرواتب والتشغيل</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <div className="text-xs font-bold text-zinc-800 mb-1">صافي التدفقات الاستثمارية</div>
              <div className="text-xl font-bold font-mono text-[#141414]">(45,000.00) ⃁</div>
              <div className="text-[10px] text-[#707070] mt-1">
                {isKasTrade ? 'تجهيزات معارض تجارية ومستودعات وأسطول توزيع' : 'تجهيزات ومعدات إيواء وسيارات'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <div className="text-xs font-bold text-zinc-800 mb-1">صافي التدفقات التمويلية</div>
              <div className="text-xl font-bold font-mono text-zinc-700">0.00 ⃁</div>
              <div className="text-[10px] text-[#707070] mt-1">لا توجد قروض أو توزيعات نقدية</div>
            </div>
          </div>

          {/* Detailed Statement Table */}
          <div className="max-w-3xl mx-auto bg-zinc-50 rounded-2xl border border-zinc-200 p-6 space-y-4 text-xs">
            <div>
              <div className="font-bold text-zinc-900 pb-2 border-b border-zinc-300">1. التدفقات النقدية من الأنشطة التشغيلية (IAS 7.18):</div>
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-zinc-700">
                  <span>صافي الربح للفترة:</span>
                  <span className="font-mono font-bold">304,971.20 ⃁</span>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span>(+) استهلاك الأصول الثابتة (غير نقدي — IAS 7.20):</span>
                  <span className="font-mono font-bold">+12,500.00 ⃁</span>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span>
                    {isKasTrade
                      ? '(-) الزيادة في الذمم التجارية ومستخلصات اعتماد:'
                      : '(-) الزيادة في المدينين وحسابات مساند المعلقة:'}
                  </span>
                  <span className="font-mono font-bold text-[#141414]">(68,471.20) ⃁</span>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span>
                    {isKasTrade
                      ? '(-) سداد مستحقات موردي البضائع وصافي رأس المال العامل:'
                      : '(-) سداد مستحقات الوكلاء الخارجيين وصافي رأس المال العامل:'}
                  </span>
                  <span className="font-mono font-bold text-[#141414]">(49,000.00) ⃁</span>
                </div>
                <div className="flex justify-between bg-[#f3f3f3] p-2 rounded-lg font-bold text-[#141414]">
                  <span>صافي النقد المتوفر من الأنشطة التشغيلية:</span>
                  <span className="font-mono">200,000.00 ⃁</span>
                </div>
              </div>
            </div>

            <div>
              <div className="font-bold text-zinc-900 pb-2 border-b border-zinc-300">2. التدفقات النقدية من الأنشطة الاستثمارية (IAS 7.16):</div>
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-zinc-700">
                  <span>
                    {isKasTrade
                      ? 'شراء أصول ثابتة وتجهيزات معارض تجارية ومستودعات:'
                      : 'شراء أصول ثابتة وتجهيزات فروع وإيواء:'}
                  </span>
                  <span className="font-mono font-bold text-[#141414]">(45,000.00) ⃁</span>
                </div>
                <div className="flex justify-between bg-zinc-200/60 p-2 rounded-lg font-bold text-zinc-900">
                  <span>صافي النقد المستخدم في الأنشطة الاستثمارية:</span>
                  <span className="font-mono">(45,000.00) ⃁</span>
                </div>
              </div>
            </div>

            <div className="border-t-2 border-zinc-300 pt-3 space-y-2">
              <div className="flex justify-between text-zinc-800 font-bold">
                <span>رصيد النقدية وما في حكمها في بداية الفترة:</span>
                <span className="font-mono">750,000.00 ⃁</span>
              </div>
              <div className="flex justify-between text-[#141414] font-bold">
                <span>صافي الزيادة في النقدية خلال الفترة:</span>
                <span className="font-mono">+155,000.00 ⃁</span>
              </div>
              <div className="flex justify-between bg-[#f3f3f3] text-[#141414] border-2 border-[#141414] p-4 rounded-xl font-bold text-sm">
                <span>رصيد النقدية وما في حكمها في نهاية الفترة (البنوك والصناديق — IAS 7.45):</span>
                <span className="font-mono text-[#141414]">905,000.00 ⃁</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: JOURNALS */}
      {activeTab === 'journals' && (
        <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-[#141414] m-0">سجل القيود اليومية المحاسبية</h3>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-full py-1 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
              >
                <option value="ALL">جميع الفروع</option>
                {isKasTrade ? (
                  <>
                    <option value="المعرض">المعرض التجاري الرئيسي</option>
                    <option value="الأميال">قطاع الأميال التجاري</option>
                    <option value="المنافسات">إدارة المنافسات واعتماد</option>
                    <option value="مستودعات">مستودعات كاس المركزية</option>
                  </>
                ) : (
                  <>
                    <option value="الرياض">فرع الرياض</option>
                    <option value="جدة">فرع جدة</option>
                    <option value="الخبر">فرع الخبر</option>
                    <option value="الإيواء">مركز الإيواء</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => exportData('journals', filteredJournals, 'excel', `القيود اليومية - ${activeCompany.name}`)}
                className="button-outline-on-light"
                style={{ padding: '4px 12px', fontSize: '11px', minHeight: '30px' }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3">رقم القيد</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">الفرع</th>
                  <th className="p-3">البيان والشرح</th>
                  <th className="p-3 font-mono">المبلغ</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredJournals.map((j) => (
                  <tr key={j.id} className="hover:bg-zinc-50">
                    <td className="p-3 font-mono font-bold text-[#141414]">{j.ref_no}</td>
                    <td className="p-3 text-[#707070] font-mono">{j.date}</td>
                    <td className="p-3 font-bold text-[#141414]">{j.branch}</td>
                    <td className="p-3 text-zinc-700">{j.description}</td>
                    <td className="p-3 font-mono font-bold text-[#141414]">{j.amount.toLocaleString()} ⃁</td>
                    <td className="p-3">
                      <Badge text={j.status} type="success" />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedJournalForPrint(j)}
                        className="button-outline-on-light"
                        style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '24px' }}
                        title="معاينة وطباعة قيد اليومية"
                      >
                        <Printer className="w-3 h-3 ml-1 text-zinc-700" />
                        <span>طباعة</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: VOUCHERS */}
      {activeTab === 'vouchers' && (() => {
        const receiptCount = vouchers.filter((v) => v.type === 'قبض').length;
        const paymentCount = vouchers.filter((v) => v.type === 'صرف').length;
        const totalReceipts = vouchers.filter((v) => v.type === 'قبض').reduce((sum, v) => sum + v.amount, 0);
        const totalPayments = vouchers.filter((v) => v.type === 'صرف').reduce((sum, v) => sum + v.amount, 0);
        const netCashFlow = totalReceipts - totalPayments;

        const displayedVouchers = vouchers.filter((v) => {
          if (voucherFilterType === 'قبض' && v.type !== 'قبض') return false;
          if (voucherFilterType === 'صرف' && v.type !== 'صرف') return false;
          if (voucherSearchQuery.trim()) {
            const q = voucherSearchQuery.toLowerCase();
            return (
              (v.voucher_no || '').toLowerCase().includes(q) ||
              (v.payee_payer || '').toLowerCase().includes(q) ||
              (v.treasury || '').toLowerCase().includes(q) ||
              String(v.amount ?? '').includes(q) ||
              (v.date || '').includes(q)
            );
          }
          return true;
        });

        const currentSectionTitle =
          voucherFilterType === 'قبض'
            ? 'سندات القبض النقدية والبنكية'
            : voucherFilterType === 'صرف'
            ? 'سندات الصرف والمصروفات'
            : 'سجل سندات القبض والصرف';

        const currentSubtitle =
          voucherFilterType === 'قبض'
            ? 'توثيق المقبوضات النقدية والشيكات والتحويلات البنكية الواردة للشركة مع الترحيل المالي الفوري'
            : voucherFilterType === 'صرف'
            ? 'توثيق المصروفات التشغيلية والمستحقات والمدفوعات النقدية والبنكية الصادرة'
            : 'إدارة وتوثيق كافة الحركات المالية النقدية والبنكية المقبوضة والمصروفة';

        return (
          <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-6 shadow-sm">
            {/* Header with Title and Action Buttons */}
            <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-zinc-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#141414] m-0">{currentSectionTitle}</h3>
                  <span
                    className={`text-[10.5px] px-2.5 py-0.5 rounded-full font-bold ${
                      voucherFilterType === 'قبض'
                        ? 'bg-[#f3f3f3] text-[#141414]'
                        : voucherFilterType === 'صرف'
                        ? 'bg-[#f3f3f3] text-[#141414]'
                        : 'bg-zinc-100 text-zinc-800'
                    }`}
                  >
                    {voucherFilterType === 'قبض'
                      ? 'مقبوضات واردة'
                      : voucherFilterType === 'صرف'
                      ? 'مصروفات صادرة'
                      : 'شامل القبض والصرف'}
                  </span>
                </div>
                <p className="text-xs text-[#707070] m-0 mt-1">{currentSubtitle}</p>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center flex-wrap gap-2">
                {/* Add Receipt Voucher Button */}
                <button
                  type="button"
                  onClick={() => {
                    setVoucherForm({
                      type: 'قبض',
                      payee_payer: '',
                      treasury: 'بنك الراجحي - الحساب التشغيلي',
                      amount: '',
                    });
                    setShowAddVoucherModal(true);
                  }}
                  className="button-primary-pill shadow-sm flex items-center gap-1"
                  style={{
                    padding: '6px 14px',
                    fontSize: '11.5px',
                    minHeight: '32px',
                    background: '#141414',
                    borderColor: '#141414',
                    color: '#ffffff',
                  }}
                  title="إصدار سند قبض نقدي أو بنكي جديد"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 ml-1" />
                  <span>+ إضافة سند قبض جديد</span>
                </button>

                {/* Add Payment Voucher Button */}
                <button
                  type="button"
                  onClick={() => {
                    setVoucherForm({
                      type: 'صرف',
                      payee_payer: '',
                      treasury: 'بنك الراجحي - الحساب التشغيلي',
                      amount: '',
                    });
                    setShowAddVoucherModal(true);
                  }}
                  className="button-primary-pill shadow-sm flex items-center gap-1"
                  style={{
                    padding: '6px 14px',
                    fontSize: '11.5px',
                    minHeight: '32px',
                    background: '#141414',
                    borderColor: '#141414',
                    color: '#ffffff',
                  }}
                  title="إصدار سند صرف أو مصروف جديد"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  <span>+ إضافة سند صرف جديد</span>
                </button>

                {/* 10-Format Export Dropdown */}
                <ExportDropdown
                  sectionKey="vouchers"
                  data={displayedVouchers}
                  customTitle={`${currentSectionTitle} - ${activeCompany.name}`}
                  buttonLabel="تصدير السندات (10 صيغ)"
                />
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 bg-[#f3f3f3] rounded-2xl border border-[#e0e0e0] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-[#141414]">إجمالي المقبوضات (سندات القبض)</div>
                  <div className="text-base font-mono font-bold text-[#141414] mt-0.5">
                    {totalReceipts.toLocaleString()} <span className="text-[10px] font-sans">⃁</span>
                  </div>
                  <div className="text-[10px] text-[#141414] mt-0.5">{receiptCount} سند قبض مسجل</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414]">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3.5 bg-[#f3f3f3] rounded-2xl border border-[#e0e0e0] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-[#141414]">إجمالي المصروفات (سندات الصرف)</div>
                  <div className="text-base font-mono font-bold text-[#141414] mt-0.5">
                    {totalPayments.toLocaleString()} <span className="text-[10px] font-sans">⃁</span>
                  </div>
                  <div className="text-[10px] text-[#141414] mt-0.5">{paymentCount} سند صرف مسجل</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414]">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-zinc-700">صافي التدفق النقدي</div>
                  <div
                    className={`text-base font-mono font-bold mt-0.5 ${
                      netCashFlow >= 0 ? 'text-zinc-900' : 'text-[#141414]'
                    }`}
                  >
                    {netCashFlow.toLocaleString()} <span className="text-[10px] font-sans">⃁</span>
                  </div>
                  <div className="text-[10px] text-[#707070] mt-0.5">الفرق بين المقبوضات والمدفوعات</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-800">
                  <Landmark className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3.5 bg-[#f3f3f3] rounded-2xl border border-[#e0e0e0] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-[#141414]">السندات المعروضة حالياً</div>
                  <div className="text-base font-mono font-bold text-[#141414] mt-0.5">
                    {displayedVouchers.length} <span className="text-[10px] font-sans">سند</span>
                  </div>
                  <div className="text-[10px] text-[#141414] mt-0.5">
                    {voucherFilterType === 'all'
                      ? 'جميع السندات'
                      : voucherFilterType === 'قبض'
                      ? 'تصفية: قبض فقط'
                      : 'تصفية: صرف فقط'}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414]">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Filter Pills & Search Bar */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-full">
                <button
                  type="button"
                  onClick={() => setVoucherFilterType('all')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    voucherFilterType === 'all'
                      ? 'bg-[#141414] text-white shadow-sm'
                      : 'text-zinc-600 hover:text-[#141414]'
                  }`}
                >
                  الكل ({vouchers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVoucherFilterType('قبض')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                    voucherFilterType === 'قبض'
                      ? 'bg-[#141414] text-white shadow-sm'
                      : 'text-zinc-600 hover:text-[#141414]'
                  }`}
                >
                  <ArrowDownLeft className="w-3 h-3" />
                  <span>سندات القبض ({receiptCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVoucherFilterType('صرف')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                    voucherFilterType === 'صرف'
                      ? 'bg-[#141414] text-white shadow-sm'
                      : 'text-zinc-600 hover:text-[#141414]'
                  }`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>سندات الصرف ({paymentCount})</span>
                </button>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#707070]" />
                <input
                  type="text"
                  placeholder="بحث برقم السند، المستفيد، الخزينة..."
                  value={voucherSearchQuery}
                  onChange={(e) => setVoucherSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 pr-8 pl-3 text-xs text-[#141414] placeholder-zinc-400 focus:outline-none focus:border-[#141414]"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-zinc-200">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3">رقم السند</th>
                    <th className="p-3">النوع</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">المدفوع له / القابض</th>
                    <th className="p-3">الخزينة / الحساب</th>
                    <th className="p-3 font-mono">المبلغ</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {displayedVouchers.length > 0 ? (
                    displayedVouchers.map((v) => (
                      <tr key={v.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-[#141414]">{v.voucher_no}</td>
                        <td className="p-3">
                          <Badge
                            text={v.type === 'قبض' ? 'سند قبض' : 'سند صرف'}
                            type={v.type === 'قبض' ? 'success' : 'danger'}
                          />
                        </td>
                        <td className="p-3 text-[#707070] font-mono">{v.date}</td>
                        <td className="p-3 font-bold text-[#141414]">
                          <div className="flex items-center gap-2">
                            <CorporateAvatar name={v.payee_payer} isClient={v.type === 'قبض'} departmentId="finance" size="sm" status="verified" />
                            <span>{v.payee_payer}</span>
                          </div>
                        </td>
                        <td className="p-3 text-zinc-600">{v.treasury}</td>
                        <td className="p-3 font-mono font-bold text-[#141414]">{v.amount.toLocaleString()} ⃁</td>
                        <td className="p-3">
                          <Badge text={v.status} type="success" />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelectedVoucherForPrint(v)}
                            className="button-outline-on-light hover:bg-zinc-100 transition-colors"
                            style={{ padding: '3px 10px', fontSize: '11px', minHeight: '26px' }}
                            title="معاينة وطباعة السند المعتمد"
                          >
                            <Printer className="w-3 h-3 ml-1 text-zinc-700" />
                            <span>طباعة السند</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#707070]">
                        <Receipt className="w-8 h-8 mx-auto mb-2 text-[#141414]" />
                        <p className="text-xs font-bold text-zinc-600 m-0">لا توجد سندات مطابقة لمعايير البحث والتصفية</p>
                        <p className="text-[11px] text-[#707070] m-0 mt-1">يمكنك إضافة سند جديد أو تغيير معايير البحث أعلاه</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* TAB: MUSANED 90-DAY ESCROW PORTFOLIO */}
      {activeTab === 'musaned-escrow' && (
        <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-5 motion-snap-enter">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="pill-tag-mint text-[11px]">MUSANED 90-DAY ESCROW</span>
                <span className="pill-tag-shade text-[11px]">حساب110301 — ذمم وعقود أمانات مساند</span>
              </div>
              <h3 className="text-sm font-bold text-[#141414] mt-1 mb-0">
                محفظة أمانات مساند المعلقة وفترة الضمان النظامية (90 يوماً)
              </h3>
              <p className="text-xs text-[#707070] mt-1">
                تحرير الدفعات المكتملة لفترة التجربة (90 يوماً) آلياً إلى الحساب البنكي مع احتساب عمولة بوابة مساند (2.5%) وضريبة المدخلات المستردة (15%)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3">رقم عقد مساند</th>
                  <th className="p-3">العميل / الكفيل</th>
                  <th className="p-3">تاريخ الوصول</th>
                  <th className="p-3">أيام الضمان</th>
                  <th className="p-3 font-mono">إجمالي الأمانة (⃁)</th>
                  <th className="p-3 font-mono">عمولة مساند + الضريبة</th>
                  <th className="p-3 font-mono">صافي التحرير للبنك (⃁)</th>
                  <th className="p-3 text-center">إجراء التسوية والتحرير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {[
                  { id: 'MSN-2026-8841', client: 'عبدالرحمن محمد القحطاني', arrivalDate: '2026-05-02', daysElapsed: 92, grossSar: 17250 },
                  { id: 'MSN-2026-8895', client: 'فهد عبدالله العتيبي', arrivalDate: '2026-05-10', daysElapsed: 90, grossSar: 16100 },
                  { id: 'MSN-2026-9012', client: 'سلمان عبدالعزيز الدوسري', arrivalDate: '2026-06-15', daysElapsed: 54, grossSar: 18400 },
                ].map((escrow) => {
                  const fee = Math.round(escrow.grossSar * 0.025 * 100) / 100;
                  const vatOnFee = Math.round(fee * 0.15 * 100) / 100;
                  const netBank = Math.round((escrow.grossSar - fee - vatOnFee) * 100) / 100;
                  return (
                    <tr key={escrow.id} className="hover:bg-zinc-50">
                      <td className="p-3 font-mono font-bold text-[#141414]">{escrow.id}</td>
                      <td className="p-3 font-bold text-[#141414]">{escrow.client}</td>
                      <td className="p-3 font-mono text-[#707070]">{escrow.arrivalDate}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                          {escrow.daysElapsed} / 90 يوم
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-[#141414]">{escrow.grossSar.toLocaleString()} ⃁</td>
                      <td className="p-3 font-mono text-[#707070]">{(fee + vatOnFee).toLocaleString()} ⃁</td>
                      <td className="p-3 font-mono font-bold text-[#141414]">{netBank.toLocaleString()} ⃁</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            try {
                              const entry = journalEngine.autoPostOperationalTransaction({
                                companyId: activeCompany.id,
                                transactionType: 'MUSANED_ESCROW_RELEASE',
                                referenceId: escrow.id,
                                partyName: escrow.client,
                                amount: escrow.grossSar,
                                description: `تحرير أمانة عقد مساند ${escrow.id} بعد إتمام 90 يوماً — العميل ${escrow.client}`,
                                createdBy: 'المحاسب المالي',
                              });
                              addNotification({
                                title: 'تم تحرير أمانة مساند وترحيل القيد',
                                message: `تم ترحيل القيد ${entry.entryNumber} بصافي إيداع بنكي ${netBank.toLocaleString()} ⃁ بعد خصم عمولة مساند والضريبة.`,
                                type: 'success',
                              });
                            } catch (err: any) {
                              addNotification({
                                title: 'تعذر تحرير الأمانة',
                                message: err?.message || 'الفترة المالية مقفلة',
                                type: 'warning',
                              });
                            }
                          }}
                          className="button-primary-pill motion-spring-press"
                          style={{ padding: '4px 12px', fontSize: '11px', minHeight: '28px' }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                          <span>تحرير الدفعة للبنك</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: SUPPLIERS / FOREIGN AGENCIES ($) */}
      {activeTab === 'suppliers-agents' && (
        <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-4 motion-snap-enter">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-zinc-100">
            <h3 className="text-sm font-bold text-[#141414] m-0">كشوفات حسابات الموردين والوكلاء الخارجيين بالدولار ($ / ⃁)</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportData('external-offices', SUPPLIERS_ACCOUNTS, 'excel', `حسابات الوكلاء الخارجيين - ${activeCompany.name}`)}
                className="button-outline-on-light"
                style={{ padding: '4px 12px', fontSize: '11px', minHeight: '30px' }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3">اسم الوكيل الخارجي</th>
                  <th className="p-3">الدولة والمدينة</th>
                  <th className="p-3">السير الذاتية</th>
                  <th className="p-3 font-mono">الرصيد بالدولار ($)</th>
                  <th className="p-3 font-mono">المقابل بالريال (⃁)</th>
                  <th className="p-3">حالة المطابقة</th>
                  <th className="p-3 text-center">إجراءات التسوية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {SUPPLIERS_ACCOUNTS.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50">
                    <td className="p-3 font-bold text-[#141414]">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar name={s.name} role={s.country} departmentId="finance" size="sm" status="verified" />
                        <span>{s.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-zinc-600">{s.country}</td>
                    <td className="p-3 font-bold text-[#141414]">{s.cv_count} سيرة ذاتية</td>
                    <td className="p-3 font-mono font-bold text-[#141414]">${s.balance_usd.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-[#141414]">{s.balance_sar.toLocaleString()} ⃁</td>
                    <td className="p-3">
                      <Badge text={s.status} type="success" />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          try {
                            const entry = journalEngine.autoPostOperationalTransaction({
                              companyId: activeCompany.id,
                              transactionType: 'FOREIGN_AGENT_SETTLEMENT',
                              referenceId: `AG-SET-${s.id}`,
                              partyName: s.name,
                              amount: s.balance_sar,
                              usdAmount: s.balance_usd,
                              description: `تسوية وسداد مستحقات الوكيل الخارجي ${s.name} (${s.balance_usd.toLocaleString()} $ × 3.75)`,
                              createdBy: 'المحاسب المالي',
                            });
                            addNotification({
                              title: 'تم سداد وتسوية حساب الوكيل الخارجي',
                              message: `تم ترحيل قيد التسوية ${entry.entryNumber} بمبلغ ${s.balance_sar.toLocaleString()} ⃁ (${s.balance_usd.toLocaleString()} $).`,
                              type: 'success',
                            });
                          } catch (err: any) {
                            addNotification({
                              title: 'تعذر ترحيل التسوية',
                              message: err?.message || 'الفترة المالية مقفلة',
                              type: 'warning',
                            });
                          }
                        }}
                        className="button-outline-on-light motion-spring-press"
                        style={{ padding: '4px 12px', fontSize: '11px', minHeight: '28px' }}
                      >
                        <DollarSign className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                        <span>تسوية وسداد دفعة ($ / ⃁)</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: EOSB & ZAKAT CALCULATOR */}
      {activeTab === 'eosb-zakat' && (
        <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-6 motion-snap-enter">
          <h3 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2 pb-3 border-b border-zinc-100">
            <Calculator className="w-4 h-4 text-[#141414]" />
            <span>حاسبة مخصص مكافأة نهاية الخدمة (EOSB) والزكاة الشرعية (نظام العمل السعودي)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
              <h4 className="font-bold text-xs text-zinc-800">بيانات احتساب مكافأة الموظف:</h4>
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">الراتب الأساسي الأخير (⃁)</label>
                <input
                  type="number"
                  value={eosbCalc.salary}
                  onChange={(e) => setEosbCalc({ ...eosbCalc, salary: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-xs font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">سنوات الخدمة الإجمالية</label>
                <input
                  type="number"
                  step="0.5"
                  value={eosbCalc.years}
                  onChange={(e) => setEosbCalc({ ...eosbCalc, years: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-xs font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">سبب انتهاء العلاقة العمالية</label>
                <select
                  value={eosbCalc.reason}
                  onChange={(e) => setEosbCalc({ ...eosbCalc, reason: e.target.value as any })}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-xs font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option value="resignation">استقالة من الموظف (المادة 85)</option>
                  <option value="termination">إنهاء عقد من المنشأة / انتهاء المدة (المادة 84)</option>
                </select>
              </div>
            </div>

            <div className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] p-6 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-[#707070]">النتيجة النظامية المعتمدة:</h4>
              <div className="text-3xl font-light font-mono text-[#141414]">
                {calculateEOSBResult().toLocaleString()} ⃁
              </div>
              <p className="text-[11px] text-[#707070] leading-relaxed">
                تم الاحتساب وفقاً للمادتين 84 و 85 من نظام العمل السعودي المعتمد من وزارة الموارد البشرية والتنمية الاجتماعية.
              </p>
              <button
                onClick={() => {
                  const eosbAmt = calculateEOSBResult();
                  if (eosbAmt <= 0) return;
                  try {
                    const entry = journalEngine.autoPostOperationalTransaction({
                      companyId: activeCompany.id,
                      transactionType: 'EOSB_SETTLEMENT',
                      referenceId: `EOSB-${Date.now().toString().slice(-5)}`,
                      partyName: 'تسوية مستحقات نهاية الخدمة للموظف',
                      amount: eosbAmt,
                      description: `صرف وتسوية مخصص مكافأة نهاية الخدمة (IAS 19) لخدمة ${eosbCalc.years} سنوات`,
                      createdBy: 'المحاسب المالي',
                    });
                    addNotification({
                      title: 'تم اعتماد وصرف مكافأة نهاية الخدمة',
                      message: `تم ترحيل قيد التسوية ${entry.entryNumber} بمبلغ ${eosbAmt.toLocaleString()} ⃁ وخصمه من حساب مخصص نهاية الخدمة (220101).`,
                      type: 'success',
                    });
                  } catch (err: any) {
                    addNotification({
                      title: 'تعذر ترحيل القيد',
                      message: err?.message || 'الفترة المالية مقفلة',
                      type: 'warning',
                    });
                  }
                }}
                className="button-primary-pill mt-2"
                style={{ padding: '6px 16px', fontSize: '11.5px' }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                <span>اعتماد وصرف تسوية مكافأة نهاية الخدمة (IAS 19)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: AGING REPORT (تقرير أعمار الذمم والتقادم) */}
      {activeTab === 'aging' && (
        <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#141414]" />
                <span>تقرير أعمار الذمم والتقادم المالي (Accounts Aging Report)</span>
              </h3>
              <p className="text-xs text-[#707070] mt-1">
                توزيع مستحقات العملاء المدينة والتزامات الموردين الدائنة حسب فترات الاستحقاق لمتابعة التحصيل والسيولة
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="pill-tag-mint text-xs font-bold">
                إجمالي الذمم المدينة: 149,550.00 ⃁
              </span>
            </div>
          </div>

          {/* Aging Summary Buckets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-center">
              <div className="text-[11px] font-bold text-[#141414] mb-1">0 - 30 يوماً (ساري)</div>
              <div className="text-lg font-bold font-mono text-[#141414]">13,800.00 ⃁</div>
              <div className="text-[10px] text-[#141414] mt-0.5">عميل واحد (تحصيل ممتاز)</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-center">
              <div className="text-[11px] font-bold text-[#141414] mb-1">31 - 60 يوماً (مستحق)</div>
              <div className="text-lg font-bold font-mono text-[#141414]">28,750.00 ⃁</div>
              <div className="text-[10px] text-[#141414] mt-0.5">عميل واحد (ضمن فترة السماح)</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-center">
              <div className="text-[11px] font-bold text-[#141414] mb-1">61 - 90 يوماً (تنبيه متأخر)</div>
              <div className="text-lg font-bold font-mono text-[#141414]">42,000.00 ⃁</div>
              <div className="text-[10px] text-[#141414] mt-0.5">عميل واحد (يتطلب متابعة فورية)</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-center">
              <div className="text-[11px] font-bold text-[#141414] mb-1">+90 يوماً (حرج / ديون مشكوك فيها)</div>
              <div className="text-lg font-bold font-mono text-[#141414]">65,000.00 ⃁</div>
              <div className="text-[10px] text-[#141414] mt-0.5">عميل واحد (تحت الإجراء القانوني)</div>
            </div>
          </div>

          {/* Accounts Receivable Table */}
          <div className="bg-zinc-50/60 rounded-2xl border border-zinc-200 p-4 space-y-3">
            <h4 className="text-xs font-bold text-zinc-900 flex items-center justify-between">
              <span>أعمار ذمم العملاء المدينة (Accounts Receivable)</span>
              <span className="text-[11px] font-mono text-[#707070]">4 حسابات عملاء نشطة</span>
            </h4>

            <div className="overflow-x-auto bg-white rounded-xl border border-zinc-200">
              <table className="w-full text-xs text-right">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3">اسم العميل / الجهة</th>
                    <th className="p-3 text-center">إجمالي الرصيد</th>
                    <th className="p-3 text-center">0 - 30 يوم</th>
                    <th className="p-3 text-center">31 - 60 يوم</th>
                    <th className="p-3 text-center">61 - 90 يوم</th>
                    <th className="p-3 text-center">+90 يوم</th>
                    <th className="p-3 text-center">حالة التحصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono">
                  <tr className="hover:bg-zinc-50">
                    <td className="p-3 font-sans font-bold text-zinc-900">بندر صالح الهويريني</td>
                    <td className="p-3 text-center font-bold">13,800.00</td>
                    <td className="p-3 text-center text-[#141414] font-bold">13,800.00</td>
                    <td className="p-3 text-center text-[#141414]">-</td>
                    <td className="p-3 text-center text-[#141414]">-</td>
                    <td className="p-3 text-center text-[#141414]">-</td>
                    <td className="p-3 text-center font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">منتظم</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-zinc-50">
                    <td className="p-3 font-sans font-bold text-zinc-900">شركة دار الرواد للمقاولات</td>
                    <td className="p-3 text-center font-bold">28,750.00</td>
                    <td className="p-3 text-center text-[#141414]">-</td>
                    <td className="p-3 text-center text-[#141414] font-bold">28,750.00</td>
                    <td className="p-3 text-center text-[#141414]">-</td>
                    <td className="p-3 text-center text-[#141414]">-</td>
                    <td className="p-3 text-center font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">فترة سماح</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-zinc-50">
                    <td className="p-3 font-sans font-bold text-zinc-900">مؤسسة أفق المستقبل للتجارة</td>
                    <td className="p-3 text-center font-bold">42,000.00</td>
                    <td className="p-3 text-center text-[#141414]">-</td>
                    <td className="p-3 text-center text-[#141414]">-</td>
                    <td className="p-3 text-center text-[#141414] font-bold">42,000.00</td>
                    <td className="p-3 text-center text-[#141414]">-</td>
                    <td className="p-3 text-center font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">إشعار مطالبة</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-zinc-50">
                    <td className="p-3 font-sans font-bold text-zinc-900">شركة البناء الحديث المحدودة</td>
                    <td className="p-3 text-center font-bold text-[#141414]">65,000.00</td>
                    <td className="p-3 text-center text-[#141414]">-</td>
                    <td className="p-3 text-center text-[#141414]">-</td>
                    <td className="p-3 text-center text-[#141414]">-</td>
                    <td className="p-3 text-center text-[#141414] font-bold">65,000.00</td>
                    <td className="p-3 text-center font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">تحت التحصيل القانوني</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 11: CHART OF ACCOUNTS */}
      {activeTab === 'chart-of-accounts' && (
        <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-[#141414]" />
                <span>شجرة الحسابات والدليل المحاسبي الموحد القابل للتعديل المباشر (Chart of Accounts)</span>
              </h3>
              <p className="text-xs text-[#707070] mt-1">
                يمكنك تعديل اسم الحساب، الكود، التصنيف الرئيسي أو الفرعي الموسع، والرصيد مباشرة من الجدول أو إضافة حساب جديد
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const { accounts, addedCount } = chartOfAccountsService.syncAndCompleteMissingAccounts(activeCompany.id);
                  setFinCoaAccounts(accounts);
                  addNotification({
                    title: 'ترتيب واستكمال الشجرة القياسية',
                    message: addedCount > 0
                      ? `تم استكمال (${addedCount}) حساباً ومستوى قياسياً ناقصاً وترتيب الشجرة (${accounts.length} حساباً) بنجاح.`
                      : `تمت مراجعة وترتيب الشجرة القياسية (${accounts.length} حساباً في 4 مستويات) وإعادة احتساب الأرصدة التجميعية.`,
                    type: 'success',
                  });
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '11.5px', minHeight: '34px' }}
              >
                <FolderTree className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                <span>ترتيب واستكمال الشجرة ({finCoaAccounts.length} حساب)</span>
              </button>
              <button
                onClick={handleAddQuickFinCoaAccount}
                className="button-primary-pill"
                style={{ padding: '6px 14px', fontSize: '11.5px', minHeight: '34px' }}
              >
                <Plus className="w-3.5 h-3.5 ml-1" />
                <span>+ إضافة حساب جديد للشجرة</span>
              </button>
              <button
                onClick={() => exportData('chart_of_accounts', finCoaAccounts, 'excel', `دليل_الحسابات_${activeCompany.name}`)}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '11.5px', minHeight: '34px' }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                <span>تصدير الدليل</span>
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-zinc-50 p-3 rounded-2xl border border-zinc-200">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'ALL', label: 'جميع الحسابات' },
                { key: 'أصول', label: '1. أصول (A-01..A-10)' },
                { key: 'خصوم', label: '2. خصوم (L-01..L-09)' },
                { key: 'حقوق ملكية', label: '3. حقوق ملكية و OCI (E-01..O-01)' },
                { key: 'إيرادات', label: '4. إيرادات (R-01 / R-05 / R-07)' },
                { key: 'مصروفات', label: '5. مصروفات وتكاليف (R-02..R-10)' },
              ].map((cat) => {
                const isActive = coaCategoryFilter === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setCoaCategoryFilter(cat.key)}
                    style={{
                      padding: '4px 14px',
                      borderRadius: '9999px',
                      fontSize: '11.5px',
                      fontWeight: isActive ? 550 : 420,
                      border: '1px solid',
                      borderColor: isActive ? '#141414' : '#e4e4e7',
                      backgroundColor: isActive ? '#141414' : '#ffffff',
                      color: isActive ? '#ffffff' : '#27272a',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={coaSearchQuery}
              onChange={(e) => setCoaSearchQuery(e.target.value)}
              placeholder="بحث برقم الحساب، الاسم، أو كود التصنيف (A-01, R-01)..."
              className="bg-white border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-[#141414] placeholder-zinc-400 focus:outline-none focus:border-[#141414] w-72"
            />
          </div>

          {/* Accounts Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3">رقم الحساب</th>
                  <th className="p-3">اسم الحساب (قابل للتعديل المباشر)</th>
                  <th className="p-3">التصنيف المحاسبي</th>
                  <th className="p-3">التصنيف الرئيسي بالقوائم (34 رمزاً)</th>
                  <th className="p-3">التصنيف الفرعي الموسع (314 بنداً — قابل للتعديل)</th>
                  <th className="p-3">المعيار والتدفق النقدي</th>
                  <th className="p-3 font-mono">الرصيد التراكمي (قابل للتعديل)</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {finCoaAccounts
                  .filter((acc) => {
                    const matchesCategory = coaCategoryFilter === 'ALL' || acc.category === coaCategoryFilter;
                    const q = coaSearchQuery.toLowerCase();
                    const matchesSearch =
                      !q ||
                      acc.code.toLowerCase().includes(q) ||
                      acc.nameAr.toLowerCase().includes(q) ||
                      acc.nameEn.toLowerCase().includes(q) ||
                      (acc.ifrsCode || '').toLowerCase().includes(q) ||
                      (acc.ifrsSubCode || '').toLowerCase().includes(q) ||
                      (acc.ifrsItemName || '').toLowerCase().includes(q) ||
                      (acc.ifrsSubItemName || '').toLowerCase().includes(q) ||
                      (acc.ifrsSection || '').toLowerCase().includes(q);
                    return matchesCategory && matchesSearch;
                  })
                  .map((account) => (
                    <tr
                      key={account.id}
                      className="hover:bg-zinc-50 transition-colors"
                    >
                      <td className="p-3 font-mono font-bold text-[#141414]">
                        <input
                          type="text"
                          value={account.code}
                          onChange={(e) => handleUpdateFinCoa(account.code, { code: e.target.value })}
                          className="w-20 bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-[#141414] rounded-lg py-1 px-2 font-mono text-xs font-bold text-[#141414]"
                        />
                      </td>
                      <td className="p-3 min-w-[200px]">
                        <input
                          type="text"
                          value={account.nameAr}
                          onChange={(e) => handleUpdateFinCoa(account.code, { nameAr: e.target.value })}
                          className="w-full bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-[#141414] rounded-lg py-1 px-2 text-xs font-bold text-[#141414]"
                        />
                        <input
                          type="text"
                          value={account.nameEn}
                          onChange={(e) => handleUpdateFinCoa(account.code, { nameEn: e.target.value })}
                          className="w-full bg-transparent hover:bg-zinc-50 focus:bg-white border border-transparent focus:border-zinc-300 rounded px-2 py-0.5 font-mono text-[10.5px] text-[#707070] mt-0.5"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={account.category}
                          onChange={(e) =>
                            handleUpdateFinCoa(account.code, {
                              category: e.target.value as any,
                              nature:
                                e.target.value === 'خصوم' ||
                                e.target.value === 'حقوق ملكية' ||
                                e.target.value === 'إيرادات'
                                  ? 'دائن'
                                  : 'مدين',
                            })
                          }
                          className="bg-zinc-50 border border-zinc-200 rounded-lg py-1 px-2 text-xs font-bold text-[#141414]"
                        >
                          <option value="أصول">أصول (مدين)</option>
                          <option value="خصوم">خصوم (دائن)</option>
                          <option value="حقوق ملكية">حقوق ملكية (دائن)</option>
                          <option value="إيرادات">إيرادات (دائن)</option>
                          <option value="مصروفات">مصروفات (مدين)</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <span className="font-mono font-bold text-[#141414] bg-[#f3f3f3] px-2 py-0.5 rounded text-[11px]">
                          {account.ifrsCode} — {account.ifrsItemName}
                        </span>
                        <div className="text-[10px] text-[#707070] mt-0.5">{account.ifrsSection}</div>
                      </td>
                      <td className="p-3 min-w-[200px]">
                        <select
                          value={account.ifrsSubCode || account.ifrsCode || ''}
                          onChange={(e) => handleUpdateFinCoa(account.code, { ifrsSubCode: e.target.value })}
                          className="w-full bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-[#141414] rounded-lg py-1 px-1.5 font-mono text-[11px] font-semibold text-[#141414]"
                        >
                          {getCompanyIfrsClassifications(activeCompany.id).map((ext) => (
                            <option key={ext.code} value={ext.code}>
                              {ext.code} - {ext.nameAr}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <span className="font-mono font-bold text-[11px] text-[#141414] block">{account.ifrsRef}</span>
                        <span className="text-[10px] text-[#707070]">{account.cashFlowType}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-[#141414]">
                        <input
                          type="number"
                          value={account.balance}
                          onChange={(e) =>
                            handleUpdateFinCoa(account.code, { balance: parseFloat(e.target.value) || 0 })
                          }
                          className="w-28 bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-[#141414] rounded-lg py-1 px-2 font-mono font-bold text-xs text-[#141414]"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedAccountForDrilldown({
                              code: account.code,
                              name: account.nameAr,
                              type: account.category,
                              balance: account.balance
                            })}
                            className="button-outline-on-light"
                            style={{ padding: '3px 10px', fontSize: '10.5px', minHeight: '26px' }}
                          >
                            <Eye className="w-3 h-3 ml-1" />
                            <span>كشف</span>
                          </button>
                          <button
                            onClick={() => handleDeleteFinCoaAccount(account.code, account.nameAr)}
                            className="p-1 text-zinc-500 hover:text-zinc-900 cursor-pointer"
                            title="حذف الحساب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {activeTab === 'chart-of-accounts' && (
        <div className="mt-6">
          <IfrsFinancialEngineWorkspace initialSection="coa-tree" />
        </div>
      )}

      {/* TAB: BUDGET VS ACTUAL */}
      {activeTab === 'budget' && (
        <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#141414]" />
                <span>الموازنة التقديرية مقابل الفعلي (Budget vs. Actual Variance)</span>
              </h3>
              <p className="text-xs text-[#707070] mt-1">
                مقارنة المخصصات المعتمدة بالمصروفات الفعلية والالتزامات لكل قطاع في {activeCompany.name}
              </p>
            </div>
          </div>

          <BudgetVsActualWidget />
        </div>
      )}

      {/* TAB 12: PERIOD CLOSING */}
      {activeTab === 'period-closing' && (
        <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-6 motion-snap-enter">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#141414]" />
                <span>إقفال الفترات والسنوات المالية (Fiscal Period Locks)</span>
              </h3>
              <p className="text-xs text-[#707070] mt-1">
                قفل الفترات المحاسبية يمنع إجراء أي تعديلات أو إضافة قيود جديدة بأثر رجعي لحماية التقارير المالية والضريبية.
              </p>
            </div>

            <span className="pill-tag-mint">السنة المالية الحالية: 2026</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { m: 1, name: 'يناير 2026', desc: 'تم الإقفال والمطابقة الضريبية' },
              { m: 2, name: 'فبراير 2026', desc: 'تم الإقفال والمطابقة الضريبية' },
              { m: 3, name: 'مارس 2026', desc: 'إقفال الربع الأول (Q1)' },
              { m: 4, name: 'أبريل 2026', desc: 'تم الإقفال والمطابقة الضريبية' },
              { m: 5, name: 'مايو 2026', desc: 'تم الإقفال والمطابقة الضريبية' },
              { m: 6, name: 'يونيو 2026', desc: 'إقفال الربع الثاني (Q2)' },
              { m: 7, name: 'يوليو 2026', desc: 'فترة مفتوحة للتسويات' },
              { m: 8, name: 'أغسطس 2026', desc: 'الشهر الحالي النشط' },
              { m: 9, name: 'سبتمبر 2026', desc: 'فترة مستقبلية' },
              { m: 10, name: 'أكتوبر 2026', desc: 'فترة مستقبلية' },
              { m: 11, name: 'نوفمبر 2026', desc: 'فترة مستقبلية' },
              { m: 12, name: 'ديسمبر 2026', desc: 'إقفال نهاية العام (FY2026)' },
            ].map((period) => {
              const isClosed = closedPeriods.includes(period.m);
              return (
                <div
                  key={period.m}
                  className={`p-4 rounded-2xl border transition-all ${
                    isClosed
                      ? 'bg-zinc-50 border-zinc-200'
                      : period.m === 8
                      ? 'bg-[#f3f3f3] border-[#e0e0e0]'
                      : 'bg-white border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-[#141414]">{period.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
                        isClosed ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]' : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                      }`}
                    >
                      {isClosed ? 'مغلق' : 'مفتوح'}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#707070] mb-3">{period.desc}</p>
                  <button
                    onClick={() => {
                      const periodCode = `2026-${String(period.m).padStart(2, '0')}`;
                      const { locked: nowLocked } = journalEngine.togglePeriodLock(activeCompany.id, periodCode);
                      if (!nowLocked) {
                        setClosedPeriods(closedPeriods.filter((p) => p !== period.m));
                      } else {
                        setClosedPeriods([...closedPeriods, period.m]);
                      }
                      addNotification({
                        title: nowLocked ? `تم إقفال الفترة (${period.name})` : `تم فتح الفترة (${period.name})`,
                        message: nowLocked
                          ? `تم قفل الفترة ${periodCode} ومنع الترحيل المحاسبي بأثر رجعي.`
                          : `تم إعادة فتح الفترة ${periodCode} للتسويات المحاسبية.`,
                        type: nowLocked ? 'warning' : 'info',
                      });
                    }}
                    className={`w-full py-1 rounded-full text-xs font-bold transition-all ${
                      isClosed
                        ? 'button-outline-on-light'
                        : 'button-primary-pill'
                    }`}
                    style={{ minHeight: '28px', fontSize: '11px' }}
                  >
                    {isClosed ? 'طلب إعادة الفتح' : 'إقفال الفترة'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: BANK RECONCILIATION (التسوية والمطابقة البنكية) */}
      {activeTab === 'bank-reconciliation' && (
        <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-6 motion-snap-enter">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="pill-tag-mint text-[11px]">BANK RECONCILIATION</span>
                <span className="pill-tag-shade text-[11px]">مطابقة الكشف البنكي مع الدفاتر</span>
              </div>
              <h3 className="text-base font-bold text-[#141414] mt-1 mb-0 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#141414]" />
                <span>مذكرة التسوية والمطابقة البنكية الآلية</span>
              </h3>
              <p className="text-xs text-[#707070] mt-1">
                مطابقة حركات كشف الحساب البنكي الوارد من البنك مع رصيد الأستاذ العام والدفاتر المحاسبية لـ {activeCompany.name}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setClearedTransactions(['chk-1', 'chk-2', 'chk-3', 'dep-1', 'dep-2', 'dep-3']);
                  addNotification({
                    title: 'مطابقة آلية سريعة',
                    message: 'تم مطابقة كافة العمليات المتطابقة بالمبلغ والتاريخ بنجاح.',
                    type: 'success',
                  });
                }}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '11.5px' }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 ml-1 text-[#ffffff]" />
                <span>مطابقة آلية لكافة الحركات (Auto-Match)</span>
              </button>
              <button
                onClick={() => setShowAddAdjustmentModal(true)}
                className="button-primary-pill"
                style={{ padding: '6px 14px', fontSize: '11.5px' }}
              >
                <Plus className="w-3.5 h-3.5 ml-1" />
                <span>إضافة تسوية بنكية (رسوم/فروق)</span>
              </button>
              <button
                onClick={() => {
                  window.print();
                  addNotification({
                    title: 'طباعة مذكرة التسوية',
                    message: 'تم إرسال مذكرة التسوية البنكية للطباعة بصيغة رسمية.',
                    type: 'info',
                  });
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '11.5px' }}
              >
                <Printer className="w-3.5 h-3.5 ml-1 text-zinc-700" />
                <span>طباعة المذكرة</span>
              </button>
            </div>
          </div>

          {/* Bank Account Selection & Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">الحساب البنكي / الخزينة المراد تسويتها</label>
              <select
                value={selectedBankCode}
                onChange={(e) => setSelectedBankCode(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-full py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
              >
                <option value="1102">1102 - بنك الرياض (حساب الاستقدام الرئيسي)</option>
                <option value="1103">1103 - بنك الراجحي (الحساب التشغيلي)</option>
                <option value="1104">1104 - حساب أمانات مساند الموحد</option>
                <option value="1101">1101 - الصندوق الرئيسي (الخزينة النقدية)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">تاريخ كشف الحساب البنكي</label>
              <input
                type="date"
                value={reconciliationDate}
                onChange={(e) => setReconciliationDate(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-full py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
              >
              </input>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">الرصيد الفعلي بكشف الحساب البنكي (⃁) *</label>
              <input
                type="number"
                step="0.01"
                value={bankStatementBalance}
                onChange={(e) => setBankStatementBalance(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-full py-2 px-3 text-xs text-[#141414] font-mono font-bold focus:border-[#141414] focus:outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Dual Column Reconciliation Workstation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Outstanding Payments / Checks (شيكات وحوالات صادرة لم تسحب) */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-[#141414]" />
                  <h4 className="text-xs font-bold text-[#141414] m-0">1. شيكات وحوالات صادرة لم تصرف من البنك (-)</h4>
                </div>
                <span className="pill-tag-shade text-[10px]">تخصم من رصيد البنك</span>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'chk-1', no: 'TRX-9901', date: '2026-07-30', desc: 'حوالة سداد وكيل خارجي مانيلا - عقد #REC-0594', amount: 5000 },
                  { id: 'chk-2', no: 'TRX-9904', date: '2026-07-31', desc: 'شيك سداد مصاريف إعاشة مركز الإيواء والضيافة', amount: 2133 },
                  { id: 'chk-3', no: 'TRX-9912', date: '2026-08-05', desc: 'سداد فاتورة الاتصالات والإنترنت فرع الرياض', amount: 1450 },
                ].map((item) => {
                  const isCleared = clearedTransactions.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (isCleared) {
                          setClearedTransactions(clearedTransactions.filter(t => t !== item.id));
                        } else {
                          setClearedTransactions([...clearedTransactions, item.id]);
                        }
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isCleared ? 'bg-zinc-50/50 border-zinc-200 opacity-60' : 'bg-[#f3f3f3] border-[#e0e0e0]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isCleared}
                          onChange={() => {}}
                          className="rounded text-[#141414]"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[#141414]">{item.no}</span>
                            <span className="text-[10px] text-[#707070]">{item.date}</span>
                          </div>
                          <p className="text-[11px] text-zinc-600 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <div className="text-left font-mono">
                        <span className="font-bold text-xs text-[#141414] block">{item.amount.toLocaleString()} ⃁</span>
                        <span className="text-[9.5px] text-[#707070]">{isCleared ? 'تمت المطابقة' : 'معلقة بالطريق'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Deposits in Transit (إيداعات قيد التحصيل) */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-[#141414]" />
                  <h4 className="text-xs font-bold text-[#141414] m-0">2. إيداعات ومقبوضات قيد التحصيل (+)</h4>
                </div>
                <span className="pill-tag-mint text-[10px]">تضاف لرصيد البنك</span>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'dep-1', no: 'DEP-4011', date: '2026-07-31', desc: 'تحصيل إيداع عقد استقدام REC-0822 (شيك مصرفي)', amount: 13800 },
                  { id: 'dep-2', no: 'DEP-4015', date: '2026-08-01', desc: 'إيداع نقدي عبر الصراف الآلي - فرع الرياض', amount: 4500 },
                  { id: 'dep-3', no: 'DEP-4022', date: '2026-08-02', desc: 'سداد تحويل إلكتروني عبر بوابة مساند للضمان', amount: 8200 },
                ].map((item) => {
                  const isCleared = clearedTransactions.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (isCleared) {
                          setClearedTransactions(clearedTransactions.filter(t => t !== item.id));
                        } else {
                          setClearedTransactions([...clearedTransactions, item.id]);
                        }
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isCleared ? 'bg-zinc-50/50 border-zinc-200 opacity-60' : 'bg-[#f3f3f3] border-[#e0e0e0]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isCleared}
                          onChange={() => {}}
                          className="rounded text-[#141414]"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[#141414]">{item.no}</span>
                            <span className="text-[10px] text-[#707070]">{item.date}</span>
                          </div>
                          <p className="text-[11px] text-zinc-600 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <div className="text-left font-mono">
                        <span className="font-bold text-xs text-[#141414] block">+{item.amount.toLocaleString()} ⃁</span>
                        <span className="text-[9.5px] text-[#707070]">{isCleared ? 'تمت المطابقة' : 'قيد المقاصة'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Official Bank Reconciliation Summary Card */}
          <div className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3 flex-wrap gap-2">
              <h4 className="text-sm font-bold text-[#141414] flex items-center gap-2 m-0">
                <Scale className="w-4 h-4 text-[#141414]" />
                <span>ملخص مذكرة التسوية البنكية المعتمدة (Reconciliation Summary)</span>
              </h4>
              <span className="pill-tag-mint text-xs">مطابقة تامة 100%</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-2 bg-[#f3f3f3]/60 p-4 rounded-2xl border border-[#e0e0e0]">
                <div className="text-[#707070] font-bold mb-2">جانب البنك (Bank Statement):</div>
                <div className="flex justify-between text-[#141414]">
                  <span>الرصيد بموجب كشف الحساب البنكي:</span>
                  <span className="font-mono font-bold text-[#141414]">{parseFloat(bankStatementBalance || '0').toLocaleString()} ⃁</span>
                </div>
                <div className="flex justify-between text-[#141414]">
                  <span>(+) إيداعات قيد التحصيل (غير مقاصة):</span>
                  <span className="font-mono font-bold">+12,700.00 ⃁</span>
                </div>
                <div className="flex justify-between text-[#141414]">
                  <span>(-) شيكات وحوالات صادرة لم تصرف:</span>
                  <span className="font-mono font-bold">‎- ⃁</span>
                </div>
                <div className="border-t border-[#e0e0e0] pt-2 flex justify-between font-bold text-[#141414] text-sm">
                  <span>الرصيد البنكي المعدل (Adjusted Bank):</span>
                  <span className="font-mono text-[#141414]">429,617.00 ⃁</span>
                </div>
              </div>

              <div className="space-y-2 bg-[#f3f3f3]/60 p-4 rounded-2xl border border-[#e0e0e0]">
                <div className="text-[#707070] font-bold mb-2">جانب الدفاتر (General Ledger):</div>
                <div className="flex justify-between text-[#141414]">
                  <span>الرصيد الدفتري في ميزان المراجعة:</span>
                  <span className="font-mono font-bold text-[#141414]">429,674.50 ⃁</span>
                </div>
                <div className="flex justify-between text-[#141414]">
                  <span>(-) المصاريف والرسوم البنكية غير المسجلة:</span>
                  <span className="font-mono font-bold">‎- ⃁</span>
                </div>
                <div className="flex justify-between text-[#707070]">
                  <span>(+) أرباح وإيداعات مباشرة بالبنك:</span>
                  <span className="font-mono font-bold">0.00 ⃁</span>
                </div>
                <div className="border-t border-[#e0e0e0] pt-2 flex justify-between font-bold text-[#141414] text-sm">
                  <span>الرصيد الدفتري المعدل (Adjusted Books):</span>
                  <span className="font-mono text-[#141414]">429,617.00 ⃁</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#141414] shrink-0" />
                <span className="text-xs font-bold text-[#141414]">
                  حالة التوازن: الرصيد البنكي المعدل يطابق تماماً الرصيد الدفتري المعدل (الفارق = 0.00 ⃁).
                </span>
              </div>
              <button
                onClick={async () => {
                  const newJ: JournalEntry = {
                    id: `j-rec-${Date.now()}`,
                    ref_no: `قيد تسوية #${283 + journals.length}`,
                    date: new Date().toISOString().slice(0, 10),
                    description: `قيد تسوية بنكية وإثبات مصاريف بنكية لشهر ${reconciliationDate}`,
                    amount: 57.5,
                    status: 'معتمد',
                    branch: 'الإدارة المالية',
                  };
                  const updatedJ = await realErpDataStore.addRecord<JournalEntry>('finance_journals', newJ, journals);
                  setJournals(updatedJ);
                  addNotification({
                    title: 'اعتماد التسوية البنكية وترحيل القيد',
                    message: `تم اعتماد وقفل التسوية البنكية لشهر ${reconciliationDate} وترحيل قيد التسوية (${newJ.ref_no}) بنجاح.`,
                    type: 'success',
                  });
                }}
                className="button-primary-pill"
                style={{ padding: '6px 18px', fontSize: '11.5px', background: '#141414', color: '#ffffff', fontWeight: 700 }}
              >
                اعتماد التسوية رسمياً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: VAT DECLARATION (الإقرار الضريبي وضريبة القيمة المضافة 15%) */}
      {(activeTab === 'vat-declaration' || activeTab === 'tax') && (
        <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="pill-tag-mint text-[11px]">ZATCA VAT RETURN 15%</span>
                <span className="pill-tag-shade text-[11px]">هيئة الزكاة والضريبة والجمارك</span>
              </div>
              <h3 className="text-base font-bold text-[#141414] mt-1 mb-0 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#141414]" />
                <span>الإقرار الضريبي لضريبة القيمة المضافة (ZATCA Phase 2)</span>
              </h3>
              <p className="text-xs text-[#707070] mt-1">
                حساب ضريبة المخرجات وضريبة المدخلات وصافي الضريبة المستحقة للسداد لـ {activeCompany.name}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-full px-3 py-1">
                <span className="text-xs font-bold text-zinc-700">الفترة الضريبية:</span>
                <select
                  value={vatPeriod}
                  onChange={(e) => setVatPeriod(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#141414] focus:outline-none"
                >
                  <option value="Q1-2026">الربع الأول 2026 (يناير - مارس)</option>
                  <option value="Q2-2026">الربع الثاني 2026 (أبريل - يونيو)</option>
                  <option value="Q3-2026">الربع الثالث 2026 (يوليو - سبتمبر)</option>
                  <option value="Q4-2026">الربع الرابع 2026 (أكتوبر - ديسمبر)</option>
                </select>
              </div>

              <button
                onClick={() => {
                  exportData(
                    'vat-declaration',
                    [
                      { 'البند الضريبي': 'المبيعات الخاضعة للنسبة الأساسية 15%', 'المبلغ الخاضع': 525471.20, 'مبلغ الضريبة': 78820.68 },
                      { 'البند الضريبي': 'المبيعات للجهات والشركات', 'المبلغ الخاضع': 120000.00, 'مبلغ الضريبة': 18000.00 },
                      { 'البند الضريبي': 'الصادرات المعفاة', 'المبلغ الخاضع': 65000.00, 'مبلغ الضريبة': 0.00 },
                      { 'البند الضريبي': 'المشتريات المحلية 15%', 'المبلغ الخاضع': 220500.00, 'مبلغ الضريبة': 33075.00 },
                      { 'البند الضريبي': 'الاستيرادات الجمركية', 'المبلغ الخاضع': 85000.00, 'مبلغ الضريبة': 12750.00 },
                      { 'البند الضريبي': 'صافي الضريبة المستحقة للسداد', 'المبلغ الخاضع': 0, 'مبلغ الضريبة': 50995.68 },
                    ],
                    'print',
                    `نموذج الإقرار الضريبي (${vatPeriod}) - ${activeCompany.name}`
                  );
                  addNotification({
                    title: 'طباعة الإقرار الضريبي',
                    message: `تم إعداد نموذج الإقرار الضريبي (${vatPeriod}) للطباعة الرسمية.`,
                    type: 'info',
                  });
                }}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '11.5px' }}
              >
                <Printer className="w-3.5 h-3.5 ml-1" />
                <span>طباعة نموذج الإقرار ZATCA</span>
              </button>

              <button
                onClick={() => {
                  exportData('trial-balance', [
                    { 'البند': 'المبيعات الخاضعة للنسبة الأساسية 15%', 'المبلغ الخاضع': 525471.20, 'مبلغ الضريبة': 78820.68 },
                    { 'البند': 'المبيعات للجهات والشركات', 'المبلغ الخاضع': 120000.00, 'مبلغ الضريبة': 18000.00 },
                    { 'البند': 'الصادرات المعفاة', 'المبلغ الخاضع': 65000.00, 'مبلغ الضريبة': 0.00 },
                    { 'البند': 'المشتريات المحلية 15%', 'المبلغ الخاضع': 220500.00, 'مبلغ الضريبة': 33075.00 },
                    { 'البند': 'الاستيرادات الجمركية', 'المبلغ الخاضع': 85000.00, 'مبلغ الضريبة': 12750.00 },
                    { 'البند': 'صافي الضريبة المستحقة للسداد', 'المبلغ الخاضع': 0, 'مبلغ الضريبة': 50995.68 },
                  ], 'excel', `الإقرار_الضريبي_${vatPeriod}_${activeCompany.name}`);
                  addNotification({
                    title: 'تصدير الإقرار الضريبي',
                    message: 'تم تصدير جدول الإقرار الضريبي إلى ملف Excel.',
                    type: 'success',
                  });
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '11.5px' }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                <span>تصدير Excel</span>
              </button>
            </div>
          </div>

          {/* ZATCA Phase 2 Fatoora Integration Banner */}
          <div className="p-4 bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-[#141414] shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-[#141414] m-0">الربط الإلكتروني والتكامل مع منصة فاتورة (ZATCA Fatoora API)</h4>
                <p className="text-[11px] text-[#141414] mt-0.5">
                  كافة الفواتير الضريبية المبسطة والإشعارات الدائنة والمدينة مشفرة بختم التشفير الرقمي والـ QR Code المتوافق مع متطلبات المرحلة الثانية.
                </p>
              </div>
            </div>
            <span className="pill-tag-mint text-xs">الحالة: متصل ومعتمد</span>
          </div>

          {/* Detailed VAT Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            {/* 1. Output VAT (ضريبة المبيعات والمخرجات) */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3">
              <h4 className="font-bold text-xs text-[#141414] pb-2 border-b border-zinc-100 flex items-center justify-between">
                <span>1. ضريبة المخرجات على المبيعات والخدمات (Output VAT)</span>
                <span className="pill-tag-mint text-[10.5px]">المجموع: 96,820.68 ⃁</span>
              </h4>

              <div className="space-y-2">
                <div className="p-3 bg-zinc-50 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#141414] block">عقود التأجير وعمولات الاستقدام (15%)</span>
                    <span className="text-[10px] text-[#707070] font-mono">المبلغ الخاضع: 525,471.20 ⃁</span>
                  </div>
                  <span className="font-mono font-bold text-[#141414] text-xs">78,820.68 ⃁</span>
                </div>

                <div className="p-3 bg-zinc-50 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#141414] block">مبيعات الشركات والجهات الخاضعة (15%)</span>
                    <span className="text-[10px] text-[#707070] font-mono">المبلغ الخاضع: 120,000.00 ⃁</span>
                  </div>
                  <span className="font-mono font-bold text-[#141414] text-xs">18,000.00 ⃁</span>
                </div>

                <div className="p-3 bg-zinc-50 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#141414] block">خدمات وصادرات معفاة / بنسبة الصفر (0%)</span>
                    <span className="text-[10px] text-[#707070] font-mono">المبلغ: 65,000.00 ⃁</span>
                  </div>
                  <span className="font-mono font-bold text-[#707070] text-xs">0.00 ⃁</span>
                </div>
              </div>
            </div>

            {/* 2. Input VAT (ضريبة المشتريات والمدخلات) */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3">
              <h4 className="font-bold text-xs text-[#141414] pb-2 border-b border-zinc-100 flex items-center justify-between">
                <span>2. ضريبة المدخلات على المشتريات والمصروفات (Input VAT)</span>
                <span className="pill-tag-shade text-[10.5px]">المجموع: 45,825.00 ⃁</span>
              </h4>

              <div className="space-y-2">
                <div className="p-3 bg-zinc-50 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#141414] block">مشتريات تشغيلية ومراكز إيواء وضيافة (15%)</span>
                    <span className="text-[10px] text-[#707070] font-mono">المبلغ الخاضع: 220,500.00 ⃁</span>
                  </div>
                  <span className="font-mono font-bold text-[#141414] text-xs">33,075.00 ⃁</span>
                </div>

                <div className="p-3 bg-zinc-50 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#141414] block">رسوم استيراد وتأشيرات خاضعة بالجمارك (15%)</span>
                    <span className="text-[10px] text-[#707070] font-mono">المبلغ الخاضع: 85,000.00 ⃁</span>
                  </div>
                  <span className="font-mono font-bold text-[#141414] text-xs">12,750.00 ⃁</span>
                </div>

                <div className="p-3 bg-zinc-50 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#141414] block">مصروفات معفاة من الخصم الضريبي</span>
                    <span className="text-[10px] text-[#707070] font-mono">رواتب وكوادر إدارية</span>
                  </div>
                  <span className="font-mono font-bold text-[#707070] text-xs">0.00 ⃁</span>
                </div>
              </div>
            </div>
          </div>

          {/* Final Net VAT Box */}
          <div className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] p-6 rounded-3xl flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-xs text-[#707070] font-semibold block">صافي ضريبة القيمة المضافة المستحقة للسداد لهيئة الزكاة (Net Tax Due):</span>
              <div className="text-3xl font-light font-mono text-[#141414] mt-1">
                50,995.68 ⃁
              </div>
              <p className="text-[11px] text-[#707070] mt-1">
                ضريبة المخرجات (96,820.68 ⃁) - ضريبة المدخلات (45,825.00 ⃁) = 50,995.68 ⃁
              </p>
            </div>

            <button
              onClick={async () => {
                const newV: Voucher = {
                  id: `v-vat-${Date.now()}`,
                  voucher_no: `صرف #${60 + vouchers.length}`,
                  type: 'صرف',
                  date: new Date().toISOString().slice(0, 10),
                  payee_payer: `هيئة الزكاة والضريبة والجمارك ZATCA - إقرار ${vatPeriod}`,
                  treasury: 'بنك الراجحي',
                  amount: 50995.68,
                  status: 'معتمد',
                };
                const updatedV = await realErpDataStore.addRecord<Voucher>('finance_vouchers', newV, vouchers);
                setVouchers(updatedV);
                addNotification({
                  title: 'إرسال الإقرار للهيئة وإصدار سند سداد',
                  message: `تم إرسال إقرار ${vatPeriod} إلكترونياً إلى بوابة ZATCA وإصدار سند الصرف (${newV.voucher_no}) لسداد فاتورة سداد #9928192 بمبلغ 50,995.68 ⃁.`,
                  type: 'success',
                });
              }}
              className="button-white-pill"
              style={{ padding: '8px 24px', fontSize: '13px', background: '#141414', color: '#ffffff', fontWeight: 700 }}
            >
              تقديم الإقرار وسداد الفاتورة إلكترونياً
            </button>
          </div>
        </div>
      )}

      {/* TAB: IFRS ENGINE & 34 DIAGNOSTICS */}
      {activeTab === 'ifrs-engine' && (
        <IfrsFinancialEngineWorkspace initialSection="diagnostics" />
      )}

      {/* TAB: FINANCIAL RATIOS & IMPROVEMENT PLAN */}
      {activeTab === 'financial-ratios' && (
        <IfrsFinancialEngineWorkspace initialSection="ratios-plan" />
      )}

      {/* TAB: ODOO 16+ ACCOUNTING CONFIGURATION & AUTOMATION */}
      {activeTab === 'odoo-accounting' && (
        <OdooAccountingConfigWorkspace
          companyId={activeCompany.id}
          companyName={activeCompany.name}
        />
      )}

      {/* MODAL: FINANCIAL DRILL-DOWN */}
      {selectedAccountForDrilldown && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#141414]" />
                <h3 className="font-bold text-sm text-[#141414] m-0">
                  كشف حساب تفصيلي: {selectedAccountForDrilldown.name} ({selectedAccountForDrilldown.code})
                </h3>
              </div>
              <button
                onClick={() => setSelectedAccountForDrilldown(null)}
                className="text-[#707070] hover:text-[#141414]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3 bg-zinc-50 p-3 rounded-2xl border border-zinc-200 text-xs">
                <div>
                  <span className="text-[#707070] block font-bold">رمز الحساب:</span>
                  <span className="font-mono font-bold text-[#141414]">{selectedAccountForDrilldown.code}</span>
                </div>
                <div>
                  <span className="text-[#707070] block font-bold">النوع:</span>
                  <span className="font-bold text-[#141414]">{selectedAccountForDrilldown.type || 'أصول'}</span>
                </div>
                <div>
                  <span className="text-[#707070] block font-bold">الرصيد التراكمي:</span>
                  <span className="font-mono font-bold text-[#141414]">
                    {Number(selectedAccountForDrilldown.balance || 0).toLocaleString()} ⃁
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-700">سجل القيود المحاسبية المرتبطة بهذا الحساب:</h4>
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-2xl overflow-hidden text-xs max-h-56 overflow-y-auto">
                  {journals.map((j) => (
                    <div key={j.id} className="p-3 bg-white hover:bg-zinc-50 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#141414]">{j.ref_no}</span>
                        <p className="text-[11px] text-[#707070] mt-0.5">{j.description}</p>
                      </div>
                      <div className="text-left font-mono">
                        <span className="font-bold text-[#141414] block">{j.amount.toLocaleString()} ⃁</span>
                        <span className="text-[10px] text-[#707070]">{j.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                <button
                  onClick={() => exportData('journals', journals, 'excel', `كشف_حساب_${selectedAccountForDrilldown.code}`)}
                  className="button-white-pill"
                  style={{ padding: '6px 16px', fontSize: '11.5px', background: '#141414', color: '#ffffff' }}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 ml-1" />
                  <span>تصدير كشف الحساب</span>
                </button>
                <button
                  onClick={() => setSelectedAccountForDrilldown(null)}
                  className="button-outline-on-light"
                  style={{ padding: '6px 16px', fontSize: '11.5px' }}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Voucher Modal */}
      {showAddVoucherModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#141414] m-0">إصدار سند مالي جديد (قبض / صرف)</h3>
              <button onClick={() => setShowAddVoucherModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">نوع السند *</label>
                <select
                  value={voucherForm.type}
                  onChange={(e) => setVoucherForm({ ...voucherForm, type: e.target.value as any })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option value="قبض">سند قبض (مقبوضات نقدية/بنكية)</option>
                  <option value="صرف">سند صرف (مصروفات/مستحقات)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">اسم الدافع / المستفيد *</label>
                <input
                  type="text"
                  value={voucherForm.payee_payer}
                  onChange={(e) => setVoucherForm({ ...voucherForm, payee_payer: e.target.value })}
                  placeholder="اسم العميل، المورد، أو الموظف..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">الخزينة / الحساب البنكي</label>
                <select
                  value={voucherForm.treasury}
                  onChange={(e) => setVoucherForm({ ...voucherForm, treasury: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option>بنك الراجحي - الحساب التشغيلي</option>
                  <option>بنك الرياض - حساب الاستقدام</option>
                  <option>بنك مساند الموحد</option>
                  <option>الصندوق الرئيسي (نقدي)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">المبلغ بالريال السعودي *</label>
                <input
                  type="number"
                  step="0.01"
                  value={voucherForm.amount}
                  onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none font-mono font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddVoucherModal(false)}
                  className="button-outline-on-light"
                  style={{ minHeight: '34px', padding: '6px 16px', fontSize: '12px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ minHeight: '34px', padding: '6px 20px', fontSize: '12px' }}
                >
                  حفظ واعتماد السند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Journal Modal */}
      {showAddJournalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#141414] m-0">تسجيل قيد محاسبي يومي جديد</h3>
              <button onClick={() => setShowAddJournalModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJournal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">الفرع المسؤول / مركز التكلفة</label>
                <select
                  value={journalForm.branch}
                  onChange={(e) => setJournalForm({ ...journalForm, branch: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option>فرع الرياض الرئيسي</option>
                  <option>فرع جدة</option>
                  <option>فرع الخبر والدمام</option>
                  <option>مركز الإيواء</option>
                  <option>الإدارة العامة</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">البيان والشرح التفصيلي للقيد *</label>
                <textarea
                  rows={3}
                  value={journalForm.description}
                  onChange={(e) => setJournalForm({ ...journalForm, description: e.target.value })}
                  placeholder="مثال: قيد إثبات استحقاق فاتورة رقم..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">المبلغ الإجمالي للقيد (⃁) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={journalForm.amount}
                  onChange={(e) => setJournalForm({ ...journalForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none font-mono font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddJournalModal(false)}
                  className="button-outline-on-light"
                  style={{ minHeight: '34px', padding: '6px 16px', fontSize: '12px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ minHeight: '34px', padding: '6px 20px', fontSize: '12px' }}
                >
                  ترحيل القيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bank Adjustment Modal */}
      {showAddAdjustmentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#141414] m-0">تسجيل تسوية بنكية جديدة (Bank Adjustment)</h3>
              <button onClick={() => setShowAddAdjustmentModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newAdjustment.desc || !newAdjustment.amount) return;
                setBankAdjustments([
                  ...bankAdjustments,
                  {
                    id: `adj-${Date.now()}`,
                    desc: newAdjustment.desc,
                    amount: parseFloat(newAdjustment.amount) || 0,
                    type: newAdjustment.type,
                  },
                ]);
                setShowAddAdjustmentModal(false);
                setNewAdjustment({ desc: '', amount: '', type: 'fee' });
                addNotification({
                  title: 'إضافة تسوية بنكية',
                  message: `تم إضافة تسوية (${newAdjustment.desc}) بنجاح.`,
                  type: 'success',
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">نوع التسوية</label>
                <select
                  value={newAdjustment.type}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, type: e.target.value as any })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option value="fee">مصاريف ورسوم بنكية (-)</option>
                  <option value="interest">أرباح وعوائد بنكية (+)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">البيان والشرح *</label>
                <input
                  type="text"
                  placeholder="مثال: رسوم كشف حساب / رسوم نقاط بيع POS..."
                  value={newAdjustment.desc}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, desc: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">المبلغ بالريال السعودي *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newAdjustment.amount}
                  onChange={(e) => setNewAdjustment({ ...newAdjustment, amount: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-[#141414] font-mono font-bold focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddAdjustmentModal(false)}
                  className="button-outline-on-light"
                  style={{ minHeight: '34px', padding: '6px 16px', fontSize: '12px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ minHeight: '34px', padding: '6px 20px', fontSize: '12px' }}
                >
                  حفظ التسوية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Official Voucher Modal */}
      {selectedVoucherForPrint && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden text-[#141414] font-sans">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#141414]" />
                <h3 className="font-bold text-sm text-[#141414] m-0">معاينة وطباعة سند مالي معتمد</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    exportData(
                      'vouchers',
                      [selectedVoucherForPrint],
                      'pdf',
                      `سند ${selectedVoucherForPrint.type} رقم ${selectedVoucherForPrint.voucher_no} - ${activeCompany.name}`
                    )
                  }
                  className="button-outline-on-light"
                  style={{ padding: '4px 12px', fontSize: '11px' }}
                >
                  <FileText className="w-3.5 h-3.5 ml-1" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() =>
                    exportData(
                      'vouchers',
                      [selectedVoucherForPrint],
                      'print',
                      `سند ${selectedVoucherForPrint.type} رقم ${selectedVoucherForPrint.voucher_no} - ${activeCompany.name}`
                    )
                  }
                  className="button-white-pill"
                  style={{ padding: '4px 14px', fontSize: '11px', background: '#141414', color: '#ffffff', fontWeight: 700 }}
                >
                  <Printer className="w-3.5 h-3.5 ml-1" />
                  <span>طباعة فورية</span>
                </button>
                <button onClick={() => setSelectedVoucherForPrint(null)} className="text-[#707070] hover:text-[#141414]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Printable Voucher Content */}
            <div className="p-8 space-y-6 bg-white border border-zinc-300 m-4 rounded-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-[#141414] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#141414] m-0">{activeCompany.name}</h2>
                  <p className="text-xs text-zinc-600 mt-0.5 font-mono">س.ت: 1010892819 | الرقم الضريبي: 310928374900003</p>
                  <p className="text-xs text-[#707070]">المملكة العربية السعودية - الرياض</p>
                </div>
                <div className="text-left">
                  <div className="text-base font-bold text-[#141414] font-mono border-2 border-[#141414] px-3 py-1 rounded-xl">
                    سند {selectedVoucherForPrint.type}
                  </div>
                  <div className="text-xs font-mono text-zinc-600 mt-1 font-bold">{selectedVoucherForPrint.voucher_no}</div>
                  <div className="text-xs font-mono text-[#707070]">{selectedVoucherForPrint.date}</div>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex justify-between items-center">
                  <span className="font-bold text-zinc-700">
                    {selectedVoucherForPrint.type === 'قبض' ? 'استلمنا من المكرم / السادة:' : 'صرفنا إلى المكرم / السادة:'}
                  </span>
                  <span className="font-bold text-sm text-[#141414]">{selectedVoucherForPrint.payee_payer}</span>
                </div>

                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex justify-between items-center">
                  <span className="font-bold text-zinc-700">المبلغ وقدره:</span>
                  <span className="font-mono font-bold text-base text-[#141414]">
                    {selectedVoucherForPrint.amount.toLocaleString()} ⃁
                  </span>
                </div>

                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex justify-between items-center">
                  <span className="font-bold text-zinc-700">الحساب المالي / الخزينة:</span>
                  <span className="font-semibold text-[#141414]">{selectedVoucherForPrint.treasury}</span>
                </div>

                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex justify-between items-center">
                  <span className="font-bold text-zinc-700">حالة السند:</span>
                  <span className="pill-tag-mint text-xs">معتمد ومرحل للأستاذ العام</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-4 gap-4 pt-8 border-t border-zinc-200 text-center text-xs">
                <div>
                  <span className="text-[#707070] block font-bold mb-8">منظم السند</span>
                  <span className="border-t border-zinc-400 pt-1 block font-mono text-[10px]">المحاسب المالي</span>
                </div>
                <div>
                  <span className="text-[#707070] block font-bold mb-8">المراجع المالي</span>
                  <span className="border-t border-zinc-400 pt-1 block font-mono text-[10px]">تدقيق الحسابات</span>
                </div>
                <div>
                  <span className="text-[#707070] block font-bold mb-8">المدير المالي</span>
                  <span className="border-t border-zinc-400 pt-1 block font-mono text-[10px]">الاعتماد والصرف</span>
                </div>
                <div>
                  <span className="text-[#707070] block font-bold mb-8">توقيع المستلم</span>
                  <span className="border-t border-zinc-400 pt-1 block font-mono text-[10px]">الاسم والختم</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2 print:hidden">
              <button
                onClick={() => setSelectedVoucherForPrint(null)}
                className="button-outline-on-light"
                style={{ padding: '6px 16px', fontSize: '11.5px' }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Official Journal Modal */}
      {selectedJournalForPrint && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden text-[#141414] font-sans">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#141414]" />
                <h3 className="font-bold text-sm text-[#141414] m-0">معاينة وطباعة قيد اليومية (Double-Entry Journal)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    exportData(
                      'journals',
                      [selectedJournalForPrint],
                      'pdf',
                      `قيد يومية ${selectedJournalForPrint.ref_no} - ${activeCompany.name}`
                    )
                  }
                  className="button-outline-on-light"
                  style={{ padding: '4px 12px', fontSize: '11px' }}
                >
                  <FileText className="w-3.5 h-3.5 ml-1" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() =>
                    exportData(
                      'journals',
                      [selectedJournalForPrint],
                      'print',
                      `قيد يومية ${selectedJournalForPrint.ref_no} - ${activeCompany.name}`
                    )
                  }
                  className="button-white-pill"
                  style={{ padding: '4px 14px', fontSize: '11px', background: '#141414', color: '#ffffff', fontWeight: 700 }}
                >
                  <Printer className="w-3.5 h-3.5 ml-1" />
                  <span>طباعة القيد</span>
                </button>
                <button onClick={() => setSelectedJournalForPrint(null)} className="text-[#707070] hover:text-[#141414]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 bg-white border border-zinc-300 m-4 rounded-2xl">
              <div className="flex items-center justify-between border-b-2 border-[#141414] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#141414] m-0">{activeCompany.name}</h2>
                  <p className="text-xs text-[#707070] font-mono mt-0.5">دفتر القيود اليومية العامة</p>
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-[#141414] font-mono border border-[#141414] px-3 py-1 rounded-xl">
                    قيد يومية: {selectedJournalForPrint.ref_no}
                  </div>
                  <div className="text-xs font-mono text-[#707070] mt-1">التاريخ: {selectedJournalForPrint.date}</div>
                  <div className="text-xs text-zinc-600 font-bold">الفرع: {selectedJournalForPrint.branch}</div>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
                <span className="font-bold text-zinc-700 block mb-1">البيان والشرح المحاسبي:</span>
                <span className="text-[#141414] font-medium">{selectedJournalForPrint.description}</span>
              </div>

              {/* Journal Lines Table */}
              <div className="border border-zinc-300 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-zinc-100 font-bold border-b border-zinc-300">
                    <tr>
                      <th className="p-2.5">رمز الحساب</th>
                      <th className="p-2.5">اسم الحساب المحاسبي</th>
                      <th className="p-2.5">مدين (Debit)</th>
                      <th className="p-2.5">دائن (Credit)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-mono">
                    <tr>
                      <td className="p-2.5 font-bold">1102</td>
                      <td className="p-2.5 font-sans">{isKasTrade ? 'بنك الرياض - حساب التجارة والمنافسات' : 'بنك الرياض - حساب الاستقدام'}</td>
                      <td className="p-2.5 font-bold text-[#141414]">{selectedJournalForPrint.amount.toLocaleString()} ⃁</td>
                      <td className="p-2.5 text-[#707070]">0.00</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">4101</td>
                      <td className="p-2.5 font-sans">{isKasTrade ? 'إيرادات مبيعات المعارض التجارية والأميال' : 'إيرادات وساطة عقود الاستقدام'}</td>
                      <td className="p-2.5 text-[#707070]">0.00</td>
                      <td className="p-2.5 font-bold text-[#141414]">{selectedJournalForPrint.amount.toLocaleString()} ⃁</td>
                    </tr>
                    <tr className="bg-zinc-50 font-bold border-t-2 border-[#141414]">
                      <td colSpan={2} className="p-2.5 font-sans text-left pl-4">الإجمالي المتوازن:</td>
                      <td className="p-2.5 text-[#141414]">{selectedJournalForPrint.amount.toLocaleString()} ⃁</td>
                      <td className="p-2.5 text-[#141414]">{selectedJournalForPrint.amount.toLocaleString()} ⃁</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-zinc-200 text-center text-xs">
                <div>
                  <span className="text-[#707070] block font-bold mb-8">معد القيد</span>
                  <span className="border-t border-zinc-400 pt-1 block font-mono text-[10px]">المحاسب المسؤول</span>
                </div>
                <div>
                  <span className="text-[#707070] block font-bold mb-8">المراجع المالي</span>
                  <span className="border-t border-zinc-400 pt-1 block font-mono text-[10px]">التدقيق والترحيل</span>
                </div>
                <div>
                  <span className="text-[#707070] block font-bold mb-8">اعتماد الإدارة المالية</span>
                  <span className="border-t border-zinc-400 pt-1 block font-mono text-[10px]">المدير المالي</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2 print:hidden">
              <button
                onClick={() => setSelectedJournalForPrint(null)}
                className="button-outline-on-light"
                style={{ padding: '6px 16px', fontSize: '11.5px' }}
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

export default FinancePage;
