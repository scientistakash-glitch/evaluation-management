import { readJson, writeJson } from './fileStore';
import { RankRecord } from '@/types';
import { generateId } from '../utils/idGenerator';

const FILE = 'rank-records.json';

export async function getAllRankRecords(filters?: {
  cycleId?: string;
  evaluationId?: string;
  programId?: string;
}): Promise<RankRecord[]> {
  let all = await readJson<RankRecord>(FILE);
  if (filters?.cycleId) all = all.filter((r) => r.cycleId === filters.cycleId);
  if (filters?.evaluationId) all = all.filter((r) => r.evaluationId === filters.evaluationId);
  if (filters?.programId) all = all.filter((r) => r.programId === filters.programId);
  return all;
}

export async function createBatch(
  records: Omit<RankRecord, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<RankRecord[]> {
  const all = await readJson<RankRecord>(FILE);
  const now = new Date().toISOString();
  const newRecords: RankRecord[] = records.map((r) => ({
    id: generateId('rank'),
    ...r,
    createdAt: now,
    updatedAt: now,
  }));
  await writeJson(FILE, [...all, ...newRecords]);
  return newRecords;
}

export async function deleteByEvaluationAndProgram(
  evaluationId: string,
  programId: string
): Promise<void> {
  const all = await readJson<RankRecord>(FILE);
  const filtered = all.filter(
    (r) => !(r.evaluationId === evaluationId && r.programId === programId)
  );
  await writeJson(FILE, filtered);
}

// Keep legacy functions for backward compatibility
export async function createRankRecordsBatch(
  records: Omit<RankRecord, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<RankRecord[]> {
  return createBatch(records);
}

export async function deleteRankRecordsByEvaluationId(evaluationId: string): Promise<void> {
  const all = await readJson<RankRecord>(FILE);
  const filtered = all.filter((r) => r.evaluationId !== evaluationId);
  await writeJson(FILE, filtered);
}
