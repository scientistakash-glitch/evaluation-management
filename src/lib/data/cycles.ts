import { readJson, writeJson } from './fileStore';
import { Cycle, CycleStatus } from '@/types';
import { generateId } from '../utils/idGenerator';

const FILE = 'cycles.json';

export async function getAllCycles(filters?: { ptatId?: string; status?: CycleStatus }): Promise<Cycle[]> {
  let all = await readJson<Cycle>(FILE);
  if (filters?.ptatId) all = all.filter((c) => c.ptatId === filters.ptatId);
  if (filters?.status) all = all.filter((c) => c.status === filters.status);
  return all;
}

export async function getCycleById(id: string): Promise<Cycle | null> {
  const all = await getAllCycles();
  return all.find((c) => c.id === id) ?? null;
}

export async function getByPtatId(ptatId: string): Promise<Cycle[]> {
  return getAllCycles({ ptatId });
}

export async function createCycle(data: Omit<Cycle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Cycle> {
  const all = await getAllCycles();
  const now = new Date().toISOString();
  const newCycle: Cycle = {
    id: generateId('cycle'),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(FILE, [...all, newCycle]);
  return newCycle;
}

export async function updateCycle(id: string, data: Partial<Omit<Cycle, 'id' | 'createdAt'>>): Promise<Cycle | null> {
  const all = await getAllCycles();
  const index = all.findIndex((c) => c.id === id);
  if (index === -1) return null;
  const updated: Cycle = {
    ...all[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  all[index] = updated;
  await writeJson(FILE, all);
  return updated;
}

export async function removeCycle(id: string): Promise<boolean> {
  const all = await getAllCycles();
  const filtered = all.filter((c) => c.id !== id);
  if (filtered.length === all.length) return false;
  await writeJson(FILE, filtered);
  return true;
}
