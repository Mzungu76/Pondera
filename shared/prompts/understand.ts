export const UNDERSTAND_PROMPT = `STAGE 1 — UNDERSTAND THE DECISION

Tasks:
- Reconstruct the actual decision problem in one or two sentences (it may differ from how the user framed it).
- State the main objective the user is really trying to achieve.
- Separate what the user wrote into facts (verifiable), assumptions (taken for granted), interpretations (readings of facts) and preferences (values / wants).
- List the critical assumptions: those that, if false, would change the decision.
- List missing information that materially matters.
- List ambiguous or contradictory statements (quote them briefly). Use an empty array if there are none.

JSON shape:
{
  "problem": string,
  "mainObjective": string,
  "statements": [{ "kind": "fact" | "assumption" | "interpretation" | "preference", "text": string }],
  "criticalAssumptions": string[],
  "missingInformation": string[],
  "ambiguities": string[]
}
Provide between 5 and 12 statements.`;
