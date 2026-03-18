import { getCriteriaSetById } from '@/lib/data/criteriaSets';
import { notFound } from 'next/navigation';
import CriteriaSetDetail from '@/components/criteriaSets/CriteriaSetDetail';

export default async function CriteriaSetDetailPage({ params }: { params: { id: string } }) {
  const cs = await getCriteriaSetById(params.id);
  if (!cs) notFound();
  return <CriteriaSetDetail criteriaSet={cs} />;
}
