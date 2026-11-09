import { TenderRecord, SupplierRecord } from '../types/tenders';

export type { SupplierRecord };

export interface TenderKPI {
  totalTenders: number;
  totalAwarded: number;
  totalDraft: number;
  totalInvoiced: number;
  totalSubmitted: number;
  winRate: number; // percentage
  totalRevenue: number;
  totalRevenueWithVat: number;
  avgTenderValue: number;
  topClient: { name: string; value: number; count: number };
  categoryBreakdown: { category: string; count: number; value: number }[];
  monthlyTrend: { month: string; count: number; value: number }[];
  statusDistribution: { status: string; count: number; color: string }[];
}

export function computeTenderKPIs(tenders: TenderRecord[]): TenderKPI {
  const totalTenders = tenders.length;
  const awarded = tenders.filter(t => t.status === 'ترسية واعتماد');
  const draft = tenders.filter(t => t.status === 'مسودة قيد الدراسة');
  const invoiced = tenders.filter(t => t.status === 'مكتملة ومفوترة');
  const submitted = tenders.filter(t => t.status === 'مقدمة ومسعرة');

  const totalRevenue = tenders.reduce((sum, t) => sum + t.subtotal, 0);
  const totalRevenueWithVat = tenders.reduce((sum, t) => sum + t.grandTotal, 0);
  const avgTenderValue = totalTenders > 0 ? totalRevenueWithVat / totalTenders : 0;
  const winRate = totalTenders > 0 ? ((awarded.length + invoiced.length) / totalTenders) * 100 : 0;

  // Top client by total value
  const clientMap = new Map<string, { value: number; count: number }>();
  tenders.forEach(t => {
    const existing = clientMap.get(t.clientName) || { value: 0, count: 0 };
    clientMap.set(t.clientName, {
      value: existing.value + t.grandTotal,
      count: existing.count + 1,
    });
  });
  let topClient = { name: 'لا يوجد', value: 0, count: 0 };
  clientMap.forEach((v, k) => {
    if (v.value > topClient.value) {
      topClient = { name: k, value: v.value, count: v.count };
    }
  });

  // Category breakdown
  const catMap = new Map<string, { count: number; value: number }>();
  tenders.forEach(t => {
    const existing = catMap.get(t.category) || { count: 0, value: 0 };
    catMap.set(t.category, { count: existing.count + 1, value: existing.value + t.grandTotal });
  });
  const categoryBreakdown = Array.from(catMap.entries()).map(([category, data]) => ({
    category,
    count: data.count,
    value: data.value,
  }));

  // Monthly trend
  const monthMap = new Map<string, { count: number; value: number }>();
  tenders.forEach(t => {
    const month = t.submissionDate ? t.submissionDate.substring(0, 7) : '2026-08';
    const existing = monthMap.get(month) || { count: 0, value: 0 };
    monthMap.set(month, { count: existing.count + 1, value: existing.value + t.grandTotal });
  });
  const monthlyTrend = Array.from(monthMap.entries()).map(([month, data]) => ({
    month,
    count: data.count,
    value: data.value,
  }));

  // Status distribution
  const statusColors: Record<string, string> = {
    'مسودة قيد الدراسة': '#eab308',
    'مقدمة ومسعرة': '#06b6d4',
    'ترسية واعتماد': '#10b981',
    'مكتملة ومفوترة': '#8b5cf6',
  };
  const statusCounts = new Map<string, number>();
  tenders.forEach(t => {
    statusCounts.set(t.status, (statusCounts.get(t.status) || 0) + 1);
  });
  const statusDistribution = Array.from(statusCounts.entries()).map(([status, count]) => ({
    status,
    count,
    color: statusColors[status] || '#64748b',
  }));

  return {
    totalTenders,
    totalAwarded: awarded.length,
    totalDraft: draft.length,
    totalInvoiced: invoiced.length,
    totalSubmitted: submitted.length,
    winRate: Number(winRate.toFixed(1)),
    totalRevenue,
    totalRevenueWithVat,
    avgTenderValue: Number(avgTenderValue.toFixed(2)),
    topClient,
    categoryBreakdown,
    monthlyTrend,
    statusDistribution,
  };
}


export const DEFAULT_SUPPLIERS: SupplierRecord[] = [
  {
    id: 'SUP-001',
    name: 'مؤسسة الضيافة الملكية للتموين',
    category: 'مواد غذائية وضيافة',
    contactPerson: 'فهد بن عبدالله العمري',
    phone: '0551234567',
    email: 'info@royalhospitality.sa',
    city: 'الرياض',
    rating: 5,
    qualityScore: 95,
    commitmentScore: 92,
    priceCompetitiveness: 88,
    totalDeals: 14,
    totalValue: 285000,
    lastDealDate: '2026-08-10',
    status: 'معتمد',
    notes: 'مورد معتمد للقهوة العربية والتمور والضيافة الوطنية',
  },
  {
    id: 'SUP-002',
    name: 'شركة الطباعة المتقدمة للدعاية والإعلان',
    category: 'طباعة ودعاية',
    contactPerson: 'سعد الشمري',
    phone: '0559876543',
    email: 'print@advancedprint.sa',
    city: 'جدة',
    rating: 4,
    qualityScore: 90,
    commitmentScore: 85,
    priceCompetitiveness: 92,
    totalDeals: 22,
    totalValue: 410000,
    lastDealDate: '2026-08-15',
    status: 'معتمد',
    notes: 'متخصص في طباعة الباك دروب واستيكرات المصاعد والواجهات',
  },
  {
    id: 'SUP-003',
    name: 'فرقة العرضة النجدية الرسمية',
    category: 'إنتاج وفعاليات',
    contactPerson: 'ناصر بن سعود الدوسري',
    phone: '0503456789',
    email: 'ardha@najdievents.sa',
    city: 'الرياض',
    rating: 5,
    qualityScore: 98,
    commitmentScore: 96,
    priceCompetitiveness: 75,
    totalDeals: 8,
    totalValue: 172000,
    lastDealDate: '2026-08-12',
    status: 'معتمد',
    notes: 'فرقة رسمية معتمدة للاحتفالات الوطنية والمناسبات الحكومية',
  },
  {
    id: 'SUP-004',
    name: 'مؤسسة الإضاءة الذكية للديكور',
    category: 'إنتاج وفعاليات',
    contactPerson: 'عمر الحربي',
    phone: '0507654321',
    email: 'light@smartdecor.sa',
    city: 'الرياض',
    rating: 4,
    qualityScore: 87,
    commitmentScore: 90,
    priceCompetitiveness: 85,
    totalDeals: 11,
    totalValue: 198000,
    lastDealDate: '2026-08-18',
    status: 'معتمد',
    notes: 'تجهيز إضاءة المباني الحكومية والمكعبات الداخلية للمناسبات',
  },
  {
    id: 'SUP-005',
    name: 'مصنع الهدايا التذكارية والشالات',
    category: 'أخرى',
    contactPerson: 'خالد المطيري',
    phone: '0561112233',
    email: 'gifts@souvenirs.sa',
    city: 'الدمام',
    rating: 3,
    qualityScore: 78,
    commitmentScore: 82,
    priceCompetitiveness: 95,
    totalDeals: 6,
    totalValue: 92000,
    lastDealDate: '2026-07-25',
    status: 'تحت التقييم',
    notes: 'يوفر شالات مطرزة وأكواب سيراميك محفورة بالشعارات الرسمية',
  },
];

// ============================================================================
// TASK-403: BANK GUARANTEES MANAGEMENT (إدارة الضمانات البنكية الابتدائي والنهائي)
// ============================================================================

export type BankGuaranteeType = 'INITIAL' | 'FINAL' | 'ADVANCE_PAYMENT';
export type BankGuaranteeStatus = 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'CONFISCATED';

export interface BankGuaranteeRecord {
  id: string;
  companyId: string;
  tenderId: string;
  tenderReference: string;
  guaranteeNumber: string;
  guaranteeType: BankGuaranteeType;
  guaranteeTypeAr: string;
  bankName: string;
  beneficiaryEntity: string;
  tenderTotalValue: number;
  guaranteePercentage: number;
  guaranteeAmount: number;
  cashMarginPercentage: number;
  cashMarginAmount: number;
  issueDate: string;
  expiryDate: string;
  status: BankGuaranteeStatus;
}

export function createBankGuarantee(params: {
  companyId?: string;
  tenderId: string;
  tenderReference: string;
  guaranteeNumber: string;
  guaranteeType: BankGuaranteeType;
  bankName: string;
  beneficiaryEntity: string;
  tenderTotalValue: number;
  customPercentage?: number;
  cashMarginPercentage?: number;
  issueDate: string;
  expiryDate: string;
}): BankGuaranteeRecord {
  const defaultPctMap: Record<BankGuaranteeType, number> = {
    INITIAL: 1, // 1% - 2% statutory initial bid bond on Etimad
    FINAL: 5,   // 5% statutory performance bond on Etimad
    ADVANCE_PAYMENT: 10,
  };
  const typeArMap: Record<BankGuaranteeType, string> = {
    INITIAL: 'ضمان بنكي ابتدائي (1% - 2%)',
    FINAL: 'ضمان بنكي نهائي لحسن التنفيذ (5%)',
    ADVANCE_PAYMENT: 'ضمان الدفعة المقدمة',
  };

  const guaranteePercentage = params.customPercentage ?? defaultPctMap[params.guaranteeType];
  const guaranteeAmount = Number(((params.tenderTotalValue * guaranteePercentage) / 100).toFixed(2));
  const cashMarginPercentage = params.cashMarginPercentage ?? 10;
  const cashMarginAmount = Number(((guaranteeAmount * cashMarginPercentage) / 100).toFixed(2));

  return {
    id: `BG-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    companyId: params.companyId && params.companyId !== 'all' ? params.companyId : 'KAS',
    tenderId: params.tenderId,
    tenderReference: params.tenderReference,
    guaranteeNumber: params.guaranteeNumber,
    guaranteeType: params.guaranteeType,
    guaranteeTypeAr: typeArMap[params.guaranteeType],
    bankName: params.bankName,
    beneficiaryEntity: params.beneficiaryEntity,
    tenderTotalValue: params.tenderTotalValue,
    guaranteePercentage,
    guaranteeAmount,
    cashMarginPercentage,
    cashMarginAmount,
    issueDate: params.issueDate,
    expiryDate: params.expiryDate,
    status: 'ACTIVE',
  };
}

/**
 * Checks bank guarantees for upcoming expiration (default alert threshold: 15 days).
 */
export function checkExpiringBankGuarantees(
  guarantees: BankGuaranteeRecord[],
  alertWindowDays = 15,
  referenceDateStr?: string
): Array<{
  guarantee: BankGuaranteeRecord;
  daysUntilExpiry: number;
  urgency: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'SAFE';
  recommendationAr: string;
}> {
  const refMs = referenceDateStr ? new Date(referenceDateStr).getTime() : Date.now();

  return guarantees
    .filter((g) => g.status === 'ACTIVE')
    .map((guarantee) => {
      const expMs = new Date(guarantee.expiryDate).getTime();
      const daysUntilExpiry = Math.ceil((expMs - refMs) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        return {
          guarantee,
          daysUntilExpiry,
          urgency: 'EXPIRED' as const,
          recommendationAr: `الضمان البنكي (${guarantee.guaranteeNumber}) منتهي الصلاحية منذ ${Math.abs(daysUntilExpiry)} يوم — يجب الإفراج عنه أو تمديده فوراً.`,
        };
      }
      if (daysUntilExpiry <= 7) {
        return {
          guarantee,
          daysUntilExpiry,
          urgency: 'CRITICAL' as const,
          recommendationAr: `تنبيه حرج: يتبقى ${daysUntilExpiry} أيام فقط على انتهاء الضمان البنكي (${guarantee.guaranteeNumber}) لدى ${guarantee.bankName}.`,
        };
      }
      if (daysUntilExpiry <= alertWindowDays) {
        return {
          guarantee,
          daysUntilExpiry,
          urgency: 'WARNING' as const,
          recommendationAr: `يتبقى ${daysUntilExpiry} يوماً على انتهاء الضمان البنكي (${guarantee.guaranteeNumber}) للجهة ${guarantee.beneficiaryEntity}.`,
        };
      }
      return {
        guarantee,
        daysUntilExpiry,
        urgency: 'SAFE' as const,
        recommendationAr: `الضمان البنكي سارٍ (${daysUntilExpiry} يوماً متبقية).`,
      };
    });
}

// ============================================================================
// TASK-402: HISTORICAL PRICING & COMPETITOR BENCHMARKING (مقارنة الأسعار التاريخية)
// ============================================================================

export interface HistoricalPriceBenchmarkResult {
  itemDescription: string;
  proposedUnitPrice: number;
  historicalAvgPrice: number;
  historicalMinPrice: number;
  historicalMaxPrice: number;
  variancePercentage: number;
  winProbabilityScore: number; // 0 - 100
  pricingPosition: 'COMPETITIVE' | 'OPTIMAL_MARGIN' | 'OVERPRICED_RISK' | 'UNDERPRICED_DUMPING_RISK';
  adviceAr: string;
}

export function benchmarkBoqItemPricing(params: {
  itemDescription: string;
  proposedUnitPrice: number;
  historicalUnitPrices: number[];
}): HistoricalPriceBenchmarkResult {
  const validHistory = params.historicalUnitPrices.filter((p) => p > 0);
  if (validHistory.length === 0) {
    return {
      itemDescription: params.itemDescription,
      proposedUnitPrice: params.proposedUnitPrice,
      historicalAvgPrice: params.proposedUnitPrice,
      historicalMinPrice: params.proposedUnitPrice,
      historicalMaxPrice: params.proposedUnitPrice,
      variancePercentage: 0,
      winProbabilityScore: 75,
      pricingPosition: 'OPTIMAL_MARGIN',
      adviceAr: 'لا توجد تسعيرات تاريخية سابقة لهذا البند — السعر المقترح معتمد كخط أساس.',
    };
  }

  const sum = validHistory.reduce((a, b) => a + b, 0);
  const historicalAvgPrice = Number((sum / validHistory.length).toFixed(2));
  const historicalMinPrice = Math.min(...validHistory);
  const historicalMaxPrice = Math.max(...validHistory);
  const variancePercentage = Number(
    (((params.proposedUnitPrice - historicalAvgPrice) / historicalAvgPrice) * 100).toFixed(2)
  );

  let pricingPosition: HistoricalPriceBenchmarkResult['pricingPosition'] = 'OPTIMAL_MARGIN';
  let winProbabilityScore = 82;
  let adviceAr = 'التسعير ضمن النطاق التنافسي الأمثل لمنافسات منصة اعتماد.';

  if (variancePercentage < -25) {
    pricingPosition = 'UNDERPRICED_DUMPING_RISK';
    winProbabilityScore = 60;
    adviceAr = 'تنبيه: السعر أقل بأكثر من 25% من المتوسط التاريخي وقد يستدعي استفسار لجنة فحص العروض (مخاطر تدني الأسعار).';
  } else if (variancePercentage <= 0) {
    pricingPosition = 'COMPETITIVE';
    winProbabilityScore = 92;
    adviceAr = 'سعر تنافسي ممتاز أقل من المتوسط التاريخي مع الحفاظ على هامش ربح آمن.';
  } else if (variancePercentage > 15) {
    pricingPosition = 'OVERPRICED_RISK';
    winProbabilityScore = 35;
    adviceAr = 'تحذير: السعر المقترح أعلى بأكثر من 15% من متوسط ترسيات المنافسين السابقة مما يخفض احتمالية الترسية.';
  }

  return {
    itemDescription: params.itemDescription,
    proposedUnitPrice: params.proposedUnitPrice,
    historicalAvgPrice,
    historicalMinPrice,
    historicalMaxPrice,
    variancePercentage,
    winProbabilityScore,
    pricingPosition,
    adviceAr,
  };
}

