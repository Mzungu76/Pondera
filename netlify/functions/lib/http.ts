import type { ApiErrorCode } from '../../../shared/schemas';

const STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  method_not_allowed: 405,
  too_large: 413,
  rate_limited: 429,
  upstream_rate_limited: 429,
  not_configured: 500,
  upstream_error: 502,
  invalid_output: 502,
  timeout: 504,
};

const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

/** Error responses never echo user content. */
export function fail(code: ApiErrorCode, message: string, extra: Record<string, unknown> = {}): Response {
  return json({ ok: false, error: { code, message, ...extra } }, STATUS[code]);
}
