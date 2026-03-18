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
    const {
      name,
      number,
      academicYear,
      hasPreviousCycle,
      ptatId,
      lppIds,
      timeline,
      evaluationStrategy,
    } = body;

    if (!name || number == null || !academicYear || !ptatId || !lppIds || !timeline) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    if (
      !timeline.startDate ||
      !timeline.offerReleaseDate ||
      !timeline.acceptanceDeadline ||
      !timeline.paymentDeadline ||
      !timeline.closingDate
    ) {
      return NextResponse.json({ error: 'All timeline dates are required' }, { status: 400 });
    }

    // Check for unique cycle number
    const existing = await getAllCycles();
    const duplicateNumber = existing.find((c) => c.number === number);
    if (duplicateNumber) {
      return NextResponse.json({ error: `Cycle number ${number} already exists` }, { status: 409 });
    }

    // Overlap validation
    const overlapError = validateNonOverlapping(
      { ptatId, startDate: timeline.startDate, closingDate: timeline.closingDate },
      existing
    );
    if (overlapError) {
      return NextResponse.json({ error: overlapError }, { status: 409 });
    }

    const cycle = await createCycle({
      name,
      number,
      academicYear,
      hasPreviousCycle: hasPreviousCycle ?? false,
      ptatId,
      lppIds,
      timeline,
      evaluationStrategy: evaluationStrategy ?? null,
      status: 'Planned',
    });

    return NextResponse.json(cycle, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create cycle' }, { status: 500 });
  }
}
