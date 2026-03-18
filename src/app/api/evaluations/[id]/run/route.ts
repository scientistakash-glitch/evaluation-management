import { NextRequest, NextResponse } from 'next/server';
import { runEvaluation } from '@/lib/engine/scoreEngine';
import { getEvaluationById } from '@/lib/data/evaluations';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await runEvaluation(params.id);
    const updated = await getEvaluationById(params.id);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run evaluation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
