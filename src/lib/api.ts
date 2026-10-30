import {
  STAGE_SCHEMAS,
  type ApiErrorCode,
  type DecisionInput,
  type PreviousOutputs,
  type StageId,
  type StageOutputs,
} from '../../shared/schemas';
import { ACCESS_HEADER_NAME } from './constants';

export type ClientErrorCode = ApiErrorCode | 'network' | 'unknown';

export class ApiClientError extends Error {
  constructor(public code: ClientErrorCode, message = code) {
    super(message);
  }
}

/** Client-side ceiling per request, slightly above the server budget. */
export const CLIENT_TIMEOUT_MS = 65_000;

async function request(path: string, init: RequestInit, timeoutMs: number, outer?: AbortSignal): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onOuter = () => ctrl.abort();
  outer?.addEventListener('abort', onOuter);
  let res: Response;
  try {
    res = await fetch(path, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (outer?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (e instanceof Error && e.name === 'AbortError') throw new ApiClientError('timeout');
    throw new ApiClientError('network');
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener('abort', onOuter);
  }
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error page (e.g. platform timeout) */
  }
  if (!res.ok || !body?.ok) {
    const code = body?.error?.code as ApiErrorCode | undefined;
    if (code) throw new ApiClientError(code, body.error.message);
    if (res.status === 504 || res.status === 502) throw new ApiClientError('timeout');
    throw new ApiClientError('unknown');
  }
  return body;
}

export async function fetchAccessRequired(): Promise<boolean> {
  try {
    const body = await request('/api/config', { method: 'GET' }, 10_000);
    return Boolean(body.accessCodeRequired);
  } catch {
    // If the config endpoint is unreachable, don't block the UI; the analyze call will enforce the gate.
    return false;
  }
}

export async function verifyAccessCode(code: string): Promise<boolean> {
  try {
    await request('/api/config', { method: 'POST', headers: { [ACCESS_HEADER_NAME]: code } }, 10_000);
    return true;
  } catch (e) {
    if (e instanceof ApiClientError && e.code === 'unauthorized') return false;
    throw e;
  }
}

export async function runStage<S extends StageId>(
  stage: S,
  input: DecisionInput,
  previous: PreviousOutputs,
  accessCode: string,
  signal?: AbortSignal,
): Promise<StageOutputs[S]> {
  const body = await request(
    '/api/analyze',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(accessCode ? { [ACCESS_HEADER_NAME]: accessCode } : {}) },
      body: JSON.stringify({ stage, input, previous }),
    },
    CLIENT_TIMEOUT_MS,
    signal,
  );
  // Never trust the wire: re-validate before anything is displayed.
  const parsed = STAGE_SCHEMAS[stage].safeParse(body.data);
  if (!parsed.success) throw new ApiClientError('invalid_output');
  return parsed.data as StageOutputs[S];
}
