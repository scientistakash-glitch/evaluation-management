import { NextRequest, NextResponse } from 'next/server';
import { computeScores } from '@/lib/engine/scoreEngine';

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
    return NextResponse.json(scores);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate scores';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
