import { getAllCycles } from '@/lib/data/cycles';
import { getAllPtats } from '@/lib/data/ptats';
import { getAllLpps } from '@/lib/data/lpps';
import CycleList from '@/components/cycles/CycleList';

export default async function CyclesPage() {
  const [cycles, ptats, lpps] = await Promise.all([
    getAllCycles(),
    getAllPtats(),
    getAllLpps(),
  ]);

  return <CycleList initialCycles={cycles} ptats={ptats} lpps={lpps} />;
}
