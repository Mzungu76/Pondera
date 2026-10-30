export const REPORT_PROMPT = `STAGE 6 — FINAL REPORT

Synthesise the earlier stages into the decision report. You must NOT tell the user which alternative to choose. Your job is to make their own decision better informed.

Fields:
- summary: 3-5 sentences summarising the decision, the key tensions and what the analysis surfaced.
- mainObjective: the main objective, restated.
- evidenceSufficiency: "sufficient" | "partial" | "insufficient" — your honest view of whether the information provided is enough to decide well. Default to "partial" or "insufficient" when key facts are missing.
- evidenceNote: one or two sentences explaining that judgement. If the evidence is insufficient, say so explicitly.
- mainRisks: the most important risks (strings).
- missingInformation: the most important missing information.
- questionsBeforeDeciding: 4-8 questions the user should answer before deciding.
- topQuestions: EXACTLY three of those questions — the most important ones.
- nextActions: 3-6 concrete, low-cost next actions to reduce uncertainty or test assumptions.
- alternativeNotes: one entry per alternative (exact names as given by the user) with strengths and concerns. Describe, do not rank.

JSON shape:
{
  "summary": string,
  "mainObjective": string,
  "evidenceSufficiency": "sufficient" | "partial" | "insufficient",
  "evidenceNote": string,
  "mainRisks": string[],
  "missingInformation": string[],
  "questionsBeforeDeciding": string[],
  "topQuestions": [string, string, string],
  "nextActions": string[],
  "alternativeNotes": [{ "alternative": string, "strengths": string[], "concerns": string[] }]
}`;
