import { NextRequest, NextResponse } from 'next/server';

// This route is deprecated. Use /api/evaluations/[id]/generate-scores instead.
export async function POST(_request: NextRequest, { params: _params }: { params: { id: string } }) {
  return NextResponse.json({ error: 'Use /api/evaluations/[id]/generate-scores instead' }, { status: 410 });
}
