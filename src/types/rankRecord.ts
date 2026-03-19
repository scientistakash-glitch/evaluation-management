export interface RankRecord {
  id: string;
  evaluationId: string;
  cycleId: string;
  applicationId: string;
  programId: string;         // 'all' or lppId
  compositeScore: number;
  globalRank: number;
  programRank: number;       // rank within the specific LPP (or same as globalRank if single strategy)
  categoryRank: number;
  category: string;
  tieBreakerValues: Record<string, number>;  // criterionId → score used for tiebreaking
  tieBreakerApplied: boolean;
  createdAt: string;
  updatedAt: string;
}
