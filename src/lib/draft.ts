import { LIMITS } from '../../shared/limits';
import { type DecisionInput } from '../../shared/schemas';

export interface DraftAlt {
  name: string;
  description: string;
}
/** Wizard state: more permissive than DecisionInput (fields may be empty while typing). */
export interface Draft {
  title: string;
  decision: string;
  context: string;
  outcome: string;
  constraints: string;
  doNothing: string;
  alternatives: DraftAlt[];
}

export const emptyDraft = (): Draft => ({
  title: '',
  decision: '',
  context: '',
  outcome: '',
  constraints: '',
  doNothing: '',
  alternatives: [
    { name: '', description: '' },
    { name: '', description: '' },
  ],
});

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Defensive parse of a stored draft; returns null if unusable. */
export function parseDraft(raw: unknown): Draft | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const alts = Array.isArray(r.alternatives) ? r.alternatives : [];
  const alternatives = alts
    .slice(0, LIMITS.maxAlternatives)
    .map((a: any) => ({ name: str(a?.name, LIMITS.alternativeName), description: str(a?.description, LIMITS.alternativeDescription) }));
  while (alternatives.length < LIMITS.minAlternatives) alternatives.push({ name: '', description: '' });
  return {
    title: str(r.title, LIMITS.title),
    decision: str(r.decision, LIMITS.decision),
    context: str(r.context, LIMITS.context),
    outcome: str(r.outcome, LIMITS.outcome),
    constraints: str(r.constraints, LIMITS.constraints),
    doNothing: str(r.doNothing, LIMITS.doNothing),
    alternatives,
  };
}

export function isEmptyDraft(d: Draft): boolean {
  return !d.title && !d.decision && !d.context && !d.outcome && !d.constraints && !d.doNothing && d.alternatives.every((a) => !a.name && !a.description);
}

export function filledAlternatives(d: Draft) {
  return d.alternatives.filter((a) => a.name.trim());
}

export type DraftErrors = Partial<Record<'title' | 'decision' | 'alternatives', string>>;

/** Required fields per step; messages are keys resolved by the UI. */
export function validateStep(d: Draft, step: number): DraftErrors {
  const e: DraftErrors = {};
  if (step === 0) {
    if (!d.title.trim()) e.title = 'required';
    if (!d.decision.trim()) e.decision = 'required';
  }
  if (step === 2) {
    const names = filledAlternatives(d).map((a) => a.name.trim().toLowerCase());
    if (names.length < LIMITS.minAlternatives) e.alternatives = 'minAlts';
    else if (new Set(names).size !== names.length) e.alternatives = 'dupAlts';
  }
  return e;
}

/** Converts the wizard draft to the API input, dropping blank alternatives. */
export function toInput(d: Draft): DecisionInput {
  return {
    title: d.title.trim(),
    decision: d.decision.trim(),
    context: d.context.trim(),
    outcome: d.outcome.trim(),
    constraints: d.constraints.trim(),
    doNothing: d.doNothing.trim(),
    alternatives: filledAlternatives(d).map((a) => ({ name: a.name.trim(), description: a.description.trim() })),
  };
}
