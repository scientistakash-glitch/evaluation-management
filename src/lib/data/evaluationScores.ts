import { readJson, writeJson } from './fileStore';
import { EvaluationScore } from '@/types';
import { generateId } from '../utils/idGenerator';

const FILE = 'evaluation-scores.json';

export async function getAllEvaluationScores(evaluationId?: string): Promise<EvaluationScore[]> {
  const all = await readJson<EvaluationScore>(FILE);
  if (evaluationId) return all.filter((s) => s.evaluationId === evaluationId);
  return all;
}

export async function getEvaluationScoresByProgram(
  evaluationId: string,
  programId: string
): Promise<EvaluationScore[]> {
  const all = await readJson<EvaluationScore>(FILE);
  return all.filter((s) => s.evaluationId === evaluationId && s.programId === programId);
}

export async function createBatch(
  scores: Omit<EvaluationScore, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<EvaluationScore[]> {
  const all = await readJson<EvaluationScore>(FILE);
  const now = new Date().toISOString();
  const newScores: EvaluationScore[] = scores.map((s) => ({
    id: generateId('escore'),
    ...s,
    createdAt: now,
    updatedAt: now,
  }));
  await writeJson(FILE, [...all, ...newScores]);
  return newScores;
}

export async function deleteByEvaluationAndProgram(
  evaluationId: string,
  programId: string
): Promise<void> {
  const all = await readJson<EvaluationScore>(FILE);
  const filtered = all.filter(
    (s) => !(s.evaluationId === evaluationId && s.programId === programId)
  );
  await writeJson(FILE, filtered);
}

// Keep legacy function for backward compatibility
export async function createEvaluationScoresBatch(
  scores: Omit<EvaluationScore, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<EvaluationScore[]> {
  return createBatch(scores);
}

export async function deleteEvaluationScoresByEvaluationId(evaluationId: string): Promise<void> {
  const all = await readJson<EvaluationScore>(FILE);
  const filtered = all.filter((s) => s.evaluationId !== evaluationId);
  await writeJson(FILE, filtered);
}
