export type EvaluationStatus = 'Draft' | 'Scored' | 'Ranked';

export interface Evaluation {
  id: string;
  cycleId: string;
  criteriaSetId?: string;
  customCriteria?: import('./criteriaSet').Criterion[];
  status: EvaluationStatus;
  scoredAt?: string;
  rankedAt?: string;
  createdAt: string;
  updatedAt: string;
}
