import { describe, expect, it } from 'vitest';
import { extractJson, parseAndValidate } from '../netlify/functions/lib/anthropic';
import { UnderstandSchema } from '../shared/schemas';
import { outputs } from './fixtures';

describe('extractJson', () => {
  const obj = { a: 1 };
  it('parses plain JSON', () => expect(extractJson('{"a":1}')).toEqual(obj));
  it('strips markdown fences', () => expect(extractJson('```json\n{"a":1}\n```')).toEqual(obj));
  it('finds JSON surrounded by prose', () => expect(extractJson('Ecco:\n{"a":1}\nFine')).toEqual(obj));
  it('throws when there is no JSON', () => expect(() => extractJson('niente')).toThrow());
  it('throws on truncated JSON', () => expect(() => extractJson('{"a":')).toThrow());
});

describe('parseAndValidate', () => {
  it('ok for valid output', () => {
    expect(parseAndValidate(JSON.stringify(outputs.understand), UnderstandSchema).ok).toBe(true);
  });
  it('reports invalid JSON', () => {
    const r = parseAndValidate('not json', UnderstandSchema);
    expect(r.ok).toBe(false);
    expect(r.problems?.[0]).toMatch(/JSON/);
  });
  it('reports missing fields without echoing content', () => {
    const r = parseAndValidate(JSON.stringify({ problem: 'SEGRETO' }), UnderstandSchema);
    expect(r.ok).toBe(false);
    expect(r.problems!.join(' ')).toMatch(/mainObjective/);
    expect(r.problems!.join(' ')).not.toMatch(/SEGRETO/);
  });
  it('applies extra semantic checks', () => {
    const r = parseAndValidate(JSON.stringify(outputs.understand), UnderstandSchema, () => ['custom problem']);
    expect(r.ok).toBe(false);
    expect(r.problems).toEqual(['custom problem']);
  });
});
