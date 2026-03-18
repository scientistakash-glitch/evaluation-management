import { getEvaluationById, updateEvaluation } from '../data/evaluations';
import { getEvaluationScoresByProgram } from '../data/evaluationScores';
import { getAllApplications } from '../data/applications';
import {
  createBatch,
  deleteByEvaluationAndProgram,
} from '../data/rankRecords';
import { EvaluationScore, RankRecord } from '@/types';

export async function generateRankings(
  evaluationId: string,
  programId: string
): Promise<void> {
  const evaluation = await getEvaluationById(evaluationId);
  if (!evaluation) throw new Error(`Evaluation ${evaluationId} not found`);

  const tieBreaker = evaluation.tieBreaker; // 'entrance' | 'academic' | null

  // Get EvaluationScores for this evaluationId + programId
  const scores = await getEvaluationScoresByProgram(evaluationId, programId);
  if (scores.length === 0) throw new Error('No scores found for this evaluation/program');

  // Get all applications for category info
  const applications = await getAllApplications();
  const appMap = new Map(applications.map((a) => [a.id, a]));

  // Sort by compositeScore DESC, with tiebreaker
  const sorted = [...scores].sort((a, b) => {
    const diff = b.compositeScore - a.compositeScore;
    if (Math.abs(diff) >= 0.1) return diff;

    // Apply tiebreaker
    if (tieBreaker === 'entrance') {
      return b.entranceScore - a.entranceScore;
    } else if (tieBreaker === 'academic') {
      return b.academicScore - a.academicScore;
    }
    return 0;
  });

  // Detect which application IDs are involved in a tie
  const tiedAppIds = new Set<string>();
  for (let i = 0; i < sorted.length - 1; i++) {
    if (Math.abs(sorted[i].compositeScore - sorted[i + 1].compositeScore) < 0.1) {
      tiedAppIds.add(sorted[i].applicationId);
      tiedAppIds.add(sorted[i + 1].applicationId);
    }
  }

  // Assign globalRank: sequential (index + 1), no gaps
  const globalRankMap = new Map<string, number>();
  sorted.forEach((score, idx) => {
    globalRankMap.set(score.applicationId, idx + 1);
  });

  // Group by category and assign categoryRank within each group
  const categoryGroups = new Map<string, EvaluationScore[]>();
  for (const score of sorted) {
    const app = appMap.get(score.applicationId);
    const category = app?.category ?? 'General';
    if (!categoryGroups.has(category)) categoryGroups.set(category, []);
    categoryGroups.get(category)!.push(score);
  }

  // categoryGroups are already sorted (we sorted `sorted` already, and we iterate in that order)
  const categoryRankMap = new Map<string, number>();
  Array.from(categoryGroups.values()).forEach((catScores) => {
    catScores.forEach((score, idx) => {
      categoryRankMap.set(score.applicationId, idx + 1);
    });
  });

  // Build rank records
  const rankRecords: Omit<RankRecord, 'id' | 'createdAt' | 'updatedAt'>[] = sorted.map((score) => {
    const app = appMap.get(score.applicationId);
    const category = app?.category ?? 'General';
    const isInTie = tiedAppIds.has(score.applicationId);

    let tieBreakerValue = 0;
    let tieBreakerType = '-';

    if (isInTie && tieBreaker) {
      tieBreakerType = tieBreaker;
      tieBreakerValue = tieBreaker === 'entrance' ? score.entranceScore : score.academicScore;
    }

    return {
      evaluationId,
      cycleId: evaluation.cycleId,
      applicationId: score.applicationId,
      programId,
      compositeScore: score.compositeScore,
      globalRank: globalRankMap.get(score.applicationId) ?? 0,
      categoryRank: categoryRankMap.get(score.applicationId) ?? 0,
      category,
      tieBreakerValue,
      tieBreakerType,
    };
  });

  // Delete existing rank records for this evaluation + programId
  await deleteByEvaluationAndProgram(evaluationId, programId);

  // Write new rank records
  await createBatch(rankRecords);

  // Update evaluation
  await updateEvaluation(evaluationId, {
    ranksGenerated: true,
    status: 'Ranked',
  });
}
