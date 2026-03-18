import { getAllPtats } from '@/lib/data/ptats';
import PtatList from '@/components/ptats/PtatList';

export default async function PtatsPage() {
  const ptats = await getAllPtats();
  return <PtatList initialPtats={ptats} />;
}
