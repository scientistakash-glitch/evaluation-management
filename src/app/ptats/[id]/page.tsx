import { getPtatById } from '@/lib/data/ptats';
import { getAllLpps } from '@/lib/data/lpps';
import { notFound } from 'next/navigation';
import PtatDetailClient from '@/components/ptats/PtatDetailClient';

export default async function PtatDetailPage({ params }: { params: { id: string } }) {
  const ptat = await getPtatById(params.id);
  if (!ptat) notFound();

  const lpps = await getAllLpps(params.id);
  return <PtatDetailClient ptat={ptat} initialLpps={lpps} />;
}
