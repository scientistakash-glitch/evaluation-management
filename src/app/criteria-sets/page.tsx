import { getAllCriteriaSets } from '@/lib/data/criteriaSets';
import CriteriaSetList from '@/components/criteriaSets/CriteriaSetList';

export default async function CriteriaSetsPage() {
  const criteriaSets = await getAllCriteriaSets();
  return <CriteriaSetList initialSets={criteriaSets} />;
}
