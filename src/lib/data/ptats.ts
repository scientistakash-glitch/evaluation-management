import { readJson, writeJson } from './fileStore';
import { PTAT } from '@/types';
import { generateId } from '../utils/idGenerator';

const FILE = 'ptats.json';

export async function getAllPtats(): Promise<PTAT[]> {
  return readJson<PTAT>(FILE);
}

export async function getPtatById(id: string): Promise<PTAT | null> {
  const all = await getAllPtats();
  return all.find((p) => p.id === id) ?? null;
}

export async function createPtat(data: Omit<PTAT, 'id' | 'createdAt' | 'updatedAt'>): Promise<PTAT> {
  const all = await getAllPtats();
  const now = new Date().toISOString();
  const newPtat: PTAT = {
    id: generateId('ptat'),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(FILE, [...all, newPtat]);
  return newPtat;
}

export async function updatePtat(id: string, data: Partial<Omit<PTAT, 'id' | 'createdAt'>>): Promise<PTAT | null> {
  const all = await getAllPtats();
  const index = all.findIndex((p) => p.id === id);
  if (index === -1) return null;
  const updated: PTAT = {
    ...all[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  all[index] = updated;
  await writeJson(FILE, all);
  return updated;
}

export async function removePtat(id: string): Promise<boolean> {
  const all = await getAllPtats();
  const filtered = all.filter((p) => p.id !== id);
  if (filtered.length === all.length) return false;
  await writeJson(FILE, filtered);
  return true;
}
