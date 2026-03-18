export interface RankRecord {
  id: string;
  evaluationId: string;
  cycleId: string;
  applicationId: string;
  programId: string;         // 'all' or lppId
  compositeScore: number;
  globalRank: number;
  categoryRank: number;
  category: string;
  tieBreakerValue: number;   // the actual score used for tiebreaking
  tieBreakerType: string;    // 'entrance' | 'academic' | '-'
  createdAt: string;
  updatedAt: string;
}
