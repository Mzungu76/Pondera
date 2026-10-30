// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KEYS, deleteAllData, deleteReport, getAccessCode, loadDraft, loadReports, renameReport, saveDraft, saveReport, setAccessCode } from '../src/lib/storage';
import { parseDraft } from '../src/lib/draft';
import { input, outputs } from './fixtures';
import type { StoredReport } from '../shared/schemas';

const rep = (id: string, createdAt = '2026-01-01T00:00:00.000Z'): StoredReport => ({ id, createdAt, updatedAt: createdAt, title: `T-${id}`, input, analysis: outputs });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('report storage', () => {
  it('saves, lists (newest first) and persists across loads', () => {
    expect(saveReport(rep('a', '2026-01-01T00:00:00.000Z')).ok).toBe(true);
    saveReport(rep('b', '2026-02-01T00:00:00.000Z'));
    const r = loadReports();
    expect(r.reports.map((x) => x.id)).toEqual(['b', 'a']);
    expect(r.corrupted).toBe(0);
  });
  it('renames and deletes individual reports', () => {
    saveReport(rep('a'));
    saveReport(rep('b'));
    expect(renameReport('a', '  Nuovo nome ').ok).toBe(true);
    expect(loadReports().reports.find((r) => r.id === 'a')?.title).toBe('Nuovo nome');
    expect(renameReport('a', '   ').ok).toBe(false);
    deleteReport('a');
    expect(loadReports().reports.map((r) => r.id)).toEqual(['b']);
  });
  it('handles fully corrupted data gracefully', () => {
    localStorage.setItem(KEYS.reports, '{not json');
    const r = loadReports();
    expect(r.reports).toEqual([]);
    expect(r.corrupted).toBe(1);
    // can recover by saving again
    expect(saveReport(rep('a')).ok).toBe(true);
    expect(loadReports().reports).toHaveLength(1);
  });
  it('skips individually corrupted entries and keeps valid ones', () => {
    localStorage.setItem(KEYS.reports, JSON.stringify([rep('ok'), { id: 'bad' }, 42]));
    const r = loadReports();
    expect(r.reports.map((x) => x.id)).toEqual(['ok']);
    expect(r.corrupted).toBe(2);
  });
  it('reports quota errors instead of throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((k: string) => {
      if (k === KEYS.reports) throw new DOMException('full', 'QuotaExceededError');
    });
    const res = saveReport(rep('a'));
    expect(res).toEqual({ ok: false, reason: 'quota' });
  });
  it('degrades when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(loadReports().available).toBe(false);
    expect(saveReport(rep('a'))).toEqual({ ok: false, reason: 'unavailable' });
  });
});

describe('deleteAllData', () => {
  it('removes every pondera key but leaves foreign keys alone', () => {
    saveReport(rep('a'));
    saveDraft({ title: 'x' });
    setAccessCode('code');
    localStorage.setItem('other:key', '1');
    deleteAllData();
    expect(loadReports().reports).toEqual([]);
    expect(loadDraft(parseDraft)).toBeNull();
    expect(getAccessCode()).toBe('');
    expect(localStorage.getItem('other:key')).toBe('1');
  });
});

describe('secrets', () => {
  it('keeps the access code out of localStorage', () => {
    setAccessCode('segreto');
    expect(getAccessCode()).toBe('segreto');
    expect(JSON.stringify({ ...localStorage })).not.toContain('segreto');
  });
});

describe('draft', () => {
  it('round-trips and sanitises a stored draft', () => {
    saveDraft({ title: 'T', decision: 'D', alternatives: [{ name: 'A' }], junk: 1 });
    const d = loadDraft(parseDraft)!;
    expect(d.title).toBe('T');
    expect(d.alternatives).toHaveLength(2); // padded to the minimum
  });
  it('ignores a broken draft', () => {
    localStorage.setItem(KEYS.draft, 'nope');
    expect(loadDraft(parseDraft)).toBeNull();
  });
});
