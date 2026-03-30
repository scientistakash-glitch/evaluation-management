import { readJson, writeJson } from './fileStore';
import { OfferRelease } from '@/types';
import { generateId } from '../utils/idGenerator';

const FILE = 'offer-releases.json';

export async function getOfferReleaseByCycleId(cycleId: string): Promise<OfferRelease | null> {
  const all = await readJson<OfferRelease>(FILE);
  return all.find((r) => r.cycleId === cycleId) ?? null;
}

export async function updateOfferReleaseAcceptance(
  cycleId: string,
  updates: { applicationId: string; status: 'Accepted' | 'Withdrawn' | 'Pending' }[]
): Promise<OfferRelease | null> {
  const all = await readJson<OfferRelease>(FILE);
  const idx = all.findIndex((r) => r.cycleId === cycleId);
  if (idx === -1) return null;
  const release = { ...all[idx] };
  const updateMap = new Map(updates.map((u) => [u.applicationId, u.status]));
  release.studentResults = release.studentResults.map((s) => {
    const newStatus = updateMap.get(s.applicationId);
    return newStatus ? { ...s, acceptanceStatus: newStatus } : s;
  });
  const offered = release.studentResults.filter((s) => s.awardedProgramId !== null);
  release.summary = {
    released: offered.length,
    accepted: offered.filter((s) => s.acceptanceStatus === 'Accepted').length,
    pending: offered.filter((s) => !s.acceptanceStatus || s.acceptanceStatus === 'Pending').length,
    withdrawn: offered.filter((s) => s.acceptanceStatus === 'Withdrawn').length,
  };
  all[idx] = release;
  await writeJson(FILE, all);
  return release;
}

export async function createOfferRelease(data: Omit<OfferRelease, 'id' | 'createdAt'>): Promise<OfferRelease> {
  const all = await readJson<OfferRelease>(FILE);
  const now = new Date().toISOString();
  // Upsert: replace existing for same cycleId
  const filtered = all.filter((r) => r.cycleId !== data.cycleId);
  const record: OfferRelease = {
    id: generateId('offer'),
    ...data,
    createdAt: now,
  };
  await writeJson(FILE, [...filtered, record]);
  return record;
}
