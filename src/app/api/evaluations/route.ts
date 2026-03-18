import { NextRequest, NextResponse } from 'next/server';
import { getAllEvaluations, createEvaluation } from '@/lib/data/evaluations';
import { EvaluationStrategy, TieBreakerType } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId') ?? undefined;
    const evaluations = await getAllEvaluations(cycleId);
    return NextResponse.json(evaluations);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch evaluations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cycleId,
      strategy,
      programConfigs,
      tieBreaker,
    } = body;

    if (!cycleId) {
      return NextResponse.json({ error: 'cycleId is required' }, { status: 400 });
    }

    const evaluation = await createEvaluation({
      cycleId,
      strategy: (strategy as EvaluationStrategy) ?? null,
      programConfigs: programConfigs ?? [],
      tieBreaker: (tieBreaker as TieBreakerType) ?? null,
      ranksGenerated: false,
      status: 'Draft',
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create evaluation' }, { status: 500 });
  }
}
