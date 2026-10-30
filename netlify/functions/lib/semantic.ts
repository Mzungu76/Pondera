import type { DecisionInput, StageId } from '../../../shared/schemas';

const norm = (s: string) => s.trim().toLowerCase();

/** Cross-field checks that Zod alone can't express. Returns problems (empty = ok). */
export function semanticProblems(stage: StageId, data: any, input: DecisionInput): string[] {
  const problems: string[] = [];
  if (stage === 'matrix') {
    const expected = input.alternatives.map((a) => norm(a.name));
    for (const [i, c] of (data.criteria ?? []).entries()) {
      const got = new Set<string>((c.scores ?? []).map((s: any) => norm(String(s.alternative))));
      for (const name of expected) {
        if (!got.has(name)) problems.push(`criteria.${i}.scores: missing alternative "${name}" (use the exact name).`);
      }
    }
  }
  if (stage === 'biases') {
    const seen = new Set<string>();
    for (const b of data.biases ?? []) {
      if (seen.has(b.id)) problems.push(`biases: duplicate id ${b.id}.`);
      seen.add(b.id);
    }
    for (const id of data.notDetected ?? []) {
      if (seen.has(id)) problems.push(`notDetected: ${id} also appears in biases.`);
    }
  }
  return problems.slice(0, 10);
}
