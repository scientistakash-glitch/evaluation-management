import { NextRequest, NextResponse } from 'next/server';
import { getCycleById, getAllCycles } from '@/lib/data/cycles';
import { getAllRankRecords } from '@/lib/data/rankRecords';
import { getAllLpps } from '@/lib/data/lpps';

const DEFAULT_INTAKE = 60;

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cycle = await getCycleById(params.id);
    if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });

    // Find the most recent previous closed/approved cycle for the same ptatId
    const allCycles = await getAllCycles({ ptatId: cycle.ptatId });
    const previousCycles = allCycles
      .filter(
        (c) =>
          c.id !== cycle.id &&
          (c.status === 'Closed' || c.status === 'Approved') &&
          (c.timeline.paymentPeriod?.end ?? '') < (cycle.timeline.applicationPeriod?.start ?? '')
      )
      .sort((a, b) =>
        (b.timeline.paymentPeriod?.end ?? '').localeCompare(a.timeline.paymentPeriod?.end ?? '')
      );

    const previousCycle = previousCycles[0] ?? null;

    // Get the LPPs for this cycle
    const allLpps = await getAllLpps(cycle.ptatId);
    const cycleLpps = allLpps.filter((l) => cycle.lppIds.includes(l.id));

    if (!previousCycle) {
      // No previous cycle — return zeros
      const programs = cycleLpps.map((lpp) => ({
        lppId: lpp.id,
        lppName: lpp.name,
        intake: DEFAULT_INTAKE,
        previousOffers: 0,
        previousAcceptances: 0,
      }));
      return NextResponse.json({ programs });
    }

    // Get rank records from the previous cycle
    const rankRecords = await getAllRankRecords({ cycleId: previousCycle.id });

    const programs = cycleLpps.map((lpp) => {
      // For program-wise: filter by lppId; for single: use all records
      const lppRecords = rankRecords.filter(
        (r) => r.programId === lpp.id || r.programId === 'all'
      );
      const intake = DEFAULT_INTAKE;
      const previousOffers = lppRecords.length;
      const previousAcceptances = lppRecords.filter((r) => r.globalRank <= intake).length;

      return {
        lppId: lpp.id,
        lppName: lpp.name,
        intake,
        previousOffers,
        previousAcceptances,
      };
    });

    return NextResponse.json({ programs });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch previous stats' }, { status: 500 });
  }
}
