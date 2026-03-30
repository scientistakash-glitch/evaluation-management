export type CycleStatus = 'Planned' | 'Active' | 'Closed' | 'Approved' | 'Released';

export interface CycleDateRange {
  start: string;  // ISO datetime string e.g. "2026-06-01T09:00"
  end: string;
}

export interface CycleTimeline {
  applicationPeriod: CycleDateRange;
  scoringPeriod: CycleDateRange;
  offerReleasePeriod: CycleDateRange;
  acceptancePeriod: CycleDateRange;
  paymentPeriod: CycleDateRange;
}

export interface Cycle {
  id: string;
  name: string;
  number: number;
  academicYear: string;       // "2026-2027"
  hasPreviousCycle: boolean;
  ptatId: string;             // program group ID
  lppIds: string[];           // associated programs under this PTAT
  timeline: CycleTimeline;
  evaluationStrategy: 'single' | 'program-wise' | null;
  status: CycleStatus;
  createdAt: string;
  updatedAt: string;
}
