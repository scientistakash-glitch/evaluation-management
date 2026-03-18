export type CycleStatus = 'Planned' | 'Active' | 'Closed';

export interface Cycle {
  id: string;
  ptatId: string;
  lppId: string;
  academicYear: string;
  cycleNumber: number;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  createdAt: string;
  updatedAt: string;
}
