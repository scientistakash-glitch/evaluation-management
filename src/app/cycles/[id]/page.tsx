import { getCycleById } from '@/lib/data/cycles';
import { getPtatById } from '@/lib/data/ptats';
import { getLppById } from '@/lib/data/lpps';
import { notFound } from 'next/navigation';
import CycleDetailTabs from '@/components/cycles/CycleDetailTabs';

export default async function CycleDetailPage({ params }: { params: { id: string } }) {
  const cycle = await getCycleById(params.id);
  if (!cycle) notFound();

  const [ptat, lpp] = await Promise.all([
    getPtatById(cycle.ptatId),
    getLppById(cycle.lppId),
  ]);

  return <CycleDetailTabs cycle={cycle} ptat={ptat} lpp={lpp} />;
}
