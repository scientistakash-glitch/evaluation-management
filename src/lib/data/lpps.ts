import { readJson, writeJson } from './fileStore';
import { LPP } from '@/types';
import { generateId } from '../utils/idGenerator';

const FILE = 'lpps.json';

export async function getAllLpps(ptatId?: string): Promise<LPP[]> {
  const all = await readJson<LPP>(FILE);
  if (ptatId) return all.filter((l) => l.ptatId === ptatId);
  return all;
}

export async function getLppById(id: string): Promise<LPP | null> {
  const all = await getAllLpps();
  return all.find((l) => l.id === id) ?? null;
}

export async function createLpp(data: Omit<LPP, 'id' | 'createdAt' | 'updatedAt'>): Promise<LPP> {
  const all = await getAllLpps();
  const now = new Date().toISOString();
  const newLpp: LPP = {
    id: generateId('lpp'),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(FILE, [...all, newLpp]);
  return newLpp;
}

export async function updateLpp(id: string, data: Partial<Omit<LPP, 'id' | 'createdAt'>>): Promise<LPP | null> {
  const all = await getAllLpps();
  const index = all.findIndex((l) => l.id === id);
  if (index === -1) return null;
  const updated: LPP = {
    ...all[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  all[index] = updated;
  await writeJson(FILE, all);
  return updated;
}

export async function removeLpp(id: string): Promise<boolean> {
  const all = await getAllLpps();
  const filtered = all.filter((l) => l.id !== id);
  if (filtered.length === all.length) return false;
  await writeJson(FILE, filtered);
  return true;
}
