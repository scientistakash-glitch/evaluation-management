export function cyclesOverlap(
  a: { startDate: string; closingDate: string },
  b: { startDate: string; closingDate: string }
): boolean {
  return a.startDate <= b.closingDate && b.startDate <= a.closingDate;
}

export function validateNonOverlapping(
  newCycle: { ptatId: string; startDate: string; closingDate: string },
  existingCycles: Array<{ id?: string; ptatId: string; timeline?: { startDate: string; closingDate: string }; number?: number }>,
  excludeId?: string
): string | null {
  for (const c of existingCycles) {
    if (c.id === excludeId) continue;
    if (!c.timeline) continue;
    if (c.ptatId === newCycle.ptatId && cyclesOverlap(newCycle, c.timeline)) {
      return `Date range overlaps with Cycle ${c.number ?? ''} (${c.timeline.startDate} – ${c.timeline.closingDate})`;
    }
  }
  return null;
}
