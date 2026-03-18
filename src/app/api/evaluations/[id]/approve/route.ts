import { NextRequest, NextResponse } from 'next/server';
import { getEvaluationById, updateEvaluation } from '@/lib/data/evaluations';
import { getCycleById, updateCycle } from '@/lib/data/cycles';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const evaluation = await getEvaluationById(params.id);
    if (!evaluation) return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });

    const now = new Date().toISOString();

    // Update evaluation status
    const updatedEvaluation = await updateEvaluation(params.id, {
      status: 'Approved',
      approvedAt: now,
    });

    // Update cycle status
    const cycle = await getCycleById(evaluation.cycleId);
    if (cycle) {
      await updateCycle(cycle.id, { status: 'Approved' });
    }

    return NextResponse.json({ evaluation: updatedEvaluation });
  } catch {
    return NextResponse.json({ error: 'Failed to approve evaluation' }, { status: 500 });
  }
}
