import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Plus, X } from 'lucide-react';
import { LIMITS } from '../../shared/limits';
import {
  AnalysisSchema,
  DecisionInputSchema,
  STAGE_IDS,
  type Analysis,
  type DecisionInput,
  type PreviousOutputs,
  type StageId,
} from '../../shared/schemas';
import { t } from '../i18n';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { AnalysisRunner, type RunnerView } from '../components/AnalysisRunner';
import {
  emptyDraft,
  filledAlternatives,
  isEmptyDraft,
  parseDraft,
  toInput,
  validateStep,
  type Draft,
  type DraftErrors,
} from '../lib/draft';
import { ApiClientError, fetchAccessRequired, verifyAccessCode } from '../lib/api';
import { runPipeline, type StageState } from '../lib/pipeline';
import { clearDraft, getAccessCode, loadDraft, newId, saveDraft, saveReport, setAccessCode } from '../lib/storage';

const initialStates = (): Record<StageId, StageState> =>
  Object.fromEntries(STAGE_IDS.map((s) => [s, 'pending'])) as Record<StageId, StageState>;

export function NewDecision() {
  const nav = useNavigate();
  const [draft, setDraft] = useState<Draft>(() => loadDraft(parseDraft) ?? emptyDraft());
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [phase, setPhase] = useState<'edit' | 'run'>('edit');

  // access gate
  const [accessRequired, setAccessRequired] = useState(false);
  const [code, setCode] = useState(getAccessCode);
  const [codeOk, setCodeOk] = useState(() => getAccessCode() !== '');
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);

  // run state
  const [view, setView] = useState<RunnerView>({ states: initialStates(), errorCode: null, busy: false, saveFailed: false });
  const results = useRef<Record<string, unknown>>({});
  const inputRef = useRef<DecisionInput | null>(null);
  const analysisRef = useRef<Analysis | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reportId = useRef(newId());

  useEffect(() => {
    let alive = true;
    fetchAccessRequired().then((r) => alive && setAccessRequired(r));
    return () => {
      alive = false;
      abortRef.current?.abort();
    };
  }, []);

  // Debounced draft persistence (only while editing)
  useEffect(() => {
    if (phase !== 'edit') return;
    const persist = () => (isEmptyDraft(draft) ? clearDraft() : saveDraft(draft));
    const h = setTimeout(persist, 400);
    // Flush immediately if the tab is closed/reloaded inside the debounce window.
    window.addEventListener('pagehide', persist);
    return () => {
      clearTimeout(h);
      window.removeEventListener('pagehide', persist);
    };
  }, [draft, phase]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (errors[k as keyof DraftErrors]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const setAlt = (i: number, patch: Partial<Draft['alternatives'][number]>) => {
    setDraft((d) => ({ ...d, alternatives: d.alternatives.map((a, j) => (j === i ? { ...a, ...patch } : a)) }));
    if (errors.alternatives) setErrors((e) => ({ ...e, alternatives: undefined }));
  };

  const goNext = () => {
    const e = validateStep(draft, step);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => s + 1);
  };

  const needsCode = accessRequired && !codeOk;

  const checkCode = async () => {
    setCodeBusy(true);
    setCodeMsg(null);
    try {
      const ok = await verifyAccessCode(code.trim());
      if (ok) {
        setAccessCode(code.trim());
        setCodeOk(true);
      } else setCodeMsg(t.wizard.accessBad);
    } catch (e) {
      setCodeMsg(t.run.errors[e instanceof ApiClientError ? e.code : 'unknown'] ?? t.run.errors.unknown);
    } finally {
      setCodeBusy(false);
    }
  };

  const finish = useCallback(
    (analysis: Analysis, input: DecisionInput) => {
      const now = new Date().toISOString();
      const res = saveReport({ id: reportId.current, createdAt: now, updatedAt: now, title: input.title, input, analysis });
      if (!res.ok) {
        analysisRef.current = analysis;
        setView((v) => ({ ...v, busy: false, saveFailed: true }));
        return;
      }
      clearDraft();
      nav(`/report/${reportId.current}`, { replace: true });
    },
    [nav],
  );

  const run = useCallback(async () => {
    const input = inputRef.current;
    if (!input) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setView((v) => ({ ...v, busy: true, errorCode: null, saveFailed: false }));
    try {
      const analysis = await runPipeline(
        input,
        results.current as PreviousOutputs,
        getAccessCode(),
        {
          onStage: (s, st) => setView((v) => ({ ...v, states: { ...v.states, [s]: st } })),
          onResult: (s, data) => (results.current[s] = data),
        },
        ctrl.signal,
      );
      const checked = AnalysisSchema.parse(analysis);
      finish(checked, input);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      const code = e instanceof ApiClientError ? e.code : 'unknown';
      if (code === 'unauthorized') {
        setAccessCode('');
        setCodeOk(false);
        setCodeMsg(t.wizard.accessBad);
      }
      setView((v) => ({ ...v, busy: false, errorCode: code }));
    }
  }, [finish]);

  const start = () => {
    const parsed = DecisionInputSchema.safeParse(toInput(draft));
    if (!parsed.success) {
      setErrors({ alternatives: 'minAlts' });
      setStep(0);
      return;
    }
    inputRef.current = parsed.data;
    results.current = {};
    reportId.current = newId();
    setView({ states: initialStates(), errorCode: null, busy: true, saveFailed: false });
    setPhase('run');
    void run();
  };

  const abort = () => {
    abortRef.current?.abort();
    setPhase('edit');
    setStep(3);
  };

  if (phase === 'run') {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 sm:py-16">
        <AnalysisRunner
          view={view}
          onRetry={() => {
            // reset the failed stage to pending, then resume from it
            setView((v) => ({ ...v, states: Object.fromEntries(Object.entries(v.states).map(([k, s]) => [k, s === 'failed' ? 'pending' : s])) as Record<StageId, StageState> }));
            void run();
          }}
          onAbort={abort}
          onRetrySave={() => analysisRef.current && inputRef.current && finish(analysisRef.current, inputRef.current)}
        />
      </div>
    );
  }

  const alts = draft.alternatives;
  const altError = errors.alternatives === 'minAlts' ? t.wizard.errMinAlts : errors.alternatives === 'dupAlts' ? t.wizard.errDupAlts : undefined;
  const input = toInput(draft);
  const thin = !draft.context.trim() || !draft.outcome.trim() || !draft.constraints.trim();

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-14">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-ink-mute hover:text-ink min-h-[44px]">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t.common.backToDashboard}
      </Link>
      <h1 className="text-3xl sm:text-4xl mt-2">{t.wizard.title}</h1>

      <nav aria-label="Avanzamento" className="mt-6">
        <ol className="flex gap-2">
          {t.wizard.steps.map((label, i) => (
            <li key={label} className="flex-1" aria-current={i === step ? 'step' : undefined}>
              <div className={`h-1 rounded-full ${i <= step ? 'bg-navy' : 'bg-line'}`} />
              <span className={`mt-2 block text-xs sm:text-sm ${i === step ? 'text-ink font-medium' : 'text-ink-mute'}`}>
                <span className="sr-only">{t.wizard.stepOf(i + 1, t.wizard.steps.length)}: </span>
                {label}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <form
        className="mt-8 space-y-6 animate-rise"
        key={step}
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 3) goNext();
        }}
      >
        {step === 0 && (
          <>
            <Field label={t.wizard.fTitle.label} hint={t.wizard.fTitle.hint} placeholder={t.wizard.fTitle.ph} value={draft.title} onChange={(v) => set('title', v)} max={LIMITS.title} required error={errors.title ? t.wizard.errRequired : undefined} autoFocus />
            <Field label={t.wizard.fDecision.label} hint={t.wizard.fDecision.hint} placeholder={t.wizard.fDecision.ph} value={draft.decision} onChange={(v) => set('decision', v)} max={LIMITS.decision} multiline required error={errors.decision ? t.wizard.errRequired : undefined} />
          </>
        )}

        {step === 1 && (
          <>
            <Notice>{t.wizard.optionalNote}</Notice>
            <Field label={t.wizard.fContext.label} hint={t.wizard.fContext.hint} value={draft.context} onChange={(v) => set('context', v)} max={LIMITS.context} multiline rows={6} autoFocus />
            <Field label={t.wizard.fOutcome.label} hint={t.wizard.fOutcome.hint} value={draft.outcome} onChange={(v) => set('outcome', v)} max={LIMITS.outcome} multiline />
            <Field label={t.wizard.fConstraints.label} hint={t.wizard.fConstraints.hint} value={draft.constraints} onChange={(v) => set('constraints', v)} max={LIMITS.constraints} multiline />
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <h2 className="text-xl">{t.wizard.alternativesTitle}</h2>
              <p className="text-sm text-ink-mute mt-1">{t.wizard.alternativesHint}</p>
            </div>
            <div className="space-y-5">
              {alts.map((a, i) => (
                <fieldset key={i} className="rounded-lg border border-line bg-surface p-4 space-y-3">
                  <legend className="sr-only">{t.wizard.altName(i + 1)}</legend>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <Field label={t.wizard.altName(i + 1)} placeholder={t.wizard.altNamePh} value={a.name} onChange={(v) => setAlt(i, { name: v })} max={LIMITS.alternativeName} required={i < 2} badge={i < 2 ? <span className="sr-only">{t.common.required}</span> : undefined} />
                    </div>
                    {alts.length > LIMITS.minAlternatives && (
                      <button
                        type="button"
                        aria-label={t.wizard.removeAlt(i + 1)}
                        className="btn btn-ghost !min-h-[44px] !px-3 mt-6"
                        onClick={() => setDraft((d) => ({ ...d, alternatives: d.alternatives.filter((_, j) => j !== i) }))}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                  </div>
                  <Field label={t.wizard.altDesc} value={a.description} onChange={(v) => setAlt(i, { description: v })} max={LIMITS.alternativeDescription} multiline rows={2} />
                </fieldset>
              ))}
              {altError && <p role="alert" className="text-sm text-[#b4452d]">{altError}</p>}
              {alts.length < LIMITS.maxAlternatives ? (
                <Button variant="secondary" onClick={() => setDraft((d) => ({ ...d, alternatives: [...d.alternatives, { name: '', description: '' }] }))}>
                  <Plus className="h-4 w-4" aria-hidden /> {t.wizard.addAlt}
                </Button>
              ) : (
                <p className="text-sm text-ink-mute">{t.wizard.maxAlts}</p>
              )}
            </div>
            <Field label={t.wizard.fDoNothing.label} hint={t.wizard.fDoNothing.hint} value={draft.doNothing} onChange={(v) => set('doNothing', v)} max={LIMITS.doNothing} multiline />
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <h2 className="text-xl">{t.wizard.summaryTitle}</h2>
              <p className="prose-p mt-1">{t.wizard.summaryIntro}</p>
            </div>
            <dl className="divide-y divide-line border-y border-line">
              {(
                [
                  [t.wizard.fTitle.label, input.title, 0],
                  [t.wizard.fDecision.label, input.decision, 0],
                  [t.wizard.fContext.label, input.context, 1],
                  [t.wizard.fOutcome.label, input.outcome, 1],
                  [t.wizard.fConstraints.label, input.constraints, 1],
                ] as const
              ).map(([label, value, target]) => (
                <div key={label} className="py-3 grid sm:grid-cols-[11rem_1fr_auto] gap-x-4 gap-y-1">
                  <dt className="text-sm text-ink-mute">{label}</dt>
                  <dd className={`whitespace-pre-wrap break-words ${value ? '' : 'text-ink-mute italic'}`}>{value || t.wizard.notProvided}</dd>
                  <button type="button" className="text-sm text-navy underline justify-self-start sm:justify-self-end min-h-[32px]" onClick={() => setStep(target)}>
                    {t.wizard.editStep}
                  </button>
                </div>
              ))}
              <div className="py-3 grid sm:grid-cols-[11rem_1fr_auto] gap-x-4 gap-y-1">
                <dt className="text-sm text-ink-mute">{t.wizard.alternativesTitle}</dt>
                <dd>
                  <ol className="list-decimal pl-5 space-y-1">
                    {filledAlternatives(draft).map((a, i) => (
                      <li key={i} className="break-words">
                        <span className="font-medium">{a.name}</span>
                        {a.description && <span className="text-ink-soft"> — {a.description}</span>}
                      </li>
                    ))}
                  </ol>
                </dd>
                <button type="button" className="text-sm text-navy underline justify-self-start sm:justify-self-end min-h-[32px]" onClick={() => setStep(2)}>
                  {t.wizard.editStep}
                </button>
              </div>
              <div className="py-3 grid sm:grid-cols-[11rem_1fr_auto] gap-x-4 gap-y-1">
                <dt className="text-sm text-ink-mute">{t.wizard.fDoNothing.label}</dt>
                <dd className={`whitespace-pre-wrap break-words ${input.doNothing ? '' : 'text-ink-mute italic'}`}>{input.doNothing || t.wizard.notProvided}</dd>
                <button type="button" className="text-sm text-navy underline justify-self-start sm:justify-self-end min-h-[32px]" onClick={() => setStep(2)}>
                  {t.wizard.editStep}
                </button>
              </div>
            </dl>

            {thin && <Notice tone="warn">{t.wizard.thinInfo}</Notice>}

            {needsCode && (
              <div className="rounded-lg border border-line bg-surface p-4 space-y-3">
                <h3 className="text-lg">{t.wizard.accessTitle}</h3>
                <p className="text-sm text-ink-mute">{t.wizard.accessHint}</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                  <div className="flex-1">
                    <label htmlFor="access" className="block text-[15px] font-medium mb-1.5">{t.wizard.accessLabel}</label>
                    <input id="access" type="password" autoComplete="off" className="input" value={code} maxLength={LIMITS.accessCode} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (code.trim()) void checkCode(); } }} aria-invalid={codeMsg ? true : undefined} aria-describedby="access-msg" />
                  </div>
                  <Button variant="secondary" disabled={!code.trim() || codeBusy} onClick={checkCode}>{t.wizard.accessCheck}</Button>
                </div>
                <p id="access-msg" role={codeMsg ? 'alert' : undefined} className="text-sm text-[#b4452d] min-h-[1.25rem]">{codeMsg}</p>
              </div>
            )}
            {accessRequired && codeOk && (
              <p className="flex items-center gap-2 text-sm text-ink-mute"><Check className="h-4 w-4 text-navy" aria-hidden /> {t.wizard.accessOk}</p>
            )}

            <div className="space-y-2">
              <Button variant="primary" className="w-full sm:w-auto text-base px-6" onClick={start} disabled={needsCode}>
                {t.wizard.cta}
              </Button>
              <p className="text-sm text-ink-mute">{t.wizard.ctaHint}</p>
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <div>
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="h-4 w-4" aria-hidden /> {t.common.back}
              </Button>
            )}
          </div>
          {step < 3 && (
            <Button variant="primary" onClick={goNext}>{t.common.next}</Button>
          )}
        </div>
      </form>

      {!isEmptyDraft(draft) && (
        <div className="mt-10 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-2 text-sm text-ink-mute">
          <span>{t.wizard.draftSaved}</span>
          <button
            type="button"
            className="underline min-h-[32px]"
            onClick={() => {
              clearDraft();
              setDraft(emptyDraft());
              setErrors({});
              setStep(0);
            }}
          >
            {t.wizard.clearDraft}
          </button>
        </div>
      )}
    </div>
  );
}
