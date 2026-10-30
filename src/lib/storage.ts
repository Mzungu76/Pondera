import { StoredReportSchema, type StoredReport } from '../../shared/schemas';

export const KEYS = {
  reports: 'pondera:v1:reports',
  draft: 'pondera:v1:draft',
  access: 'pondera:v1:access', // sessionStorage only
} as const;

export interface LoadResult {
  reports: StoredReport[];
  /** Entries that failed validation and were skipped. */
  corrupted: number;
  available: boolean;
}
export type WriteResult = { ok: true } | { ok: false; reason: 'unavailable' | 'quota' | 'unknown' };

function store(kind: 'local' | 'session' = 'local'): Storage | null {
  try {
    const s = kind === 'local' ? window.localStorage : window.sessionStorage;
    const probe = '__pondera_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function storageAvailable(): boolean {
  return store() !== null;
}

function write(key: string, value: string): WriteResult {
  const s = store();
  if (!s) return { ok: false, reason: 'unavailable' };
  try {
    s.setItem(key, value);
    return { ok: true };
  } catch (e) {
    const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
    return { ok: false, reason: quota ? 'quota' : 'unknown' };
  }
}

export function loadReports(): LoadResult {
  const s = store();
  if (!s) return { reports: [], corrupted: 0, available: false };
  let raw: string | null = null;
  try {
    raw = s.getItem(KEYS.reports);
  } catch {
    return { reports: [], corrupted: 0, available: false };
  }
  if (!raw) return { reports: [], corrupted: 0, available: true };

  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return { reports: [], corrupted: 1, available: true };
  }
  if (!Array.isArray(arr)) return { reports: [], corrupted: 1, available: true };

  const reports: StoredReport[] = [];
  let corrupted = 0;
  for (const item of arr) {
    const r = StoredReportSchema.safeParse(item);
    if (r.success) reports.push(r.data);
    else corrupted++;
  }
  reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { reports, corrupted, available: true };
}

function persist(reports: StoredReport[]): WriteResult {
  return write(KEYS.reports, JSON.stringify(reports));
}

export function getReport(id: string): StoredReport | undefined {
  return loadReports().reports.find((r) => r.id === id);
}

export function saveReport(report: StoredReport): WriteResult {
  const { reports } = loadReports();
  const next = [report, ...reports.filter((r) => r.id !== report.id)];
  return persist(next);
}

export function renameReport(id: string, title: string): WriteResult {
  const clean = title.trim().slice(0, 120);
  if (!clean) return { ok: false, reason: 'unknown' };
  const { reports } = loadReports();
  return persist(reports.map((r) => (r.id === id ? { ...r, title: clean, updatedAt: new Date().toISOString() } : r)));
}

export function deleteReport(id: string): WriteResult {
  const { reports } = loadReports();
  return persist(reports.filter((r) => r.id !== id));
}

/** Removes every Pondera key from local and session storage. */
export function deleteAllData(): void {
  for (const kind of ['local', 'session'] as const) {
    const s = store(kind);
    if (!s) continue;
    try {
      Object.keys(s)
        .filter((k) => k.startsWith('pondera:'))
        .forEach((k) => s.removeItem(k));
    } catch {
      /* ignore */
    }
  }
}

/* Draft (wizard in progress) */
export function loadDraft<T>(parse: (raw: unknown) => T | null): T | null {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(KEYS.draft);
    return raw ? parse(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
export function saveDraft(value: unknown): WriteResult {
  return write(KEYS.draft, JSON.stringify(value));
}
export function clearDraft(): void {
  try {
    store()?.removeItem(KEYS.draft);
  } catch {
    /* ignore */
  }
}

/* Access code: session only, never localStorage. */
export function getAccessCode(): string {
  try {
    return store('session')?.getItem(KEYS.access) ?? '';
  } catch {
    return '';
  }
}
export function setAccessCode(code: string): void {
  try {
    const s = store('session');
    if (!s) return;
    if (code) s.setItem(KEYS.access, code);
    else s.removeItem(KEYS.access);
  } catch {
    /* ignore */
  }
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
