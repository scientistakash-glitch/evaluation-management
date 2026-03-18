import { getEvaluationById, updateEvaluation } from '../data/evaluations';
import { getAllApplications } from '../data/applications';
import { getCriteriaSetById } from '../data/criteriaSets';
import {
  createEvaluationScoresBatch,
  deleteEvaluationScoresByEvaluationId,
} from '../data/evaluationScores';
import { validateWeightageSum } from '../utils/validators';
import { Criterion, CriterionScore, EvaluationScore } from '@/types';

export async function runEvaluation(evaluationId: string): Promise<void> {
  const evaluation = await getEvaluationById(evaluationId);
  if (!evaluation) throw new Error(`Evaluation ${evaluationId} not found`);

  // Get criteria
  let criteria: Criterion[] = [];
  if (evaluation.customCriteria && evaluation.customCriteria.length > 0) {
    criteria = evaluation.customCriteria;
  } else if (evaluation.criteriaSetId) {
    const cs = await getCriteriaSetById(evaluation.criteriaSetId);
    if (!cs) throw new Error(`CriteriaSet ${evaluation.criteriaSetId} not found`);
    criteria = cs.criteria;
  } else {
    throw new Error('No criteria defined for this evaluation');
  }

  // Validate weightages sum to 100
  const weightageError = validateWeightageSum(criteria);
  if (weightageError) throw new Error(weightageError);

  const applications = await getAllApplications();

  // Min-max normalize per criterion
  const normalizedMap: Record<string, Record<string, number>> = {};

  for (const criterion of criteria) {
    if (!criterion.sourceField) continue;
    const field = criterion.sourceField as 'entranceScore' | 'academicScore';
    const rawValues = applications.map((a) => a[field] as number);
    const minVal = Math.min(...rawValues);
    const maxVal = Math.max(...rawValues);
    const range = maxVal - minVal;

    normalizedMap[criterion.id] = {};
    for (const app of applications) {
      const raw = app[field] as number;
      const normalized = range === 0 ? 100 : ((raw - minVal) / range) * 100;
      normalizedMap[criterion.id][app.id] = normalized;
    }
  }

  // Compute composite scores
  const scoreRecords: Omit<EvaluationScore, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  for (const app of applications) {
    const criterionScores: CriterionScore[] = [];
    let compositeScore = 0;

    for (const criterion of criteria) {
      let rawScore = 0;
      let normalizedScore = 0;

      if (criterion.sourceField) {
        const field = criterion.sourceField as 'entranceScore' | 'academicScore';
        rawScore = app[field] as number;
        normalizedScore = normalizedMap[criterion.id]?.[app.id] ?? 0;
      }

      const weightedContribution = (normalizedScore * criterion.weightage) / 100;
      compositeScore += weightedContribution;

      criterionScores.push({
        criterionId: criterion.id,
        criterionName: criterion.name,
        rawScore,
        normalizedScore,
        weightedContribution,
      });
    }

    scoreRecords.push({
      evaluationId,
      applicationId: app.id,
      criterionScores,
      compositeScore,
    });
  }

  // Delete existing scores and write new ones
  await deleteEvaluationScoresByEvaluationId(evaluationId);
  await createEvaluationScoresBatch(scoreRecords);

  // Update evaluation status
  await updateEvaluation(evaluationId, {
    status: 'Scored',
    scoredAt: new Date().toISOString(),
  });
}
