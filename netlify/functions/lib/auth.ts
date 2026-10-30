import { timingSafeEqual } from 'node:crypto';

export const ACCESS_HEADER = 'x-pondera-access';

/** Beta-only shared code. Disabled when PONDERA_ACCESS_CODE is unset or empty. */
export function accessCodeRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.PONDERA_ACCESS_CODE && env.PONDERA_ACCESS_CODE.length > 0);
}

export function accessCodeValid(provided: string | null | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!accessCodeRequired(env)) return true;
  const expected = Buffer.from(env.PONDERA_ACCESS_CODE as string);
  const got = Buffer.from(provided ?? '');
  // Compare fixed-length digests' worth of data without leaking length via early exit.
  if (got.length !== expected.length) {
    timingSafeEqual(expected, expected);
    return false;
  }
  return timingSafeEqual(expected, got);
}
