# Pondera

**Think clearly. Decide better.**

Pondera is an AI-powered *decision copilot*. It does not decide for you and it does not simply agree with you: it challenges assumptions, flags *possible* cognitive biases, explores counter-arguments and alternative scenarios, compares options in a decision matrix and produces a structured report. The UI is in Italian (with an i18n seam for other languages).

> AI analysis is not a guarantee of correctness. Pondera is a thinking aid.

## Architecture

```
Browser (React + Vite + Tailwind)          Netlify Functions (Node)               Anthropic
  wizard → runPipeline ── POST /api/analyze {stage,input,previous} ──► validate ──► Messages API
  report ◄── Zod re-validation ◄──────────── {ok,data} ◄──── Zod validate (+1 repair) ◄─┘
  localStorage (reports, draft)            env: ANTHROPIC_API_KEY / ANTHROPIC_MODEL / PONDERA_ACCESS_CODE
```

* `shared/` – code used by both sides: Zod schemas (`schemas.ts`), size limits, **prompts (one file per stage in `shared/prompts/`)**, pipeline registry (`pipeline.ts`), matrix scoring.
* `netlify/functions/analyze.ts` – validates the request (size, shape, access code, dependencies), calls Anthropic for **one stage**, validates the JSON with Zod, performs **at most one repair call**, returns validated data or a clear error. `config.ts` reports/verifies the access gate (no AI call).
* `src/` – UI. `lib/pipeline.ts` runs the six stages sequentially (one HTTP request each, which keeps every request inside serverless time limits); `lib/storage.ts` handles localStorage with corruption/quota handling; `i18n/` holds all copy.

### The six-stage pipeline
1 understand → 2 cognitive biases → 3 critical challenge → 4 perspectives → 5 decision matrix → 6 final report. Each stage has its own prompt, token budget, schema and dependencies, so they can be improved independently. Later stages receive the validated outputs of earlier ones. User text is passed inside a delimited `<user_decision>` block and declared untrusted (prompt-injection mitigation). Bias wording is calibrated by schema (`possible_indication | potential_bias | insufficient_evidence`) and prompt; the report prompt forbids picking a winner.

If a stage fails, the UI keeps completed stages and lets the user **explicitly** retry from the failing one. There are no automatic retries; the only automatic extra call is the single JSON repair request.

## Local development

```bash
npm install
cp .env.example .env     # fill ANTHROPIC_API_KEY and ANTHROPIC_MODEL
npm run dev              # http://localhost:5173 — /api/* is served by a Vite plugin that runs the same function code
```
(`npx netlify-cli dev` also works if you prefer the real Netlify runtime.)

| Command | Purpose |
|---|---|
| `npm run dev` | dev server incl. local functions |
| `npm run typecheck` | TypeScript check |
| `npm test` | unit/integration tests (Vitest) |
| `npm run build` | typecheck + production build to `dist/` |
| `node e2e/mock-anthropic.mjs` + `node e2e/run.cjs` | optional browser E2E against a mock provider (needs Playwright; see header of `e2e/run.cjs`; start Vite with `ANTHROPIC_API_URL=http://localhost:8799/v1/messages PONDERA_RATE_LIMIT_MAX=500`, port 5199, and set `SHOTS` to a writable dir) |

## Environment variables (server-side only — never `VITE_`-prefixed)

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Anthropic API key. Never exposed to the browser. |
| `ANTHROPIC_MODEL` | yes | Model id used for all stages. Deliberately has no default in code. Use a current model id from the Anthropic docs. |
| `PONDERA_ACCESS_CODE` | no | If set, analysis requires this shared code (checked in the function). |
| `ANTHROPIC_TIMEOUT_MS` | no | Per-request time budget (default 50000). Keep within your Netlify function timeout. |
| `PONDERA_RATE_LIMIT_MAX` | no | Requests per client per 10 min per warm instance (default 30; one analysis = 6). |
| `ANTHROPIC_API_URL` | no | Override provider URL; for tests only. |

### Anthropic configuration
Create a key in the Anthropic Console, set a **monthly spend limit** there, and add the key/model as Netlify environment variables (Site configuration → Environment variables). Mark the key as secret.

## Deploying (GitHub → Netlify)
1. Push this repository to GitHub (`Mzungu76/Pondera`) and merge to your production branch.
2. In Netlify: *Add new site → Import an existing project → GitHub →* select the repo. Build settings are read from `netlify.toml` (`npm run build`, publish `dist`, functions `netlify/functions`).
3. Add `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` and (recommended for the beta) `PONDERA_ACCESS_CODE` under Environment variables, then trigger a deploy.
4. Check `https://<site>/api/config` returns `{"ok":true,"accessCodeRequired":…}` and run one analysis.
5. Ensure the function timeout is adequate for one stage (a stage typically takes 5–25 s). If your plan's default sync timeout is shorter than ~30 s, raise it or lower `ANTHROPIC_TIMEOUT_MS`/model size; timeouts surface as a clear, retryable error.

`netlify.toml` also defines the `/api/*` → function redirect, the SPA fallback and security headers (CSP, nosniff, no-referrer, frame denial).

## Git workflow
Work on feature branches, open a PR, merge to the production branch; Netlify builds every push (deploy previews for PRs). Never commit `.env` (ignored) or user data.

## Cost estimate (not a price list)
One analysis = 6 stage calls (+ a repair call only when output is invalid). Assumptions: ~1.5–4k input tokens per stage (user text + earlier stage outputs, growing along the pipeline) ≈ **15–20k input** and ≈ **8–12k output** tokens in total.
`cost ≈ input_tokens × input_price + output_tokens × output_price`. Illustration with *assumed* prices of $3 / $15 per million tokens: 18k × 3/1M + 10k × 15/1M ≈ **$0.20 per analysis**. Check current prices for your chosen model on Anthropic's pricing page; real usage varies with input length. Each stage logs token counts (metadata only) in Netlify function logs so you can measure actuals.
Controls: explicit button to start, request/field size limits, `max_tokens` per stage, no automatic retries, single repair attempt, per-client rate limit, spend limit in the Anthropic Console.

## Security & privacy
* API key only in function env; all AI calls go through functions; requests validated server-side (Zod, 120 KB cap, field limits).
* Function logs contain only stage/status/timing/token counts — never decision text or model output (covered by a test).
* Analyses and the in-progress draft live in browser `localStorage` (device-local, not synced). The access code is kept in `sessionStorage` only. "Elimina tutti i dati locali" is on the Privacy page; single reports can be deleted from the report page.
* User data goes only to the configured AI provider.

### Access code (beta only)
`PONDERA_ACCESS_CODE` is a **temporary shared secret** for a private beta. It is *not* user authentication: anyone who knows it can use the service, it identifies no one, and it cannot be revoked per person (rotate the variable to revoke everyone).

### Compliance — remaining work
The in-app privacy notice is **not** a GDPR-compliance claim. Before a public launch: legal basis and full privacy policy, controller identity/contact, DPA with Anthropic and Netlify, assessment of international transfers, retention policy for provider-side data, data-subject-rights process, cookie/consent review (the app currently sets no cookies), DPIA if warranted, and review of what users may enter (sensitive data).

## Known limitations
* Storage is per browser/device; clearing site data loses reports. No sync, export or import yet.
* Rate limiting is in-memory per function instance (best-effort); use Netlify/edge rate limiting or auth for real protection.
* A report is auto-saved locally when the analysis completes (instead of requiring a manual save), so a refresh cannot lose six calls' worth of work.
* Matrix weights are fixed AI estimates; editing weights is planned, not implemented.
* LLM output can be wrong or shallow; bias detection is speculative by nature and phrased accordingly.
* Italian only (structure ready for more).
* Not verified against a live Anthropic account or a live Netlify deploy in development (see test notes below).

## Tests
`npm test` covers schemas, JSON extraction/repair, the function (success, repair, repair failure, 429, 5xx, network, timeout, missing config, bad input, size limit, access code, no-content logging, rate limit), local storage (CRUD, corruption, quota, unavailability, delete-all, no secrets), draft validation, scoring and prompt assembly. `e2e/` drives the real UI in Chromium against a mock provider.
