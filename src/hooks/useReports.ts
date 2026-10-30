import { useCallback, useState } from 'react';
import { loadReports, type LoadResult } from '../lib/storage';

export function useReports() {
  const [state, setState] = useState<LoadResult>(() => loadReports());
  const refresh = useCallback(() => setState(loadReports()), []);
  return { ...state, refresh };
}
