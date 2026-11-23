import type { WmsItem, WmsVoucherType } from '../types/wms';

const ARABIC_DIGITS_MAP: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
};

/**
 * Normalizes Arabic & English text for resilient search:
 * - Unifies Alef/Hamza variants (أ إ آ ٱ -> ا), Teh Marbuta (ة -> ه), Alef Maksura (ى -> ي)
 * - Strips Arabic diacritics (tashkeel) and tatweel (ـ)
 * - Converts Eastern Arabic / Persian numerals to Western digits (0-9)
 * - Lowercases Latin text and collapses whitespace
 */
export function normalizeArabicText(value: unknown): string {
  if (value === null || value === undefined || value === false) return '';
  return String(value)
    .replace(/[٠-٩۰-۹]/g, (d) => ARABIC_DIGITS_MAP[d] ?? d)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/[ئى]/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Multi-token smart search across multiple item/voucher fields.
 * Every space-separated token in `query` must appear somewhere in the combined fields.
 */
export function matchesSmartSearch(
  query: string,
  fields: Array<string | number | undefined | null | false>
): boolean {
  const normalizedQuery = normalizeArabicText(query);
  if (!normalizedQuery) return true;
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = fields
    .filter((f): f is string | number => f !== null && f !== undefined && f !== false && f !== '')
    .map((f) => normalizeArabicText(f))
    .join(' ');

  return tokens.every((tok) => haystack.includes(tok));
}

export const DEFAULT_WMS_ITEM_TYPES: string[] = [
  'أصل / عهدة مستديمة',
  'مستهلك تشغيلي',
  'أجهزة كهربائية',
  'أجهزة تقنية وإلكترونيات',
  'أثاث وتجهيزات مكتبية',
  'مستلزمات طبية',
  'مواد كهرباء وسباكة وصيانة',
  'قرطاسية ومطبوعات',
  'ضيافة وبوفيه',
  'شحنات تجارية (أمازون)',
  'عينات ومنافسات',
];

export const DEFAULT_WMS_UNITS: string[] = [
  'حبة',
  'كرتون',
  'درزن',
  'طقم',
  'علبة',
  'كيس',
  'متر',
  'لفة',
  'بكتج',
  'شدة',
  'شريحة',
  'حجر',
  'زوج',
  'جالون',
  'لتر',
  'كجم',
];

export const VOUCHER_TYPE_ARABIC_KEYWORDS: Record<WmsVoucherType, string> = {
  GRN: 'وارد توريد استلام اضافة grn شراء',
  GIN: 'صادر صرف تسليم اخراج gin استهلاك',
  SRN: 'مرتجع ارجاع عائد srn',
  STR: 'تحويل مناقلة نقل مستودع str',
  ADJ: 'تسوية جرد تعديل رصيد adj',
  SAMPLE: 'عينة عينات معرض sample smp',
  RTV: 'مرتجع مورد مشتريات rtv',
  SCRAP: 'اتلاف تكهين تالف هالك scrap',
};

export function resolveItemTypeLabel(
  item: Pick<WmsItem, 'itemType' | 'isCustodyEligible' | 'isFastConsumable' | 'isSampleItem' | 'categoryId'>,
  categoryCode?: string
): string {
  if (item.itemType && item.itemType.trim()) {
    return item.itemType.trim();
  }
  if (item.isSampleItem) return 'عينات ومنافسات';
  if (item.isFastConsumable) return 'مستهلك تشغيلي';
  const code = (categoryCode || item.categoryId || '').toUpperCase();
  if (code.includes('IT')) return 'أجهزة تقنية وإلكترونيات';
  if (code.includes('MED')) return 'مستلزمات طبية';
  if (code.includes('MEP')) return 'مواد كهرباء وسباكة وصيانة';
  if (code.includes('AMZ')) return 'شحنات تجارية (أمازون)';
  if (code.includes('CON')) return 'ضيافة وبوفيه';
  if (code.includes('FUR')) return item.isCustodyEligible ? 'أجهزة كهربائية' : 'أثاث وتجهيزات مكتبية';
  if (item.isCustodyEligible) return 'أصل / عهدة مستديمة';
  return 'مستهلك تشغيلي';
}
