import { NextRequest, NextResponse } from 'next/server';
import { getAllEvaluationScores } from '@/lib/data/evaluationScores';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evaluationId = searchParams.get('evaluationId');
    if (!evaluationId) {
      return NextResponse.json({ error: 'evaluationId query param is required' }, { status: 400 });
    }
    const scores = await getAllEvaluationScores(evaluationId);
    return NextResponse.json(scores);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch evaluation scores' }, { status: 500 });
  }
}
