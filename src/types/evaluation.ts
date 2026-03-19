import type { TiebreakerRule } from './tiebreakerConfig';

export type EvaluationStatus = 'Draft' | 'Scored' | 'Ranked' | 'Approved';
export type EvaluationStrategy = 'single' | 'program-wise';

export interface ProgramWeights {
  entrance: number;   // 0–100
  academic: number;   // 0–100
  interview: number;  // 0–100
  // must sum to 100
}

export interface ProgramConfig {
  programId: string;       // lppId or 'all'
  programName: string;
  weights: ProgramWeights;
  scoresGenerated: boolean;
}

export interface Evaluation {
  id: string;
  cycleId: string;
  strategy: EvaluationStrategy | null;
  // For 'single': one config in programConfigs with programId = 'all'
  // For 'program-wise': one config per lppId
  programConfigs: ProgramConfig[];
  tiebreakerRules: TiebreakerRule[];  // ordered list; last resort = applicationId alphabetical
  ranksGenerated: boolean;
  status: EvaluationStatus;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
