import type { Matrix } from './schemas';

export interface RankedAlternative {
  alternative: string;
  /** Weighted average on the 1-10 scale. */
  total: number;
  /** Highest uncertainty among the criteria that carry the most weight. */
  highUncertaintyShare: number;
}

/**
 * Weighted average per alternative. Scores are rough judgements; this is a
 * reading aid, not a verdict. Criteria that don't score an alternative are
 * skipped for that alternative (weights are renormalised).
 */
export function computeTotals(matrix: Matrix): RankedAlternative[] {
  const names = new Set<string>();
  matrix.criteria.forEach((c) => c.scores.forEach((sc) => names.add(sc.alternative)));
  return [...names].map((alternative) => {
    let weighted = 0;
    let weightSum = 0;
    let highWeight = 0;
    for (const c of matrix.criteria) {
      const sc = c.scores.find((x) => x.alternative === alternative);
      if (!sc) continue;
      weighted += sc.score * c.weight;
      weightSum += c.weight;
      if (sc.uncertainty === 'high') highWeight += c.weight;
    }
    return {
      alternative,
      total: weightSum ? Math.round((weighted / weightSum) * 10) / 10 : 0,
      highUncertaintyShare: weightSum ? highWeight / weightSum : 0,
    };
  });
}

export function normalisedWeights(matrix: Matrix): number[] {
  const sum = matrix.criteria.reduce((a, c) => a + c.weight, 0) || 1;
  return matrix.criteria.map((c) => Math.round((c.weight / sum) * 100));
}
