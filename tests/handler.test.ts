import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import analyze from '../netlify/functions/analyze';
import config from '../netlify/functions/config';
import { resetRateLimit } from '../netlify/functions/lib/rateLimit';
import { LIMITS } from '../shared/limits';
import { input, outputs } from './fixtures';

const anthropicReply = (text: string, extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ content: [{ type: 'text', text }], usage: { input_tokens: 100, output_tokens: 50 }, stop_reason: 'end_turn', ...extra }), { status: 200 });

const req = (body: unknown, headers: Record<string, string> = {}, method = 'POST') =>
  new Request('http://x/api/analyze', { method, headers: { 'content-type': 'application/json', ...headers }, body: method === 'GET' ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });

const body = (stage: string, previous: object = {}) => ({ stage, input, previous });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  resetRateLimit();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.ANTHROPIC_MODEL = 'test-model';
  delete process.env.PONDERA_ACCESS_CODE;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('analyze function', () => {
  it('returns validated data on success and sends model/key server-side only', async () => {
    fetchMock.mockResolvedValueOnce(anthropicReply(JSON.stringify(outputs.understand)));
    const res = await analyze(req(body('understand')));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.problem).toBe(outputs.understand.problem);
    expect(json.usage.repaired).toBe(false);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('anthropic.com');
    expect(init.headers['x-api-key']).toBe('test-key');
    expect(JSON.parse(init.body).model).toBe('test-model');
    // untrusted user content is delimited
    expect(JSON.parse(init.body).messages[0].content).toContain('<user_decision>');
  });

  it('attempts exactly one repair when the first output is invalid, then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(anthropicReply('questo non è json'))
      .mockResolvedValueOnce(anthropicReply(JSON.stringify(outputs.understand)));
    const res = await analyze(req(body('understand')));
    const json = await res.json();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(json.ok).toBe(true);
    expect(json.usage.repaired).toBe(true);
  });

  it('returns invalid_output (no invented result) when repair also fails', async () => {
    fetchMock.mockImplementation(async () => anthropicReply('{"problem": "x"}'));
    const res = await analyze(req(body('understand')));
    const json = await res.json();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(502);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe('invalid_output');
    expect(json.data).toBeUndefined();
  });

  it('repairs a matrix that omits one of the user alternatives', async () => {
    const bad2 = structuredClone(outputs.matrix);
    bad2.criteria.forEach((c) => (c.scores[1].alternative = 'Roma'));
    fetchMock.mockResolvedValueOnce(anthropicReply(JSON.stringify(bad2))).mockResolvedValueOnce(anthropicReply(JSON.stringify(outputs.matrix)));
    const prev = { understand: outputs.understand, challenge: outputs.challenge, perspectives: outputs.perspectives };
    const res = await analyze(req(body('matrix', prev)));
    expect((await res.json()).usage.repaired).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('maps provider 429 to upstream_rate_limited without retrying', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 429 }));
    const res = await analyze(req(body('understand')));
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe('upstream_rate_limited');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps provider 5xx and network errors to upstream_error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    expect((await (await analyze(req(body('understand')))).json()).error.code).toBe('upstream_error');
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    expect((await (await analyze(req(body('understand')))).json()).error.code).toBe('upstream_error');
  });

  it('maps aborts to timeout', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
    const res = await analyze(req(body('understand')));
    expect(res.status).toBe(504);
    expect((await res.json()).error.code).toBe('timeout');
  });

  it('enforces a real timeout via the abort signal', async () => {
    process.env.ANTHROPIC_TIMEOUT_MS = '30';
    fetchMock.mockImplementationOnce((_u: string, init: RequestInit) => new Promise((_r, rej) => init.signal!.addEventListener('abort', () => rej(new DOMException('x', 'AbortError')))));
    const res = await analyze(req(body('understand')));
    delete process.env.ANTHROPIC_TIMEOUT_MS;
    expect((await res.json()).error.code).toBe('timeout');
  });

  it('reports not_configured when the key or model is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await analyze(req(body('understand')));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe('not_configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects non-POST, bad JSON, invalid shape and missing dependencies', async () => {
    expect((await analyze(req({}, {}, 'GET'))).status).toBe(405);
    expect((await analyze(req('{nope'))).status).toBe(400);
    expect((await analyze(req({ stage: 'understand', input: { title: 'x' } }))).status).toBe(400);
    const res = await analyze(req(body('biases')));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects oversized requests before calling the provider', async () => {
    const huge = { ...body('understand'), pad: 'x'.repeat(LIMITS.maxRequestBytes + 10) };
    const res = await analyze(req(huge));
    expect(res.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('enforces the access code server-side when configured', async () => {
    process.env.PONDERA_ACCESS_CODE = 'segreto';
    expect((await analyze(req(body('understand')))).status).toBe(401);
    expect((await analyze(req(body('understand'), { 'x-pondera-access': 'sbagliato' }))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(anthropicReply(JSON.stringify(outputs.understand)));
    const ok = await analyze(req(body('understand'), { 'x-pondera-access': 'segreto' }));
    expect(ok.status).toBe(200);
  });

  it('never logs decision content or model output', async () => {
    const log = vi.spyOn(console, 'log');
    fetchMock.mockResolvedValueOnce(anthropicReply(JSON.stringify(outputs.understand)));
    await analyze(req(body('understand')));
    fetchMock.mockResolvedValueOnce(anthropicReply('garbage SEGRETO-CONTESTO-123'));
    fetchMock.mockResolvedValueOnce(anthropicReply('garbage'));
    await analyze(req(body('understand')));
    const logged = JSON.stringify(log.mock.calls) + JSON.stringify(vi.mocked(console.error).mock?.calls ?? []);
    expect(logged).not.toContain('SEGRETO-CONTESTO-123');
    expect(logged).not.toContain('Cambiare città');
    expect(logged).not.toContain(outputs.understand.problem);
  });

  it('rate limits bursts per client', async () => {
    fetchMock.mockImplementation(async () => anthropicReply(JSON.stringify(outputs.understand)));
    let last = 0;
    for (let i = 0; i < 35; i++) last = (await analyze(req(body('understand'), { 'x-nf-client-connection-ip': '1.2.3.4' }))).status;
    expect(last).toBe(429);
  });
});

describe('config function', () => {
  it('reports whether a code is required', async () => {
    expect((await (await config(req({}, {}, 'GET'))).json()).accessCodeRequired).toBe(false);
    process.env.PONDERA_ACCESS_CODE = 'abc';
    expect((await (await config(req({}, {}, 'GET'))).json()).accessCodeRequired).toBe(true);
  });
  it('verifies the code without calling the AI provider', async () => {
    process.env.PONDERA_ACCESS_CODE = 'abc';
    expect((await config(req({}, { 'x-pondera-access': 'abc' }))).status).toBe(200);
    expect((await config(req({}, { 'x-pondera-access': 'abd' }))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
