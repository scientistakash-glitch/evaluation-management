import { NextRequest, NextResponse } from 'next/server';
import { getTiebreakerConfigByEvaluationId, createTiebreakerConfig } from '@/lib/data/tiebreakerConfigs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evaluationId = searchParams.get('evaluationId');
    if (!evaluationId) {
      return NextResponse.json({ error: 'evaluationId query param is required' }, { status: 400 });
    }
    const config = await getTiebreakerConfigByEvaluationId(evaluationId);
    return NextResponse.json(config ?? null);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tiebreaker config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { evaluationId, rules } = body;
    if (!evaluationId || !rules) {
      return NextResponse.json({ error: 'evaluationId and rules are required' }, { status: 400 });
    }
    const config = await createTiebreakerConfig({ evaluationId, rules });
    return NextResponse.json(config, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create tiebreaker config' }, { status: 500 });
  }
}
