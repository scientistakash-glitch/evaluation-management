export interface EvaluationScore {
  id: string;
  evaluationId: string;
  applicationId: string;
  programId: string;       // 'all' for single, lppId for program-wise
  entranceScore: number;
  academicScore: number;
  interviewScore: number;
  compositeScore: number;
  createdAt: string;
  updatedAt: string;
}
