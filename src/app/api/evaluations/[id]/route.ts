import { NextRequest, NextResponse } from 'next/server';
import { getEvaluationById, updateEvaluation } from '@/lib/data/evaluations';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const evaluation = await getEvaluationById(params.id);
    if (!evaluation) return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });
    return NextResponse.json(evaluation);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch evaluation' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updated = await updateEvaluation(params.id, body);
    if (!updated) return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update evaluation' }, { status: 500 });
  }
}
