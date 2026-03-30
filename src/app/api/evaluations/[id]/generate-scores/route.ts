import { NextRequest, NextResponse } from 'next/server';
import { computeScores } from '@/lib/engine/scoreEngine';
import { createBatch, deleteByEvaluationAndProgram } from '@/lib/data/evaluationScores';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { programId, weights, applications } = body;

    if (!programId || !weights || !applications) {
      return NextResponse.json(
        { error: 'programId, weights, and applications are required' },
        { status: 400 }
      );
    }

    const scores = computeScores(params.id, programId, weights, applications);

    // Persist: remove old scores for this evaluation+program, then save new ones
    await deleteByEvaluationAndProgram(params.id, programId);
    const persisted = await createBatch(scores);

    return NextResponse.json(persisted);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate scores';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
