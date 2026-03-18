import { getEvaluationById, updateEvaluation } from '../data/evaluations';
import { getAllApplications } from '../data/applications';
import {
  createBatch,
  deleteByEvaluationAndProgram,
} from '../data/evaluationScores';
import { EvaluationScore, ProgramConfig } from '@/types';

export async function generateCompositeScores(
  evaluationId: string,
  programId: string   // 'all' or specific lppId
): Promise<void> {
  const evaluation = await getEvaluationById(evaluationId);
  if (!evaluation) throw new Error(`Evaluation ${evaluationId} not found`);

  // Find programConfig for this programId
  const programConfig: ProgramConfig | undefined = evaluation.programConfigs.find(
    (pc) => pc.programId === programId
  );
  if (!programConfig) throw new Error(`ProgramConfig for programId ${programId} not found`);

  const { weights } = programConfig;

  // Validate sum = 100
  const sum = weights.entrance + weights.academic + weights.interview;
  if (Math.abs(sum - 100) > 0.01) {
    throw new Error(`Weights must sum to 100, got ${sum}`);
  }

  const applications = await getAllApplications();

  // Build score records
  const scoreRecords: Omit<EvaluationScore, 'id' | 'createdAt' | 'updatedAt'>[] = applications.map((app) => {
    // Normalize entrance to 0-100 scale (max 300)
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

  // Delete existing scores for this evaluation + programId
  await deleteByEvaluationAndProgram(evaluationId, programId);

  // Write new scores
  await createBatch(scoreRecords);

  // Mark programConfig.scoresGenerated = true
  const updatedConfigs = evaluation.programConfigs.map((pc) =>
    pc.programId === programId ? { ...pc, scoresGenerated: true } : pc
  );

  // Update evaluation
  await updateEvaluation(evaluationId, {
    programConfigs: updatedConfigs,
    status: 'Scored',
  });
}
