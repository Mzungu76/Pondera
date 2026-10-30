import { COMMON_SYSTEM } from './prompts/common';
import { UNDERSTAND_PROMPT } from './prompts/understand';
import { BIASES_PROMPT } from './prompts/biases';
import { CHALLENGE_PROMPT } from './prompts/challenge';
import { PERSPECTIVES_PROMPT } from './prompts/perspectives';
import { MATRIX_PROMPT } from './prompts/matrix';
import { REPORT_PROMPT } from './prompts/report';
import type { DecisionInput, PreviousOutputs, StageId } from './schemas';

export interface StageConfig {
  id: StageId;
  prompt: string;
  /** Output token budget for the stage. Keep tight: it bounds cost and latency. */
  maxTokens: number;
  /** Earlier stages whose outputs are passed as context. */
  needs: readonly StageId[];
}

export const STAGES: Record<StageId, StageConfig> = {
  understand: { id: 'understand', prompt: UNDERSTAND_PROMPT, maxTokens: 1800, needs: [] },
  biases: { id: 'biases', prompt: BIASES_PROMPT, maxTokens: 2600, needs: ['understand'] },
  challenge: { id: 'challenge', prompt: CHALLENGE_PROMPT, maxTokens: 2600, needs: ['understand', 'biases'] },
  perspectives: { id: 'perspectives', prompt: PERSPECTIVES_PROMPT, maxTokens: 2000, needs: ['understand', 'challenge'] },
  matrix: { id: 'matrix', prompt: MATRIX_PROMPT, maxTokens: 3000, needs: ['understand', 'challenge', 'perspectives'] },
  report: {
    id: 'report',
    prompt: REPORT_PROMPT,
    maxTokens: 2600,
    needs: ['understand', 'biases', 'challenge', 'perspectives', 'matrix'],
  },
};

export function buildSystemPrompt(stage: StageId): string {
  return `${COMMON_SYSTEM}\n\n${STAGES[stage].prompt}`;
}

/** Serialises the user's input as delimited, untrusted data. */
export function renderDecision(input: DecisionInput): string {
  const alts = input.alternatives
    .map((a, i) => `${i + 1}. ${a.name}${a.description ? ` — ${a.description}` : ''}`)
    .join('\n');
  const field = (label: string, value: string) => `${label}: ${value || '(non indicato)'}`;
  return [
    '<user_decision>',
    field('Titolo', input.title),
    field('Cosa devo decidere', input.decision),
    field('Contesto', input.context),
    field('Risultato desiderato', input.outcome),
    field('Vincoli', input.constraints),
    `Alternative considerate:\n${alts}`,
    field('Cosa succede se non faccio nulla', input.doNothing),
    '</user_decision>',
  ].join('\n');
}

export function buildUserMessage(stage: StageId, input: DecisionInput, previous: PreviousOutputs): string {
  const parts = [renderDecision(input)];
  for (const dep of STAGES[stage].needs) {
    const out = previous[dep as keyof PreviousOutputs];
    if (out) parts.push(`<previous_stage name="${dep}">\n${JSON.stringify(out)}\n</previous_stage>`);
  }
  parts.push(`Produce the JSON output for stage "${stage}" now.`);
  return parts.join('\n\n');
}

/** Which earlier outputs a stage requires. Used server-side to reject incomplete requests. */
export function missingDependencies(stage: StageId, previous: PreviousOutputs): StageId[] {
  return STAGES[stage].needs.filter((d) => !previous[d as keyof PreviousOutputs]);
}
