import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Lightbulb } from 'lucide-react';
import { t } from '../i18n';
import { Notice } from '../components/ui/Notice';
import { Badge } from '../components/ui/Badge';
import { useReports } from '../hooks/useReports';
import { formatDate } from '../lib/format';

export function Home() {
  const { reports, corrupted, available } = useReports();
  const nav = useNavigate();
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <section className="pt-14 sm:pt-20 pb-12 animate-rise">
        <p className="eyebrow mb-4">{t.tagline}</p>
        <h1 className="text-[34px] sm:text-5xl leading-[1.12] max-w-2xl">{t.home.headline}</h1>
        <p className="mt-5 text-lg text-ink-soft max-w-xl leading-relaxed">{t.home.sub}</p>
        <div className="mt-8">
          <button className="btn btn-primary text-base px-6" onClick={() => nav('/nuova')}>
            {t.home.cta} <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="mt-8 max-w-xl">
          <Notice>{t.disclaimer.short}</Notice>
        </div>
      </section>

      <section aria-labelledby="hist" className="py-10 border-t border-line">
        <h2 id="hist" className="text-2xl mb-1">{t.home.historyTitle}</h2>
        <p className="text-sm text-ink-mute mb-5">{t.home.historyLocal}</p>
        {!available && <Notice tone="warn" role="alert">{t.home.storageUnavailable}</Notice>}
        {corrupted > 0 && (
          <div className="mb-4">
            <Notice tone="warn" role="status">{t.home.corrupted(corrupted)}</Notice>
          </div>
        )}
        {reports.length === 0 ? (
          available && <p className="prose-p">{t.home.historyEmpty}</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {reports.map((r) => (
              <li key={r.id}>
                <Link to={`/report/${r.id}`} className="flex items-center justify-between gap-4 py-4 min-h-[44px] group">
                  <span className="min-w-0">
                    <span className="block font-serif text-lg truncate group-hover:text-navy">{r.title}</span>
                    <span className="block text-sm text-ink-mute">{formatDate(r.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:inline">
                      <Badge tone={r.analysis.report.evidenceSufficiency === 'insufficient' ? 'amber' : 'neutral'}>
                        {t.report.evidence[r.analysis.report.evidenceSufficiency]}
                      </Badge>
                    </span>
                    <ChevronRight className="h-4 w-4 text-ink-mute" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="how" className="py-10 border-t border-line">
        <h2 id="how" className="text-2xl mb-6">{t.home.howTitle}</h2>
        <ol className="grid gap-6 sm:grid-cols-3">
          {t.home.how.map((s, i) => (
            <li key={s.t}>
              <span className="font-serif text-3xl text-navy/70">{i + 1}</span>
              <h3 className="text-lg mt-1">{s.t}</h3>
              <p className="prose-p text-[15px] mt-1">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ex" className="py-10 border-t border-line">
        <h2 id="ex" className="text-2xl">{t.home.exampleTitle}</h2>
        <p className="text-sm text-ink-mute mb-5">{t.home.exampleCaption}</p>
        <div className="rounded-lg border border-line bg-surface p-5 sm:p-6 space-y-4">
          <p className="font-serif text-lg">{t.home.example.decision}</p>
          <div className="border-l-2 border-amber-line pl-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{t.home.example.biasName}</span>
              <Badge tone="amber">{t.home.example.biasStatus}</Badge>
            </div>
            <p className="text-[15px] italic text-ink-soft">{t.home.example.statement}</p>
            <p className="text-[15px] text-ink-soft">{t.home.example.biasWhy}</p>
          </div>
          <p className="text-[15px] text-ink-soft">{t.home.example.counter}</p>
          <div className="flex gap-3 rounded-md bg-navy-soft/70 px-4 py-3">
            <Lightbulb className="h-5 w-5 text-navy shrink-0 mt-0.5" aria-hidden />
            <p className="text-[15px] text-navy">{t.home.example.question}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
