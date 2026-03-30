export interface OfferConfigRow {
  programId: string;
  programName: string;
  categoryName: string;
  subcategoryName: string;
  approvedIntake: number;
  committed: number;
  availableSeats: number;
  applicants: number;
  eligiblePool: number;
  offersToRelease: number;
}

export interface OfferSummary {
  released: number;
  pending: number;
  accepted: number;
  withdrawn: number;
}

export interface StudentOfferResult {
  applicationId: string;
  studentName: string;
  rollNumber: string;
  category: string;
  compositeScore: number;
  programResults: Record<string, { status: string; waitlistNumber?: number; categoryRank: number }>;
  awardedProgramId: string | null;
  awardedPreferenceOrder: number | null;
  acceptanceStatus?: 'Pending' | 'Accepted' | 'Withdrawn';
  cycleAllotmentType?: 'Fresh' | 'Upgraded' | 'StatusQuo' | 'Waitlisted';
  upgradedFromProgramId?: string;
  upgradedFromCycleId?: string;
  previousProgramFee?: number;
  newProgramFee?: number;
  feeDelta?: number;
}

export interface OfferRelease {
  id: string;
  cycleId: string;
  configRows: OfferConfigRow[];
  summary: OfferSummary;
  studentResults: StudentOfferResult[];
  createdAt: string;
}
