import { readJson, writeJson } from './fileStore';
import { CycleFeeConfig } from '@/types/feeConfig';
import { generateId } from '../utils/idGenerator';

const FILE = 'fee-configs.json';

export async function getFeeConfigByCycleId(cycleId: string): Promise<CycleFeeConfig | null> {
  const all = await readJson<CycleFeeConfig>(FILE);
  return all.find((c) => c.cycleId === cycleId) ?? null;
}

export async function upsertFeeConfig(data: Omit<CycleFeeConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<CycleFeeConfig> {
  const all = await readJson<CycleFeeConfig>(FILE);
  const now = new Date().toISOString();
  const existing = all.find((c) => c.cycleId === data.cycleId);
  const record: CycleFeeConfig = {
    id: existing?.id ?? generateId('fee'),
    ...data,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const filtered = all.filter((c) => c.cycleId !== data.cycleId);
  await writeJson(FILE, [...filtered, record]);
  return record;
}
