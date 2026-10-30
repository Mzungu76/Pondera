export const BIASES_PROMPT = `STAGE 2 — COGNITIVE BIAS SCAN

Evaluate whether the text gives any indication of the following biases. Use these ids exactly:
confirmation (Confirmation bias), anchoring (Anchoring bias), availability (Availability heuristic), sunk_cost (Sunk cost fallacy), overconfidence (Overconfidence bias), loss_aversion (Loss aversion), status_quo (Status quo bias), framing (Framing effect), optimism (Optimism bias), planning_fallacy (Planning fallacy), attribution_error (Fundamental attribution error), false_dilemma (False dilemma).

Rules:
- Only list a bias in "biases" if there is a concrete textual hook for it. For each one give:
  - "status": "possible_indication" (a statement plausibly points to it), "potential_bias" (a pattern worth checking) or "insufficient_evidence" (a hint, too weak to conclude).
  - "meaning": a plain-language explanation of the bias (one sentence, no jargon).
  - "trigger": the specific statement or assumption (quoted or closely paraphrased) that may indicate it.
  - "why": why it could distort THIS decision.
  - "testQuestion": one concrete question the user can ask themselves to test it.
- Put every bias with no textual hook in "notDetected" (ids only). Every one of the 12 ids must appear exactly once, either in "biases" or in "notDetected".
- Use calibrated wording ("potrebbe indicare", "possibile", "non ci sono elementi sufficienti"). Never write that the user "has" or "suffers from" a bias.
- Do not stretch to find biases. An honest "notDetected" is better than a forced match.

JSON shape:
{
  "biases": [{ "id": string, "name": string, "status": "possible_indication" | "potential_bias" | "insufficient_evidence", "meaning": string, "trigger": string, "why": string, "testQuestion": string }],
  "notDetected": string[]
}`;
