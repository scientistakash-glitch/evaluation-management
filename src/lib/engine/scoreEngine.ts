import type { EvaluationScore } from '@/types';

interface Application {
  id: string;
  entranceScore: number;
  academicScore: number;
  interviewScore: number;
}

interface ProgramWeights {
  entrance: number;
  academic: number;
  interview: number;
}

export function computeScores(
  evaluationId: string,
  programId: string,
  weights: ProgramWeights,
  applications: Application[]
): Omit<EvaluationScore, 'id' | 'createdAt' | 'updatedAt'>[] {
  const sum = weights.entrance + weights.academic + weights.interview;
  if (Math.abs(sum - 100) > 0.01) {
    throw new Error(`Weights must sum to 100, got ${sum}`);
  }

  return applications.map((app) => {
    const normalizedEntrance = (app.entranceScore / 300) * 100;
    const compositeScore =
      normalizedEntrance * (weights.entrance / 100) +
      app.academicScore * (weights.academic / 100) +
      app.interviewScore * (weights.interview / 100);

    return {
      evaluationId,
      applicationId: app.id,
      programId,
      entranceScore: app.entranceScore,
      academicScore: app.academicScore,
      interviewScore: app.interviewScore,
      compositeScore: Math.round(compositeScore * 100) / 100,
    };
  });
}
