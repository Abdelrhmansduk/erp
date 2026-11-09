export interface KasTenderItem {
  id: string;
  sheetName: string;
  seq: number | string;
  company: string;
  tenderCode: string;
  title: string;
  referenceNumber: string;
  tenderNumber: string;
  entity: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  startDate: string;
  deadlineDate: string;
  durationDays: number | string;
  executionDuration: string;
  bidValue: number;
  winningBidValue: number;
  notes: string;
  rejectionReason: string;
  biddersCount: number;
  boqStatus: string;
  filePrepStatus: string;
  reviewStatus: string;
  sampleDeliveryStatus: string;
  awardingStatus: string;
  approvalsStatus: string;
  platformType: string;
  platformContractStatus: string;
  completionCertStatus: string;
  city: string;
  supplyDurationDays: string;
  supplyStartDate: string;
  supplyEndDate: string;
  estimatedCost: number;
  profitPercentage: number;
  sampleRequired: string;
  siteVisitRequired: string;
}

export type SheetCategory = 'all' | 'companies' | 'medical' | 'monthly' | 'archive';

export interface KasSheetMeta {
  name: string;
  label: string;
  category: 'companies' | 'medical' | 'monthly' | 'archive';
  badge?: string;
  icon?: string;
  count?: number;
}

export interface KasKPIStats {
  totalTenders: number;
  totalBidValue: number;
  totalWinningValue: number;
  wonCount: number;
  highBidCount: number;
  cancelledCount: number;
  pendingCount: number;
  nonCompliantCount: number;
  winRate: number;
  avgBidValue: number;
  topEntities: { name: string; count: number; value: number }[];
}
