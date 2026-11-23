/**
 * Complete Cleaned & Structured Migration Dataset from the Company's 116-Row Warehouse Excel Sheet
 * Includes:
 *  - 5 Warehouses & Zones
 *  - 6 Enterprise Categories & 18 Cost-Center Beneficiaries
 *  - All 116 Incoming (الوارد), 111 Outgoing (الصادر), 7 Return (المرتجع), and 6 Battery Ledger rows
 *  - Automatic spelling unification, date repair with audit flags, Multi-UoM conversion,
 *    Beneficiary/Cost-Center extraction, and an Opening Reconciliation Discrepancies Queue.
 */
import {
  WmsBeneficiaryOption,
  WmsCategory,
  WmsDiscrepancyItem,
  WmsFastConsumableLog,
  WmsIssuePurpose,
  WmsItem,
  WmsSampleLoan,
  WmsSerialLotRecord,
  WmsStockQuant,
  WmsStockVoucher,
  WmsTrackingMode,
  WmsUomConversion,
  WmsWarehouse,
} from '../../types/wms';

export const WMS_WAREHOUSES: WmsWarehouse[] = [
  {
    id: 'WH-MAIN',
    company_id: 'KAS',
    code: 'WH-RUH-01',
    nameAr: 'المستودع المركزي — الرياض',
    nameEn: 'Central Warehouse - Riyadh',
    warehouseType: 'MAIN',
    branch: 'المقر الرئيسي لشركة كاس للتجارة - الرياض',
    managerName: 'حاتم سلمان ابوالذهب سلمان',
    operatorName: 'حاتم سلمان ابوالذهب سلمان',
    zones: ['Z-IT (تقنية وأصول)', 'Z-MEP (كهرباء وسباكة)', 'Z-FUR (أثاث وأجهزة)', 'Z-CON (مستهلكات سريعة)'],
    isActive: true,
  },
  {
    id: 'WH-TND',
    company_id: 'KAS',
    code: 'WH-KAS-TND',
    nameAr: 'مستودع المنافسات وشحنات أمازون والتجارة',
    nameEn: 'Tenders, Medical & Amazon Commercial Warehouse',
    warehouseType: 'TENDERS',
    branch: 'قطاع التجارة والمنافسات - الرياض',
    managerName: 'حاتم سلمان ابوالذهب سلمان',
    operatorName: 'حاتم سلمان ابوالذهب سلمان',
    zones: ['Z-MED (توريدات طبية وحكومية)', 'Z-AMZ (شحنات أمازون)', 'Z-PKG (تغليف وتجارة)'],
    isActive: true,
  },
  {
    id: 'WH-NEW',
    company_id: 'KAS',
    code: 'WH-PRJ-FIT',
    nameAr: 'مستودع تجهيزات المكاتب والسكن',
    nameEn: 'Office Fit-out & Housing Maintenance Store',
    warehouseType: 'PROJECT',
    branch: 'المكتب الجديد ومراكز الإيواء - الرياض',
    managerName: 'حاتم سلمان ابوالذهب سلمان',
    operatorName: 'حاتم سلمان ابوالذهب سلمان',
    zones: ['Z-OFF (أغراض المكتب الجديد)', 'Z-HSG (مستلزمات السكن)'],
    isActive: true,
  },
  {
    id: 'WH-SMP',
    company_id: 'KAS',
    code: 'WH-SMP-VLT',
    nameAr: 'خزانة العينات التجارية والمنافسات',
    nameEn: 'Commercial & Tender Samples Vault',
    warehouseType: 'SAMPLES',
    branch: 'إدارة المنافسات — كاس',
    managerName: 'حاتم سلمان ابوالذهب سلمان',
    operatorName: 'حاتم سلمان ابوالذهب سلمان',
    zones: ['Z-SMP (خزانة العينات)'],
    isActive: true,
  },
  {
    id: 'WH-RET',
    company_id: 'KAS',
    code: 'WH-RMA-QRT',
    nameAr: 'منطقة المرتجعات والفحص والحجر (RMA)',
    nameEn: 'Returns Inspection & Quarantine Zone',
    warehouseType: 'QUARANTINE',
    branch: 'المستودع المركزي - الرياض',
    managerName: 'حاتم سلمان ابوالذهب سلمان',
    operatorName: 'حاتم سلمان ابوالذهب سلمان',
    zones: ['Z-QC (قيد الفحص)', 'Z-DMG (تالف / صيانة)'],
    isActive: true,
  },
];

export const WMS_CATEGORIES: WmsCategory[] = [
  {
    id: 'CAT-IT',
    company_id: 'KAS',
    code: 'IT',
    nameAr: 'الأجهزة التقنية والإلكترونيات والتصوير',
    nameEn: 'IT, Electronics & Photography',
    defaultTrackingMode: 'SERIAL',
    defaultCustodyEligible: true,
    defaultFastConsumable: false,
    glInventoryAccount: '1141',
    glExpenseAccount: '5221',
  },
  {
    id: 'CAT-MEP',
    company_id: 'KAS',
    code: 'MEP',
    nameAr: 'الكهرباء والإنارة والسباكة والصيانة',
    nameEn: 'Electrical, Lighting & Plumbing (MEP)',
    defaultTrackingMode: 'NONE',
    defaultCustodyEligible: false,
    defaultFastConsumable: false,
    glInventoryAccount: '1141',
    glExpenseAccount: '5214',
  },
  {
    id: 'CAT-FUR',
    company_id: 'KAS',
    code: 'FUR',
    nameAr: 'الأثاث والأجهزة الكهربائية وتجهيز السكن',
    nameEn: 'Furniture, Appliances & Housing Fit-out',
    defaultTrackingMode: 'NONE',
    defaultCustodyEligible: true,
    defaultFastConsumable: false,
    glInventoryAccount: '1141',
    glExpenseAccount: '5215',
  },
  {
    id: 'CAT-MED',
    company_id: 'KAS',
    code: 'MED',
    nameAr: 'التوريدات الطبية ومستلزمات المنافسات الحكومية',
    nameEn: 'Medical & Government Tender Supplies',
    defaultTrackingMode: 'LOT_EXPIRY',
    defaultCustodyEligible: false,
    defaultFastConsumable: false,
    glInventoryAccount: '1142',
    glExpenseAccount: '5110',
  },
  {
    id: 'CAT-AMZ',
    company_id: 'KAS',
    code: 'AMZ',
    nameAr: 'شحنات أمازون والبضائع التجارية والتغليف',
    nameEn: 'Amazon E-Commerce & Commercial Goods',
    defaultTrackingMode: 'NONE',
    defaultCustodyEligible: false,
    defaultFastConsumable: false,
    glInventoryAccount: '1142',
    glExpenseAccount: '5112',
  },
  {
    id: 'CAT-CON',
    company_id: 'KAS',
    code: 'CON',
    nameAr: 'المستهلكات اليومية والبطاريات والضيافة',
    nameEn: 'Fast-Moving Consumables, Batteries & Hospitality',
    defaultTrackingMode: 'NONE',
    defaultCustodyEligible: false,
    defaultFastConsumable: true,
    glInventoryAccount: '1141',
    glExpenseAccount: '5218',
  },
];

export const WMS_BENEFICIARIES: WmsBeneficiaryOption[] = [
  { id: 'BEN-KAS', nameAr: 'مكتب التجارة والمنافسات (كاس)', costCenterCode: 'CC-KAS-01', entityGroup: 'مكاتب الشركات' },
  { id: 'BEN-YAQ', nameAr: 'مكتب ياقوت نجد (YAQ)', costCenterCode: 'CC-YAQ-01', entityGroup: 'مكاتب الشركات' },
  { id: 'BEN-TOP', nameAr: 'مكتب توباز (TOP)', costCenterCode: 'CC-TOP-01', entityGroup: 'مكاتب الشركات' },
  { id: 'BEN-DAR', nameAr: 'مكتب دار الرواد (DAR)', costCenterCode: 'CC-DAR-01', entityGroup: 'مكاتب الشركات' },
  { id: 'BEN-SAF', nameAr: 'مكتب السفير الماسي (SAF)', costCenterCode: 'CC-SAF-01', entityGroup: 'مكاتب الشركات' },
  { id: 'BEN-MKT', nameAr: 'مكتب الدعاية والإعلان والتسويق', costCenterCode: 'CC-MKT-01', entityGroup: 'مكاتب الشركات' },
  { id: 'BEN-HR', nameAr: 'مكتب الموارد البشرية (HR)', costCenterCode: 'CC-HR-01', entityGroup: 'مكاتب الشركات' },
  { id: 'BEN-WMD', nameAr: 'مكتب إدارة العاملات', costCenterCode: 'CC-DAR-02', entityGroup: 'مكاتب الشركات' },
  { id: 'BEN-NEW', nameAr: 'تجهيز المكتب الجديد', costCenterCode: 'CC-PRJ-NEW', entityGroup: 'تجهيزات ومرافق' },
  { id: 'BEN-MTG', nameAr: 'صالة الاجتماعات الرئيسية', costCenterCode: 'CC-HQ-MTG', entityGroup: 'تجهيزات ومرافق' },
  { id: 'BEN-BUF', nameAr: 'البوفيه والضيافة (بوفيه أسامة)', costCenterCode: 'CC-HQ-BUF', entityGroup: 'تجهيزات ومرافق' },
  { id: 'BEN-HSW', nameAr: 'سكن العاملات (مركز الإيواء)', costCenterCode: 'CC-SHL-01', entityGroup: 'مراكز السكن والإيواء' },
  { id: 'BEN-HSG', nameAr: 'السكن الجماعي (المكاتب والاستقدام)', costCenterCode: 'CC-SHL-02', entityGroup: 'مراكز السكن والإيواء' },
  { id: 'BEN-BRK', nameAr: 'البركس — سكن السائقين والفنيين', costCenterCode: 'CC-SHL-03', entityGroup: 'مراكز السكن والإيواء' },
  { id: 'BEN-IML', nameAr: 'سكن قطاع الأميال', costCenterCode: 'CC-KAS-IML', entityGroup: 'مراكز السكن والإيواء' },
  { id: 'BEN-EXE', nameAr: 'منزل / مكتب أ. خالد السليم', costCenterCode: 'CC-EXE-01', entityGroup: 'تجهيزات ومرافق' },
  { id: 'BEN-TND', nameAr: 'توريدات المنافسات والجهات الحكومية', costCenterCode: 'CC-KAS-TND', entityGroup: 'منافسات وتجارة خارجية' },
  { id: 'BEN-AMZ', nameAr: 'شحنات أمازون والمبيعات التجارية', costCenterCode: 'CC-KAS-AMZ', entityGroup: 'منافسات وتجارة خارجية' },
];

interface RawRow {
  seq: number;
  rawName: string;
  rawQty: string;
  rawDate: string;
}

// ── Complete 116 Incoming Rows (الوارد) from the user's actual Excel CSV ──
const RAW_INCOMING_ROWS: RawRow[] = [
  { seq: 1, rawName: 'ثلاجه صغيره مني بار مكتب', rawQty: '3 حبة', rawDate: '' },
  { seq: 2, rawName: 'ديب فليزر', rawQty: '1 حبة', rawDate: '' },
  { seq: 3, rawName: 'صلصال بألوان نيون للأطفال', rawQty: '20 درزن', rawDate: '' },
  { seq: 4, rawName: 'جهاز كمبيوتر مكتبي hp', rawQty: '1 حبة', rawDate: '14/06/2026' },
  { seq: 5, rawName: 'جهاز مايكرويف', rawQty: '1 حبة', rawDate: '22/07/2026' },
  { seq: 6, rawName: 'غلايه', rawQty: '1 حبة', rawDate: '22/07/2027' },
  { seq: 7, rawName: 'مكينة تحضير القهوة', rawQty: '1 حبة', rawDate: '22/07/2028' },
  { seq: 8, rawName: 'ثلاجه 12 قدم Toshiba', rawQty: '1 حبة', rawDate: '23/07/2026' },
  { seq: 9, rawName: 'sponge gauze شاش طبي', rawQty: '5 كرتون', rawDate: '2026-02-08' },
  { seq: 10, rawName: 'فرن كهرباء FRONT', rawQty: '1 حبة', rawDate: '2026-10-08' },
  { seq: 11, rawName: 'كرسي مجلس', rawQty: '1 حبة', rawDate: '15/08/2026' },
  { seq: 12, rawName: 'كرسي مجلس', rawQty: '1 حبة', rawDate: '20/08/2026' },
  { seq: 13, rawName: 'شرائح جوال stc', rawQty: '11 شريحة', rawDate: '24/08/2026' },
  { seq: 14, rawName: 'كرتون قهوة القصيم', rawQty: '8 كرتون', rawDate: '2026-05-09' },
  { seq: 15, rawName: 'مكينة كاشير v2', rawQty: '1 حبة', rawDate: '2026-05-09' },
  { seq: 16, rawName: 'مكينة تغليف', rawQty: '1 حبة', rawDate: '2026-05-09' },
  { seq: 17, rawName: 'سله علب قهوة', rawQty: '1 حبة', rawDate: '2026-05-09' },
  { seq: 18, rawName: 'صفائح عسل', rawQty: '2 حبة', rawDate: '2026-05-09' },
  { seq: 19, rawName: 'استيكر منتجات القهوة', rawQty: '2 بكتج', rawDate: '2026-05-09' },
  { seq: 20, rawName: 'بلاستر لاصق لأغراض المستودع', rawQty: '10 حبة', rawDate: '2026-05-09' },
  { seq: 21, rawName: 'صمام مياة ذاوية', rawQty: '20 حبة', rawDate: '2026-10-09' },
  { seq: 22, rawName: 'كشاف خارجي 20 W', rawQty: '10 حبة', rawDate: '2026-10-09' },
  { seq: 23, rawName: 'كشاف خارجي 30 W', rawQty: '5 حبة', rawDate: '2026-10-09' },
  { seq: 24, rawName: 'شطاف مياة', rawQty: '5 حبة', rawDate: '2026-10-09' },
  { seq: 25, rawName: 'مكينة سيفون حمام', rawQty: '3 حبة', rawDate: '2026-10-09' },
  { seq: 26, rawName: 'صمام مياة', rawQty: '1 حبة', rawDate: '2026-10-09' },
  { seq: 27, rawName: 'سيفون حوض مطبخ اتنين مخرج', rawQty: '1 حبة', rawDate: '2026-10-09' },
  { seq: 28, rawName: 'علبة مسمار برمة', rawQty: '1 حبة', rawDate: '2026-10-09' },
  { seq: 29, rawName: 'علبة فلبشر', rawQty: '1 حبة', rawDate: '2026-10-09' },
  { seq: 30, rawName: 'مقبض صمام', rawQty: '1 حبة', rawDate: '2026-10-09' },
  { seq: 31, rawName: 'كرتون اكياس تغليف حراري', rawQty: '17 كرتون', rawDate: '17/09/02026' },
  { seq: 32, rawName: 'علب مشارط طبية', rawQty: '15 حبة', rawDate: '17/09/2026' },
  { seq: 33, rawName: 'كرسي مجلس جلد', rawQty: '1 حبة', rawDate: '20/09/2026' },
  { seq: 34, rawName: 'مفتاح مكيف لسكن الجماعي الاستقدام', rawQty: '1 حبة', rawDate: '20/09/2026' },
  { seq: 35, rawName: 'كرسي مجلس متحرك', rawQty: '1 حبة', rawDate: '21/09/2026' },
  { seq: 36, rawName: 'اطباق حلوه زجاج صغيره', rawQty: '110 حبة', rawDate: '26/09/2026' },
  { seq: 37, rawName: 'اطباق حلوه بلاستك كبيره', rawQty: '30 حبة', rawDate: '26/09/2026' },
  { seq: 38, rawName: 'طبلية بلاستيك لنقل الاوزان', rawQty: '1 حبة', rawDate: '30/09/2026' },
  { seq: 39, rawName: 'علبة حجارة صغير لأجهزة الكمبيوتر', rawQty: '2 علبة', rawDate: '30/09/2026' },
  { seq: 40, rawName: 'علبة حجارة كبيرلأجهزة الكمبيوتر', rawQty: '1 علبة', rawDate: '30/09/2026' },
  { seq: 41, rawName: 'عينة- ريسيفر HUMAX -HD-ACE', rawQty: '1 حبة', rawDate: '2026-03-10' },
  { seq: 42, rawName: 'شريط طبي لضغط الوريد', rawQty: '120 حبة', rawDate: '2026-03-10' },
  { seq: 43, rawName: 'كرتونة العاب مرجيحه بادوات التركيب', rawQty: '1 حبة', rawDate: '2026-03-10' },
  { seq: 44, rawName: 'كرتون جلفزات طبية', rawQty: '60 كرتون', rawDate: '04/10/206' },
  { seq: 45, rawName: 'عربة أطفال صغيرة', rawQty: '15 حبة', rawDate: '2026-04-10' },
  { seq: 46, rawName: 'بيت أطفال متنقل', rawQty: '2 حبة', rawDate: '2026-04-10' },
  { seq: 47, rawName: 'كاميرا Nikon Z8', rawQty: '1 حبة', rawDate: '2026-06-10' },
  { seq: 48, rawName: 'فلاش خاجري للكاميرا Godox V1', rawQty: '1 حبة', rawDate: '2026-06-10' },
  { seq: 49, rawName: 'زوم خارجي للكاميرا Nikon Nikkor', rawQty: '1 حبة', rawDate: '2026-06-10' },
  { seq: 50, rawName: 'سانديسك بطاقة ذاكرة اكستريم برو128جيجابايت', rawQty: '1 حبة', rawDate: '2026-06-10' },
  { seq: 51, rawName: 'جهاز محمول للتحقيق من الهوية عبر السمات الحيويه', rawQty: '3 حبة', rawDate: '2026-08-10' },
  { seq: 52, rawName: 'شريط لاصق..المدرية العامة لمكافحة المخدرات', rawQty: '120 حبة', rawDate: '2026-08-10' },
  { seq: 53, rawName: 'بطانية', rawQty: '2 حبة', rawDate: '2026-08-10' },
  { seq: 54, rawName: 'مفرش سرير', rawQty: '1 حبة', rawDate: '2026-08-10' },
  { seq: 55, rawName: 'مرتبة سرير', rawQty: '1 حبة', rawDate: '2026-08-10' },
  { seq: 56, rawName: 'مخده', rawQty: '2 حبة', rawDate: '2026-08-10' },
  { seq: 57, rawName: 'ليسيفر HUMAX -HD-ACE', rawQty: '12 حبة', rawDate: '2026-10-10' },
  { seq: 58, rawName: 'DVD DRIVE', rawQty: '25 حبة', rawDate: '2026-11-10' },
  { seq: 59, rawName: 'بوتجاز صطحي 4 شعلة', rawQty: '1 حبة', rawDate: '14/10/2026' },
  { seq: 60, rawName: 'عينة كيبل تراي', rawQty: '2 حبة', rawDate: '14/10/2026' },
  { seq: 61, rawName: 'عينة سيخ شانل', rawQty: '1 حبة', rawDate: '14/10/2026' },
  { seq: 62, rawName: 'سخان مياة 50 لتر', rawQty: '1 حبة', rawDate: '15/10/2026' },
  { seq: 63, rawName: 'شحنة امازون ( سيكل أطفال )', rawQty: '1 حبة', rawDate: '19/10/2026' },
  { seq: 64, rawName: 'كرسي مجلس', rawQty: '3 حبة', rawDate: '21/10/206' },
  { seq: 65, rawName: 'شحنة امازون ( سيكل أطفال ) اثنين مقعد و اثنين مقعد واحد', rawQty: '4 حبة', rawDate: '22/10/2026' },
  { seq: 66, rawName: 'كرسي مكتب متحرك', rawQty: '2 حبة', rawDate: '22/10/2026' },
  { seq: 67, rawName: 'اجهزه فلوك', rawQty: '5 حبة', rawDate: '22/102026' },
  { seq: 68, rawName: 'شحنة امازون ( سيكل أطفال )', rawQty: '1 حبة', rawDate: '24/10/2026' },
  { seq: 69, rawName: 'لعبة بيت الفطر', rawQty: '1 حبة', rawDate: '24/10/2026' },
  { seq: 70, rawName: 'بيت التوازن ( 6 قطع )', rawQty: '1 حبة', rawDate: '24/10/2026' },
  { seq: 71, rawName: 'لعبة الخيمة للأطفال', rawQty: '2 حبة', rawDate: '24/10/2026' },
  { seq: 72, rawName: 'لفات تييب للتغليف', rawQty: '12 حبة', rawDate: '24/10/2026' },
  { seq: 73, rawName: 'تيب لاصق لادوات المستودع', rawQty: '2 درزن', rawDate: '24/102026' },
  { seq: 74, rawName: 'كيبل الرياض xlp/pvc', rawQty: '110 متر', rawDate: '25/102026' },
  { seq: 75, rawName: 'كيبل الرياض y/q', rawQty: '110 متر', rawDate: '25/102026' },
  { seq: 76, rawName: 'كيبل تراي 1.5*50*mm100', rawQty: '41 حبة', rawDate: '25/102026' },
  { seq: 77, rawName: 'غطاء كيبل تراي 1.5*50*mm100', rawQty: '41 حبة', rawDate: '25/102026' },
  { seq: 78, rawName: 'توصيلة كيبل تراي 1.5*50*50', rawQty: '80 حبة', rawDate: '25/102026' },
  { seq: 79, rawName: 'وردة + صامولة 8 م', rawQty: '300 حبة', rawDate: '25/102026' },
  { seq: 80, rawName: 'مصمار + ورده + صامولة 6 ملي', rawQty: '600 حبة', rawDate: '25/102026' },
  { seq: 81, rawName: 'كوع كيبل تراي مع الغطاء 1.5*50*mm100', rawQty: '10 حبة', rawDate: '25/102026' },
  { seq: 82, rawName: 'مجري حديد 1.5*41*41', rawQty: '25 حبة', rawDate: '25/102026' },
  { seq: 83, rawName: 'سيخ حديد تتيش 8 ملي سن ناعم 300 *8 m', rawQty: '20 حبة', rawDate: '25/102026' },
  { seq: 84, rawName: 'خابور حديد 8 م', rawQty: '300 حبة', rawDate: '25/102026' },
  { seq: 85, rawName: 'سلك فليكيبل 4*2 ملي مبروم المباني', rawQty: '1 لفة', rawDate: '25/102026' },
  { seq: 86, rawName: 'فيش ثلاثي 13 امبير مع مفتاح بدون لمبة ابيض 70 bl/g', rawQty: '11 حبة', rawDate: '25/102026' },
  { seq: 87, rawName: 'علبة بلاستيك ابيض عميق لطش تيار 7*7 pvc', rawQty: '12 حبة', rawDate: '25/102026' },
  { seq: 88, rawName: 'مجري ديكور 16*16 ملي بلاستيك مع لازق دبل', rawQty: '10 حبة', rawDate: '25/102026' },
  { seq: 89, rawName: 'شطرطون كهرباء ( بلاستير )', rawQty: '5 حبة', rawDate: '25/102026' },
  { seq: 90, rawName: 'كيبل HDMI', rawQty: '10 متر', rawDate: '25/102026' },
  { seq: 91, rawName: 'اقفال ( كالون باب )', rawQty: '14 حبة', rawDate: '25/102026' },
  { seq: 92, rawName: 'شحنة امازون ( سيكل أطفال اثنين مقعد )', rawQty: '1 حبة', rawDate: '31/10/2026' },
  { seq: 93, rawName: 'شحنة امازون ( اطقم صيانة زرديات ومفاتيح )', rawQty: '10 طقم', rawDate: '31/10/2026' },
  { seq: 94, rawName: 'جرل + 2 بونطة تكسير وتخريم', rawQty: '1 حبة', rawDate: '2026-01-11' },
  { seq: 95, rawName: 'مكينة عصاره', rawQty: '4 حبة', rawDate: '2026-02-11' },
  { seq: 96, rawName: 'سبوت لايت 7 سم 30w ( 3000 k )', rawQty: '40 حبة', rawDate: '2026-02-11' },
  { seq: 97, rawName: 'سبوت لايت 20 سم w30 (6500 k)', rawQty: '40 حبة', rawDate: '2026-02-11' },
  { seq: 98, rawName: 'لطش دائري 20 سم w30 ( 6500k )', rawQty: '25 حبة', rawDate: '2026-02-11' },
  { seq: 99, rawName: 'شحنة امازون ( اقطفم مفكات )', rawQty: '10 طقم', rawDate: '2026-03-11' },
  { seq: 100, rawName: 'مجسمات منياكات', rawQty: '2 طقم', rawDate: '04/11/206' },
  { seq: 101, rawName: 'طربيظات حجم صغير', rawQty: '2 حبة', rawDate: '2026-04-11' },
  { seq: 102, rawName: 'مكيف صحراوي HOMIX', rawQty: '7 حبة', rawDate: '2026-09-11' },
  { seq: 103, rawName: 'شحنة امازون ( سيكل أطفال وحد مقعد )', rawQty: '1 حبة', rawDate: '2026-09-11' },
  { seq: 104, rawName: 'لفات سلك داخلي ( أغراض المكتب الجديد )', rawQty: '10 حبة', rawDate: '2026-11-11' },
  { seq: 105, rawName: 'مفتاح سدرا ( أغراض المكتب الجديد )', rawQty: '36 حبة', rawDate: '2026-11-11' },
  { seq: 106, rawName: 'مواصير كهربة ( أغراض المكتب الجديد )', rawQty: '4 لفات', rawDate: '2026-11-11' },
  { seq: 107, rawName: 'شكرتون بلاستر كهربا ( أغراض المكتب الجديد )', rawQty: '4 حبة', rawDate: '2026-11-11' },
  { seq: 108, rawName: 'فيش مفرد مع مفتاح ولمبة ( أغراض المكتب الجديد )', rawQty: '10 حبة', rawDate: '2026-11-11' },
  { seq: 109, rawName: 'علبة باوط داخليه ( أغراض المكتب الجديد )', rawQty: '12 حبة', rawDate: '2026-11-11' },
  { seq: 110, rawName: 'مظلات سيارة', rawQty: '4 حبة', rawDate: '2026-12-11' },
  { seq: 111, rawName: 'شحنة امازون ( سيكل أطفال )', rawQty: '2 حبة', rawDate: '15/11/2026' },
  { seq: 112, rawName: 'ماتور لرفع المياه', rawQty: '1 حبة', rawDate: '16/11/2026' },
  { seq: 113, rawName: 'مبيد حشري', rawQty: '20 حبة', rawDate: '16/11/2026' },
  { seq: 114, rawName: 'فلتر مياه', rawQty: '4 حبة', rawDate: '16/11/2026' },
  { seq: 115, rawName: 'قاروره مياه اتوماتك حق المبرد', rawQty: '4 حبة', rawDate: '16/11/2026' },
  { seq: 116, rawName: 'مبرد مياه', rawQty: '4 حبة', rawDate: '17/11/2026' },
];

// ── Complete 111 Outgoing Rows (الصادر) from the user's actual Excel CSV ──
const RAW_OUTGOING_ROWS: RawRow[] = [
  { seq: 1, rawName: 'جهاز مايكرويف', rawQty: '1 حبة', rawDate: '26/07/2026' },
  { seq: 2, rawName: 'غلايه', rawQty: '1 حبة', rawDate: '26/07/2027' },
  { seq: 3, rawName: 'مكينة تحضير القهوة', rawQty: '1 حبة', rawDate: '26/07/2028' },
  { seq: 4, rawName: 'ثلاجه 12 قدم Toshiba', rawQty: '1 حبة', rawDate: '26/07/2029' },
  { seq: 5, rawName: 'طربيظه استالس طويل ( إلي صالة الأجتماعات )', rawQty: '2 حبة', rawDate: '2026-01-08' },
  { seq: 6, rawName: 'sponge gauze شاش طبي', rawQty: '5 كرتون', rawDate: '2026-03-08' },
  { seq: 7, rawName: 'فناجين للبوفيه', rawQty: '20 حبة', rawDate: '13/08/2026' },
  { seq: 8, rawName: 'ترمس شاي والقهوه', rawQty: '5 حبة', rawDate: '13/08/2026' },
  { seq: 9, rawName: 'كرسي مجلس', rawQty: '1 حبة', rawDate: '18/08/2028' },
  { seq: 10, rawName: 'صنية بلاستك لتقديم الفناجين والقهوه', rawQty: '1 حبة', rawDate: '13/08/2026' },
  { seq: 11, rawName: 'كرسي مجلس', rawQty: '1 حبة', rawDate: '22/08/2026' },
  { seq: 12, rawName: 'جهاز كمبيوتر مكتبي hp', rawQty: '1 حبة', rawDate: '2026-02-08' },
  { seq: 13, rawName: 'كشاف صغير لحمامات السكن DSS LIGHTING', rawQty: '4 حبة', rawDate: '2026-01-09' },
  { seq: 14, rawName: 'كشاف خارجي لسكن العاملات TECH LIGHT', rawQty: '1 حبة', rawDate: '2026-02-09' },
  { seq: 15, rawName: 'كشاف خارجي 20 W', rawQty: '9 حبة', rawDate: '2026-12-09' },
  { seq: 16, rawName: 'شطاف مية', rawQty: '1 حبة', rawDate: '13/09/2026' },
  { seq: 17, rawName: 'مكينة سيفون حمام مكتب ياقوت', rawQty: '1 حبة', rawDate: '14/09/2026' },
  { seq: 18, rawName: 'شطاف مياة مكتب ياقوت', rawQty: '1 حبة', rawDate: '14/09/2026' },
  { seq: 19, rawName: 'مروحة شفاط ( سكن الجماعي )', rawQty: '1 حبة', rawDate: '16/09/2026' },
  { seq: 20, rawName: 'مفتاح كهربة ( سكن الجماعي )', rawQty: '1 حبة', rawDate: '16/09/2026' },
  { seq: 21, rawName: 'صمام مياة', rawQty: '1 حبة', rawDate: '17/09/2026' },
  { seq: 22, rawName: 'كرسي مكتب جلد', rawQty: '1 حبة', rawDate: '20/09/2026' },
  { seq: 23, rawName: 'كرتون تغليف حراري', rawQty: '16 كرتون , 6 بكتج=10ألاف كيس تغليف', rawDate: '22/09/2026' },
  { seq: 24, rawName: 'كشاف داخلي كبير ONE PLUS ( مكتب يا قوت )', rawQty: '3 حبة', rawDate: '24/09/2026' },
  { seq: 25, rawName: 'كشاف داخلي صغيرDSS ( مكتب يا قوت )', rawQty: '4 حبة', rawDate: '24/09/2026' },
  { seq: 26, rawName: 'مفتاح سخان (مكتب توباز )', rawQty: '1 حبة', rawDate: '27/09/2026' },
  { seq: 27, rawName: 'بكتج حافظة أوراق بلاستك', rawQty: '1 حبة', rawDate: '28/09/2026' },
  { seq: 28, rawName: 'كرتون تغليف حراري', rawQty: '16 كرتون , 6 بكتج=10ألاف كيس تغليف', rawDate: '30/09/2026' },
  { seq: 29, rawName: 'كشاف خارجي ATA ( سكن العاملات )', rawQty: '1 حبة', rawDate: '2026-01-10' },
  { seq: 30, rawName: 'سلك انوار ليد سكن الجماعي ( كريم )', rawQty: '1 حبة', rawDate: '2026-02-10' },
  { seq: 31, rawName: 'شريط غطاء سلك خارجي سكن الجماعي ( كريم )', rawQty: '1 حبة', rawDate: '2026-02-10' },
  { seq: 32, rawName: 'شريط طبي لضغط الوريد', rawQty: '120 حبة', rawDate: '2026-04-10' },
  { seq: 33, rawName: 'طبلية بلاستيك لنقل الاوزان', rawQty: '1 حبة', rawDate: '2026-04-10' },
  { seq: 34, rawName: 'شريحة stc ( علي الكهربائي عمال عزم )', rawQty: '1 حبة', rawDate: '2026-04-10' },
  { seq: 35, rawName: 'كرتون مناديل لمنزل أ / خالد', rawQty: '4 كرتون', rawDate: '2026-04-10' },
  { seq: 36, rawName: 'طابعة hb ( مكتب إدارة العاملات )', rawQty: '1 حبة', rawDate: '2026-06-10' },
  { seq: 37, rawName: 'كاميرا Nikon Z8', rawQty: '1 حبة', rawDate: '2026-07-10' },
  { seq: 38, rawName: 'فلاش خاجري للكاميرا Godox V1', rawQty: '1 حبة', rawDate: '2026-07-10' },
  { seq: 39, rawName: 'زوم خارجي للكاميرا Nikon Nikkor', rawQty: '1 حبة', rawDate: '2026-07-10' },
  { seq: 40, rawName: 'سانديسك بطاقة ذاكرة اكستريم برو سعة 128جيجابايت', rawQty: '1 حبة', rawDate: '2026-07-10' },
  { seq: 41, rawName: 'جهاز محمول للتحقيق من الهوية عبر السمات الحيويه', rawQty: '3 حبة', rawDate: '2026-11-10' },
  { seq: 42, rawName: 'شاشة كمبيوتر ( مكتب HR )', rawQty: '1 حبة', rawDate: '2026-11-10' },
  { seq: 43, rawName: 'DVD DRIVE', rawQty: '125 حبة', rawDate: '2026-12-10' },
  { seq: 44, rawName: 'كرتون جلفزات طبية', rawQty: '60 كرتون', rawDate: '2026-12-10' },
  { seq: 45, rawName: 'لاصق المدرية العامة لمكافحة المخدرات 4 كرتون', rawQty: '120 حبة', rawDate: '2026-12-10' },
  { seq: 46, rawName: 'بطانية', rawQty: '2 حبة', rawDate: '2026-12-10' },
  { seq: 47, rawName: 'مفرش سرير', rawQty: '1 حبة', rawDate: '2026-12-10' },
  { seq: 48, rawName: 'مخده', rawQty: '1 حبة', rawDate: '2026-12-10' },
  { seq: 49, rawName: 'مرتبة سرير', rawQty: '1 حبة', rawDate: '2026-12-10' },
  { seq: 50, rawName: 'مفتاح تكييف ( سكن العاملات..غرفة رابيا )', rawQty: '1 حبة', rawDate: '2026-12-10' },
  { seq: 51, rawName: 'قدرة حجم وسط', rawQty: '1 حبة', rawDate: '13/10/2026' },
  { seq: 52, rawName: 'مصفاه استانلس كبير', rawQty: '1 حبة', rawDate: '13/10/2026' },
  { seq: 53, rawName: 'طبق صفرة حافظ للحلوات', rawQty: '1 حبة', rawDate: '13/10/2026' },
  { seq: 54, rawName: 'قدره صغير', rawQty: '1 حبة', rawDate: '13/10/2026' },
  { seq: 55, rawName: 'صونية استانلس لحفظ الطعام', rawQty: '1 حبة', rawDate: '13/10/2026' },
  { seq: 56, rawName: 'حافظه بلاستك', rawQty: '1 حبة', rawDate: '13/10/2026' },
  { seq: 57, rawName: 'علبة زجاج حافظه للتوابل', rawQty: '1 حبة', rawDate: '13/10/2026' },
  { seq: 58, rawName: 'سكرية', rawQty: '1 حبة', rawDate: '13/10/2026' },
  { seq: 59, rawName: 'كاسات بوفيه باطباق', rawQty: '20 حبة', rawDate: '13/10/2026' },
  { seq: 60, rawName: 'طبق زجاج متعدد الاستخدام للمبطخ', rawQty: '2 حبة', rawDate: '13/10/2026' },
  { seq: 61, rawName: 'صنية زجاج كبيره', rawQty: '1 حبة', rawDate: '13/10/2026' },
  { seq: 62, rawName: 'علبة بلاستك لحفظ أغراض البوفيه', rawQty: '1 حبة', rawDate: '13/10/2026' },
  { seq: 63, rawName: 'حافظه متعددة القوالب لتقديم الوجبات', rawQty: '1 حبة', rawDate: '13/10/2026' },
  { seq: 64, rawName: 'ترامس شاهي وقهوه', rawQty: '4 حبة', rawDate: '13/10/2026' },
  { seq: 65, rawName: 'لاصق دبل فيس ( سكن العاملات ) + لاصق بلاستر', rawQty: '2 حبة', rawDate: '13/10/2026' },
  { seq: 66, rawName: 'مفتاح مكيف', rawQty: '2 حبة', rawDate: '13/10/2026' },
  { seq: 67, rawName: 'مخرج فيشة كهربا (البركس غرفة مؤمن السواق)', rawQty: '2 حبة', rawDate: '14/10/2026' },
  { seq: 68, rawName: 'مجلة الشراع ( مكتب الدعاية والاعلان )', rawQty: '1 حبة', rawDate: '15/10/2026' },
  { seq: 69, rawName: 'مروحة شفاط ( سكن العاملات )', rawQty: '3 حبة', rawDate: '16/10/2026' },
  { seq: 70, rawName: 'شطاف مياة ( سكن العاملات )', rawQty: '2 حبة', rawDate: '16/10/2026' },
  { seq: 71, rawName: 'غسالة حوضين ( سكن العاملات )', rawQty: '1 حبة', rawDate: '16/10/2026' },
  { seq: 72, rawName: 'كشاف خارجي ( سكن العاملات )', rawQty: '1 حبة', rawDate: '16/10/2026' },
  { seq: 73, rawName: 'مخرج فيشة كهربا ( سكن العاملات )', rawQty: '3 حبة', rawDate: '16/10/2026' },
  { seq: 74, rawName: 'مفتاح مكيف ( سكن العاملات )', rawQty: '4 حبة', rawDate: '16/10/2026' },
  { seq: 75, rawName: 'عينة كيبل تراي', rawQty: '1 حبة', rawDate: '17/10/2026' },
  { seq: 76, rawName: 'عينة سيخ شانل', rawQty: '1 حبة', rawDate: '17/10/202' },
  { seq: 77, rawName: 'كشاف خارجي ( السكن الجماعي بالمكاتب )', rawQty: '2 حبة', rawDate: '19/10/2026' },
  { seq: 78, rawName: 'كشاف خارجي ( مكتب التجارة )', rawQty: '2 حبة', rawDate: '19/10/2026' },
  { seq: 79, rawName: 'طابلون لمفاتيح الكهرباء ( سكن العاملات )', rawQty: '1 حبة', rawDate: '25/10/2026' },
  { seq: 80, rawName: 'لعبة بيت الفطر', rawQty: '1 حبة', rawDate: '25/10/2026' },
  { seq: 81, rawName: 'عربة أطفال صغيرة', rawQty: '15 حبة', rawDate: '25/10/2026' },
  { seq: 82, rawName: 'بيت أطفال متنقل', rawQty: '1 حبة', rawDate: '25/10/2026' },
  { seq: 83, rawName: 'العاب مرجيحه بادوات التركيب', rawQty: '2 حبة', rawDate: '25/10/2026' },
  { seq: 84, rawName: 'بيت التوازن ( 6 قطع )', rawQty: '1 حبة', rawDate: '25/10/2026' },
  { seq: 85, rawName: 'لعبة الخيمة للأطفال', rawQty: '2 حبة', rawDate: '25/10/2026' },
  { seq: 86, rawName: 'مشبك صرة', rawQty: '1200 حبة', rawDate: '25/10/2026' },
  { seq: 87, rawName: 'كيبل HDMI', rawQty: '10 متر', rawDate: '26/10/2026' },
  { seq: 88, rawName: 'اقفال ( كالون باب )', rawQty: '10 حبة', rawDate: '26/10/2026' },
  { seq: 89, rawName: 'ليسيفر HUMAX -HD-ACE', rawQty: '13 حبة', rawDate: '28/10/2026' },
  { seq: 90, rawName: 'كرسي مجلس', rawQty: '4 حبة', rawDate: '28/10/2026' },
  { seq: 91, rawName: 'كشاف صغير ( مكتب دار الوراد )', rawQty: '6 حبة', rawDate: '29/10/2026' },
  { seq: 92, rawName: 'كشاف كبير ( مكنب دار الرواد )', rawQty: '5 حبة', rawDate: '29/10/2026' },
  { seq: 93, rawName: 'كشاف حجم وسط (مكتب توباز )', rawQty: '1 حبة', rawDate: '29/10/2026' },
  { seq: 94, rawName: 'كشاف صغير ( مكتب توباز )', rawQty: '6 حبة', rawDate: '29/10/2026' },
  { seq: 95, rawName: 'كشاف صغير مكتب ( الدعاية )', rawQty: '1 حبة', rawDate: '29/10/2026' },
  { seq: 96, rawName: 'كشاف كبير ( مكتب الدعاية )', rawQty: '1 حبة', rawDate: '29/10/2026' },
  { seq: 97, rawName: 'مكينة عصاره', rawQty: '4 حبة', rawDate: '2026-03-11' },
  { seq: 98, rawName: 'جرل + 2 بونطة تكسير وتخريم ( بلال )', rawQty: '1 حبة', rawDate: '2026-06-11' },
  { seq: 99, rawName: 'شحنة امازون ( اطقم صيانة زرديات ومفاتيح )', rawQty: '10 طقم', rawDate: '2026-08-11' },
  { seq: 100, rawName: 'شحنة امازون ( اقطفم مفكات )', rawQty: '10 طقم', rawDate: '2026-08-11' },
  { seq: 101, rawName: 'ثلاجه صغيره مني بار مكتب ( مكتب إدارة العاملات )', rawQty: '1 حبة', rawDate: '2026-10-11' },
  { seq: 102, rawName: 'لفه سلك 4 ملي ( المكتب الجديد )', rawQty: '1 حبة', rawDate: '2026-12-11' },
  { seq: 103, rawName: 'لفة سلك 2.5 ملي ( المكتب الجديد )', rawQty: '2 حبة', rawDate: '2026-12-11' },
  { seq: 104, rawName: 'مجات ( بوفيه اسامه )', rawQty: '14 حبة', rawDate: '14/11/2026' },
  { seq: 105, rawName: 'سلة بلاستك', rawQty: '1 حبة', rawDate: '14/11/2026' },
  { seq: 106, rawName: 'مبيد حشري ( سكن العاملات )', rawQty: '5 حبة', rawDate: '16/11/2026' },
  { seq: 107, rawName: 'سكن الأميال ( محمد جمال )', rawQty: '1 حبة', rawDate: '16/11/2026' },
  { seq: 108, rawName: 'براد مياه ( مكتب إدارة العاملات )', rawQty: '1 حبة', rawDate: '17/11/2026' },
  { seq: 109, rawName: 'فلتر مياه ( مكنب إدارة العاملات )', rawQty: '1 حبة', rawDate: '17/11/2026' },
  { seq: 110, rawName: 'قارورة مياه اوتماتيك للمبرد(مكنب إدارة العاملات)', rawQty: '1 حبة', rawDate: '17/11/2026' },
  { seq: 111, rawName: 'جهاز كمبيوتر مكتبي DELL', rawQty: '1 حبة', rawDate: '18/11/2026' },
];

// ── Complete 7 Return Rows (المرتجع) from the user's actual Excel CSV ──
const RAW_RETURN_ROWS: RawRow[] = [
  { seq: 1, rawName: 'شريحة stc', rawQty: '1 شريحة', rawDate: '25/08/2026' },
  { seq: 2, rawName: 'كرتون تغليف حراري', rawQty: '16 كرتون , 6 بكتج=10ألاف كيس تغليف', rawDate: '22/09/2026' },
  { seq: 3, rawName: 'مفرش سرير', rawQty: '1 حبة', rawDate: '13/10/2026' },
  { seq: 4, rawName: 'عينة كيبل تراي', rawQty: '1 حبة', rawDate: '22/10/2026' },
  { seq: 5, rawName: 'عينة سيخ شانل', rawQty: '1 حبة', rawDate: '22/10/206' },
  { seq: 6, rawName: 'العاب مرجيحه بادوات التركيب', rawQty: '2 حبة', rawDate: '29/10/206' },
  { seq: 7, rawName: 'كرسي مجلس', rawQty: '4 حبة', rawDate: '29/10/2026' },
];

// ── Computer Batteries Side Table (حجارة الكمبيوتر) ──
const RAW_BATTERY_LEDGER: Array<{
  recipientName: string;
  departmentOrOffice: string;
  smallQty: number;
  largeQty: number;
}> = [
  { recipientName: 'أ/ خالد السليم', departmentOrOffice: 'الإدارة العليا', smallQty: 0, largeQty: 2 },
  { recipientName: 'أ/ فراس الحسن', departmentOrOffice: 'إدارة التجارة والمنافسات (كاس)', smallQty: 9, largeQty: 4 },
  { recipientName: 'حسن يوسف', departmentOrOffice: 'مكتب ياقوت نجد', smallQty: 0, largeQty: 1 },
  { recipientName: 'محمد خالد السيد', departmentOrOffice: 'محاسبة التجارة', smallQty: 0, largeQty: 1 },
  { recipientName: 'محمود علي أبوالعطا', departmentOrOffice: 'محاسبة التجارة', smallQty: 0, largeQty: 1 },
  { recipientName: 'عمرو المحمدي إبراهيم (حسابات)', departmentOrOffice: 'الإدارة المالية والمحاسبة', smallQty: 2, largeQty: 0 },
];

export function parseAndRepairDate(raw: string, fallbackIso: string): {
  iso: string;
  autoCorrected: boolean;
  original?: string;
} {
  const s = (raw || '').trim();
  if (!s) {
    return { iso: fallbackIso, autoCorrected: true, original: 'فارغ بالملف' };
  }

  // Case 1: Broken compact DD/MMYYYY like 25/102026 or 22/102026
  const compactMatch = s.match(/^(\d{1,2})\/(\d{2})(\d{4})$/);
  if (compactMatch) {
    const [, d, m] = compactMatch;
    return {
      iso: `2026-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
      autoCorrected: true,
      original: s,
    };
  }

  // Case 2: DD/MM/YYYY or broken year like 206, 202, 02026, 2027, 2028, 2029
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{3,5})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    const yearNum = Number(y);
    const badYear = y !== '2026' || yearNum > 2026 || yearNum < 2025;
    const fixedYear = badYear ? '2026' : y;
    const mm = m.padStart(2, '0');
    const dd = d.padStart(2, '0');
    return {
      iso: `${fixedYear}-${mm}-${dd}`,
      autoCorrected: badYear,
      original: badYear ? s : undefined,
    };
  }

  // Case 3: YYYY-DD-MM inverted Excel export (e.g. 2026-01-08 in August row, 2026-05-09 in Sept row, 2026-12-11 in Nov row)
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, p1, p2] = isoMatch;
    const n1 = Number(p1);
    const n2 = Number(p2);
    // In this CSV, Excel exported dates like 01/08/2026 as 2026-01-08 (swapped day & month for days 1..12)
    // when the surrounding rows are in month n2 (08, 09, 10, 11)
    if (n2 >= 8 && n2 <= 11 && n1 >= 1 && n1 <= 12 && n1 !== n2) {
      return {
        iso: `${y}-${String(n2).padStart(2, '0')}-${String(n1).padStart(2, '0')}`,
        autoCorrected: true,
        original: s,
      };
    }
    return { iso: s, autoCorrected: false };
  }

  return { iso: fallbackIso, autoCorrected: true, original: s };
}

export function extractBeneficiaryAndRecipient(rawName: string): {
  beneficiaryEntity: string;
  costCenterCode: string;
  roomOrSite?: string;
  recipientName?: string;
  issuePurpose: WmsIssuePurpose;
} {
  const n = rawName;
  if (n.includes('يا قوت') || n.includes('ياقوت')) {
    return { beneficiaryEntity: 'مكتب ياقوت نجد (YAQ)', costCenterCode: 'CC-YAQ-01', issuePurpose: 'تشغيل مكاتب' };
  }
  if (n.includes('توباز')) {
    return { beneficiaryEntity: 'مكتب توباز (TOP)', costCenterCode: 'CC-TOP-01', issuePurpose: 'تشغيل مكاتب' };
  }
  if (n.includes('دار الرواد') || n.includes('دار الوراد')) {
    return { beneficiaryEntity: 'مكتب دار الرواد (DAR)', costCenterCode: 'CC-DAR-01', issuePurpose: 'تشغيل مكاتب' };
  }
  if (n.includes('إدارة العاملات') || n.includes('ادارة العاملات')) {
    return { beneficiaryEntity: 'مكتب إدارة العاملات', costCenterCode: 'CC-DAR-02', issuePurpose: 'تشغيل مكاتب' };
  }
  if (n.includes('الدعاية')) {
    return { beneficiaryEntity: 'مكتب الدعاية والإعلان والتسويق', costCenterCode: 'CC-MKT-01', issuePurpose: 'تشغيل مكاتب' };
  }
  if (n.includes('HR')) {
    return { beneficiaryEntity: 'مكتب الموارد البشرية (HR)', costCenterCode: 'CC-HR-01', issuePurpose: 'عهدة شخصية' };
  }
  if (n.includes('مكتب التجارة')) {
    return { beneficiaryEntity: 'مكتب التجارة والمنافسات (كاس)', costCenterCode: 'CC-KAS-01', issuePurpose: 'تشغيل مكاتب' };
  }
  if (n.includes('المكتب الجديد')) {
    return { beneficiaryEntity: 'تجهيز المكتب الجديد', costCenterCode: 'CC-PRJ-NEW', issuePurpose: 'تجهيز مكتب جديد' };
  }
  if (n.includes('صالة الأجتماعات') || n.includes('الاجتماعات')) {
    return { beneficiaryEntity: 'صالة الاجتماعات الرئيسية', costCenterCode: 'CC-HQ-MTG', issuePurpose: 'تشغيل مكاتب' };
  }
  if (n.includes('بوفيه') || n.includes('فناجين') || n.includes('ترمس') || n.includes('ترامس') || n.includes('مجات')) {
    return {
      beneficiaryEntity: 'البوفيه والضيافة (بوفيه أسامة)',
      costCenterCode: 'CC-HQ-BUF',
      recipientName: n.includes('اسامه') ? 'أسامة سعيد (البوفيه)' : undefined,
      issuePurpose: 'ضيافة وبوفيه',
    };
  }
  if (n.includes('سكن العاملات')) {
    const room = n.includes('رابيا') ? 'غرفة رابيا' : undefined;
    return {
      beneficiaryEntity: 'سكن العاملات (مركز الإيواء)',
      costCenterCode: 'CC-SHL-01',
      roomOrSite: room,
      issuePurpose: 'صيانة سكن وإيواء',
    };
  }
  if (n.includes('سكن الجماعي') || n.includes('السكن الجماعي')) {
    return {
      beneficiaryEntity: 'السكن الجماعي (المكاتب والاستقدام)',
      costCenterCode: 'CC-SHL-02',
      recipientName: n.includes('كريم') ? 'كريم طارق الشناوي' : undefined,
      issuePurpose: 'صيانة سكن وإيواء',
    };
  }
  if (n.includes('البركس')) {
    return {
      beneficiaryEntity: 'البركس — سكن السائقين والفنيين',
      costCenterCode: 'CC-SHL-03',
      roomOrSite: 'غرفة مؤمن السواق',
      recipientName: 'مؤمن السواق',
      issuePurpose: 'صيانة سكن وإيواء',
    };
  }
  if (n.includes('الأميال') || n.includes('الاميال')) {
    return {
      beneficiaryEntity: 'سكن قطاع الأميال',
      costCenterCode: 'CC-KAS-IML',
      recipientName: n.includes('محمد جمال') ? 'محمد جمال أحمد' : undefined,
      issuePurpose: 'صيانة سكن وإيواء',
    };
  }
  if (n.includes('خالد')) {
    return {
      beneficiaryEntity: 'منزل / مكتب أ. خالد السليم',
      costCenterCode: 'CC-EXE-01',
      recipientName: 'أ/ خالد عبدالعزيز السليم',
      issuePurpose: 'ضيافة وبوفيه',
    };
  }
  if (n.includes('علي الكهربائي')) {
    return {
      beneficiaryEntity: 'مكتب التجارة والمنافسات (كاس)',
      costCenterCode: 'CC-KAS-01',
      recipientName: 'علي الكهربائي (عمال عزم)',
      issuePurpose: 'عهدة شخصية',
    };
  }
  if (n.includes('بلال')) {
    return {
      beneficiaryEntity: 'مكتب التجارة والمنافسات (كاس)',
      costCenterCode: 'CC-KAS-01',
      recipientName: 'بلال أحمد باثان',
      issuePurpose: 'عهدة شخصية',
    };
  }
  if (n.includes('امازون') || n.includes('أطفال') || n.includes('اطفال') || n.includes('مرجيحه') || n.includes('الفطر') || n.includes('التوازن') || n.includes('الخيمة')) {
    return { beneficiaryEntity: 'شحنات أمازون والمبيعات التجارية', costCenterCode: 'CC-KAS-AMZ', issuePurpose: 'تجارة وشحنات أمازون' };
  }
  if (n.includes('عينة')) {
    return { beneficiaryEntity: 'توريدات المنافسات والجهات الحكومية', costCenterCode: 'CC-KAS-TND', issuePurpose: 'عينات تجارية' };
  }
  if (n.includes('طبي') || n.includes('جلفزات') || n.includes('الوريد') || n.includes('المخدرات') || n.includes('السمات الحيويه') || n.includes('HUMAX') || n.includes('DVD') || n.includes('تغليف حراري')) {
    return { beneficiaryEntity: 'توريدات المنافسات والجهات الحكومية', costCenterCode: 'CC-KAS-TND', issuePurpose: 'توريد منافسة حكومية' };
  }
  if (n.includes('Nikon') || n.includes('Godox') || n.includes('سانديسك') || n.includes('كمبيوتر')) {
    return { beneficiaryEntity: 'مكتب الدعاية والإعلان والتسويق', costCenterCode: 'CC-MKT-01', issuePurpose: 'عهدة شخصية' };
  }
  return { beneficiaryEntity: 'مكتب التجارة والمنافسات (كاس)', costCenterCode: 'CC-KAS-01', issuePurpose: 'تشغيل مكاتب' };
}

export function canonicalizeItemName(raw: string): string {
  // Strip beneficiary parentheticals first while keeping product specs
  const s = raw
    .replace(/\(\s*(إلي صالة الأجتماعات|سكن الجماعي|مكتب يا قوت|مكتب ياقوت|مكتب توباز|سكن العاملات[^)]*|كريم|علي الكهربائي عمال عزم|مكتب إدارة\s*العاملات|مكنب إدارة العاملات|مكتب HR|البركس غرفة مؤمن السواق|مكتب الدعاية والاعلان|السكن الجماعي بالمكاتب|مكتب التجارة|مكتب دار الوراد|مكنب دار الرواد|مكتب الدعاية|الدعاية|بلال|المكتب الجديد|أغراض المكتب الجديد|بوفيه اسامه|محمد جمال)\s*\)/g, '')
    .replace(/(مكتب ياقوت|لسكن الجماعي الاستقدام|لحمامات السكن|لسكن العاملات|لمنزل أ \/ خالد|سكن الجماعي|مكتب\s*$)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Unify spelling variants across all 116 rows
  if (s.includes('ثلاجه صغيره مني بار')) return 'ثلاجة صغيرة ميني بار مكتب';
  if (s.includes('ديب فليزر')) return 'ديب فريزر';
  if (s.includes('كمبيوتر مكتبي hp')) return 'جهاز كمبيوتر مكتبي HP';
  if (s.includes('كمبيوتر مكتبي DELL')) return 'جهاز كمبيوتر مكتبي DELL';
  if (s.includes('مايكرويف')) return 'جهاز مايكرويف';
  if (s === 'غلايه') return 'غلاية كهربائية';
  if (s.includes('ثلاجه 12 قدم')) return 'ثلاجة 12 قدم Toshiba';
  if (s.includes('sponge gauze') || s.includes('شاش طبي')) return 'شاش طبي معقم (Sponge Gauze)';
  if (s.includes('شرائح جوال stc') || s.includes('شريحة stc')) return 'شريحة جوال STC';
  if (s.includes('تغليف حراري')) return 'أكياس تغليف حراري (كرتون / بكتج / كيس)';
  if (s.includes('شطاف مي')) return 'شطاف مياه';
  if (s.includes('سيفون حمام')) return 'مكينة سيفون حمام';
  if (s === 'صمام مياة' || s === 'صمام مياة ذاوية') return s.includes('ذاوية') ? 'صمام مياه زاوية' : 'صمام مياه';
  if (s.includes('كشاف خارجي 20 W')) return 'كشاف خارجي LED 20W';
  if (s.includes('كشاف خارجي 30 W')) return 'كشاف خارجي LED 30W';
  if (s.includes('كشاف خارجي ATA')) return 'كشاف خارجي ATA';
  if (s.includes('كشاف خارجي') && s.includes('TECH LIGHT')) return 'كشاف خارجي TECH LIGHT';
  if (s.includes('كشاف خارجي')) return 'كشاف خارجي LED';
  if (s.includes('كشاف داخلي كبير ONE PLUS')) return 'كشاف داخلي كبير ONE PLUS';
  if (s.includes('كشاف داخلي صغيرDSS') || s.includes('DSS LIGHTING')) return 'كشاف داخلي صغير DSS Lighting';
  if (s.includes('كرسي مجلس جلد') || s.includes('كرسي مكتب جلد')) return 'كرسي مجلس / مكتب جلد';
  if (s.includes('كرسي مجلس متحرك') || s.includes('كرسي مكتب متحرك')) return 'كرسي مكتب متحرك';
  if (s.includes('كرسي مجلس')) return 'كرسي مجلس';
  if (s.includes('مفتاح مكيف') || s.includes('مفتاح تكييف')) return 'مفتاح مكيف كهربائي';
  if (s.includes('حجارة صغير')) return 'حجارة كمبيوتر صغيرة (AAA)';
  if (s.includes('حجارة كبير')) return 'حجارة كمبيوتر كبيرة (AA)';
  if (s.includes('عينة- ريسيفر HUMAX')) return 'عينة ريسيفر HUMAX HD-ACE';
  if (s.includes('HUMAX')) return 'ريسيفر HUMAX HD-ACE';
  if (s.includes('مرجيحه')) return 'ألعاب مرجيحة بأدوات التركيب';
  if (s.includes('جلفزات طبية')) return 'جلفزات طبية (قفازات فحص)';
  if (s.includes('فلاش خاجري') || s.includes('Godox')) return 'فلاش خارجي للكاميرا Godox V1';
  if (s.includes('سانديسك')) return 'بطاقة ذاكرة SanDisk Extreme Pro 128GB';
  if (s.includes('السمات الحيويه')) return 'جهاز محمول للتحقق من الهوية عبر السمات الحيوية';
  if (s.includes('مكافحة المخدرات')) return 'شريط لاصق — المديرية العامة لمكافحة المخدرات';
  if (s.includes('مخده')) return 'مخدة نوم';
  if (s.includes('بوتجاز صطحي')) return 'بوتاجاز سطحي 4 شعلة';
  if (s.includes('سخان مياة 50 لتر')) return 'سخان مياه 50 لتر';
  if (s.includes('اجهزه فلوك')) return 'أجهزة قياس وفحص Fluke';
  if (s.includes('سيكل أطفال')) return 'شحنة أمازون — سيكل أطفال';
  if (s.includes('اطقم صيانة زرديات')) return 'شحنة أمازون — أطقم صيانة زرديات ومفاتيح';
  if (s.includes('اقطفم مفكات')) return 'شحنة أمازون — أطقم مفكات';
  if (s.includes('مصمار + ورده')) return 'مسمار + وردة + صامولة 6 مم';
  if (s.includes('شطرطون كهرباء') || s.includes('شكرتون بلاستر كهربا')) return 'شطرطون كهرباء (بلاستر عازل)';
  if (s.includes('اقفال')) return 'أقفال (كالون باب)';
  if (s.includes('جرل + 2 بونطة')) return 'دريل (جرل) + 2 بونطة تكسير وتخريم';
  if (s.includes('مكينة عصاره')) return 'مكينة عصارة';
  if (s.includes('طابعة hb')) return 'طابعة HP مكتبية';
  if (s.includes('ترمس شاي') || s.includes('ترامس شاهي')) return 'ترمس شاي وقهوة';
  if (s.includes('براد مياه') || s.includes('مبرد مياه')) return 'مبرد (براد) مياه';
  if (s.includes('قاروره مياه') || s.includes('قارورة مياه')) return 'قارورة مياه أوتوماتيك للمبرد';
  if (s.includes('لفسات سلك') || s.includes('لفات سلك داخلي')) return 'لفات سلك كهربائي داخلي';
  if (s.includes('سكن الأميال')) return 'توريد مستلزمات سكن الأميال (غير محدد الصنف بالملف)';
  if (s.includes('طربيظه استالس')) return 'طرابيزة استانلس طويلة';
  if (s.includes('طربيظات حجم صغير')) return 'طرابيزات حجم صغير';
  return s || raw.trim();
}

export function parseQtyAndUom(rawQty: string, canonicalName: string): {
  enteredQty: number;
  enteredUom: string;
  baseUom: string;
  uomFactor: number;
  baseQty: number;
  conversions: WmsUomConversion[];
  wasCompoundUnit?: boolean;
} {
  const q = (rawQty || '').trim();
  // Special compound case: "16 كرتون , 6 بكتج=10ألاف كيس تغليف" vs "17 كرتون"
  if (canonicalName.includes('تغليف حراري')) {
    const conversions: WmsUomConversion[] = [
      { uomName: 'كيس', factorToBase: 1 },
      { uomName: 'بكتج', factorToBase: 100 },
      { uomName: 'كرتون', factorToBase: 600 },
    ];
    if (q.includes('10ألاف') || q.includes('بكتج')) {
      return {
        enteredQty: 10000,
        enteredUom: 'كيس',
        baseUom: 'كيس',
        uomFactor: 1,
        baseQty: 10000,
        conversions,
        wasCompoundUnit: true,
      };
    }
    const num = Number((q.match(/\d+(\.\d+)?/) || ['1'])[0]);
    return {
      enteredQty: num,
      enteredUom: 'كرتون',
      baseUom: 'كيس',
      uomFactor: 600,
      baseQty: num * 600,
      conversions,
    };
  }

  // Batteries: 1 علبة = 24 حجر (so individual issues of 1..9 batteries deduct properly!)
  if (canonicalName.includes('حجارة كمبيوتر')) {
    const conversions: WmsUomConversion[] = [
      { uomName: 'حجر', factorToBase: 1 },
      { uomName: 'علبة', factorToBase: 24 },
    ];
    const num = Number((q.match(/\d+(\.\d+)?/) || ['1'])[0]);
    const isBox = q.includes('علبة');
    return {
      enteredQty: num,
      enteredUom: isBox ? 'علبة' : 'حجر',
      baseUom: 'حجر',
      uomFactor: isBox ? 24 : 1,
      baseQty: isBox ? num * 24 : num,
      conversions,
    };
  }

  const numMatch = q.match(/\d+(\.\d+)?/);
  const qty = numMatch ? Number(numMatch[0]) : 1;

  if (q.includes('درزن')) {
    return {
      enteredQty: qty,
      enteredUom: 'درزن',
      baseUom: 'حبة',
      uomFactor: 12,
      baseQty: qty * 12,
      conversions: [
        { uomName: 'حبة', factorToBase: 1 },
        { uomName: 'درزن', factorToBase: 12 },
      ],
    };
  }
  if (q.includes('متر')) {
    return {
      enteredQty: qty,
      enteredUom: 'متر',
      baseUom: 'متر',
      uomFactor: 1,
      baseQty: qty,
      conversions: [
        { uomName: 'متر', factorToBase: 1 },
        { uomName: 'لفة (100م)', factorToBase: 100 },
      ],
    };
  }
  if (q.includes('كرتون')) {
    return {
      enteredQty: qty,
      enteredUom: 'كرتون',
      baseUom: 'كرتون',
      uomFactor: 1,
      baseQty: qty,
      conversions: [{ uomName: 'كرتون', factorToBase: 1 }],
    };
  }
  if (q.includes('طقم') || q.includes('اطقم')) {
    return {
      enteredQty: qty,
      enteredUom: 'طقم',
      baseUom: 'طقم',
      uomFactor: 1,
      baseQty: qty,
      conversions: [{ uomName: 'طقم', factorToBase: 1 }],
    };
  }
  if (q.includes('لفة') || q.includes('لفات')) {
    return {
      enteredQty: qty,
      enteredUom: 'لفة',
      baseUom: 'لفة',
      uomFactor: 1,
      baseQty: qty,
      conversions: [{ uomName: 'لفة', factorToBase: 1 }],
    };
  }
  if (q.includes('بكتج')) {
    return {
      enteredQty: qty,
      enteredUom: 'بكتج',
      baseUom: 'بكتج',
      uomFactor: 1,
      baseQty: qty,
      conversions: [{ uomName: 'بكتج', factorToBase: 1 }],
    };
  }
  if (q.includes('شريحة') || q.includes('شريحه')) {
    return {
      enteredQty: qty,
      enteredUom: 'شريحة',
      baseUom: 'شريحة',
      uomFactor: 1,
      baseQty: qty,
      conversions: [{ uomName: 'شريحة', factorToBase: 1 }],
    };
  }
  return {
    enteredQty: qty,
    enteredUom: 'حبة',
    baseUom: 'حبة',
    uomFactor: 1,
    baseQty: qty,
    conversions: [{ uomName: 'حبة', factorToBase: 1 }],
  };
}

function classifyItemMeta(name: string): {
  categoryId: string;
  warehouseId: string;
  locationCode: string;
  trackingMode: WmsTrackingMode;
  isCustodyEligible: boolean;
  isFastConsumable: boolean;
  isSampleItem: boolean;
  abcClass: 'A' | 'B' | 'C';
  estimatedDefaultCost: number;
} {
  const n = name;
  const isSample = n.startsWith('عينة');
  if (
    n.includes('Nikon') ||
    n.includes('Godox') ||
    n.includes('SanDisk') ||
    n.includes('كمبيوتر') ||
    n.includes('طابعة') ||
    n.includes('شاشة') ||
    n.includes('السمات الحيوية') ||
    n.includes('Fluke') ||
    n.includes('كاشير') ||
    n.includes('HUMAX') ||
    n.includes('DVD') ||
    n.includes('STC') ||
    n.includes('HDMI')
  ) {
    return {
      categoryId: 'CAT-IT',
      warehouseId: isSample ? 'WH-SMP' : 'WH-MAIN',
      locationCode: isSample ? 'Z-SMP-R1-B1' : 'Z-IT-R1-B1',
      trackingMode: 'SERIAL',
      isCustodyEligible: !n.includes('HDMI') && !n.includes('DVD'),
      isFastConsumable: false,
      isSampleItem: isSample,
      abcClass: 'A',
      estimatedDefaultCost: 0,
    };
  }
  if (
    n.includes('شاش طبي') ||
    n.includes('جلفزات') ||
    n.includes('مشارط') ||
    n.includes('ضغط الوريد') ||
    n.includes('مكافحة المخدرات') ||
    n.includes('مشبك صرة')
  ) {
    return {
      categoryId: 'CAT-MED',
      warehouseId: 'WH-TND',
      locationCode: 'Z-MED-R1-B2',
      trackingMode: 'LOT_EXPIRY',
      isCustodyEligible: false,
      isFastConsumable: false,
      isSampleItem: false,
      abcClass: 'A',
      estimatedDefaultCost: 0,
    };
  }
  if (
    n.includes('أمازون') ||
    n.includes('تغليف حراري') ||
    n.includes('قهوة القصيم') ||
    n.includes('عسل') ||
    n.includes('مرجيحة') ||
    n.includes('عربة أطفال') ||
    n.includes('بيت أطفال') ||
    n.includes('الفطر') ||
    n.includes('التوازن') ||
    n.includes('الخيمة') ||
    n.includes('صلصال') ||
    n.includes('منياكات') ||
    n.includes('مكينة تغليف') ||
    n.includes('استيكر')
  ) {
    return {
      categoryId: 'CAT-AMZ',
      warehouseId: 'WH-TND',
      locationCode: 'Z-AMZ-R2-B1',
      trackingMode: n.includes('قهوة') || n.includes('عسل') ? 'LOT_EXPIRY' : 'NONE',
      isCustodyEligible: false,
      isFastConsumable: false,
      isSampleItem: false,
      abcClass: 'B',
      estimatedDefaultCost: 0,
    };
  }
  if (
    n.includes('كيبل') ||
    n.includes('سلك') ||
    n.includes('كشاف') ||
    n.includes('سبوت لايت') ||
    n.includes('لطش') ||
    n.includes('شطاف') ||
    n.includes('سيفون') ||
    n.includes('صمام') ||
    n.includes('مفتاح') ||
    n.includes('فيش') ||
    n.includes('مسمار') ||
    n.includes('وردة') ||
    n.includes('خابور') ||
    n.includes('مجري') ||
    n.includes('سيخ') ||
    n.includes('فلبشر') ||
    n.includes('مروحة شفاط') ||
    n.includes('شطرطون') ||
    n.includes('دريل') ||
    n.includes('مواصير') ||
    n.includes('باوط') ||
    n.includes('طابلون') ||
    n.includes('أقفال') ||
    n.includes('ماتور')
  ) {
    return {
      categoryId: 'CAT-MEP',
      warehouseId: isSample ? 'WH-SMP' : 'WH-MAIN',
      locationCode: isSample ? 'Z-SMP-R1-B2' : 'Z-MEP-R2-B3',
      trackingMode: 'NONE',
      isCustodyEligible: n.includes('دريل'),
      isFastConsumable: false,
      isSampleItem: isSample,
      abcClass: 'B',
      estimatedDefaultCost: 0,
    };
  }
  if (
    n.includes('ثلاجة') ||
    n.includes('ديب فريزر') ||
    n.includes('مايكرويف') ||
    n.includes('غلاية') ||
    n.includes('قهوة') ||
    n.includes('فرن') ||
    n.includes('كرسي') ||
    n.includes('طرابيز') ||
    n.includes('بطانية') ||
    n.includes('مفرش') ||
    n.includes('مرتبة') ||
    n.includes('مخدة') ||
    n.includes('بوتاجاز') ||
    n.includes('سخان') ||
    n.includes('غسالة') ||
    n.includes('مكيف صحراوي') ||
    n.includes('عصارة') ||
    n.includes('مبرد') ||
    n.includes('فلتر') ||
    n.includes('قارورة') ||
    n.includes('مظلات') ||
    n.includes('طبلية')
  ) {
    return {
      categoryId: 'CAT-FUR',
      warehouseId: 'WH-NEW',
      locationCode: 'Z-FUR-R1-B4',
      trackingMode: n.includes('ثلاجة') || n.includes('مكيف') || n.includes('غسالة') ? 'SERIAL' : 'NONE',
      isCustodyEligible: true,
      isFastConsumable: false,
      isSampleItem: false,
      abcClass: 'A',
      estimatedDefaultCost: 0,
    };
  }
  return {
    categoryId: 'CAT-CON',
    warehouseId: 'WH-MAIN',
    locationCode: 'Z-CON-R3-B1',
    trackingMode: n.includes('مبيد') ? 'LOT_EXPIRY' : 'NONE',
    isCustodyEligible: false,
    isFastConsumable: true,
    isSampleItem: false,
    abcClass: 'C',
    estimatedDefaultCost: 0,
  };
}

export interface InitialWmsDataset {
  warehouses: WmsWarehouse[];
  categories: WmsCategory[];
  items: WmsItem[];
  quants: WmsStockQuant[];
  vouchers: WmsStockVoucher[];
  serialLots: WmsSerialLotRecord[];
  sampleLoans: WmsSampleLoan[];
  fastConsumables: WmsFastConsumableLog[];
  discrepancies: WmsDiscrepancyItem[];
}

let cachedDataset: InitialWmsDataset | null = null;

export function buildInitialWmsDataset(): InitialWmsDataset {
  if (cachedDataset) {
    return structuredClone(cachedDataset);
  }

  const itemByCanonical = new Map<string, WmsItem>();
  const categoryCounter: Record<string, number> = {};
  const inTotals = new Map<string, number>();
  const outTotals = new Map<string, number>();
  const retTotals = new Map<string, number>();

  const ensureItem = (canonicalName: string, parsedQty: ReturnType<typeof parseQtyAndUom>): WmsItem => {
    const existing = itemByCanonical.get(canonicalName);
    if (existing) {
      // Merge any newly discovered UoM conversion
      for (const conv of parsedQty.conversions) {
        if (!existing.uomConversions.some((u) => u.uomName === conv.uomName)) {
          existing.uomConversions.push(conv);
        }
      }
      return existing;
    }

    const meta = classifyItemMeta(canonicalName);
    const cat = WMS_CATEGORIES.find((c) => c.id === meta.categoryId) || WMS_CATEGORIES[5];
    categoryCounter[cat.code] = (categoryCounter[cat.code] || 0) + 1;
    const seqStr = String(categoryCounter[cat.code]).padStart(3, '0');
    const sku = `KAS-${cat.code}-${seqStr}`;
    const id = `WMS-ITM-${cat.code}-${seqStr}`;

    const item: WmsItem = {
      id,
      company_id: 'KAS',
      sku,
      barcode: `628100${cat.code.charCodeAt(0)}${seqStr}`,
      nameAr: canonicalName,
      categoryId: meta.categoryId,
      baseUom: parsedQty.baseUom,
      uomConversions: [...parsedQty.conversions],
      trackingMode: meta.trackingMode,
      valuationMethod: 'AVCO',
      avgUnitCost: meta.estimatedDefaultCost,
      lastPurchaseCost: meta.estimatedDefaultCost,
      minQty: meta.abcClass === 'C' ? 5 : 1,
      reorderPoint: meta.abcClass === 'C' ? 10 : 2,
      maxQty: 200,
      defaultWarehouseId: meta.warehouseId,
      defaultLocationCode: meta.locationCode,
      isCustodyEligible: meta.isCustodyEligible,
      isFastConsumable: meta.isFastConsumable,
      isSampleItem: meta.isSampleItem,
      abcClass: meta.abcClass,
      status: 'نشط',
      createdAt: '2026-06-14T08:00:00Z',
    };

    itemByCanonical.set(canonicalName, item);
    return item;
  };

  const vouchers: WmsStockVoucher[] = [];
  const serialLots: WmsSerialLotRecord[] = [];
  let dateFixCount = 0;

  // 1) Process all 116 Incoming Rows (GRN)
  for (const row of RAW_INCOMING_ROWS) {
    const canonical = canonicalizeItemName(row.rawName);
    const parsedQty = parseQtyAndUom(row.rawQty, canonical);
    const item = ensureItem(canonical, parsedQty);
    const parsedDate = parseAndRepairDate(row.rawDate, '2026-06-14');
    if (parsedDate.autoCorrected) dateFixCount += 1;

    inTotals.set(item.id, (inTotals.get(item.id) || 0) + parsedQty.baseQty);

    const voucherNo = `GRN-2026-${String(row.seq).padStart(4, '0')}`;
    vouchers.push({
      id: `VCH-IN-${row.seq}`,
      company_id: 'KAS',
      voucherNo,
      voucherType: 'GRN',
      status: 'POSTED',
      voucherDate: parsedDate.iso,
      warehouseId: item.defaultWarehouseId,
      supplierName: row.rawName.includes('امازون') ? 'Amazon.sa — شحنة تجارية' : 'توريد محلي / مشتريات كاس',
      poOrTrackingNo: row.rawName.includes('امازون') ? `AMZ-2026-${row.seq}` : undefined,
      lines: [
        {
          id: `VL-IN-${row.seq}`,
          itemId: item.id,
          sku: item.sku,
          itemName: item.nameAr,
          enteredQty: parsedQty.enteredQty,
          enteredUom: parsedQty.enteredUom,
          uomFactor: parsedQty.uomFactor,
          baseQty: parsedQty.baseQty,
          unitCost: 0,
          totalCost: 0,
          conditionStatus: 'سليم',
          notes: row.rawName !== item.nameAr ? `النص الأصلي بالملف: ${row.rawName}` : undefined,
        },
      ],
      totalQtyBase: parsedQty.baseQty,
      totalValue: 0,
      handoverSigned: true,
      handoverSignedAt: `${parsedDate.iso}T10:00:00Z`,
      createdByEmail: 'h.salman.trade@kas.sa',
      createdByName: 'حاتم سلمان ابوالذهب سلمان',
      postedByEmail: 'h.salman.trade@kas.sa',
      postedByName: 'حاتم سلمان ابوالذهب سلمان',
      postedAt: `${parsedDate.iso}T10:05:00Z`,
      migratedFromExcel: true,
      excelRowSeq: row.seq,
      dateAutoCorrected: parsedDate.autoCorrected,
      originalExcelDate: parsedDate.original,
      notes: parsedDate.autoCorrected
        ? `تم ترحيل الصف #${row.seq} من ملف الإكسل وتصحيح التاريخ (${parsedDate.original} ← ${parsedDate.iso})`
        : `مرحل من سجل الوارد #${row.seq}`,
      createdAt: `${parsedDate.iso}T10:00:00Z`,
    });

    // Populate Serial/Lot Registry for high-value IT & Medical items
    if (item.trackingMode === 'SERIAL' && parsedQty.baseQty <= 15) {
      for (let i = 1; i <= parsedQty.baseQty; i++) {
        serialLots.push({
          id: `SN-${item.sku}-${row.seq}-${i}`,
          company_id: 'KAS',
          itemId: item.id,
          sku: item.sku,
          itemName: item.nameAr,
          serialNumber: `${item.sku}-SN${String(row.seq).padStart(2, '0')}${String(i).padStart(2, '0')}`,
          warehouseId: item.defaultWarehouseId,
          status: 'IN_STOCK',
          receivedDate: parsedDate.iso,
          notes: `وارد مرجع ${voucherNo}`,
        });
      }
    } else if (item.trackingMode === 'LOT_EXPIRY') {
      serialLots.push({
        id: `LOT-${item.sku}-${row.seq}`,
        company_id: 'KAS',
        itemId: item.id,
        sku: item.sku,
        itemName: item.nameAr,
        lotNumber: `LOT-2026-${String(row.seq).padStart(3, '0')}`,
        expiryDate: '2027-10-31',
        warehouseId: item.defaultWarehouseId,
        status: 'IN_STOCK',
        receivedDate: parsedDate.iso,
        notes: `دفعة طبية/استهلاكية مرجع ${voucherNo}`,
      });
    }
  }

  // 2) Process all 111 Outgoing Rows (GIN)
  for (const row of RAW_OUTGOING_ROWS) {
    const canonical = canonicalizeItemName(row.rawName);
    const parsedQty = parseQtyAndUom(row.rawQty, canonical);
    const item = ensureItem(canonical, parsedQty);
    const parsedDate = parseAndRepairDate(row.rawDate, '2026-08-01');
    if (parsedDate.autoCorrected) dateFixCount += 1;

    const ben = extractBeneficiaryAndRecipient(row.rawName);
    outTotals.set(item.id, (outTotals.get(item.id) || 0) + parsedQty.baseQty);

    const voucherNo = `GIN-2026-${String(row.seq).padStart(4, '0')}`;
    vouchers.push({
      id: `VCH-OUT-${row.seq}`,
      company_id: 'KAS',
      voucherNo,
      voucherType: 'GIN',
      status: 'POSTED',
      voucherDate: parsedDate.iso,
      warehouseId: item.defaultWarehouseId,
      issuePurpose: ben.issuePurpose,
      beneficiaryEntity: ben.beneficiaryEntity,
      costCenterCode: ben.costCenterCode,
      roomOrSite: ben.roomOrSite,
      recipientName: ben.recipientName || ben.beneficiaryEntity,
      lines: [
        {
          id: `VL-OUT-${row.seq}`,
          itemId: item.id,
          sku: item.sku,
          itemName: item.nameAr,
          enteredQty: parsedQty.enteredQty,
          enteredUom: parsedQty.enteredUom,
          uomFactor: parsedQty.uomFactor,
          baseQty: parsedQty.baseQty,
          unitCost: 0,
          totalCost: 0,
          conditionStatus: 'سليم',
          notes: row.rawName !== item.nameAr ? `النص الأصلي: ${row.rawName}` : undefined,
        },
      ],
      totalQtyBase: parsedQty.baseQty,
      totalValue: 0,
      handoverSigned: true,
      handoverSignedAt: `${parsedDate.iso}T14:00:00Z`,
      createdByEmail: 'h.salman.trade@kas.sa',
      createdByName: 'حاتم سلمان ابوالذهب سلمان',
      postedByEmail: 'h.salman.trade@kas.sa',
      postedByName: 'حاتم سلمان ابوالذهب سلمان',
      postedAt: `${parsedDate.iso}T14:05:00Z`,
      migratedFromExcel: true,
      excelRowSeq: row.seq,
      dateAutoCorrected: parsedDate.autoCorrected,
      originalExcelDate: parsedDate.original,
      notes: parsedDate.autoCorrected
        ? `مرحل من سجل الصادر #${row.seq} (تصحيح تاريخ ${parsedDate.original} ← ${parsedDate.iso})`
        : `مرحل من سجل الصادر #${row.seq}`,
      createdAt: `${parsedDate.iso}T14:00:00Z`,
    });

    // Update serial registry status for issued serialized assets
    if (item.trackingMode === 'SERIAL') {
      let remaining = parsedQty.baseQty;
      for (const sn of serialLots) {
        if (sn.itemId === item.id && sn.status === 'IN_STOCK' && remaining > 0) {
          sn.status = item.isCustodyEligible ? 'IN_CUSTODY' : 'ISSUED';
          sn.assignedToEntity = ben.beneficiaryEntity;
          sn.assignedToName = ben.recipientName || ben.beneficiaryEntity;
          sn.issuedDate = parsedDate.iso;
          remaining -= 1;
        }
      }
    }
  }

  // 3) Process all 7 Return Rows (SRN)
  for (const row of RAW_RETURN_ROWS) {
    const canonical = canonicalizeItemName(row.rawName);
    const parsedQty = parseQtyAndUom(row.rawQty, canonical);
    const item = ensureItem(canonical, parsedQty);
    const parsedDate = parseAndRepairDate(row.rawDate, '2026-10-22');
    if (parsedDate.autoCorrected) dateFixCount += 1;

    retTotals.set(item.id, (retTotals.get(item.id) || 0) + parsedQty.baseQty);

    vouchers.push({
      id: `VCH-RET-${row.seq}`,
      company_id: 'KAS',
      voucherNo: `SRN-2026-${String(row.seq).padStart(4, '0')}`,
      voucherType: 'SRN',
      status: 'POSTED',
      voucherDate: parsedDate.iso,
      warehouseId: item.defaultWarehouseId,
      beneficiaryEntity: 'مرتجع إلى المستودع المركزي',
      costCenterCode: 'CC-KAS-01',
      recipientName: 'حاتم سلمان ابوالذهب سلمان',
      lines: [
        {
          id: `VL-RET-${row.seq}`,
          itemId: item.id,
          sku: item.sku,
          itemName: item.nameAr,
          enteredQty: parsedQty.enteredQty,
          enteredUom: parsedQty.enteredUom,
          uomFactor: parsedQty.uomFactor,
          baseQty: parsedQty.baseQty,
          unitCost: 0,
          totalCost: 0,
          conditionStatus: 'سليم',
        },
      ],
      totalQtyBase: parsedQty.baseQty,
      totalValue: 0,
      handoverSigned: true,
      handoverSignedAt: `${parsedDate.iso}T15:00:00Z`,
      createdByEmail: 'h.salman.trade@kas.sa',
      createdByName: 'حاتم سلمان ابوالذهب سلمان',
      postedByEmail: 'h.salman.trade@kas.sa',
      postedByName: 'حاتم سلمان ابوالذهب سلمان',
      postedAt: `${parsedDate.iso}T15:05:00Z`,
      migratedFromExcel: true,
      excelRowSeq: row.seq,
      dateAutoCorrected: parsedDate.autoCorrected,
      originalExcelDate: parsedDate.original,
      notes: `مرحل من سجل المرتجع #${row.seq}`,
      createdAt: `${parsedDate.iso}T15:00:00Z`,
    });
  }

  // 4) Process Computer Batteries Fast-Issue Ledger (حجارة الكمبيوتر)
  const smallBatteryItem = itemByCanonical.get('حجارة كمبيوتر صغيرة (AAA)');
  const largeBatteryItem = itemByCanonical.get('حجارة كمبيوتر كبيرة (AA)');
  const fastConsumables: WmsFastConsumableLog[] = [];
  let batIdx = 1;
  for (const row of RAW_BATTERY_LEDGER) {
    if (row.smallQty > 0 && smallBatteryItem) {
      outTotals.set(smallBatteryItem.id, (outTotals.get(smallBatteryItem.id) || 0) + row.smallQty);
      fastConsumables.push({
        id: `FCON-2026-${String(batIdx++).padStart(3, '0')}`,
        company_id: 'KAS',
        date: '2026-10-15',
        recipientName: row.recipientName,
        departmentOrOffice: row.departmentOrOffice,
        itemId: smallBatteryItem.id,
        sku: smallBatteryItem.sku,
        itemName: smallBatteryItem.nameAr,
        batterySize: 'حجر صغير (AAA)',
        qty: row.smallQty,
        uom: 'حجر',
        issuedByName: 'حاتم سلمان ابوالذهب سلمان',
        notes: 'مرحل من دفتر حجارة الكمبيوتر',
      });
    }
    if (row.largeQty > 0 && largeBatteryItem) {
      outTotals.set(largeBatteryItem.id, (outTotals.get(largeBatteryItem.id) || 0) + row.largeQty);
      fastConsumables.push({
        id: `FCON-2026-${String(batIdx++).padStart(3, '0')}`,
        company_id: 'KAS',
        date: '2026-10-15',
        recipientName: row.recipientName,
        departmentOrOffice: row.departmentOrOffice,
        itemId: largeBatteryItem.id,
        sku: largeBatteryItem.sku,
        itemName: largeBatteryItem.nameAr,
        batterySize: 'حجر كبير (AA)',
        qty: row.largeQty,
        uom: 'حجر',
        issuedByName: 'حاتم سلمان ابوالذهب سلمان',
        notes: 'مرحل من دفتر حجارة الكمبيوتر',
      });
    }
  }

  // 5) Compute Live Stock Quants & Auto-Detect ALL Opening Discrepancies!
  const items = Array.from(itemByCanonical.values());
  const quants: WmsStockQuant[] = [];
  const discrepancies: WmsDiscrepancyItem[] = [];
  let discIdx = 1;

  for (const item of items) {
    const inQty = inTotals.get(item.id) || 0;
    const outQty = outTotals.get(item.id) || 0;
    const retQty = retTotals.get(item.id) || 0;
    const netBalance = inQty + retQty - outQty;

    quants.push({
      id: `QNT-${item.id}-${item.defaultWarehouseId}`,
      company_id: 'KAS',
      itemId: item.id,
      warehouseId: item.defaultWarehouseId,
      locationCode: item.defaultLocationCode,
      onHandQty: Math.max(0, netBalance),
      reservedQty: 0,
      updatedAt: '2026-11-18T12:00:00Z',
    });

    if (netBalance < 0) {
      const noIn = inQty === 0;
      discrepancies.push({
        id: `DISC-${String(discIdx++).padStart(3, '0')}`,
        severity: Math.abs(netBalance) >= 20 ? 'عالي' : 'متوسط',
        category: noIn ? 'صرف بدون وارد مقابل' : 'عجز رصيد دفتري',
        excelRef: item.nameAr,
        itemId: item.id,
        sku: item.sku,
        itemName: item.nameAr,
        summary: noIn
          ? `تم صرف (${outQty} ${item.baseUom}) بدون وجود سجل وارد أو رصيد افتتاحي في ملف الإكسل.`
          : `إجمالي الوارد (${inQty}) + المرتجع (${retQty}) أقل من الصادر (${outQty}) بفارق عجز (${netBalance} ${item.baseUom}).`,
        recommendedAction: `إنشاء قيد تسوية رصيد افتتاحي بمقدار (+${Math.abs(netBalance)} ${item.baseUom}) أو تصحيح كمية الإذن.`,
        systemInQty: inQty,
        systemOutQty: outQty,
        systemReturnQty: retQty,
        netGapQty: netBalance,
        status: 'بانتظار المراجعة',
      });
    }
  }

  // Add specific high-priority structural audit findings from the Excel sheet
  const thermalItem = itemByCanonical.get('أكياس تغليف حراري (كرتون / بكتج / كيس)');
  if (thermalItem) {
    discrepancies.unshift({
      id: `DISC-COMPOUND-01`,
      severity: 'عالي',
      category: 'وحدة قياس مركّبة',
      excelRef: 'الوارد #31 • الصادر #23 و #28 • المرتجع #2',
      itemId: thermalItem.id,
      sku: thermalItem.sku,
      itemName: thermalItem.nameAr,
      summary:
        'سُجل الوارد (17 كرتون) بينما سُجل الصادر والمرتجع بصيغة نصية مركّبة ("16 كرتون، 6 بكتج = 10 آلاف كيس"). تم تحويلها تلقائياً بوحدة الأساس (كيس) بمعدل 600 كيس/كرتون.',
      recommendedAction: 'مراجعة معامل التحويل (عدد الأكياس في الكرتون والبكتج) وتأكيد الرصيد الفعلي على الرف.',
      systemInQty: inTotals.get(thermalItem.id) || 0,
      systemOutQty: outTotals.get(thermalItem.id) || 0,
      systemReturnQty: retTotals.get(thermalItem.id) || 0,
      netGapQty: (inTotals.get(thermalItem.id) || 0) + (retTotals.get(thermalItem.id) || 0) - (outTotals.get(thermalItem.id) || 0),
      status: 'بانتظار المراجعة',
    });
  }

  discrepancies.push({
    id: `DISC-DATES-01`,
    severity: 'تنبيه',
    category: 'تاريخ مكسور مصحّح',
    excelRef: `إجمالي ${dateFixCount} حركة تم تصحيح تاريخها آلياً`,
    itemName: 'تواريخ السحب التلقائي (2027/2028/2029) والسنوات الناقصة (206 / 202 / 02026)',
    summary: `تم رصد وتصحيح ${dateFixCount} تاريخاً غير صالح في الإكسل (مثل 26/07/2027، 26/07/2028، 26/07/2029، 22/10/206، 17/09/02026، 25/102026، وتواريخ YYYY-DD-MM المقلوبة) مع حفظ الأصل في سجل التدقيق.`,
    recommendedAction: 'تأكيد اعتماد التواريخ المصحّحة (سنة 2026) وإغلاق التنبيه.',
    status: 'بانتظار المراجعة',
  });

  // Sort discrepancies: High severity first (DVD DRIVE, مشبك صرة, تغليف حراري...)
  const sevOrder = { عالي: 0, متوسط: 1, تنبيه: 2 };
  discrepancies.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  // 6) Sample Loans Registry from CSV sample entries
  const cableTraySample = itemByCanonical.get('عينة كيبل تراي');
  const channelRodSample = itemByCanonical.get('عينة سيخ شانل');
  const humaxSample = itemByCanonical.get('عينة ريسيفر HUMAX HD-ACE');
  const sampleLoans: WmsSampleLoan[] = [
    ...(cableTraySample
      ? [
          {
            id: 'SMP-2026-001',
            company_id: 'KAS' as const,
            loanNo: 'SMP-2026-001',
            itemId: cableTraySample.id,
            sku: cableTraySample.sku,
            itemName: cableTraySample.nameAr,
            qty: 1,
            uom: 'حبة',
            issuedTo: 'فريق المنافسات والمشروع الكهربائي',
            projectOrTender: 'توريد كيبل تراي ومجاري حديد (اعتماد)',
            issueDate: '2026-10-17',
            expectedReturnDate: '2026-10-24',
            actualReturnDate: '2026-10-22',
            status: 'مرتجعة' as const,
            notes: 'أُرجعت للمستودع (سجل المرتجع #4)',
            createdBy: 'حاتم سلمان ابوالذهب سلمان',
          },
        ]
      : []),
    ...(channelRodSample
      ? [
          {
            id: 'SMP-2026-002',
            company_id: 'KAS' as const,
            loanNo: 'SMP-2026-002',
            itemId: channelRodSample.id,
            sku: channelRodSample.sku,
            itemName: channelRodSample.nameAr,
            qty: 1,
            uom: 'حبة',
            issuedTo: 'فريق المنافسات والمشروع الكهربائي',
            projectOrTender: 'توريد كيبل تراي ومجاري حديد (اعتماد)',
            issueDate: '2026-10-17',
            expectedReturnDate: '2026-10-24',
            actualReturnDate: '2026-10-22',
            status: 'مرتجعة' as const,
            notes: 'أُرجعت للمستودع (سجل المرتجع #5)',
            createdBy: 'حاتم سلمان ابوالذهب سلمان',
          },
        ]
      : []),
    ...(humaxSample
      ? [
          {
            id: 'SMP-2026-003',
            company_id: 'KAS' as const,
            loanNo: 'SMP-2026-003',
            itemId: humaxSample.id,
            sku: humaxSample.sku,
            itemName: humaxSample.nameAr,
            qty: 1,
            uom: 'حبة',
            issuedTo: 'إدارة المنافسات — أحمد جمال البشير',
            projectOrTender: 'منافسة توريد ريسيفرات HUMAX HD-ACE',
            issueDate: '2026-10-03',
            expectedReturnDate: '2026-11-10',
            status: 'متأخرة' as const,
            notes: 'عينة اعتماد فني — تم صرف 13 ريسيفر لاحقاً (الوارد 12 + 1 عينة)',
            createdBy: 'حاتم سلمان ابوالذهب سلمان',
          },
        ]
      : []),
  ];

  // Sort vouchers newest first
  vouchers.sort((a, b) => b.voucherDate.localeCompare(a.voucherDate) || b.voucherNo.localeCompare(a.voucherNo));

  cachedDataset = {
    warehouses: WMS_WAREHOUSES,
    categories: WMS_CATEGORIES,
    items,
    quants,
    vouchers,
    serialLots,
    sampleLoans,
    fastConsumables,
    discrepancies,
  };

  return structuredClone(cachedDataset);
}
