export function cyclesOverlap(
  a: { startDate: string; endDate: string },
  b: { startDate: string; endDate: string }
): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export function validateNonOverlapping(
  newCycle: { ptatId: string; startDate: string; endDate: string },
  existingCycles: any[],
  excludeId?: string
): string | null {
  for (const c of existingCycles) {
    if (c.id === excludeId) continue;
    if (c.ptatId === newCycle.ptatId && cyclesOverlap(newCycle, c)) {
      return `Date range overlaps with Cycle ${c.cycleNumber} (${c.startDate} – ${c.endDate})`;
    }
  }
  return null;
}
