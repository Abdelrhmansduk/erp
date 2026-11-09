import * as XLSX from 'xlsx';
import { KasTenderItem, KasKPIStats, KasSheetMeta, SheetCategory } from '../types/kasMonafasat';
import seedData from '../data/kasMonafasatSeedData.json';
import { erpIndexedStorage } from './storage/erpIndexedStorage';

const LOCAL_STORAGE_KEY = 'kas_monafasat_overrides_v1';

export const KAS_SHEETS_META: KasSheetMeta[] = [
  // Companies / Activities
  { name: 'تجارة', label: 'مؤسسة خالد السليم للتجارة (كاس)', category: 'companies', badge: 'تجارة عامة وتوريدات', icon: 'Store' },
  { name: 'معارض', label: 'مؤسسة كاس لتنظيم المعارض والمؤتمرات', category: 'companies', badge: 'معارض وفعاليات', icon: 'Tent' },
  { name: 'دعاية', label: 'مؤسسة خالد السليم للدعاية والإعلان', category: 'companies', badge: 'دعاية وإعلان', icon: 'Megaphone' },
  { name: 'بنايات', label: 'مؤسسة بنايات ذكية للمقاولات', category: 'companies', badge: 'مقاولات وترميم', icon: 'Building' },
  { name: 'أميال', label: 'وكالة الأميال للسفر والسياحة', category: 'companies', badge: 'سياحة وضيافة', icon: 'Plane' },
  { name: 'تقنية', label: 'مؤسسة اللمسة الخارقة للاتصالات والتقنية', category: 'companies', badge: 'تقنية وشبكات', icon: 'Cpu' },

  // Medical Division
  { name: 'August26 الادارة الطبية ', label: 'الادارة الطبية - أغسطس 2026', category: 'medical' },
  { name: ' 26 Jul الادارة الطبية', label: 'الادارة الطبية - يوليو 2026', category: 'medical' },
  { name: 'June26 الاداره الطبيه', label: 'الادارة الطبية - يونيو 2026', category: 'medical' },
  { name: 'May26 الاداره الطبيه', label: 'الادارة الطبية - مايو 2026', category: 'medical' },
  { name: 'April26 الادارة الطبيه', label: 'الادارة الطبية - أبريل 2026', category: 'medical' },
  { name: 'الاداره الطبيه March-26', label: 'الادارة الطبية - مارس 2026', category: 'medical' },
  { name: ' الاداره الطبيه February', label: 'الادارة الطبية - فبراير 2026', category: 'medical' },
  { name: 'January2026 الادارة الطبية', label: 'الادارة الطبية - يناير 2026', category: 'medical' },
  { name: 'December الادارة الطبية', label: 'الادارة الطبية - ديسمبر 2025', category: 'medical' },
  { name: 'November الادارة الطبية', label: 'الادارة الطبية - نوفمبر 2025', category: 'medical' },
  { name: 'October الاداره الطبيه', label: 'الادارة الطبية - أكتوبر 2025', category: 'medical' },

  // Monthly Tracking
  { name: 'August26', label: 'المنافسات الشهرية - أغسطس 2026', category: 'monthly' },
  { name: 'Jul26', label: 'المنافسات الشهرية - يوليو 2026', category: 'monthly' },
  { name: 'June26', label: 'المنافسات الشهرية - يونيو 2026', category: 'monthly' },
  { name: 'May26', label: 'المنافسات الشهرية - مايو 2026', category: 'monthly' },
  { name: 'April26', label: 'المنافسات الشهرية - أبريل 2026', category: 'monthly' },
  { name: 'March-26', label: 'المنافسات الشهرية - مارس 2026', category: 'monthly' },
  { name: 'February-26', label: 'المنافسات الشهرية - فبراير 2026', category: 'monthly' },
  { name: 'January-26', label: 'المنافسات الشهرية - يناير 2026', category: 'monthly' },
  { name: 'December', label: 'المنافسات الشهرية - ديسمبر 2025', category: 'monthly' },
  { name: 'November', label: 'المنافسات الشهرية - نوفمبر 2025', category: 'monthly' },
  { name: 'October', label: 'المنافسات الشهرية - أكتوبر 2025', category: 'monthly' },
  { name: 'September', label: 'المنافسات الشهرية - سبتمبر 2025', category: 'monthly' },

  // Archive & General
  { name: 'منافسات عامة', label: 'سجل المنافسات العامة الشاملة', category: 'archive', badge: 'عامة' },
  { name: 'منافسات 2024', label: 'أرشيف منافسات عام 2024 المعتمدة', category: 'archive', badge: 'أرشيف 2024' },
];

class KasMonafasatService {
  private data: Record<string, KasTenderItem[]> = {};
  private fullDataLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    this.initData();
  }

  private initData() {
    this.data = erpIndexedStorage.getSync<Record<string, KasTenderItem[]>>(
      LOCAL_STORAGE_KEY,
      structuredClone(seedData as Record<string, KasTenderItem[]>)
    );
  }

  public async ensureFullDataLoaded(): Promise<void> {
    if (this.fullDataLoaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        // First check if IndexedDB already holds the full dataset
        const cached = await erpIndexedStorage.getAsync<Record<string, KasTenderItem[]>>(LOCAL_STORAGE_KEY);
        const cachedTotal = cached ? Object.values(cached).reduce((s, list) => s + list.length, 0) : 0;
        if (cached && cachedTotal > 100) {
          this.data = cached;
          this.fullDataLoaded = true;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kas_monafasat_data_loaded'));
          }
          return;
        }

        if (typeof fetch !== 'undefined') {
          const response = await fetch('/data/kasMonafasatSheetData.json');
          if (response.ok) {
            const fullJson = (await response.json()) as Record<string, KasTenderItem[]>;
            // Merge any items added before full load
            Object.entries(fullJson).forEach(([sheet, items]) => {
              const existing = this.data[sheet] || [];
              const customAdded = existing.filter((e) => e.id.startsWith('KAS-') && !items.some((i) => i.id === e.id));
              this.data[sheet] = [...customAdded, ...items];
            });
            this.fullDataLoaded = true;
            await erpIndexedStorage.setAsync(LOCAL_STORAGE_KEY, this.data);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('kas_monafasat_data_loaded'));
            }
          }
        }
      } catch {
        // Keep seed dataset if offline or in test environment
      } finally {
        this.loadingPromise = null;
      }
    })();

    return this.loadingPromise;
  }

  private saveToStorage() {
    erpIndexedStorage.setSync(LOCAL_STORAGE_KEY, this.data, { maxLocalStorageBytes: 500_000 });
  }

  public getAllSheets(): string[] {
    return Object.keys(this.data);
  }

  public getSheetTenders(sheetName: string): KasTenderItem[] {
    return this.data[sheetName] || [];
  }

  public getAllTenders(): KasTenderItem[] {
    const all: KasTenderItem[] = [];
    Object.values(this.data).forEach(list => {
      all.push(...list);
    });
    return all;
  }

  public getTendersByCategory(category: SheetCategory): KasTenderItem[] {
    if (category === 'all') {
      return this.getAllTenders();
    }
    const matchingSheetNames = KAS_SHEETS_META.filter(s => s.category === category).map(s => s.name);
    const result: KasTenderItem[] = [];
    matchingSheetNames.forEach(sheetName => {
      if (this.data[sheetName]) {
        result.push(...this.data[sheetName]);
      }
    });
    return result;
  }

  public computeKPIs(items: KasTenderItem[]): KasKPIStats {
    let totalBidValue = 0;
    let totalWinningValue = 0;
    let wonCount = 0;
    let highBidCount = 0;
    let cancelledCount = 0;
    let pendingCount = 0;
    let nonCompliantCount = 0;
    const entityMap: Record<string, { count: number; value: number }> = {};

    items.forEach(item => {
      const bid = Number(item.bidValue) || 0;
      const win = Number(item.winningBidValue) || 0;
      totalBidValue += bid;
      totalWinningValue += win;

      const reason = (item.rejectionReason || '').trim();
      const notes = (item.notes || '').trim();
      const statusText = `${reason} ${notes}`;

      if (statusText.includes('تم الترسية') || statusText.includes('معتمد')) {
        wonCount++;
      } else if (statusText.includes('مرتفع')) {
        highBidCount++;
      } else if (statusText.includes('إلغاء') || statusText.includes('الغاء') || statusText.includes('لاغي')) {
        cancelledCount++;
      } else if (statusText.includes('غير مطابق') || statusText.includes('غير مقبول')) {
        nonCompliantCount++;
      } else {
        pendingCount++;
      }

      const entity = item.entity || 'جهة حكومية غير محددة';
      if (!entityMap[entity]) {
        entityMap[entity] = { count: 0, value: 0 };
      }
      entityMap[entity].count++;
      entityMap[entity].value += bid;
    });

    const evaluatedCount = wonCount + highBidCount + nonCompliantCount;
    const winRate = evaluatedCount > 0 ? (wonCount / evaluatedCount) * 100 : 0;
    const avgBidValue = items.length > 0 ? totalBidValue / items.length : 0;

    const topEntities = Object.entries(entityMap)
      .map(([name, stats]) => ({ name, count: stats.count, value: stats.value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return {
      totalTenders: items.length,
      totalBidValue,
      totalWinningValue,
      wonCount,
      highBidCount,
      cancelledCount,
      pendingCount,
      nonCompliantCount,
      winRate: Math.round(winRate * 10) / 10,
      avgBidValue: Math.round(avgBidValue),
      topEntities
    };
  }

  public addTender(sheetName: string, item: Omit<KasTenderItem, 'id'>): KasTenderItem {
    if (!this.data[sheetName]) {
      this.data[sheetName] = [];
    }
    const newItem: KasTenderItem = {
      ...item,
      id: `KAS-${sheetName.replace(/\s+/g, '_')}-${Date.now()}`
    };
    this.data[sheetName].unshift(newItem);
    this.saveToStorage();
    return newItem;
  }

  public updateTender(sheetName: string, id: string, updates: Partial<KasTenderItem>): boolean {
    const list = this.data[sheetName];
    if (!list) return false;
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return false;
    list[index] = { ...list[index], ...updates };
    this.saveToStorage();
    return true;
  }

  public deleteTender(sheetName: string, id: string): boolean {
    const list = this.data[sheetName];
    if (!list) return false;
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return false;
    list.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  public exportSheetToXLSX(sheetName: string, items?: KasTenderItem[]) {
    const dataToExport = items || this.data[sheetName] || [];
    const headers = [
      'العدد', 'اسم المؤسسة', 'كود المنافسة', 'اسم المنافسة', 'الرقم المرجعى', 'رقم المنافسة',
      'الجهة', 'اسم المسؤول', 'رقم المسؤول', 'ايميل المسؤول', 'تاريخ بدء المنافسه', 'تاريخ إنتهاء التقديم',
      'المدة لمنافسه', 'مدة التنفيذ', 'قيمة المنافسة', 'مبلغ الحاصل على المنافسة', 'ملاحظات', 'سبب عدم الترسية',
      'عدد المتقدمين', 'جدول الكميات', 'إعداد الملف', 'الترسية', 'المراجعة', 'تسليم العينة', 'الاعتمادات',
      'موجودة بالمنصة او موجودة ورقيا', 'حالة العقد بالمنصة مرفوع او غير مرفوع', 'شهادة الانجاز', 'اسم المدينة',
      'مدة التوريد', 'بداية التوريد', 'نهاية التوريد', 'التكلفه التقدرية', 'النسبه', 'عينة', 'زيارة'
    ];

    const rows = dataToExport.map(item => [
      item.seq,
      item.company,
      item.tenderCode,
      item.title,
      item.referenceNumber,
      item.tenderNumber,
      item.entity,
      item.managerName,
      item.managerPhone,
      item.managerEmail,
      item.startDate,
      item.deadlineDate,
      item.durationDays,
      item.executionDuration,
      item.bidValue,
      item.winningBidValue,
      item.notes,
      item.rejectionReason,
      item.biddersCount,
      item.boqStatus,
      item.filePrepStatus,
      item.awardingStatus,
      item.reviewStatus,
      item.sampleDeliveryStatus,
      item.approvalsStatus,
      item.platformType,
      item.platformContractStatus,
      item.completionCertStatus,
      item.city,
      item.supplyDurationDays,
      item.supplyStartDate,
      item.supplyEndDate,
      item.estimatedCost,
      item.profitPercentage,
      item.sampleRequired,
      item.siteVisitRequired
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet['!sheetViews'] = [{ rightToLeft: true }];
    worksheet['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 6, 16) }));
    const workbook = XLSX.utils.book_new();
    workbook.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));
    XLSX.writeFile(workbook, `KAS_Monafasat_${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  public exportFullWorkbook() {
    const workbook = XLSX.utils.book_new();
    workbook.Workbook = { Views: [{ RTL: true }] };
    const headers = [
      'العدد', 'اسم المؤسسة', 'كود المنافسة', 'اسم المنافسة', 'الرقم المرجعى', 'رقم المنافسة',
      'الجهة', 'اسم المسؤول', 'رقم المسؤول', 'ايميل المسؤول', 'تاريخ بدء المنافسه', 'تاريخ إنتهاء التقديم',
      'المدة لمنافسه', 'مدة التنفيذ', 'قيمة المنافسة', 'مبلغ الحاصل على المنافسة', 'ملاحظات', 'سبب عدم الترسية',
      'عدد المتقدمين', 'جدول الكميات', 'إعداد الملف', 'الترسية', 'المراجعة', 'تسليم العينة', 'الاعتمادات',
      'موجودة بالمنصة او موجودة ورقيا', 'حالة العقد بالمنصة مرفوع او غير مرفوع', 'شهادة الانجاز', 'اسم المدينة',
      'مدة التوريد', 'بداية التوريد', 'نهاية التوريد', 'التكلفه التقدرية', 'النسبه', 'عينة', 'زيارة'
    ];

    Object.entries(this.data).forEach(([sheetName, items]) => {
      const rows = items.map(item => [
        item.seq, item.company, item.tenderCode, item.title, item.referenceNumber, item.tenderNumber,
        item.entity, item.managerName, item.managerPhone, item.managerEmail, item.startDate, item.deadlineDate,
        item.durationDays, item.executionDuration, item.bidValue, item.winningBidValue, item.notes, item.rejectionReason,
        item.biddersCount, item.boqStatus, item.filePrepStatus, item.awardingStatus, item.reviewStatus, item.sampleDeliveryStatus,
        item.approvalsStatus, item.platformType, item.platformContractStatus, item.completionCertStatus, item.city,
        item.supplyDurationDays, item.supplyStartDate, item.supplyEndDate, item.estimatedCost, item.profitPercentage,
        item.sampleRequired, item.siteVisitRequired
      ]);
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      worksheet['!sheetViews'] = [{ rightToLeft: true }];
      worksheet['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 6, 16) }));
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));
    });

    XLSX.writeFile(workbook, `KAS_Monafasat_Master_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  public async importFromXLSX(file: File): Promise<{ success: boolean; importedCount: number; message: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          let importedCount = 0;

          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const jsonRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            
            let headerRowIdx = 0;
            for (let i = 0; i < Math.min(10, jsonRows.length); i++) {
              const r = jsonRows[i] || [];
              if (r.filter(c => c !== '').length > 5) {
                headerRowIdx = i;
                break;
              }
            }

            const list: KasTenderItem[] = [];
            for (let r = headerRowIdx + 1; r < jsonRows.length; r++) {
              const row = jsonRows[r];
              if (!row) continue;
              const title = (row[3] || row[2] || '').toString().trim();
              if (!title || title.length < 3 || title === 'اسم المنافسة') continue;

              const item: KasTenderItem = {
                id: `KAS-${sheetName.replace(/\s+/g, '_')}-${Date.now()}-${r}`,
                sheetName,
                seq: row[0] || (list.length + 1),
                company: (row[1] || '').toString().trim() || sheetName,
                tenderCode: (row[2] || '').toString().trim(),
                title,
                referenceNumber: (row[4] || row[5] || '').toString().trim(),
                tenderNumber: (row[5] || '').toString().trim(),
                entity: (row[6] || row[7] || '').toString().trim(),
                managerName: (row[7] !== row[6] ? row[7] : '') || '',
                managerPhone: (row[8] || '').toString().trim(),
                managerEmail: (row[9] || '').toString().trim(),
                startDate: (row[10] || '').toString().trim(),
                deadlineDate: (row[11] || '').toString().trim(),
                durationDays: row[12] || '',
                executionDuration: (row[13] || '').toString().trim(),
                bidValue: parseFloat((row[14] || '').toString().replace(/[^0-9.]/g, '')) || 0,
                winningBidValue: parseFloat((row[15] || '').toString().replace(/[^0-9.]/g, '')) || 0,
                notes: (row[16] || '').toString().trim(),
                rejectionReason: (row[17] || '').toString().trim(),
                biddersCount: parseInt(row[18]) || 0,
                boqStatus: (row[19] || '').toString().trim(),
                filePrepStatus: (row[20] || '').toString().trim(),
                awardingStatus: (row[21] || '').toString().trim(),
                reviewStatus: (row[22] || '').toString().trim(),
                sampleDeliveryStatus: (row[23] || '').toString().trim(),
                approvalsStatus: (row[24] || '').toString().trim(),
                platformType: (row[25] || '').toString().trim() || 'منصة اعتماد',
                platformContractStatus: (row[26] || '').toString().trim(),
                completionCertStatus: (row[27] || '').toString().trim(),
                city: (row[28] || '').toString().trim(),
                supplyDurationDays: (row[29] || '').toString().trim(),
                supplyStartDate: (row[30] || '').toString().trim(),
                supplyEndDate: (row[31] || '').toString().trim(),
                estimatedCost: parseFloat((row[32] || '').toString().replace(/[^0-9.]/g, '')) || 0,
                profitPercentage: parseFloat((row[33] || '').toString().replace(/[^0-9.]/g, '')) || 0,
                sampleRequired: (row[34] || '').toString().trim() || 'لا',
                siteVisitRequired: (row[35] || '').toString().trim() || 'لا',
              };
              list.push(item);
              importedCount++;
            }

            if (list.length > 0) {
              this.data[sheetName] = list;
            }
          });

          this.saveToStorage();
          resolve({
            success: true,
            importedCount,
            message: `تم استيراد ${importedCount} منافسة بنجاح عبر ${workbook.SheetNames.length} شيت.`
          });
        } catch (err: any) {
          resolve({
            success: false,
            importedCount: 0,
            message: `فشل استيراد الملف: ${err.message}`
          });
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }
}

export const kasMonafasatService = new KasMonafasatService();
