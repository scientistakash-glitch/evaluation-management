import { redirect } from 'next/navigation';

export default function CycleDetailPage({ params }: { params: { id: string } }) {
  redirect(`/cycle/${params.id}/evaluation`);
}
