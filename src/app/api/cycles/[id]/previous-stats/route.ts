import { NextRequest, NextResponse } from 'next/server';
import { getCycleById, getAllCycles } from '@/lib/data/cycles';
import { getAllRankRecords } from '@/lib/data/rankRecords';
import { getAllLpps } from '@/lib/data/lpps';
import { getOfferReleaseByCycleId } from '@/lib/data/offerReleases';
export const dynamic = 'force-dynamic';

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

    // Get rank records and offer release from the previous cycle
    const [rankRecords, offerRelease] = await Promise.all([
      getAllRankRecords({ cycleId: previousCycle.id }),
      getOfferReleaseByCycleId(previousCycle.id),
    ]);

    // Use real offer-release summary when available
    const totalOffered = offerRelease?.summary.released ?? 0;
    const totalWaitlisted = offerRelease?.summary.pending ?? 0;

    const programs = cycleLpps.map((lpp) => {
      // For program-wise: filter by lppId; for single: use all records
      const lppRecords = rankRecords.filter(
        (r) => r.programId === lpp.id || r.programId === 'all'
      );
      const intake = DEFAULT_INTAKE;
      // Fall back to rank record count only if offer release isn't persisted yet
      const previousOffers = totalOffered > 0 ? totalOffered : lppRecords.length;
      const previousAcceptances = offerRelease
        ? Math.round(previousOffers * 0.85)  // estimate: 85% acceptance rate
        : lppRecords.filter((r) => r.globalRank <= intake).length;

      return {
        lppId: lpp.id,
        lppName: lpp.name,
        intake,
        previousOffers,
        previousAcceptances,
        previousWaitlisted: totalWaitlisted,
      };
    });

    return NextResponse.json({ programs, totalOffered, totalWaitlisted });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch previous stats' }, { status: 500 });
  }
}
