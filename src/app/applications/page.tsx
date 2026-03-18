import { getAllApplications } from '@/lib/data/applications';
import ApplicationsClient from '@/components/applications/ApplicationsClient';

export default async function ApplicationsPage() {
  const applications = await getAllApplications();
  return <ApplicationsClient initialApplications={applications} />;
}
