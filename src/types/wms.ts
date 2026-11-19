/**
 * KAS Enterprise Warehouse & Inventory Management System (WMS) Domain Types
 * Built to SAP EWM / Odoo 18 Inventory / NetSuite WMS standards
 * Scoped exclusively to KAS Trade (Hatem Salman & Ahmed Gamal + Executive/Director Oversight)
 */

export type WmsWarehouseType = 'MAIN' | 'TENDERS' | 'SAMPLES' | 'QUARANTINE' | 'PROJECT';

export type WmsTrackingMode = 'NONE' | 'SERIAL' | 'LOT_EXPIRY';

export type WmsValuationMethod = 'AVCO' | 'FIFO';

export type WmsCostingMode = 'optional' | 'mandatory';

export type WmsVoucherType = 'GRN' | 'GIN' | 'SRN' | 'STR' | 'ADJ' | 'SAMPLE';

export type WmsVoucherStatus = 'DRAFT' | 'POSTED' | 'REVERSED';

export type WmsConditionStatus = 'سليم' | 'يحتاج صيانة' | 'تالف';

export type WmsAbcClass = 'A' | 'B' | 'C';

export type WmsIssuePurpose =
  | 'تشغيل مكاتب'
  | 'صيانة سكن وإيواء'
  | 'تجهيز مكتب جديد'
  | 'توريد منافسة حكومية'
  | 'عهدة شخصية'
  | 'تجارة وشحنات أمازون'
  | 'ضيافة وبوفيه'
  | 'مستهلكات يومية (حجارة/مكتبية)'
  | 'عينات تجارية';

export interface WmsWarehouse {
  id: string;
  company_id: 'KAS';
  code: string;
  nameAr: string;
  nameEn: string;
  warehouseType: WmsWarehouseType;
  branch: string;
  managerName: string;
  operatorName: string;
  zones: string[];
  isActive: boolean;
}

export interface WmsCategory {
  id: string;
  company_id: 'KAS';
  code: string;
  nameAr: string;
  nameEn: string;
  defaultTrackingMode: WmsTrackingMode;
  defaultCustodyEligible: boolean;
  defaultFastConsumable: boolean;
  glInventoryAccount: string;
  glExpenseAccount: string;
}

export interface WmsUomConversion {
  uomName: string;
  factorToBase: number;
}

export type WmsMediaTag =
  | 'صورة الصنف'
  | 'صورة الفاتورة'
  | 'سند استلام/تسليم'
  | 'إثبات مرتجع/تلف'
  | 'فيديو/وسائط';

export interface WmsMediaAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  caption?: string;
  tag: WmsMediaTag;
  uploadedBy: string;
  uploadedAt: string;
}

export interface WmsItem {
  id: string;
  company_id: 'KAS';
  sku: string;
  barcode: string;
  nameAr: string;
  nameEn?: string;
  categoryId: string;
  baseUom: string;
  uomConversions: WmsUomConversion[];
  trackingMode: WmsTrackingMode;
  valuationMethod: WmsValuationMethod;
  avgUnitCost: number;
  lastPurchaseCost: number;
  minQty: number;
  reorderPoint: number;
  maxQty: number;
  defaultWarehouseId: string;
  defaultLocationCode: string;
  isCustodyEligible: boolean;
  isFastConsumable: boolean;
  isSampleItem: boolean;
  abcClass: WmsAbcClass;
  status: 'نشط' | 'موقوف';
  notes?: string;
  attachments?: WmsMediaAttachment[];
  createdAt: string;
}

export interface WmsStockQuant {
  id: string;
  company_id: 'KAS';
  itemId: string;
  warehouseId: string;
  locationCode: string;
  onHandQty: number;
  reservedQty: number;
  updatedAt: string;
}

export interface WmsVoucherLine {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  enteredQty: number;
  enteredUom: string;
  uomFactor: number;
  baseQty: number;
  unitCost: number;
  totalCost: number;
  serialNumbers?: string[];
  lotNumber?: string;
  expiryDate?: string;
  conditionStatus?: WmsConditionStatus;
  custodyId?: string;
  notes?: string;
}

export interface WmsStockVoucher {
  id: string;
  company_id: 'KAS';
  voucherNo: string;
  voucherType: WmsVoucherType;
  status: WmsVoucherStatus;
  voucherDate: string; // ISO YYYY-MM-DD
  warehouseId: string;
  targetWarehouseId?: string;
  issuePurpose?: WmsIssuePurpose;
  beneficiaryEntity?: string;
  costCenterCode?: string;
  roomOrSite?: string;
  recipientEmployeeId?: string;
  recipientName?: string;
  supplierName?: string;
  poOrTrackingNo?: string;
  tenderRef?: string;
  referenceVoucherNo?: string;
  lines: WmsVoucherLine[];
  totalQtyBase: number;
  totalValue: number;
  journalEntryId?: string;
  handoverSigned: boolean;
  handoverSignedAt?: string;
  createdByEmail: string;
  createdByName: string;
  postedByEmail?: string;
  postedByName?: string;
  postedAt?: string;
  reversedByName?: string;
  reversedAt?: string;
  notes?: string;
  attachments?: WmsMediaAttachment[];
  migratedFromExcel?: boolean;
  excelRowSeq?: number;
  dateAutoCorrected?: boolean;
  originalExcelDate?: string;
  createdAt: string;
}

export interface WmsSerialLotRecord {
  id: string;
  company_id: 'KAS';
  itemId: string;
  sku: string;
  itemName: string;
  serialNumber?: string;
  lotNumber?: string;
  expiryDate?: string;
  warehouseId: string;
  status: 'IN_STOCK' | 'ISSUED' | 'IN_CUSTODY' | 'MAINTENANCE' | 'SCRAPPED';
  assignedToName?: string;
  assignedToEntity?: string;
  custodyId?: string;
  receivedDate: string;
  issuedDate?: string;
  notes?: string;
}

export interface WmsSampleLoan {
  id: string;
  company_id: 'KAS';
  loanNo: string;
  itemId: string;
  sku: string;
  itemName: string;
  qty: number;
  uom: string;
  issuedTo: string;
  projectOrTender: string;
  issueDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  status: 'معارة' | 'مرتجعة' | 'متأخرة' | 'مستهلكة';
  notes?: string;
  createdBy: string;
}

export interface WmsFastConsumableLog {
  id: string;
  company_id: 'KAS';
  date: string;
  recipientName: string;
  departmentOrOffice: string;
  itemId: string;
  sku: string;
  itemName: string;
  batterySize?: 'حجر صغير (AAA)' | 'حجر كبير (AA)' | 'أخرى';
  qty: number;
  uom: string;
  issuedByName: string;
  notes?: string;
}

export interface WmsCycleCountLine {
  itemId: string;
  sku: string;
  itemName: string;
  baseUom: string;
  systemQty: number;
  countedQty: number | null;
  varianceQty: number;
  unitCost: number;
  varianceValue: number;
  notes?: string;
}

export interface WmsCycleCountSession {
  id: string;
  company_id: 'KAS';
  countNo: string;
  warehouseId: string;
  countDate: string;
  blindMode: boolean;
  status: 'قيد الجرد' | 'معتمد ومُرحّل';
  countedBy: string;
  approvedBy?: string;
  postedAt?: string;
  adjustmentVoucherNo?: string;
  lines: WmsCycleCountLine[];
  notes?: string;
}

export interface WmsTenderReservation {
  id: string;
  company_id: 'KAS';
  tenderRef: string;
  tenderTitle: string;
  itemId: string;
  sku: string;
  itemName: string;
  warehouseId: string;
  reservedQty: number;
  status: 'محجوز' | 'تم الصرف' | 'ملغى';
  reservedBy: string;
  reservedAt: string;
  notes?: string;
}

export interface WmsDiscrepancyItem {
  id: string;
  severity: 'عالي' | 'متوسط' | 'تنبيه';
  category: 'عجز رصيد دفتري' | 'تاريخ مكسور مصحّح' | 'وحدة قياس مركّبة' | 'صرف بدون وارد مقابل' | 'توحيد اسم صنف';
  excelRef: string;
  itemId?: string;
  sku?: string;
  itemName: string;
  summary: string;
  recommendedAction: string;
  systemInQty?: number;
  systemOutQty?: number;
  systemReturnQty?: number;
  netGapQty?: number;
  status: 'بانتظار المراجعة' | 'تمت التسوية' | 'تم التأكيد';
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface WmsAuditLog {
  id: string;
  company_id: 'KAS';
  action:
    | 'ITEM_CREATED'
    | 'ITEM_UPDATED'
    | 'ITEM_DELETED'
    | 'ITEM_RESTORED'
    | 'VOUCHER_POSTED'
    | 'VOUCHER_UPDATED'
    | 'VOUCHER_DELETED'
    | 'VOUCHER_RESTORED'
    | 'VOUCHER_DRAFTED'
    | 'VOUCHER_REVERSED'
    | 'MEDIA_ADDED'
    | 'MEDIA_REMOVED'
    | 'UNDO_EXECUTED'
    | 'REDO_EXECUTED'
    | 'FAST_ISSUE'
    | 'CUSTODY_BRIDGED'
    | 'SAMPLE_LOANED'
    | 'SAMPLE_RETURNED'
    | 'CYCLE_COUNT_POSTED'
    | 'TENDER_RESERVED'
    | 'DISCREPANCY_RESOLVED'
    | 'SETTINGS_UPDATED'
    | 'GL_POSTED';
  entityType: string;
  entityId: string;
  entityLabel: string;
  actorEmail: string;
  actorName: string;
  details: string;
  timestamp: string;
}

export interface WmsRecycleBinEntry {
  id: string;
  entityType: 'ITEM' | 'VOUCHER' | 'FAST_CONSUMABLE';
  entityId: string;
  label: string;
  deletedBy: string;
  deletedAt: string;
  reason?: string;
  payload: unknown;
}

export interface WmsSettings {
  company_id: 'KAS';
  costingMode: WmsCostingMode; // 'optional' | 'mandatory'
  valuationMethod: WmsValuationMethod; // 'AVCO' | 'FIFO'
  autoPostGlWhenCostPresent: boolean;
  allowNegativeStock: boolean;
  autoCustodyPrompt: boolean;
  updatedBy: string;
  updatedAt: string;
}

export interface WmsStockCardEntry {
  date: string;
  voucherNo: string;
  voucherType: WmsVoucherType;
  warehouseId: string;
  beneficiaryOrSupplier: string;
  recipientName: string;
  inQty: number;
  outQty: number;
  runningBalance: number;
  unitCost: number;
  totalValue: number;
  actorName: string;
  notes?: string;
}

export interface WmsBeneficiaryOption {
  id: string;
  nameAr: string;
  costCenterCode: string;
  entityGroup: 'مكاتب الشركات' | 'مراكز السكن والإيواء' | 'تجهيزات ومرافق' | 'منافسات وتجارة خارجية';
}
