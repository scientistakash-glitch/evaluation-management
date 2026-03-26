export interface OfferConfigRow {
  programId: string;
  programName: string;
  category: string;
  availableSeats: number;
  offersToRelease: number;
}

export type OfferStatus = 'Offered' | 'Waitlisted' | 'None';

export interface ProgramOfferResult {
  status: OfferStatus;
  waitlistNumber?: number;
  categoryRank: number;
}

export interface StudentOfferResult {
  applicationId: string;
  studentName: string;
  rollNumber: string;
  category: string;
  compositeScore: number;
  programResults: Record<string, ProgramOfferResult>;
  awardedProgramId: string | null;
}
