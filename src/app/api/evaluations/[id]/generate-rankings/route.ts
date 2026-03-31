import { NextRequest, NextResponse } from 'next/server';
import { computeRankings } from '@/lib/engine/rankEngine';
import { createBatch, deleteByEvaluationAndProgram } from '@/lib/data/rankRecords';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { programId, cycleId, tiebreakerRules, evaluationScores, applications } = body;

    if (!programId || !cycleId || !tiebreakerRules || !evaluationScores || !applications) {
      return NextResponse.json(
        { error: 'programId, cycleId, tiebreakerRules, evaluationScores, and applications are required' },
        { status: 400 }
      );
    }

    const rankings = computeRankings(params.id, programId, cycleId, tiebreakerRules, evaluationScores, applications);

    // Persist: remove old records for this evaluation+program, then save new ones
    await deleteByEvaluationAndProgram(params.id, programId);
    const persisted = await createBatch(rankings);

    return NextResponse.json(persisted);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate rankings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
