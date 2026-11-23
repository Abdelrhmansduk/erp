/**
 * KAS Enterprise Warehouse & Inventory Management System (WMS) Domain Types
 * Built to SAP EWM / Odoo 18 Inventory / NetSuite WMS standards
 * Scoped exclusively to KAS Trade (Hatem Salman & Ahmed Gamal + Executive/Director Oversight)
 */

export type WmsCompanyId = 'KAS' | 'SAF' | 'YAQ' | 'TOP' | 'DAR';

export type WmsWarehouseType = 'MAIN' | 'TENDERS' | 'SAMPLES' | 'QUARANTINE' | 'PROJECT';

export type WmsTrackingMode = 'NONE' | 'SERIAL' | 'LOT_EXPIRY';

export type WmsValuationMethod = 'AVCO' | 'FIFO';

export type WmsCostingMode = 'optional' | 'mandatory';

export type WmsVoucherType = 'GRN' | 'GIN' | 'SRN' | 'STR' | 'ADJ' | 'SAMPLE' | 'RTV' | 'SCRAP';

export type WmsVoucherStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'IN_TRANSIT' | 'POSTED' | 'REVERSED';

export type WmsConditionStatus = 'سليم' | 'يحتاج صيانة' | 'تالف';

export type WmsAbcClass = 'A' | 'B' | 'C';

export type WmsIssuePurpose =
  | 'تشغيل مكاتب'
  | 'صيانة سكن وإيواء'
  | 'تجهيز مكتب جديد'
  | 'توريد منافسة حكومية'
  | 'عهدة شخصية'
  | 'تجارة وشحنات أمازون'
  | 'صرف قطاع تجاري / معرض'
  | 'ضيافة وبوفيه'
  | 'مستهلكات يومية (حجارة/مكتبية)'
  | 'عينات تجارية'
  | 'إرجاع لمورد (RTV)'
  | 'إتلاف وتكهين';

export interface WmsWarehouse {
  id: string;
  company_id: WmsCompanyId;
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
  company_id: WmsCompanyId;
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
  storagePath?: string;
  storageUrl?: string;
  caption?: string;
  tag: WmsMediaTag;
  uploadedBy: string;
  uploadedAt: string;
}

export interface WmsItem {
  id: string;
  company_id: WmsCompanyId;
  sku: string;
  barcode: string;
  nameAr: string;
  nameEn?: string;
  categoryId: string;
  itemType?: string;
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
  company_id: WmsCompanyId;
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
  itemType?: string;
  enteredQty: number;
  enteredUom: string;
  uomFactor: number;
  baseQty: number;
  unitCost: number;
  totalCost: number;
  locationCode?: string;
  serialNumbers?: string[];
  lotNumber?: string;
  expiryDate?: string;
  conditionStatus?: WmsConditionStatus;
  custodyId?: string;
  notes?: string;
}

export interface WmsStockVoucher {
  id: string;
  company_id: WmsCompanyId;
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
  handoverSignatureDataUrl?: string;
  handoverSignerName?: string;
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
  company_id: WmsCompanyId;
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
  company_id: WmsCompanyId;
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
  company_id: WmsCompanyId;
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
  company_id: WmsCompanyId;
  countNo: string;
  warehouseId: string;
  countDate: string;
  blindMode: boolean;
  scope?: 'ALL' | 'ABC_A' | 'ABC_B' | 'ABC_C' | 'ZONE';
  zoneFilter?: string;
  status: 'قيد الجرد' | 'بانتظار الاعتماد' | 'معتمد ومُرحّل';
  countedBy: string;
  approvedBy?: string;
  postedAt?: string;
  adjustmentVoucherNo?: string;
  lines: WmsCycleCountLine[];
  notes?: string;
}

export interface WmsTenderReservation {
  id: string;
  company_id: WmsCompanyId;
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
  company_id: WmsCompanyId;
  action:
    | 'ITEM_CREATED'
    | 'CATEGORY_CREATED'
    | 'WAREHOUSE_CREATED'
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
    | 'GL_POSTED'
    | 'LANDED_COST_APPLIED'
    | 'QC_INSPECTED'
    | 'TRANSFER_DISPATCHED'
    | 'TRANSFER_RECEIVED'
    | 'APPROVAL_REQUESTED'
    | 'APPROVAL_DECIDED'
    | 'KIT_EXPLODED'
    | 'PO_CREATED'
    | 'PO_PARTIAL_GRN'
    | 'INVOICE_3WAY_MATCHED'
    | 'RTV_DEBIT_NOTE'
    | 'SCRAP_POSTED';
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

export interface WmsMaterialRequisition {
  id: string;
  company_id: WmsCompanyId;
  reqNo: string;
  requestDate: string;
  requestedBy: string;
  beneficiaryEntity: string;
  costCenterCode: string;
  roomOrSite?: string;
  priority: 'عاجل' | 'عادي';
  status: 'جديد' | 'تم الصرف' | 'مرفوض';
  lines: Array<{
    itemId: string;
    sku: string;
    itemName: string;
    requestedQty: number;
    uom: string;
  }>;
  convertedVoucherNo?: string;
  notes?: string;
  processedBy?: string;
  processedAt?: string;
}

export interface WmsPurchaseRequest {
  id: string;
  company_id: WmsCompanyId;
  prNo: string;
  createdDate: string;
  itemId: string;
  sku: string;
  itemName: string;
  currentAvailableQty: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  uom: string;
  estimatedUnitCost: number;
  assignedBuyer: string;
  preferredSupplier?: string;
  status: 'مفتوح للمشتريات' | 'قيد التوريد' | 'تم الاستلام (GRN)';
  receivedVoucherNo?: string;
  notes?: string;
}

export interface WmsMaintenanceLog {
  id: string;
  date: string;
  issue: string;
  vendorOrTech: string;
  cost: number;
  status: 'مكتمل' | 'قيد الإصلاح';
}

export interface WmsWarrantyRecord {
  id: string;
  company_id: WmsCompanyId;
  itemId?: string;
  sku: string;
  assetName: string;
  serialNumber: string;
  locationOrCustodian: string;
  vendorName: string;
  purchaseDate: string;
  warrantyEndDate: string;
  status: 'ساري' | 'قريب الانتهاء' | 'منتهي' | 'تحت الصيانة';
  maintenanceLogs: WmsMaintenanceLog[];
  notes?: string;
}

export interface WmsSettings {
  company_id: WmsCompanyId;
  costingMode: WmsCostingMode; // 'optional' | 'mandatory'
  valuationMethod: WmsValuationMethod; // 'AVCO' | 'FIFO'
  autoPostGlWhenCostPresent: boolean;
  allowNegativeStock: boolean;
  autoCustodyPrompt: boolean;
  strictImmutablePostedVouchers?: boolean;
  enforceFefo?: boolean;
  blockExpiredLots?: boolean;
  requireQcOnGrn?: boolean;
  enableInTransitTransfers?: boolean;
  approvalThresholdSar?: number;
  cycleCountVarianceApprovalPct?: number;
  enforceMakerChecker?: boolean;
  defaultGlInventoryAccount?: string;
  defaultGlExpenseAccount?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface WmsCostLayer {
  id: string;
  company_id: WmsCompanyId;
  itemId: string;
  warehouseId: string;
  voucherId: string;
  voucherNo: string;
  receivedDate: string;
  originalQty: number;
  remainingQty: number;
  unitCost: number;
  landedCostPerUnit: number;
  createdAt: string;
}

export interface WmsLandedCostCharge {
  chargeType: 'شحن ونقل' | 'رسوم جمركية' | 'تخليص جمركي' | 'تأمين بضائع' | 'أخرى';
  description: string;
  amount: number;
}

export interface WmsLandedCostRecord {
  id: string;
  company_id: WmsCompanyId;
  voucherId: string;
  voucherNo: string;
  allocationMethod: 'BY_VALUE' | 'BY_QTY';
  totalCharge: number;
  charges: WmsLandedCostCharge[];
  journalEntryId?: string;
  allocatedBy: string;
  createdAt: string;
}

export interface WmsBinLotQuant {
  id: string;
  company_id: WmsCompanyId;
  itemId: string;
  warehouseId: string;
  locationCode: string;
  lotNumber: string;
  expiryDate?: string;
  qcStatus: 'APPROVED' | 'PENDING_QC' | 'QUARANTINE';
  onHandQty: number;
  reservedQty: number;
  inTransitQty: number;
  updatedAt: string;
}

export interface WmsQcInspection {
  id: string;
  company_id: WmsCompanyId;
  inspectionNo: string;
  grnVoucherId: string;
  grnVoucherNo: string;
  itemId: string;
  sku: string;
  itemName: string;
  targetWarehouseId: string;
  lotNumber?: string;
  expiryDate?: string;
  receivedQty: number;
  approvedQty: number;
  rejectedQty: number;
  status: 'PENDING_QC' | 'COMPLETED';
  inspectedBy?: string;
  inspectedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface WmsInTransitTransfer {
  id: string;
  company_id: WmsCompanyId;
  transferNo: string;
  voucherId: string;
  voucherNo: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  itemId: string;
  sku: string;
  itemName: string;
  dispatchedQty: number;
  receivedQty: number;
  varianceQty: number;
  status: 'IN_TRANSIT' | 'RECEIVED' | 'PARTIAL_VARIANCE';
  dispatchedBy: string;
  dispatchedAt: string;
  receivedBy?: string;
  receivedAt?: string;
  notes?: string;
}

export interface WmsApprovalRequest {
  id: string;
  company_id: WmsCompanyId;
  requestNo: string;
  requestType: 'HIGH_VALUE_VOUCHER' | 'CYCLE_COUNT_VARIANCE' | 'SCRAP_WRITEOFF';
  entityId: string;
  entityLabel: string;
  amountSar: number;
  variancePct?: number;
  requestedByEmail: string;
  requestedByName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  checkerEmail?: string;
  checkerName?: string;
  decidedAt?: string;
  reason?: string;
  createdAt: string;
}

export interface WmsKitBom {
  id: string;
  company_id: WmsCompanyId;
  kitCode: string;
  kitNameAr: string;
  defaultWarehouseId: string;
  components: Array<{
    itemId: string;
    sku: string;
    itemName: string;
    qtyPerKit: number;
    uom: string;
  }>;
  createdBy: string;
  createdAt: string;
}

export interface WmsVendor {
  id: string;
  company_id: WmsCompanyId;
  vendorCode: string;
  nameAr: string;
  nameEn?: string;
  vatNumber: string;
  crNumber?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  leadTimeDays: number;
  paymentTerms: string;
  rating: number;
  status: 'معتمد' | 'موقوف';
  createdAt: string;
}

export interface WmsPurchaseOrderLine {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  uom: string;
  orderedQty: number;
  receivedQty: number;
  backorderQty: number;
  unitCost: number;
  lineTotal: number;
}

export interface WmsPurchaseOrder {
  id: string;
  company_id: WmsCompanyId;
  poNo: string;
  orderDate: string;
  expectedDate: string;
  vendorId: string;
  vendorName: string;
  warehouseId: string;
  prRef?: string;
  tenderRef?: string;
  status: 'مفتوح' | 'استلام جزئي' | 'مكتمل الاستلام' | 'ملغى';
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  linkedGrnVoucherNos: string[];
  lines: WmsPurchaseOrderLine[];
  createdBy: string;
  notes?: string;
  createdAt: string;
}

export interface WmsSupplierInvoiceMatch {
  id: string;
  company_id: WmsCompanyId;
  internalRef: string;
  vendorInvoiceNo: string;
  invoiceDate: string;
  poId: string;
  poNo: string;
  vendorId: string;
  vendorName: string;
  grnVoucherIds: string[];
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  variancePct: number;
  matchStatus:
    | 'مطابق ثلاثياً ومُرحّل (Matched)'
    | 'معلق للتباين (Variance Hold)'
    | 'معتمد استثنائياً ومُرحّل';
  lines: Array<{
    itemId: string;
    sku: string;
    itemName: string;
    poUnitCost: number;
    grnReceivedQty: number;
    invoicedQty: number;
    invoicedUnitCost: number;
    lineSubtotal: number;
    varianceNote?: string;
  }>;
  journalEntryId?: string;
  createdByEmail: string;
  createdByName: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface WmsRtvDebitNote {
  id: string;
  company_id: WmsCompanyId;
  debitNoteNo: string;
  rtvDate: string;
  vendorId: string;
  vendorName: string;
  poId?: string;
  warehouseId: string;
  voucherNo: string;
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  journalEntryId?: string;
  lines: Array<{
    itemId: string;
    sku: string;
    itemName: string;
    qty: number;
    unitCost: number;
    lineTotal: number;
    reason: string;
  }>;
  createdBy: string;
  notes?: string;
  createdAt: string;
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
