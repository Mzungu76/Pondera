export const CHALLENGE_PROMPT = `STAGE 3 — CRITICAL CHALLENGE

Act as a rigorous devil's advocate. Challenge the user's reasoning using the earlier analysis as a map. Identify:
- weakAssumptions: assumptions that look fragile, with the reason they are weak.
- missingEvidence: claims or beliefs lacking supporting evidence.
- logicalWeaknesses: inconsistencies or gaps in the reasoning.
- unsupportedConclusions: conclusions that do not follow from what is stated.
- risks: unconsidered risks, with the consequence and a severity ("low" | "medium" | "high"). Use severity honestly; most risks are not "high".
- alternativeExplanations: other plausible explanations for the situation the user describes.
- counterarguments: at least three strong counterarguments to the user's apparent leaning, where the information allows it (fewer only if the input is too thin — then say so in the reasoning). Each has "argument", "reasoning" and "strength" ("weak" | "moderate" | "strong").

Do not invent facts. Use empty arrays for categories with nothing to report.

JSON shape:
{
  "weakAssumptions": [{ "assumption": string, "whyWeak": string }],
  "missingEvidence": string[],
  "logicalWeaknesses": string[],
  "unsupportedConclusions": string[],
  "risks": [{ "risk": string, "consequence": string, "severity": "low" | "medium" | "high" }],
  "alternativeExplanations": string[],
  "counterarguments": [{ "argument": string, "reasoning": string, "strength": "weak" | "moderate" | "strong" }]
}`;
