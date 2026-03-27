import { NextRequest, NextResponse } from 'next/server';
import { getAllCycles, createCycle } from '@/lib/data/cycles';
import { createEvaluation } from '@/lib/data/evaluations';
import { validateNonOverlapping } from '@/lib/utils/dateUtils';
import type { CycleStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ptatId = searchParams.get('ptatId') ?? undefined;
    const status = searchParams.get('status') as CycleStatus | null;
    const academicYear = searchParams.get('academicYear') ?? undefined;
    let cycles = await getAllCycles({ ptatId, status: status ?? undefined });
    if (academicYear) cycles = cycles.filter((c) => c.academicYear === academicYear);
    return NextResponse.json(cycles);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch cycles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      academicYear,
      ptatId,
      lppIds,
      timeline,
      evaluationStrategy,
      programConfigs,
      tiebreakerRules,
    } = body;

    if (!academicYear || !ptatId || !lppIds || !timeline) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    if (!timeline.applicationPeriod?.start || !timeline.paymentPeriod?.end) {
      return NextResponse.json({ error: 'All timeline dates are required' }, { status: 400 });
    }

    const existing = await getAllCycles();

    // Auto-calculate cycle number for this PTAT + academicYear
    const samePtatYear = existing.filter(
      (c) => c.ptatId === ptatId && c.academicYear === academicYear
    );
    const cycleNumber = samePtatYear.length + 1;

    // Overlap validation (date range within same PTAT)
    const overlapError = validateNonOverlapping(
      { ptatId, start: timeline.applicationPeriod.start, end: timeline.paymentPeriod.end },
      existing
    );
    if (overlapError) {
      return NextResponse.json({ error: overlapError }, { status: 409 });
    }

    // Auto-generate cycle name
    const ptatName = body.ptatName ?? ptatId;
    const name = `${ptatName} – ${academicYear} – Cycle ${cycleNumber}`;

    const cycle = await createCycle({
      name,
      number: cycleNumber,
      academicYear,
      hasPreviousCycle: samePtatYear.length > 0,
      ptatId,
      lppIds,
      timeline,
      evaluationStrategy: evaluationStrategy ?? null,
      status: 'Planned',
    });

    // Create the Evaluation record inline so the client always has one
    const evaluation = await createEvaluation({
      cycleId: cycle.id,
      strategy: evaluationStrategy ?? null,
      programConfigs: programConfigs ?? [],
      tiebreakerRules: tiebreakerRules ?? [],
      ranksGenerated: false,
      status: 'Draft',
    });

    return NextResponse.json({ cycle, evaluation }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create cycle' }, { status: 500 });
  }
}
