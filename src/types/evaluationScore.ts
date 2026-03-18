export interface CriterionScore {
  criterionId: string;
  criterionName: string;
  rawScore: number;
  normalizedScore: number;
  weightedContribution: number;
}

export interface EvaluationScore {
  id: string;
  evaluationId: string;
  applicationId: string;
  criterionScores: CriterionScore[];
  compositeScore: number;
  createdAt: string;
  updatedAt: string;
}
