import { NextRequest, NextResponse } from 'next/server';
import { getAllRankRecords } from '@/lib/data/rankRecords';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId') ?? undefined;
    const evaluationId = searchParams.get('evaluationId') ?? undefined;
    const records = await getAllRankRecords({ cycleId, evaluationId });
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch rank records' }, { status: 500 });
  }
}
