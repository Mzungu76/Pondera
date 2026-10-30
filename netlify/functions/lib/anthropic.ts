import type { ZodType } from 'zod';

export const DEFAULT_API_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION = '2023-06-01';

export class UpstreamError extends Error {
  constructor(
    public kind: 'timeout' | 'rate_limited' | 'upstream' | 'not_configured',
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export interface CallParams {
  system: string;
  user: string;
  maxTokens: number;
  signal: AbortSignal;
}
export interface CallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  truncated: boolean;
}

export async function callAnthropic(p: CallParams, env: NodeJS.ProcessEnv = process.env): Promise<CallResult> {
  const apiKey = env.ANTHROPIC_API_KEY;
  const model = env.ANTHROPIC_MODEL;
  if (!apiKey || !model) throw new UpstreamError('not_configured', 'Missing ANTHROPIC_API_KEY or ANTHROPIC_MODEL');

  let res: Response;
  try {
    res = await fetch(env.ANTHROPIC_API_URL || DEFAULT_API_URL, {
      method: 'POST',
      signal: p.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: p.maxTokens,
        system: p.system,
        messages: [{ role: 'user', content: p.user }],
      }),
    });
  } catch (e) {
    if (e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
      throw new UpstreamError('timeout', 'Upstream request timed out');
    }
    throw new UpstreamError('upstream', 'Network error contacting the AI provider');
  }

  if (res.status === 429) throw new UpstreamError('rate_limited', 'AI provider rate limit', 429);
  if (!res.ok) throw new UpstreamError('upstream', `AI provider error (${res.status})`, res.status);

  let body: any;
  try {
    body = await res.json();
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new UpstreamError('timeout', 'Upstream request timed out');
    throw new UpstreamError('upstream', 'Unreadable AI provider response');
  }
  const text = Array.isArray(body?.content)
    ? body.content.filter((b: any) => b?.type === 'text').map((b: any) => String(b.text ?? '')).join('')
    : '';
  return {
    text,
    inputTokens: Number(body?.usage?.input_tokens ?? 0),
    outputTokens: Number(body?.usage?.output_tokens ?? 0),
    truncated: body?.stop_reason === 'max_tokens',
  };
}

/** Extracts the first top-level JSON object from model text (tolerates fences / stray prose). */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    // fall through to brace scan
  }
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object found');
  return JSON.parse(candidate.slice(start, end + 1));
}

export interface ParseOutcome<T> {
  ok: boolean;
  data?: T;
  /** Short, content-free description of what's wrong; safe to feed to the repair prompt. */
  problems?: string[];
}

export function parseAndValidate<T>(
  text: string,
  schema: ZodType<T>,
  extraCheck?: (data: T) => string[],
): ParseOutcome<T> {
  let raw: unknown;
  try {
    raw = extractJson(text);
  } catch {
    return { ok: false, problems: ['Output is not valid JSON.'] };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .slice(0, 12)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
    return { ok: false, problems };
  }
  const extra = extraCheck?.(parsed.data) ?? [];
  if (extra.length) return { ok: false, problems: extra };
  return { ok: true, data: parsed.data };
}
