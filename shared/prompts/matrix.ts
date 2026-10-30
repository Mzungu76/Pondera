export const MATRIX_PROMPT = `STAGE 5 — DECISION MATRIX

Compare the alternatives with a structured matrix.
- Choose between 3 and 6 criteria derived from the user's stated objective and constraints (not generic ones).
- Each criterion: "name", "description", "weight" (integer 1-10, relative importance for THIS user given their objective and constraints), and "scores".
- "scores" must contain exactly one entry for EVERY alternative listed by the user, using the alternative's exact name as given, plus one entry for the "do nothing / status quo" option only if the user described one — in that case name it exactly "Non fare nulla".
- Each score: "score" (integer 1-10, higher is better for that criterion), "justification" (one short sentence tied to the facts provided), and "uncertainty" ("low" | "medium" | "high") reflecting how much the score rests on missing or assumed information. Prefer "high" over false precision.
- "caveat": one or two sentences reminding the user these numbers are rough judgements, not measurements, and that the weights should be revisited by them.

Do not pretend the scores are objective. Do not declare a winner.

JSON shape:
{
  "criteria": [{ "name": string, "description": string, "weight": number, "scores": [{ "alternative": string, "score": number, "justification": string, "uncertainty": "low" | "medium" | "high" }] }],
  "caveat": string
}`;
