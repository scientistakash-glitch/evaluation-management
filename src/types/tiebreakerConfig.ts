export interface TiebreakerRule {
  order: number;
  criterionId: string;
  criterionName: string;
  direction: 'DESC' | 'ASC';
}

export interface TiebreakerConfig {
  id: string;
  evaluationId: string;
  rules: TiebreakerRule[];
  createdAt: string;
  updatedAt: string;
}
