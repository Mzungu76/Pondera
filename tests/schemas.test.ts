import { describe, expect, it } from 'vitest';
import { AnalysisSchema, AnalyzeRequestSchema, DecisionInputSchema, MatrixSchema, ReportSchema, UnderstandSchema } from '../shared/schemas';
import { LIMITS } from '../shared/limits';
import { input, outputs } from './fixtures';

describe('DecisionInputSchema', () => {
  it('accepts a valid input and trims strings', () => {
    const r = DecisionInputSchema.parse({ ...input, title: '  Ciao  ' });
    expect(r.title).toBe('Ciao');
  });
  it('allows partial information (optional fields default to empty)', () => {
    const r = DecisionInputSchema.parse({ title: 'T', decision: 'D', alternatives: [{ name: 'A' }, { name: 'B' }] });
    expect(r.context).toBe('');
  });
  it('requires 2 to 5 alternatives', () => {
    expect(DecisionInputSchema.safeParse({ ...input, alternatives: [input.alternatives[0]] }).success).toBe(false);
    const six = Array.from({ length: 6 }, (_, i) => ({ name: `A${i}`, description: '' }));
    expect(DecisionInputSchema.safeParse({ ...input, alternatives: six }).success).toBe(false);
  });
  it('enforces field length limits', () => {
    expect(DecisionInputSchema.safeParse({ ...input, context: 'x'.repeat(LIMITS.context + 1) }).success).toBe(false);
  });
  it('requires title and decision', () => {
    expect(DecisionInputSchema.safeParse({ ...input, title: '  ' }).success).toBe(false);
    expect(DecisionInputSchema.safeParse({ ...input, decision: '' }).success).toBe(false);
  });
});

describe('stage schemas', () => {
  it('accepts the full fixture analysis', () => {
    expect(AnalysisSchema.safeParse(outputs).success).toBe(true);
  });
  it('rejects missing fields', () => {
    const { problem: _p, ...rest } = outputs.understand;
    expect(UnderstandSchema.safeParse(rest).success).toBe(false);
  });
  it('rejects unknown bias statuses (no "definitely has")', () => {
    const bad = structuredClone(outputs.biases) as any;
    bad.biases[0].status = 'confirmed';
    expect(AnalysisSchema.shape.biases.safeParse(bad).success).toBe(false);
  });
  it('rejects matrix weights/scores out of range', () => {
    const bad = structuredClone(outputs.matrix);
    bad.criteria[0].weight = 11;
    expect(MatrixSchema.safeParse(bad).success).toBe(false);
    const bad2 = structuredClone(outputs.matrix);
    bad2.criteria[0].scores[0].score = 0;
    expect(MatrixSchema.safeParse(bad2).success).toBe(false);
  });
  it('requires exactly three top questions and at least three questions', () => {
    expect(ReportSchema.safeParse({ ...outputs.report, topQuestions: ['a', 'b'] }).success).toBe(false);
    expect(ReportSchema.safeParse({ ...outputs.report, questionsBeforeDeciding: ['a', 'b'] }).success).toBe(false);
  });
  it('requires at least one counterargument and three scenarios', () => {
    expect(AnalysisSchema.shape.challenge.safeParse({ ...outputs.challenge, counterarguments: [] }).success).toBe(false);
    expect(AnalysisSchema.shape.perspectives.safeParse({ ...outputs.perspectives, scenarios: outputs.perspectives.scenarios.slice(0, 2) }).success).toBe(false);
  });
});

describe('AnalyzeRequestSchema', () => {
  it('rejects unknown stages and unknown keys in previous', () => {
    expect(AnalyzeRequestSchema.safeParse({ stage: 'nope', input }).success).toBe(false);
    expect(AnalyzeRequestSchema.safeParse({ stage: 'biases', input, previous: { evil: 1 } }).success).toBe(false);
  });
  it('validates previous outputs against stage schemas', () => {
    expect(AnalyzeRequestSchema.safeParse({ stage: 'biases', input, previous: { understand: { bad: true } } }).success).toBe(false);
    expect(AnalyzeRequestSchema.safeParse({ stage: 'biases', input, previous: { understand: outputs.understand } }).success).toBe(true);
  });
});
