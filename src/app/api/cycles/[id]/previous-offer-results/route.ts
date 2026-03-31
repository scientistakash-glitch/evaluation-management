import { NextRequest, NextResponse } from 'next/server';
import { getCycleById, getAllCycles } from '@/lib/data/cycles';
import { getOfferReleaseByCycleId } from '@/lib/data/offerReleases';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cycle = await getCycleById(params.id);
    if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });

    // Find the most recent previous closed/approved/released cycle for the same ptatId
    const allCycles = await getAllCycles({ ptatId: cycle.ptatId });
    const previousCycles = allCycles
      .filter(
        (c) =>
          c.id !== cycle.id &&
          (c.status === 'Closed' || c.status === 'Approved' || c.status === 'Released' || c.status === 'Planned') &&
          c.number < cycle.number
      )
      .sort((a, b) => b.number - a.number);

    const previousCycle = previousCycles[0] ?? null;
    const empty = {
      prevCycleId: null,
      acceptedIds: [],
      pendingIds: [],
      withdrawnIds: [],
      waitlistedIds: [],
      acceptedDetails: [],
      totals: { accepted: 0, pending: 0, withdrawn: 0, waitlisted: 0, outOfPool: 0 },
    };

    if (!previousCycle) return NextResponse.json(empty);

    const offerRelease = await getOfferReleaseByCycleId(previousCycle.id);
    if (!offerRelease || !offerRelease.studentResults || offerRelease.studentResults.length === 0) {
      return NextResponse.json({ ...empty, prevCycleId: previousCycle.id });
    }

    const offered = offerRelease.studentResults.filter((r) => r.awardedProgramId !== null);
    const waitlistedStudents = offerRelease.studentResults.filter((r) => r.awardedProgramId === null);

    const acceptedStudents = offered.filter((r) => r.acceptanceStatus === 'Accepted');
    const pendingStudents  = offered.filter((r) => !r.acceptanceStatus || r.acceptanceStatus === 'Pending');
    const withdrawnStudents = offered.filter((r) => r.acceptanceStatus === 'Withdrawn');

    const acceptedIds  = acceptedStudents.map((r) => r.applicationId);
    const pendingIds   = pendingStudents.map((r) => r.applicationId);
    const withdrawnIds = withdrawnStudents.map((r) => r.applicationId);
    const waitlistedIds = waitlistedStudents.map((r) => r.applicationId);

    const acceptedDetails = acceptedStudents
      .filter((r) => r.awardedProgramId !== null)
      .map((r) => ({
        applicationId: r.applicationId,
        awardedProgramId: r.awardedProgramId!,
        awardedPreferenceOrder: r.awardedPreferenceOrder ?? 1,
      }));

    return NextResponse.json({
      prevCycleId: previousCycle.id,
      acceptedIds,
      pendingIds,
      withdrawnIds,
      waitlistedIds,
      acceptedDetails,
      totals: {
        accepted: acceptedIds.length,
        pending: pendingIds.length,
        withdrawn: withdrawnIds.length,
        waitlisted: waitlistedIds.length,
        outOfPool: pendingIds.length + withdrawnIds.length,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch previous offer results' }, { status: 500 });
  }
}
