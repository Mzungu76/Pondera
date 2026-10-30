import { LIMITS } from '../../shared/limits';
import { ACCESS_HEADER, accessCodeRequired, accessCodeValid } from './lib/auth';
import { fail, json } from './lib/http';
import { rateLimited } from './lib/rateLimit';

/**
 * GET  /api/config  -> { accessCodeRequired }
 * POST /api/config  -> verifies the code in the x-pondera-access header (no AI call, no cost)
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'GET') return json({ ok: true, accessCodeRequired: accessCodeRequired() });
  if (req.method !== 'POST') return fail('method_not_allowed', 'Metodo non consentito.');

  const ip = req.headers.get('x-nf-client-connection-ip') ?? req.headers.get('x-forwarded-for') ?? 'unknown';
  // Stricter bucket to slow down guessing of the shared code.
  if (rateLimited(`cfg:${ip}`, 20, 10 * 60_000)) return fail('rate_limited', 'Troppi tentativi. Riprova più tardi.');

  if (!accessCodeValid(req.headers.get(ACCESS_HEADER)?.slice(0, LIMITS.accessCode))) {
    return fail('unauthorized', 'Codice di accesso non valido.');
  }
  return json({ ok: true });
}

