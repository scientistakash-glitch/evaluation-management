import { getCycleById } from '@/lib/data/cycles';
import { getPtatById } from '@/lib/data/ptats';
import { getAllLpps } from '@/lib/data/lpps';
import { getAllEvaluations } from '@/lib/data/evaluations';
import { notFound } from 'next/navigation';
import EvaluationWorkflow from '@/components/evaluation/EvaluationWorkflow';
import { Cycle, PTAT, LPP, Evaluation } from '@/types';

export default async function CycleEvaluationPage({ params }: { params: { id: string } }) {
  const cycle = await getCycleById(params.id);
  if (!cycle) notFound();

  const [ptat, allLpps, evaluations] = await Promise.all([
    getPtatById(cycle.ptatId),
    getAllLpps(cycle.ptatId),
    getAllEvaluations(cycle.id),
  ]);

  const cycleLpps = allLpps.filter((l) => cycle.lppIds.includes(l.id));
  const existingEvaluation = evaluations[0] ?? null;

  return (
    <EvaluationWorkflow
      cycle={cycle as Cycle}
      ptat={ptat as PTAT}
      lpps={cycleLpps as LPP[]}
      initialEvaluation={existingEvaluation as Evaluation | null}
    />
  );
}
