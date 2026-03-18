export type CycleStatus = 'Planned' | 'Active' | 'Closed' | 'Approved';

export interface CycleTimeline {
  startDate: string;        // ISO date
  offerReleaseDate: string;
  acceptanceDeadline: string;
  paymentDeadline: string;
  closingDate: string;
}

export interface Cycle {
  id: string;
  name: string;
  number: number;
  academicYear: string;       // "2024-2025"
  hasPreviousCycle: boolean;
  ptatId: string;             // program group ID
  lppIds: string[];           // associated programs under this PTAT
  timeline: CycleTimeline;
  evaluationStrategy: 'single' | 'program-wise' | null; // set in Step 5
  status: CycleStatus;
  createdAt: string;
  updatedAt: string;
}
