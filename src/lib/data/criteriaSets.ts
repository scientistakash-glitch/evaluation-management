import { readJson, writeJson } from './fileStore';
import { CriteriaSet } from '@/types';
import { generateId } from '../utils/idGenerator';

const FILE = 'criteria-sets.json';

export async function getAllCriteriaSets(): Promise<CriteriaSet[]> {
  return readJson<CriteriaSet>(FILE);
}

export async function getCriteriaSetById(id: string): Promise<CriteriaSet | null> {
  const all = await getAllCriteriaSets();
  return all.find((cs) => cs.id === id) ?? null;
}

export async function createCriteriaSet(
  data: Omit<CriteriaSet, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CriteriaSet> {
  const all = await getAllCriteriaSets();
  const now = new Date().toISOString();
  const newCs: CriteriaSet = {
    id: generateId('cs'),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(FILE, [...all, newCs]);
  return newCs;
}

export async function updateCriteriaSet(
  id: string,
  data: Partial<Omit<CriteriaSet, 'id' | 'createdAt'>>
): Promise<CriteriaSet | null> {
  const all = await getAllCriteriaSets();
  const index = all.findIndex((cs) => cs.id === id);
  if (index === -1) return null;
  const updated: CriteriaSet = {
    ...all[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  all[index] = updated;
  await writeJson(FILE, all);
  return updated;
}

export async function removeCriteriaSet(id: string): Promise<boolean> {
  const all = await getAllCriteriaSets();
  const filtered = all.filter((cs) => cs.id !== id);
  if (filtered.length === all.length) return false;
  await writeJson(FILE, filtered);
  return true;
}
