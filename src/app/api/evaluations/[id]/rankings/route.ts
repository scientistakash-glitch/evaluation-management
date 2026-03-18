import { NextRequest, NextResponse } from 'next/server';
import { generateRankings } from '@/lib/engine/rankEngine';
import { getEvaluationById } from '@/lib/data/evaluations';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await generateRankings(params.id);
    const updated = await getEvaluationById(params.id);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate rankings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
