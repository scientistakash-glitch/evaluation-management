import { CycleTimeline } from '@/types/cycle';

export function cycleTimelineStart(t: CycleTimeline): string {
  return t.applicationPeriod?.start ?? '';
}

export function cycleTimelineEnd(t: CycleTimeline): string {
  return t.paymentPeriod?.end ?? '';
}

export function cyclesOverlap(
  a: { start: string; end: string },
  b: { start: string; end: string }
): boolean {
  return a.start <= b.end && b.start <= a.end;
}

export function validateNonOverlapping(
  newCycle: { ptatId: string; start: string; end: string },
  existingCycles: Array<{ id?: string; ptatId: string; timeline?: CycleTimeline; number?: number }>,
  excludeId?: string
): string | null {
  for (const c of existingCycles) {
    if (c.id === excludeId) continue;
    if (!c.timeline) continue;
    const cStart = cycleTimelineStart(c.timeline);
    const cEnd   = cycleTimelineEnd(c.timeline);
    if (c.ptatId === newCycle.ptatId && cyclesOverlap(newCycle, { start: cStart, end: cEnd })) {
      return `Date range overlaps with Cycle ${c.number ?? ''} (${cStart} – ${cEnd})`;
    }
  }
  return null;
}
