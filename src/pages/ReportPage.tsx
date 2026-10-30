import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Pencil, Trash2 } from 'lucide-react';
import { t } from '../i18n';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Notice } from '../components/ui/Notice';
import { Collapsible } from '../components/ui/Collapsible';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Assumptions, Biases, Counterarguments, MatrixView, NextSteps, Overview, Questions, RisksAndGaps, Scenarios } from '../components/report/Sections';
import { deleteReport, getReport, renameReport } from '../lib/storage';
import { formatDate } from '../lib/format';
import { LIMITS } from '../../shared/limits';

const SECTION_KEYS = ['overview', 'biases', 'assumptions', 'counter', 'scenarios', 'matrix', 'risks', 'next', 'questions'] as const;
type Key = (typeof SECTION_KEYS)[number];

export function ReportPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [rev, setRev] = useState(0);
  const report = useMemo(() => getReport(id), [id, rev]);
  const [open, setOpen] = useState<Record<Key, boolean>>({ overview: true, biases: true, assumptions: false, counter: false, scenarios: false, matrix: false, risks: false, next: false, questions: false });
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [renameErr, setRenameErr] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const renameBtn = useRef<HTMLButtonElement>(null);

  if (!report) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 space-y-3">
        <h1 className="text-3xl">{t.report.notFound}</h1>
        <p className="prose-p">{t.report.notFoundHint}</p>
        <Link to="/" className="underline text-navy">{t.common.backToDashboard}</Link>
      </div>
    );
  }
  const a = report.analysis;
  const allOpen = SECTION_KEYS.every((k) => open[k]);
  const toggle = (k: Key) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const S = t.report.sections;

  const submitRename = () => {
    const res = renameReport(report.id, name);
    if (res.ok) {
      setRenaming(false);
      setRenameErr(false);
      setRev((r) => r + 1);
      setTimeout(() => renameBtn.current?.focus(), 0);
    } else setRenameErr(true);
  };

  const sections: { key: Key; title: string; eyebrow: string; body: ReactNode; aside?: ReactNode }[] = [
    { key: 'overview', title: S.overview, eyebrow: '01', body: <Overview a={a} /> },
    { key: 'biases', title: S.biases, eyebrow: '02', body: <Biases a={a} />, aside: <Badge tone={a.biases.biases.length ? 'amber' : 'neutral'}>{a.biases.biases.length}</Badge> },
    { key: 'assumptions', title: S.assumptions, eyebrow: '03', body: <Assumptions a={a} /> },
    { key: 'counter', title: S.counter, eyebrow: '04', body: <Counterarguments a={a} />, aside: <Badge>{a.challenge.counterarguments.length}</Badge> },
    { key: 'scenarios', title: S.scenarios, eyebrow: '05', body: <Scenarios a={a} /> },
    { key: 'matrix', title: S.matrix, eyebrow: '06', body: <MatrixView a={a} /> },
    { key: 'risks', title: S.risks, eyebrow: '07', body: <RisksAndGaps a={a} /> },
    { key: 'next', title: S.next, eyebrow: '08', body: <NextSteps a={a} /> },
    { key: 'questions', title: S.questions, eyebrow: '09', body: <Questions a={a} /> },
  ];

  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-ink-mute hover:text-ink min-h-[44px]">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t.common.backToDashboard}
      </Link>

      <header className="mt-2 space-y-4">
        {renaming ? (
          <form onSubmit={(e) => { e.preventDefault(); submitRename(); }} className="space-y-2">
            <label htmlFor="rename" className="text-sm font-medium">{t.report.renameLabel}</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input id="rename" className="input" value={name} maxLength={LIMITS.title} autoFocus onChange={(e) => setName(e.target.value)} aria-invalid={renameErr || !name.trim() ? true : undefined} />
              <Button variant="primary" type="submit" disabled={!name.trim()}>{t.common.save}</Button>
              <Button variant="ghost" onClick={() => { setRenaming(false); setRenameErr(false); }}>{t.common.cancel}</Button>
            </div>
            {renameErr && <p role="alert" className="text-sm text-[#b4452d]">{t.run.saveFailed}</p>}
          </form>
        ) : (
          <h1 className="text-3xl sm:text-4xl leading-tight break-words">{report.title}</h1>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-mute">
          <span>{t.report.created} {formatDate(report.createdAt)}</span>
          <Badge tone={a.report.evidenceSufficiency === 'sufficient' ? 'navy' : 'amber'}>{t.report.evidence[a.report.evidenceSufficiency]}</Badge>
          <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-navy" aria-hidden /> {t.report.saved}</span>
        </div>
        <p className="text-sm text-ink-mute">{t.report.savedHint}</p>
        <div className="flex flex-wrap gap-2">
          <Button ref={renameBtn} onClick={() => { setName(report.title); setRenaming(true); }} disabled={renaming}>
            <Pencil className="h-4 w-4" aria-hidden /> {t.common.rename}
          </Button>
          <Button onClick={() => setConfirmDel(true)}>
            <Trash2 className="h-4 w-4" aria-hidden /> {t.common.delete}
          </Button>
        </div>
        <Notice>{t.disclaimer.short}</Notice>
      </header>

      <div className="mt-8 flex justify-end">
        <button type="button" className="text-sm underline text-ink-soft min-h-[32px]" onClick={() => setOpen(Object.fromEntries(SECTION_KEYS.map((k) => [k, !allOpen])) as Record<Key, boolean>)}>
          {allOpen ? t.common.collapseAll : t.common.expandAll}
        </button>
      </div>

      <div className="border-b border-line">
        {sections.map((s) => (
          <Collapsible key={s.key} title={s.title} eyebrow={s.eyebrow} open={open[s.key]} onToggle={() => toggle(s.key)} aside={s.aside}>
            {s.body}
          </Collapsible>
        ))}
      </div>

      <section aria-labelledby="before" className="mt-12 rounded-xl bg-navy text-paper p-6 sm:p-9">
        <h2 id="before" className="font-serif text-2xl sm:text-3xl !text-paper">{t.report.beforeDeciding}</h2>
        <ol className="mt-6 space-y-5">
          {a.report.topQuestions.map((q, i) => (
            <li key={i} className="flex gap-4">
              <span className="font-serif text-2xl text-paper/60 w-7 shrink-0">{i + 1}</span>
              <p className="text-lg leading-snug break-words">{q}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-10">
        <Link to="/" className="btn btn-secondary">{t.common.backToDashboard}</Link>
      </div>

      <ConfirmDialog
        open={confirmDel}
        title={t.report.deleteTitle}
        body={t.report.deleteBody(report.title)}
        confirmLabel={t.report.deleteConfirm}
        onClose={() => setConfirmDel(false)}
        onConfirm={() => {
          deleteReport(report.id);
          nav('/', { replace: true });
        }}
      />
    </article>
  );
}
