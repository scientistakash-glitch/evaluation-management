import { readJson, writeJson } from './fileStore';
import { TiebreakerConfig } from '@/types';
import { generateId } from '../utils/idGenerator';

const FILE = 'tiebreaker-configs.json';

export async function getTiebreakerConfigByEvaluationId(evaluationId: string): Promise<TiebreakerConfig | null> {
  const all = await readJson<TiebreakerConfig>(FILE);
  return all.find((t) => t.evaluationId === evaluationId) ?? null;
}

export async function createTiebreakerConfig(
  data: Omit<TiebreakerConfig, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TiebreakerConfig> {
  const all = await readJson<TiebreakerConfig>(FILE);
  const now = new Date().toISOString();
  const newConfig: TiebreakerConfig = {
    id: generateId('tbc'),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(FILE, [...all, newConfig]);
  return newConfig;
}

export async function updateTiebreakerConfig(
  id: string,
  data: Partial<Omit<TiebreakerConfig, 'id' | 'createdAt'>>
): Promise<TiebreakerConfig | null> {
  const all = await readJson<TiebreakerConfig>(FILE);
  const index = all.findIndex((t) => t.id === id);
  if (index === -1) return null;
  const updated: TiebreakerConfig = {
    ...all[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  all[index] = updated;
  await writeJson(FILE, all);
  return updated;
}
