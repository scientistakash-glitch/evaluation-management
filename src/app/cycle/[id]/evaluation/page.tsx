import EvaluationWorkflow from '@/components/evaluation/EvaluationWorkflow';

export default function CycleEvaluationPage({ params }: { params: { id: string } }) {
  return <EvaluationWorkflow cycleId={params.id} />;
}
