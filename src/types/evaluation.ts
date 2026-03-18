export type EvaluationStatus = 'Draft' | 'Scored' | 'Ranked' | 'Approved';
export type EvaluationStrategy = 'single' | 'program-wise';
export type TieBreakerType = 'entrance' | 'academic';

export interface ProgramWeights {
  entrance: number;   // 0–100
  academic: number;   // 0–100
  interview: number;  // 0–100
  // must sum to 100
}

export interface ProgramConfig {
  programId: string;       // lppId
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
  tieBreaker: TieBreakerType | null;
  ranksGenerated: boolean;
  status: EvaluationStatus;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
