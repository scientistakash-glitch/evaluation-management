import { NextRequest, NextResponse } from 'next/server';
import { getAllCycles, createCycle } from '@/lib/data/cycles';
import { validateNonOverlapping } from '@/lib/utils/dateUtils';
import { CycleStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ptatId = searchParams.get('ptatId') ?? undefined;
    const status = searchParams.get('status') as CycleStatus | null;
    const cycles = await getAllCycles({ ptatId, status: status ?? undefined });
    return NextResponse.json(cycles);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch cycles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ptatId, lppId, academicYear, cycleNumber, startDate, endDate, status } = body;
    if (!ptatId || !lppId || !academicYear || cycleNumber == null || !startDate || !endDate || !status) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const existing = await getAllCycles();
    const overlapError = validateNonOverlapping({ ptatId, startDate, endDate }, existing);
    if (overlapError) {
      return NextResponse.json({ error: overlapError }, { status: 409 });
    }

    const cycle = await createCycle({ ptatId, lppId, academicYear, cycleNumber, startDate, endDate, status });
    return NextResponse.json(cycle, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create cycle' }, { status: 500 });
  }
}
