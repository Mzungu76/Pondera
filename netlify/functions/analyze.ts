import {
  AnalyzeRequestSchema,
  STAGE_SCHEMAS,
  type StageId,
} from '../../shared/schemas';
import { LIMITS } from '../../shared/limits';
import { STAGES, buildSystemPrompt, buildUserMessage, missingDependencies } from '../../shared/pipeline';
import { REPAIR_SYSTEM } from '../../shared/prompts/repair';
import { ACCESS_HEADER, accessCodeValid } from './lib/auth';
import { UpstreamError, callAnthropic, parseAndValidate } from './lib/anthropic';
import { fail, json } from './lib/http';
import { rateLimited } from './lib/rateLimit';
import { semanticProblems } from './lib/semantic';

const DEFAULT_TIMEOUT_MS = 50_000;
/** Minimum time budget left to be worth attempting the (single) repair call. */
const MIN_REPAIR_BUDGET_MS = 8_000;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return fail('method_not_allowed', 'Metodo non consentito.');

  const ip = req.headers.get('x-nf-client-connection-ip') ?? req.headers.get('x-forwarded-for') ?? 'unknown';
  if (rateLimited(ip, Number(process.env.PONDERA_RATE_LIMIT_MAX) || 30)) return fail('rate_limited', 'Troppe richieste. Riprova tra qualche minuto.');

  // Access gate (checked before reading the body to avoid doing work for strangers).
  if (!accessCodeValid(req.headers.get(ACCESS_HEADER)?.slice(0, LIMITS.accessCode))) {
    return fail('unauthorized', 'Codice di accesso non valido.');
  }

  // Size limit
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > LIMITS.maxRequestBytes) return fail('too_large', 'Richiesta troppo grande.');
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > LIMITS.maxRequestBytes) {
    return fail('too_large', 'Richiesta troppo grande.');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return fail('bad_request', 'Richiesta non valida.');
  }
  const parsed = AnalyzeRequestSchema.safeParse(payload);
  if (!parsed.success) return fail('bad_request', 'Dati della richiesta non validi.');
  const { stage, input, previous } = parsed.data;

  const missing = missingDependencies(stage, previous);
  if (missing.length) return fail('bad_request', `Fasi precedenti mancanti: ${missing.join(', ')}.`);

  const started = Date.now();
  const budget = Number(process.env.ANTHROPIC_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const deadline = started + budget;
  const controller = () => {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), Math.max(1, deadline - Date.now()));
    return { signal: c.signal, clear: () => clearTimeout(t) };
  };

  const schema = STAGE_SCHEMAS[stage as StageId];
  const check = (d: unknown) => semanticProblems(stage, d, input);
  let inTok = 0;
  let outTok = 0;
  const log = (status: string) =>
    // Metadata only — never log decision content or model output.
    console.log(JSON.stringify({ evt: 'analyze', stage, status, ms: Date.now() - started, inTok, outTok }));

  try {
    const t1 = controller();
    let first;
    try {
      first = await callAnthropic({
        system: buildSystemPrompt(stage),
        user: buildUserMessage(stage, input, previous),
        maxTokens: STAGES[stage].maxTokens,
        signal: t1.signal,
      });
    } finally {
      t1.clear();
    }
    inTok += first.inputTokens;
    outTok += first.outputTokens;

    let outcome = parseAndValidate(first.text, schema, check);
    if (outcome.ok) {
      log('ok');
      return json({ ok: true, stage, data: outcome.data, usage: { inputTokens: inTok, outputTokens: outTok, repaired: false } });
    }

    // One controlled repair attempt, only if there is time left.
    if (deadline - Date.now() < MIN_REPAIR_BUDGET_MS) {
      log('invalid_no_budget');
      return fail('invalid_output', "L'analisi non è andata a buon fine in tempo utile. Riprova.");
    }
    const t2 = controller();
    try {
      const repair = await callAnthropic({
        system: REPAIR_SYSTEM,
        user: `Validation problems:\n- ${(outcome.problems ?? []).join('\n- ')}\n\nExpected schema (field names): ${Object.keys(
          (schema as any).shape ?? {},
        ).join(', ')}\n\nPrevious output to repair:\n${first.text.slice(0, 20_000)}`,
        maxTokens: STAGES[stage].maxTokens,
        signal: t2.signal,
      });
      inTok += repair.inputTokens;
      outTok += repair.outputTokens;
      outcome = parseAndValidate(repair.text, schema, check);
    } finally {
      t2.clear();
    }
    if (outcome.ok) {
      log('ok_repaired');
      return json({ ok: true, stage, data: outcome.data, usage: { inputTokens: inTok, outputTokens: outTok, repaired: true } });
    }
    log('invalid_output');
    return fail('invalid_output', "La risposta dell'IA non è risultata valida. Nessun risultato è stato inventato: riprova.");
  } catch (e) {
    if (e instanceof UpstreamError) {
      log(e.kind);
      switch (e.kind) {
        case 'not_configured':
          return fail('not_configured', 'Il servizio non è configurato correttamente.');
        case 'rate_limited':
          return fail('upstream_rate_limited', "Il servizio IA è temporaneamente sovraccarico. Riprova tra poco.");
        case 'timeout':
          return fail('timeout', "L'analisi ha richiesto troppo tempo. Riprova.");
        default:
          return fail('upstream_error', 'Il servizio IA non è raggiungibile al momento. Riprova.');
      }
    }
    log('internal_error');
    return fail('upstream_error', 'Errore inatteso. Riprova.');
  }
}

