export interface BOQItem {
  id: string;
  itemNumber: number;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  unitPriceInWords: string;
  totalPrice: number;
  totalPriceInWords: string;
  vat: number;
  totalWithVat: number;
  totalWithVatInWords: string;
}

export type TenderCategory = 
  | 'احتفالات ومواسم وطنية'
  | 'توريدات حكومية وتجهيزات'
  | 'معارض ومؤتمرات'
  | 'تقنية واتصالات'
  | 'أعمال مدنية وإنشائية'
  | 'تشغيل وصيانة ونظافة'
  | 'تقنية معلومات واتصالات'
  | 'دعاية وإعلان وتنظيم معارض'
  | string;

export type TenderStatus = 
  | 'مسودة قيد الدراسة'
  | 'مقدمة ومسعرة'
  | 'ترسية واعتماد'
  | 'مكتملة ومفوترة'
  | string;

export interface TenderRecord {
  id: string;
  referenceNumber: string;
  title: string;
  entityName: string;
  clientName: string;
  category: TenderCategory;
  status: TenderStatus;
  submissionDate: string;
  supplyDuration: string;
  commitmentDays: number;
  itemsCount: number;
  subtotal: number;
  subtotalInWords: string;
  vatAmount: number;
  vatInWords: string;
  grandTotal: number;
  grandTotalInWords: string;
  items: BOQItem[];
}

export interface SupplierRecord {
  id: string;
  name: string;
  category: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  city: string;
  rating: number;
  qualityScore: number;
  commitmentScore: number;
  priceCompetitiveness: number;
  totalDeals: number;
  totalValue: number;
  lastDealDate?: string;
  status: 'معتمد' | 'تحت التقييم' | 'موقوف' | string;
  notes?: string;
}
