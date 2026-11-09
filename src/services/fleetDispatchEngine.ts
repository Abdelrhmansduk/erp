/**
 * YAQOOT FLEXIBLE RENTAL & FLEET DISPATCH ENGINE (TASK-203, TASK-204)
 * Blueprint: prd.md §4.2 & architecture.md §2.1
 * Provides dynamic rental package pricing, geospatial Haversine clustering,
 * driver route optimization for morning/evening shifts, and OTP delivery confirmation.
 */

export type RentalPackageDuration = '4_HOURS' | '8_HOURS' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type ShiftWindow = 'MORNING_08_12' | 'AFTERNOON_13_17' | 'EVENING_18_22' | 'FULL_DAY' | 'RESIDENT';

export interface GeoCoordinate {
  lat: number;
  lng: number;
  districtAr?: string;
}

export interface RentalPricingResult {
  packageDuration: RentalPackageDuration;
  shiftWindow: ShiftWindow;
  visitsCount: number;
  basePriceBeforeVat: number;
  discountAmount: number;
  netSubtotal: number;
  vatAmount: number;
  grandTotal: number;
}

export interface DispatchVisitStop {
  visitId: string;
  contractId: string;
  clientName: string;
  clientPhone: string;
  workerId: string;
  workerName: string;
  shiftWindow: ShiftWindow;
  coordinates: GeoCoordinate;
  deliveryOtp: string;
  status: 'SCHEDULED' | 'EN_ROUTE' | 'DELIVERED' | 'PICKED_UP';
  deliveredAt?: string;
}

export interface OptimizedDriverRoute {
  driverId: string;
  driverName: string;
  vehiclePlate: string;
  shiftWindow: ShiftWindow;
  orderedStops: Array<DispatchVisitStop & { distanceFromPreviousKm: number; estimatedEtaMinutes: number }>;
  totalDistanceKm: number;
  totalEstimatedMinutes: number;
}

export interface AtsCandidateEvaluationInput {
  candidateId: string;
  fullName: string;
  yearsOfExperience: number;
  requiredYears: number;
  matchedSkills: string[];
  requiredSkills: string[];
  certificationsCount: number;
  interviewRatingOutOf5: number;
  expectedSalarySar: number;
  budgetMaxSar: number;
}

export interface AtsCandidateScoreResult {
  candidateId: string;
  fullName: string;
  totalScore: number; // 0 - 100
  experienceScore: number;
  skillsScore: number;
  interviewScore: number;
  budgetAlignmentScore: number;
  recommendation: 'STRONG_HIRE' | 'SHORTLIST' | 'HOLD' | 'REJECT';
  summaryAr: string;
}

const BASE_PACKAGE_RATES_SAR: Record<RentalPackageDuration, { baseRate: number; defaultVisits: number; discountPct: number }> = {
  '4_HOURS': { baseRate: 135, defaultVisits: 1, discountPct: 0 },
  '8_HOURS': { baseRate: 240, defaultVisits: 1, discountPct: 5 },
  DAILY: { baseRate: 260, defaultVisits: 1, discountPct: 0 },
  WEEKLY: { baseRate: 1150, defaultVisits: 6, discountPct: 8 },
  MONTHLY: { baseRate: 3450, defaultVisits: 26, discountPct: 12 },
  QUARTERLY: { baseRate: 9800, defaultVisits: 78, discountPct: 15 },
  ANNUAL: { baseRate: 36000, defaultVisits: 312, discountPct: 20 },
};

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates.
 */
export function calculateHaversineDistanceKm(a: GeoCoordinate, b: GeoCoordinate): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Number((R * c).toFixed(2));
}

export const fleetDispatchEngine = {
  /**
   * Computes dynamic flexible rental pricing (`YAQ` - TASK-203) with 15% VAT and shift adjustments.
   */
  calculateRentalPackagePrice(params: {
    packageDuration: RentalPackageDuration;
    shiftWindow: ShiftWindow;
    customVisitsCount?: number;
    promoDiscountPct?: number;
  }): RentalPricingResult {
    const config = BASE_PACKAGE_RATES_SAR[params.packageDuration];
    const visitsCount = params.customVisitsCount ?? config.defaultVisits;
    const eveningSurcharge = params.shiftWindow === 'EVENING_18_22' ? 1.08 : 1.0;

    const rawBase =
      params.customVisitsCount && params.packageDuration === '4_HOURS'
        ? config.baseRate * visitsCount * eveningSurcharge
        : config.baseRate * eveningSurcharge;

    const basePriceBeforeVat = Number(rawBase.toFixed(2));
    const totalDiscountPct = Math.min(35, config.discountPct + (params.promoDiscountPct || 0));
    const discountAmount = Number(((basePriceBeforeVat * totalDiscountPct) / 100).toFixed(2));
    const netSubtotal = Number((basePriceBeforeVat - discountAmount).toFixed(2));
    const vatAmount = Number((netSubtotal * 0.15).toFixed(2));
    const grandTotal = Number((netSubtotal + vatAmount).toFixed(2));

    return {
      packageDuration: params.packageDuration,
      shiftWindow: params.shiftWindow,
      visitsCount,
      basePriceBeforeVat,
      discountAmount,
      netSubtotal,
      vatAmount,
      grandTotal,
    };
  },

  /**
   * Optimizes driver dispatch route using Nearest-Neighbor geospatial sorting (TASK-204).
   */
  optimizeDriverRoute(params: {
    driverId: string;
    driverName: string;
    vehiclePlate: string;
    shiftWindow: ShiftWindow;
    depotOrigin: GeoCoordinate;
    stops: DispatchVisitStop[];
  }): OptimizedDriverRoute {
    const remaining = params.stops.filter((s) => s.shiftWindow === params.shiftWindow);
    const orderedStops: Array<DispatchVisitStop & { distanceFromPreviousKm: number; estimatedEtaMinutes: number }> = [];
    let currentPoint = params.depotOrigin;
    let totalDistanceKm = 0;
    let cumulativeMinutes = 0;

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const dist = calculateHaversineDistanceKm(currentPoint, remaining[i].coordinates);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      const [nextStop] = remaining.splice(nearestIdx, 1);
      const legMinutes = Math.max(4, Math.ceil((nearestDist / 40) * 60)); // Avg urban speed 40km/h
      totalDistanceKm = Number((totalDistanceKm + nearestDist).toFixed(2));
      cumulativeMinutes += legMinutes;

      orderedStops.push({
        ...nextStop,
        distanceFromPreviousKm: nearestDist,
        estimatedEtaMinutes: cumulativeMinutes,
      });

      currentPoint = nextStop.coordinates;
    }

    return {
      driverId: params.driverId,
      driverName: params.driverName,
      vehiclePlate: params.vehiclePlate,
      shiftWindow: params.shiftWindow,
      orderedStops,
      totalDistanceKm,
      totalEstimatedMinutes: cumulativeMinutes,
    };
  },

  /**
   * Verifies customer OTP upon worker drop-off to confirm safe delivery (TASK-204).
   */
  verifyDeliveryOtp(stop: DispatchVisitStop, providedOtp: string): DispatchVisitStop {
    if (!providedOtp || providedOtp.trim() !== stop.deliveryOtp.trim()) {
      throw new Error('رمز التحقق من التسليم (OTP) غير صحيح. يرجى التحقق من الرمز المرسل لجوال العميل.');
    }
    return {
      ...stop,
      status: 'DELIVERED',
      deliveredAt: new Date().toISOString(),
    };
  },

  /**
   * Evaluates and ranks Executive Headhunting candidates for Top Talent (`TOP` - TASK-205 / prd.md §4.3).
   */
  scoreHeadhuntCandidate(input: AtsCandidateEvaluationInput): AtsCandidateScoreResult {
    const expRatio = Math.min(1.25, input.yearsOfExperience / Math.max(1, input.requiredYears));
    const experienceScore = Math.round(Math.min(30, expRatio * 24));

    const skillRatio =
      input.requiredSkills.length > 0
        ? input.matchedSkills.length / input.requiredSkills.length
        : 1;
    const skillsScore = Math.round(Math.min(35, skillRatio * 30 + Math.min(5, input.certificationsCount * 2)));

    const interviewScore = Math.round(Math.min(20, (Math.max(0, input.interviewRatingOutOf5) / 5) * 20));

    let budgetAlignmentScore = 15;
    if (input.expectedSalarySar > input.budgetMaxSar) {
      const overagePct = (input.expectedSalarySar - input.budgetMaxSar) / Math.max(1, input.budgetMaxSar);
      budgetAlignmentScore = Math.max(0, Math.round(15 * (1 - overagePct * 2)));
    }

    const totalScore = Math.min(100, experienceScore + skillsScore + interviewScore + budgetAlignmentScore);

    let recommendation: AtsCandidateScoreResult['recommendation'] = 'REJECT';
    let summaryAr = 'المرشح غير مطابق للحد الأدنى من متطلبات الوظيفة.';
    if (totalScore >= 85) {
      recommendation = 'STRONG_HIRE';
      summaryAr = 'مرشح تنفيذي متميز مطابق للمهارات والميزانية — يوصى بإصدار العرض الوظيفي فوراً.';
    } else if (totalScore >= 70) {
      recommendation = 'SHORTLIST';
      summaryAr = 'مرشح مؤهل للقائمة القصيرة وإجراء المقابلة النهائية مع العميل.';
    } else if (totalScore >= 55) {
      recommendation = 'HOLD';
      summaryAr = 'مرشح احتياطي (Hold) — يحتاج تفاوضاً على الراتب أو تقييماً إضافياً.';
    }

    return {
      candidateId: input.candidateId,
      fullName: input.fullName,
      totalScore,
      experienceScore,
      skillsScore,
      interviewScore,
      budgetAlignmentScore,
      recommendation,
      summaryAr,
    };
  },
};
