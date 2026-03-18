import { readJson, writeJson } from './fileStore';
import { Evaluation } from '@/types';
import { generateId } from '../utils/idGenerator';

const FILE = 'evaluations.json';

export async function getAllEvaluations(cycleId?: string): Promise<Evaluation[]> {
  const all = await readJson<Evaluation>(FILE);
  if (cycleId) return all.filter((e) => e.cycleId === cycleId);
  return all;
}

export async function getEvaluationById(id: string): Promise<Evaluation | null> {
  const all = await getAllEvaluations();
  return all.find((e) => e.id === id) ?? null;
}

export async function createEvaluation(
  data: Omit<Evaluation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Evaluation> {
  const all = await getAllEvaluations();
  const now = new Date().toISOString();
  const newEval: Evaluation = {
    id: generateId('eval'),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(FILE, [...all, newEval]);
  return newEval;
}

export async function updateEvaluation(
  id: string,
  data: Partial<Omit<Evaluation, 'id' | 'createdAt'>>
): Promise<Evaluation | null> {
  const all = await getAllEvaluations();
  const index = all.findIndex((e) => e.id === id);
  if (index === -1) return null;
  const updated: Evaluation = {
    ...all[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  all[index] = updated;
  await writeJson(FILE, all);
  return updated;
}
