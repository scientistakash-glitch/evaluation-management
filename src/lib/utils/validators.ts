export function validateWeightageSum(criteria: { weightage: number }[]): string | null {
  const sum = criteria.reduce((acc, c) => acc + c.weightage, 0);
  if (Math.abs(sum - 100) > 0.01) {
    return `Weightages must sum to 100% (currently ${sum.toFixed(1)}%)`;
  }
  return null;
}
