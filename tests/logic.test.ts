import { describe, expect, it } from 'vitest';
import { computeTotals, normalisedWeights } from '../shared/scoring';
import { buildUserMessage, buildSystemPrompt, missingDependencies, renderDecision } from '../shared/pipeline';
import { emptyDraft, toInput, validateStep } from '../src/lib/draft';
import { STAGE_IDS } from '../shared/schemas';
import { input, outputs } from './fixtures';

describe('scoring', () => {
  it('computes weighted averages', () => {
    const t = computeTotals(outputs.matrix);
    const milano = t.find((x) => x.alternative === 'Milano')!;
    expect(milano.total).toBe(Math.round(((8 * 8 + 4 * 6) / 14) * 10) / 10);
  });
  it('normalises weights to ~100%', () => {
    const w = normalisedWeights(outputs.matrix);
    expect(Math.abs(w.reduce((a, b) => a + b, 0) - 100)).toBeLessThanOrEqual(1);
  });
});

describe('pipeline', () => {
  it('keeps prompts out of user message and delimits user data', () => {
    expect(renderDecision(input)).toMatch(/^<user_decision>[\s\S]*<\/user_decision>$/);
    for (const s of STAGE_IDS) expect(buildSystemPrompt(s)).toContain('untrusted');
  });
  it('declares dependencies and injects previous outputs', () => {
    expect(missingDependencies('biases', {})).toEqual(['understand']);
    expect(missingDependencies('understand', {})).toEqual([]);
    expect(buildUserMessage('biases', input, { understand: outputs.understand })).toContain('<previous_stage name="understand">');
  });
  it('biases prompt enforces calibrated language', () => {
    expect(buildSystemPrompt('biases')).toMatch(/Never write that the user "has"/);
  });
});

describe('draft validation', () => {
  it('requires title and decision on step 0 only', () => {
    expect(Object.keys(validateStep(emptyDraft(), 0)).sort()).toEqual(['decision', 'title']);
    expect(validateStep(emptyDraft(), 1)).toEqual({});
  });
  it('requires two named, distinct alternatives', () => {
    const d = emptyDraft();
    expect(validateStep(d, 2).alternatives).toBe('minAlts');
    d.alternatives[0].name = 'A';
    d.alternatives[1].name = 'a';
    expect(validateStep(d, 2).alternatives).toBe('dupAlts');
    d.alternatives[1].name = 'B';
    expect(validateStep(d, 2)).toEqual({});
  });
  it('drops blank alternatives when building the API input', () => {
    const d = { ...emptyDraft(), title: 'T', decision: 'D' };
    d.alternatives = [{ name: 'A', description: '' }, { name: ' ', description: '' }, { name: 'B', description: 'x' }];
    expect(toInput(d).alternatives.map((a) => a.name)).toEqual(['A', 'B']);
  });
});
