/** Size limits shared by client-side validation and server-side enforcement. */
export const LIMITS = {
  title: 120,
  decision: 1000,
  context: 3000,
  outcome: 1000,
  constraints: 1500,
  doNothing: 1000,
  alternativeName: 80,
  alternativeDescription: 600,
  minAlternatives: 2,
  maxAlternatives: 5,
  /** Hard cap on the full request body accepted by the function (bytes). */
  maxRequestBytes: 120_000,
  accessCode: 200,
} as const;
