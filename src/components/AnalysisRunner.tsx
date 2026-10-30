import { Check, Circle, Loader2, AlertTriangle } from 'lucide-react';
import { STAGE_IDS, type StageId } from '../../shared/schemas';
import type { StageState } from '../lib/pipeline';
import { Button } from './ui/Button';
import { Notice } from './ui/Notice';
import { t } from '../i18n';

export interface RunnerView {
  states: Record<StageId, StageState>;
  errorCode: string | null;
  busy: boolean;
  saveFailed: boolean;
}

export function AnalysisRunner({
  view,
  onRetry,
  onAbort,
  onRetrySave,
}: {
  view: RunnerView;
  onRetry: () => void;
  onAbort: () => void;
  onRetrySave: () => void;
}) {
  const failed = STAGE_IDS.find((s) => view.states[s] === 'failed');
  return (
    <div className="animate-rise">
      <h1 className="text-3xl sm:text-4xl">{t.run.title}</h1>
      <p className="prose-p mt-3">{t.run.intro}</p>

      <ol className="mt-8 divide-y divide-line border-y border-line" aria-live="polite">
        {STAGE_IDS.map((id) => {
          const st = view.states[id];
          const copy = t.run.stages[id];
          return (
            <li key={id} className="flex items-start gap-4 py-4">
              <span className="mt-1 shrink-0">
                {st === 'done' && <Check className="h-5 w-5 text-navy" aria-hidden />}
                {st === 'working' && <Loader2 className="h-5 w-5 text-navy animate-spin motion-reduce:animate-none" aria-hidden />}
                {st === 'pending' && <Circle className="h-5 w-5 text-line" aria-hidden />}
                {st === 'failed' && <AlertTriangle className="h-5 w-5 text-[#b4452d]" aria-hidden />}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block font-medium ${st === 'pending' ? 'text-ink-mute' : ''}`}>{copy.t}</span>
                <span className="block text-sm text-ink-mute">{copy.d}</span>
              </span>
              <span className="text-sm text-ink-mute shrink-0">
                {st === 'pending' ? t.run.pending : st === 'working' ? t.run.working : st === 'done' ? t.run.done : t.run.failed}
              </span>
            </li>
          );
        })}
      </ol>

      {failed && !view.busy && (
        <div className="mt-8 space-y-4">
          <Notice tone="error" role="alert">
            <p className="font-medium">{t.run.failedTitle}</p>
            <p className="mt-1">{t.run.errors[view.errorCode ?? 'unknown'] ?? t.run.errors.unknown}</p>
            <p className="mt-1 opacity-90">{t.run.failedHint}</p>
          </Notice>
          <div className="flex flex-col sm:flex-row gap-3">
            {view.errorCode !== 'unauthorized' && view.errorCode !== 'too_large' && view.errorCode !== 'bad_request' && (
              <Button variant="primary" onClick={onRetry}>{t.run.retryFrom}</Button>
            )}
            <Button variant="secondary" onClick={onAbort}>{t.run.abort}</Button>
          </div>
        </div>
      )}
      {view.saveFailed && (
        <div className="mt-8 space-y-4">
          <Notice tone="error" role="alert">{t.run.saveFailed}</Notice>
          <Button variant="primary" onClick={onRetrySave}>{t.common.retry}</Button>
        </div>
      )}
    </div>
  );
}
