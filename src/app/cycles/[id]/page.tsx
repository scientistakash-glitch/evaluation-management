import { redirect } from 'next/navigation';

export default async function CycleDetailPage({ params }: { params: { id: string } }) {
  redirect(`/cycle/${params.id}/evaluation`);
}
