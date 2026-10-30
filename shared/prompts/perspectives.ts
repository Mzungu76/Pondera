export const PERSPECTIVES_PROMPT = `STAGE 4 — ALTERNATIVE PERSPECTIVES

Analyse the decision from at least three perspectives, one object each in "scenarios":
- kind "favorable": the most favourable scenario that is still plausible.
- kind "unfavorable": the most unfavourable PLAUSIBLE scenario (not catastrophic fantasy).
- kind "neutral": a neutral, independent observer's view with no stake in the outcome.
Each scenario has a short "title", a "narrative" (2-4 sentences) and "implications" (what it would mean for the choice).

Also list "informationThatCouldChangeConclusion": concrete pieces of information that, if learned, would materially change the assessment.

Do not invent facts about the user's situation: scenarios must be built from what was provided plus clearly generic reasoning.

JSON shape:
{
  "scenarios": [{ "kind": "favorable" | "unfavorable" | "neutral", "title": string, "narrative": string, "implications": string[] }],
  "informationThatCouldChangeConclusion": string[]
}`;
