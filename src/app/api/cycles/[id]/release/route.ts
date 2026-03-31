import { NextRequest, NextResponse } from 'next/server';
import { getCycleById, updateCycle } from '@/lib/data/cycles';
export const dynamic = 'force-dynamic';

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cycle = await getCycleById(params.id);
    if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
    if (cycle.status !== 'Approved')
      return NextResponse.json({ error: 'Only Approved cycles can be released' }, { status: 400 });
    const updated = await updateCycle(params.id, { status: 'Released' });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to release cycle' }, { status: 500 });
  }
}
