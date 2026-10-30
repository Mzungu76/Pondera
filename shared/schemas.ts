import { z } from 'zod';
import { LIMITS } from './limits';

/* ------------------------------------------------------------------ */
/* User input                                                          */
/* ------------------------------------------------------------------ */

const text = (max: number) => z.string().trim().max(max);

export const AlternativeSchema = z.object({
  name: text(LIMITS.alternativeName).min(1),
  description: text(LIMITS.alternativeDescription).default(''),
});

export const DecisionInputSchema = z.object({
  title: text(LIMITS.title).min(1),
  decision: text(LIMITS.decision).min(1),
  context: text(LIMITS.context).default(''),
  outcome: text(LIMITS.outcome).default(''),
  constraints: text(LIMITS.constraints).default(''),
  alternatives: z.array(AlternativeSchema).min(LIMITS.minAlternatives).max(LIMITS.maxAlternatives),
  doNothing: text(LIMITS.doNothing).default(''),
});
export type DecisionInput = z.infer<typeof DecisionInputSchema>;

/* ------------------------------------------------------------------ */
/* AI stage outputs                                                    */
/* ------------------------------------------------------------------ */

const s = z.string().trim().min(1);
const list = (item: z.ZodType<string> = s) => z.array(item);

export const BIAS_IDS = [
  'confirmation',
  'anchoring',
  'availability',
  'sunk_cost',
  'overconfidence',
  'loss_aversion',
  'status_quo',
  'framing',
  'optimism',
  'planning_fallacy',
  'attribution_error',
  'false_dilemma',
] as const;
export type BiasId = (typeof BIAS_IDS)[number];

/** Stage 1 — understand the decision */
export const UnderstandSchema = z.object({
  problem: s,
  mainObjective: s,
  statements: z
    .array(
      z.object({
        kind: z.enum(['fact', 'assumption', 'interpretation', 'preference']),
        text: s,
      }),
    )
    .min(1),
  criticalAssumptions: list(),
  missingInformation: list(),
  ambiguities: list(),
});
export type Understand = z.infer<typeof UnderstandSchema>;

/** Stage 2 — cognitive bias detection */
export const BiasStatusSchema = z.enum([
  'possible_indication',
  'potential_bias',
  'insufficient_evidence',
]);
export type BiasStatus = z.infer<typeof BiasStatusSchema>;

export const BiasSchema = z.object({
  id: z.enum(BIAS_IDS),
  name: s,
  status: BiasStatusSchema,
  meaning: s,
  trigger: s,
  why: s,
  testQuestion: s,
});
export const BiasesSchema = z.object({
  biases: z.array(BiasSchema),
  notDetected: z.array(z.enum(BIAS_IDS)),
});
export type Bias = z.infer<typeof BiasSchema>;
export type Biases = z.infer<typeof BiasesSchema>;

/** Stage 3 — critical challenge */
export const ChallengeSchema = z.object({
  weakAssumptions: z.array(z.object({ assumption: s, whyWeak: s })),
  missingEvidence: list(),
  logicalWeaknesses: list(),
  unsupportedConclusions: list(),
  risks: z.array(
    z.object({
      risk: s,
      consequence: s,
      severity: z.enum(['low', 'medium', 'high']),
    }),
  ),
  alternativeExplanations: list(),
  counterarguments: z
    .array(
      z.object({
        argument: s,
        reasoning: s,
        strength: z.enum(['weak', 'moderate', 'strong']),
      }),
    )
    .min(1),
});
export type Challenge = z.infer<typeof ChallengeSchema>;

/** Stage 4 — alternative perspectives */
export const PerspectivesSchema = z.object({
  scenarios: z
    .array(
      z.object({
        kind: z.enum(['favorable', 'unfavorable', 'neutral']),
        title: s,
        narrative: s,
        implications: list(),
      }),
    )
    .min(3),
  informationThatCouldChangeConclusion: list(),
});
export type Perspectives = z.infer<typeof PerspectivesSchema>;

/** Stage 5 — decision matrix */
export const UncertaintySchema = z.enum(['low', 'medium', 'high']);
export type Uncertainty = z.infer<typeof UncertaintySchema>;

export const MatrixSchema = z.object({
  criteria: z
    .array(
      z.object({
        name: s,
        description: s,
        /** Relative importance 1 (minor) .. 10 (critical). Normalised client-side. */
        weight: z.number().min(1).max(10),
        scores: z
          .array(
            z.object({
              alternative: s,
              /** 1 (poor) .. 10 (excellent) */
              score: z.number().min(1).max(10),
              justification: s,
              uncertainty: UncertaintySchema,
            }),
          )
          .min(2),
      }),
    )
    .min(2)
    .max(8),
  caveat: s,
});
export type Matrix = z.infer<typeof MatrixSchema>;

/** Stage 6 — final report */
export const ReportSchema = z.object({
  summary: s,
  mainObjective: s,
  evidenceSufficiency: z.enum(['sufficient', 'partial', 'insufficient']),
  evidenceNote: s,
  mainRisks: list(),
  missingInformation: list(),
  questionsBeforeDeciding: z.array(s).min(3),
  topQuestions: z.array(s).length(3),
  nextActions: list(),
  alternativeNotes: z.array(
    z.object({ alternative: s, strengths: list(), concerns: list() }),
  ),
});
export type Report = z.infer<typeof ReportSchema>;

/* ------------------------------------------------------------------ */
/* Pipeline definition                                                 */
/* ------------------------------------------------------------------ */

export const STAGE_IDS = ['understand', 'biases', 'challenge', 'perspectives', 'matrix', 'report'] as const;
export type StageId = (typeof STAGE_IDS)[number];

export const STAGE_SCHEMAS = {
  understand: UnderstandSchema,
  biases: BiasesSchema,
  challenge: ChallengeSchema,
  perspectives: PerspectivesSchema,
  matrix: MatrixSchema,
  report: ReportSchema,
} as const;

export interface StageOutputs {
  understand: Understand;
  biases: Biases;
  challenge: Challenge;
  perspectives: Perspectives;
  matrix: Matrix;
  report: Report;
}

/** Outputs of earlier stages, passed back by the client as context. */
export const PreviousOutputsSchema = z
  .object({
    understand: UnderstandSchema.optional(),
    biases: BiasesSchema.optional(),
    challenge: ChallengeSchema.optional(),
    perspectives: PerspectivesSchema.optional(),
    matrix: MatrixSchema.optional(),
  })
  .strict();
export type PreviousOutputs = z.infer<typeof PreviousOutputsSchema>;

/** Complete analysis, as stored locally and rendered. */
export const AnalysisSchema = z.object({
  understand: UnderstandSchema,
  biases: BiasesSchema,
  challenge: ChallengeSchema,
  perspectives: PerspectivesSchema,
  matrix: MatrixSchema,
  report: ReportSchema,
});
export type Analysis = z.infer<typeof AnalysisSchema>;

/* ------------------------------------------------------------------ */
/* API contract                                                        */
/* ------------------------------------------------------------------ */

export const AnalyzeRequestSchema = z.object({
  stage: z.enum(STAGE_IDS),
  input: DecisionInputSchema,
  previous: PreviousOutputsSchema.default({}),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const API_ERROR_CODES = [
  'bad_request',
  'unauthorized',
  'rate_limited',
  'too_large',
  'upstream_error',
  'upstream_rate_limited',
  'timeout',
  'invalid_output',
  'not_configured',
  'method_not_allowed',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Stored report (localStorage). */
export const StoredReportSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  title: z.string().min(1).max(LIMITS.title),
  input: DecisionInputSchema,
  analysis: AnalysisSchema,
});
export type StoredReport = z.infer<typeof StoredReportSchema>;
