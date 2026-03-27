import { NextRequest, NextResponse } from 'next/server';
import { getCycleById, updateCycle, removeCycle, getAllCycles } from '@/lib/data/cycles';
import { validateNonOverlapping } from '@/lib/utils/dateUtils';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cycle = await getCycleById(params.id);
    if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
    return NextResponse.json(cycle);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch cycle' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const existing = await getCycleById(params.id);
    if (!existing) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });

    // If timeline is being updated, validate overlap
    const updatedTimeline = body.timeline ?? existing.timeline;
    const updatedPtatId = body.ptatId ?? existing.ptatId;

    const allCycles = await getAllCycles();
    const overlapError = validateNonOverlapping(
      {
        ptatId: updatedPtatId,
        start: updatedTimeline.applicationPeriod?.start ?? '',
        end: updatedTimeline.paymentPeriod?.end ?? '',
      },
      allCycles,
      params.id
    );
    if (overlapError) {
      return NextResponse.json({ error: overlapError }, { status: 409 });
    }

    const updated = await updateCycle(params.id, body);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update cycle' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const removed = await removeCycle(params.id);
    if (!removed) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete cycle' }, { status: 500 });
  }
}
