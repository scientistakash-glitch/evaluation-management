import { getEvaluationById, updateEvaluation } from '../data/evaluations';
import { getEvaluationScoresByProgram } from '../data/evaluationScores';
import { getAllApplications } from '../data/applications';
import {
  createBatch,
  deleteByEvaluationAndProgram,
} from '../data/rankRecords';
import type { EvaluationScore, RankRecord } from '@/types';
import type { TiebreakerRule } from '@/types/tiebreakerConfig';

function getScoreForCriterion(score: EvaluationScore, criterionId: string): number {
  if (criterionId === 'entrance') return score.entranceScore;
  if (criterionId === 'academic') return score.academicScore;
  if (criterionId === 'interview') return score.interviewScore;
  return 0;
}

function compareWithTiebreakers(
  a: EvaluationScore,
  b: EvaluationScore,
  rules: TiebreakerRule[]
): number {
  // Primary sort: compositeScore DESC
  const compositeDiff = b.compositeScore - a.compositeScore;
  if (Math.abs(compositeDiff) >= 0.01) return compositeDiff;

  // Walk tiebreaker rules in priority order
  for (const rule of rules) {
    const aVal = getScoreForCriterion(a, rule.criterionId);
    const bVal = getScoreForCriterion(b, rule.criterionId);
    const diff = rule.direction === 'DESC' ? bVal - aVal : aVal - bVal;
    if (Math.abs(diff) >= 0.01) return diff;
  }

  // Last resort: applicationId alphabetical (guarantees unique ranks)
  return a.applicationId.localeCompare(b.applicationId);
}

export async function generateRankings(
  evaluationId: string,
  programId: string
): Promise<void> {
  const evaluation = await getEvaluationById(evaluationId);
  if (!evaluation) throw new Error(`Evaluation ${evaluationId} not found`);

  const tiebreakerRules: TiebreakerRule[] = (evaluation.tiebreakerRules ?? [])
    .slice()
    .sort((a, b) => a.order - b.order);

  // Get EvaluationScores for this evaluationId + programId
  const scores = await getEvaluationScoresByProgram(evaluationId, programId);
  if (scores.length === 0) throw new Error('No scores found for this evaluation/program');

  // Get all applications for category info
  const applications = await getAllApplications();
  const appMap = new Map(applications.map((a) => [a.id, a]));

  // Sort with full tiebreaker chain — guaranteed unique order
  const sorted = [...scores].sort((a, b) =>
    compareWithTiebreakers(a, b, tiebreakerRules)
  );

  // Global rank: strictly sequential (no ties)
  const globalRankMap = new Map<string, number>();
  sorted.forEach((score, idx) => {
    globalRankMap.set(score.applicationId, idx + 1);
  });

  // Category rank: sequential within each category, preserving global sort order
  const categoryGroups = new Map<string, EvaluationScore[]>();
  for (const score of sorted) {
    const app = appMap.get(score.applicationId);
    const category = app?.category ?? 'General';
    if (!categoryGroups.has(category)) categoryGroups.set(category, []);
    categoryGroups.get(category)!.push(score);
  }
  const categoryRankMap = new Map<string, number>();
  Array.from(categoryGroups.values()).forEach((catScores) => {
    catScores.forEach((score, idx) => {
      categoryRankMap.set(score.applicationId, idx + 1);
    });
  });

  // Program rank: for program-wise, re-rank within this LPP scope
  // For single strategy (programId = 'all'), programRank = globalRank
  const programRankMap = new Map<string, number>();
  sorted.forEach((score, idx) => {
    programRankMap.set(score.applicationId, idx + 1);
  });

  // Determine which applicants had tiebreaker applied (composite score within 0.01 of neighbour)
  const tiedAppIds = new Set<string>();
  for (let i = 0; i < sorted.length - 1; i++) {
    if (Math.abs(sorted[i].compositeScore - sorted[i + 1].compositeScore) < 0.01) {
      tiedAppIds.add(sorted[i].applicationId);
      tiedAppIds.add(sorted[i + 1].applicationId);
    }
  }

  // Build rank records
  const rankRecords: Omit<RankRecord, 'id' | 'createdAt' | 'updatedAt'>[] = sorted.map((score) => {
    const app = appMap.get(score.applicationId);
    const category = app?.category ?? 'General';
    const tieBreakerApplied = tiedAppIds.has(score.applicationId);

    const tieBreakerValues: Record<string, number> = {};
    if (tieBreakerApplied) {
      for (const rule of tiebreakerRules) {
        tieBreakerValues[rule.criterionId] = getScoreForCriterion(score, rule.criterionId);
      }
    }

    return {
      evaluationId,
      cycleId: evaluation.cycleId,
      applicationId: score.applicationId,
      programId,
      compositeScore: score.compositeScore,
      globalRank: globalRankMap.get(score.applicationId) ?? 0,
      programRank: programRankMap.get(score.applicationId) ?? 0,
      categoryRank: categoryRankMap.get(score.applicationId) ?? 0,
      category,
      tieBreakerValues,
      tieBreakerApplied,
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
