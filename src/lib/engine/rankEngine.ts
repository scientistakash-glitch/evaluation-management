import { getEvaluationById, updateEvaluation } from '../data/evaluations';
import { getAllEvaluationScores } from '../data/evaluationScores';
import { getTiebreakerConfigByEvaluationId } from '../data/tiebreakerConfigs';
import { getAllApplications } from '../data/applications';
import {
  createRankRecordsBatch,
  deleteRankRecordsByEvaluationId,
} from '../data/rankRecords';
import { EvaluationScore, TiebreakerConfig, RankRecord } from '@/types';

function getTiebreakerValue(score: EvaluationScore, criterionId: string): number {
  const cs = score.criterionScores.find((c) => c.criterionId === criterionId);
  return cs?.normalizedScore ?? 0;
}

function isTie(
  a: EvaluationScore,
  b: EvaluationScore,
  tbConfig: TiebreakerConfig | null
): boolean {
  if (a.compositeScore !== b.compositeScore) return false;
  if (!tbConfig) return true;
  for (const rule of tbConfig.rules) {
    const aVal = getTiebreakerValue(a, rule.criterionId);
    const bVal = getTiebreakerValue(b, rule.criterionId);
    if (aVal !== bVal) return false;
  }
  return true;
}

function sortScores(
  scores: EvaluationScore[],
  tbConfig: TiebreakerConfig | null
): EvaluationScore[] {
  return [...scores].sort((a, b) => {
    // Primary: compositeScore DESC
    if (b.compositeScore !== a.compositeScore) {
      return b.compositeScore - a.compositeScore;
    }
    // Tiebreakers
    if (tbConfig) {
      for (const rule of tbConfig.rules.sort((x, y) => x.order - y.order)) {
        const aVal = getTiebreakerValue(a, rule.criterionId);
        const bVal = getTiebreakerValue(b, rule.criterionId);
        if (aVal !== bVal) {
          return rule.direction === 'DESC' ? bVal - aVal : aVal - bVal;
        }
      }
    }
    return 0;
  });
}

function assignOlympicRanks(
  sorted: EvaluationScore[],
  tbConfig: TiebreakerConfig | null
): Map<string, number> {
  const rankMap = new Map<string, number>();
  let rank = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      rankMap.set(sorted[i].applicationId, rank);
    } else {
      if (isTie(sorted[i], sorted[i - 1], tbConfig)) {
        rankMap.set(sorted[i].applicationId, rankMap.get(sorted[i - 1].applicationId)!);
      } else {
        rank = i + 1;
        rankMap.set(sorted[i].applicationId, rank);
      }
    }
  }
  return rankMap;
}

export async function generateRankings(evaluationId: string): Promise<void> {
  const evaluation = await getEvaluationById(evaluationId);
  if (!evaluation) throw new Error(`Evaluation ${evaluationId} not found`);
  if (evaluation.status !== 'Scored' && evaluation.status !== 'Ranked') {
    throw new Error('Evaluation must be Scored before generating rankings');
  }

  const scores = await getAllEvaluationScores(evaluationId);
  const tbConfig = await getTiebreakerConfigByEvaluationId(evaluationId);
  const applications = await getAllApplications();
  const appMap = new Map(applications.map((a) => [a.id, a]));

  // Global ranking
  const globalSorted = sortScores(scores, tbConfig);
  const globalRankMap = assignOlympicRanks(globalSorted, tbConfig);

  // Category ranking
  const categoriesSet = new Set(applications.map((a) => a.category));
  const categories = Array.from(categoriesSet);
  const categoryRankMaps = new Map<string, Map<string, number>>();

  for (const cat of categories) {
    const catScores = scores.filter((s) => appMap.get(s.applicationId)?.category === cat);
    const catSorted = sortScores(catScores, tbConfig);
    categoryRankMaps.set(cat, assignOlympicRanks(catSorted, tbConfig));
  }

  // Build rank records
  const now = new Date().toISOString();
  const rankRecords: Omit<RankRecord, 'id' | 'createdAt' | 'updatedAt'>[] = scores.map((score) => {
    const app = appMap.get(score.applicationId);
    const category = app?.category ?? 'General';
    const tiebreakerValues: Record<string, number> = {};
    if (tbConfig) {
      for (const rule of tbConfig.rules) {
        tiebreakerValues[rule.criterionId] = getTiebreakerValue(score, rule.criterionId);
      }
    }

    return {
      evaluationId,
      cycleId: evaluation.cycleId,
      applicationId: score.applicationId,
      compositeScore: score.compositeScore,
      globalRank: globalRankMap.get(score.applicationId) ?? 0,
      categoryRank: categoryRankMaps.get(category)?.get(score.applicationId) ?? 0,
      category,
      tiebreakerValues,
    };
  });

  await deleteRankRecordsByEvaluationId(evaluationId);
  await createRankRecordsBatch(rankRecords);

  await updateEvaluation(evaluationId, {
    status: 'Ranked',
    rankedAt: now,
  });
}
