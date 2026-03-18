export interface RankRecord {
  id: string;
  evaluationId: string;
  cycleId: string;
  applicationId: string;
  compositeScore: number;
  globalRank: number;
  categoryRank: number;
  category: string;
  tiebreakerValues: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}
