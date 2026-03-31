import type { RankRecord } from '@/types';
import type { TiebreakerRule } from '@/types/tiebreakerConfig';

interface EvaluationScoreInput {
  applicationId: string;
  programId: string;
  entranceScore: number;
  academicScore: number;
  interviewScore: number;
  compositeScore: number;
}

interface ApplicationInput {
  id: string;
  category: string;
  lppPreference?: string;
  lppPreferences?: { lppId: string; preferenceOrder: number }[];
}

function getScoreForCriterion(score: EvaluationScoreInput, criterionId: string): number {
  if (criterionId === 'entrance') return score.entranceScore;
  if (criterionId === 'academic') return score.academicScore;
  if (criterionId === 'interview') return score.interviewScore;
  return 0;
}

function compareWithTiebreakers(
  a: EvaluationScoreInput,
  b: EvaluationScoreInput,
  rules: TiebreakerRule[]
): number {
  const compositeDiff = b.compositeScore - a.compositeScore;
  if (Math.abs(compositeDiff) >= 0.01) return compositeDiff;

  for (const rule of rules) {
    const aVal = getScoreForCriterion(a, rule.criterionId);
    const bVal = getScoreForCriterion(b, rule.criterionId);
    const diff = rule.direction === 'DESC' ? bVal - aVal : aVal - bVal;
    if (Math.abs(diff) >= 0.01) return diff;
  }

  return a.applicationId.localeCompare(b.applicationId);
}

export function computeRankings(
  evaluationId: string,
  programId: string,
  cycleId: string,
  tiebreakerRules: TiebreakerRule[],
  evaluationScores: EvaluationScoreInput[],
  applications: ApplicationInput[]
): Omit<RankRecord, 'createdAt' | 'updatedAt'>[] {
  if (evaluationScores.length === 0) {
    return [];
  }

  const sortedRules = [...tiebreakerRules].sort((a, b) => a.order - b.order);
  const appMap = new Map(applications.map((a) => [a.id, a]));

  const sorted = [...evaluationScores].sort((a, b) =>
    compareWithTiebreakers(a, b, sortedRules)
  );

  // Global rank
  const globalRankMap = new Map<string, number>();
  sorted.forEach((score, idx) => globalRankMap.set(score.applicationId, idx + 1));

  // Category rank
  const categoryGroups = new Map<string, EvaluationScoreInput[]>();
  for (const score of sorted) {
    const category = appMap.get(score.applicationId)?.category ?? 'General';
    if (!categoryGroups.has(category)) categoryGroups.set(category, []);
    categoryGroups.get(category)!.push(score);
  }
  const categoryRankMap = new Map<string, number>();
  Array.from(categoryGroups.values()).forEach((catScores) => {
    catScores.forEach((score, idx) => categoryRankMap.set(score.applicationId, idx + 1));
  });

  // Program rank (sequential within this scope, same as global for single strategy)
  const programRankMap = new Map<string, number>();
  sorted.forEach((score, idx) => programRankMap.set(score.applicationId, idx + 1));

  // Detect ties (tiebreaker applied)
  const tiedAppIds = new Set<string>();
  for (let i = 0; i < sorted.length - 1; i++) {
    if (Math.abs(sorted[i].compositeScore - sorted[i + 1].compositeScore) < 0.01) {
      tiedAppIds.add(sorted[i].applicationId);
      tiedAppIds.add(sorted[i + 1].applicationId);
    }
  }

  return sorted.map((score) => {
    const category = appMap.get(score.applicationId)?.category ?? 'General';
    const tieBreakerApplied = tiedAppIds.has(score.applicationId);

    const tieBreakerValues: Record<string, number> = {};
    if (tieBreakerApplied) {
      for (const rule of sortedRules) {
        tieBreakerValues[rule.criterionId] = getScoreForCriterion(score, rule.criterionId);
      }
    }

    const app = appMap.get(score.applicationId);
    const prefEntry = app?.lppPreferences?.find((p) => p.lppId === programId);
    const preferenceOrder = prefEntry?.preferenceOrder ?? 1;

    return {
      id: `rr_${evaluationId}_${score.applicationId}_${programId}`,
      evaluationId,
      cycleId,
      applicationId: score.applicationId,
      programId,
      compositeScore: score.compositeScore,
      globalRank: globalRankMap.get(score.applicationId) ?? 0,
      programRank: programRankMap.get(score.applicationId) ?? 0,
      categoryRank: categoryRankMap.get(score.applicationId) ?? 0,
      category,
      tieBreakerValues,
      tieBreakerApplied,
      preferenceOrder,
    };
  });
}
