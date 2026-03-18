import { NextRequest, NextResponse } from 'next/server';
import { generateCompositeScores } from '@/lib/engine/scoreEngine';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { programId } = body;

    if (!programId) {
      return NextResponse.json({ error: 'programId is required' }, { status: 400 });
    }

    await generateCompositeScores(params.id, programId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate scores';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
