import { NextRequest, NextResponse } from 'next/server';
import { getEvaluationScoresByProgram, getAllEvaluationScores } from '@/lib/data/evaluationScores';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evaluationId = searchParams.get('evaluationId');
    const programId = searchParams.get('programId');

    if (!evaluationId) {
      return NextResponse.json({ error: 'evaluationId query param is required' }, { status: 400 });
    }

    let scores;
    if (programId) {
      scores = await getEvaluationScoresByProgram(evaluationId, programId);
    } else {
      scores = await getAllEvaluationScores(evaluationId);
    }

    return NextResponse.json(scores);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch evaluation scores' }, { status: 500 });
  }
}
