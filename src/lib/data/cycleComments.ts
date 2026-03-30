import { readJson, writeJson } from './fileStore';
import { CycleComment } from '@/types';
import { generateId } from '../utils/idGenerator';

const FILE = 'cycle-comments.json';

export async function getCommentsByCycleId(cycleId: string): Promise<CycleComment[]> {
  const all = await readJson<CycleComment>(FILE);
  return all.filter((c) => c.cycleId === cycleId);
}

export async function addComment(data: Omit<CycleComment, 'id' | 'createdAt'>): Promise<CycleComment> {
  const all = await readJson<CycleComment>(FILE);
  const now = new Date().toISOString();
  const comment: CycleComment = {
    id: generateId('comment'),
    ...data,
    createdAt: now,
  };
  await writeJson(FILE, [...all, comment]);
  return comment;
}
