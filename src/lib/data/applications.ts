import { readJson } from './fileStore';
import { Application } from '@/types';

const FILE = 'applications.json';

export async function getAllApplications(search?: string): Promise<Application[]> {
  const all = await readJson<Application>(FILE);
  if (search) {
    const q = search.toLowerCase();
    return all.filter(
      (a) =>
        a.studentName.toLowerCase().includes(q) ||
        a.rollNumber.toLowerCase().includes(q)
    );
  }
  return all;
}

export async function getApplicationById(id: string): Promise<Application | null> {
  const all = await getAllApplications();
  return all.find((a) => a.id === id) ?? null;
}
