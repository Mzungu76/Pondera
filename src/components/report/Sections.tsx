import type { Analysis } from '../../../shared/schemas';
import { computeTotals, normalisedWeights } from '../../../shared/scoring';
import { t } from '../../i18n';
import { Notice } from '../ui/Notice';
import { Bullets, Card, Empty, Meter, Pill, Sub } from './Parts';

type A = Analysis;
const R = t.report;

export function Overview({ a }: { a: A }) {
  const kinds = ['fact', 'assumption', 'interpretation', 'preference'] as const;
  return (
    <div className="space-y-7">
      <p className="text-[17px] leading-relaxed">{a.report.summary}</p>
      <Sub title={R.objective}><p className="prose-p">{a.report.mainObjective}</p></Sub>
      <Sub title={R.problem}><p className="prose-p">{a.understand.problem}</p></Sub>
      <Notice tone={a.report.evidenceSufficiency === 'sufficient' ? 'neutral' : 'warn'}>
        <span className="font-medium">{R.evidence[a.report.evidenceSufficiency]}.</span> {a.report.evidenceNote}
      </Notice>
      <div className="grid gap-6 sm:grid-cols-2">
        {kinds.map((k) => {
          const items = a.understand.statements.filter((s) => s.kind === k).map((s) => s.text);
          return items.length ? (
            <Sub key={k} title={R.statementKinds[k]}><Bullets items={items} /></Sub>
          ) : null;
        })}
      </div>
      {a.understand.ambiguities.length > 0 && (
        <Sub title={R.ambiguities}><Bullets items={a.understand.ambiguities} /></Sub>
      )}
    </div>
  );
}

export function Biases({ a }: { a: A }) {
  const { biases, notDetected } = a.biases;
  const names = new Map(biases.map((b) => [b.id, b.name]));
  return (
    <div className="space-y-5">
      <Notice>{t.disclaimer.biases}</Notice>
      {biases.length === 0 && <Empty>{R.biasNone}</Empty>}
      {biases.map((b) => (
        <Card key={b.id} tone={b.status === 'insufficient_evidence' ? 'plain' : 'amber'}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-lg">{b.name}</h3>
            <Pill tone={b.status === 'insufficient_evidence' ? 'outline' : 'amber'}>{R.biasStatus[b.status]}</Pill>
          </div>
          <p className="text-[15px] text-ink-soft"><span className="font-medium text-ink">{R.biasMeaning}: </span>{b.meaning}</p>
          <blockquote className="border-l-2 border-amber-line pl-3 text-[15px] italic text-ink-soft break-words">
            <span className="not-italic font-medium text-ink block text-sm">{R.biasTrigger}</span>
            {b.trigger}
          </blockquote>
          <p className="text-[15px] text-ink-soft"><span className="font-medium text-ink">{R.biasWhy}: </span>{b.why}</p>
          <p className="text-[15px] text-navy bg-navy-soft/70 rounded-md px-3 py-2"><span className="font-medium">{R.biasTest}: </span>{b.testQuestion}</p>
        </Card>
      ))}
      {notDetected.length > 0 && (
        <p className="text-sm text-ink-mute">
          <span className="font-medium">{R.biasNotDetected}:</span>{' '}
          {notDetected.map((id) => names.get(id) ?? BIAS_LABELS[id] ?? id).join(', ')}
        </p>
      )}
    </div>
  );
}

const BIAS_LABELS: Record<string, string> = {
  confirmation: 'Bias di conferma',
  anchoring: 'Ancoraggio',
  availability: 'Euristica della disponibilità',
  sunk_cost: 'Costi irrecuperabili',
  overconfidence: 'Eccesso di fiducia',
  loss_aversion: 'Avversione alle perdite',
  status_quo: 'Bias dello status quo',
  framing: 'Effetto framing',
  optimism: 'Bias di ottimismo',
  planning_fallacy: 'Fallacia della pianificazione',
  attribution_error: "Errore fondamentale di attribuzione",
  false_dilemma: 'Falso dilemma',
};

export function Assumptions({ a }: { a: A }) {
  const c = a.challenge;
  return (
    <div className="space-y-7">
      {c.weakAssumptions.length > 0 && (
        <Sub title={R.weakAssumptions}>
          <div className="space-y-3">
            {c.weakAssumptions.map((w, i) => (
              <Card key={i}>
                <p className="font-medium break-words">{w.assumption}</p>
                <p className="prose-p text-[15px]">{w.whyWeak}</p>
              </Card>
            ))}
          </div>
        </Sub>
      )}
      {a.understand.criticalAssumptions.length > 0 && <Sub title={R.criticalAssumptions}><Bullets items={a.understand.criticalAssumptions} /></Sub>}
      {c.missingEvidence.length > 0 && <Sub title={R.missingEvidence}><Bullets items={c.missingEvidence} /></Sub>}
      {c.logicalWeaknesses.length > 0 && <Sub title={R.logicalWeaknesses}><Bullets items={c.logicalWeaknesses} /></Sub>}
      {c.unsupportedConclusions.length > 0 && <Sub title={R.unsupportedConclusions}><Bullets items={c.unsupportedConclusions} /></Sub>}
      {!c.weakAssumptions.length && !c.missingEvidence.length && !c.logicalWeaknesses.length && !c.unsupportedConclusions.length && <Empty>{R.noItems}</Empty>}
    </div>
  );
}

export function Counterarguments({ a }: { a: A }) {
  const c = a.challenge;
  return (
    <div className="space-y-7">
      <div className="space-y-3">
        {c.counterarguments.map((x, i) => (
          <Card key={i}>
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <p className="font-medium break-words flex-1 min-w-0">{x.argument}</p>
              <Pill tone={x.strength === 'strong' ? 'navy' : 'outline'}>{R.strength[x.strength]}</Pill>
            </div>
            <p className="prose-p text-[15px]">{x.reasoning}</p>
          </Card>
        ))}
      </div>
      {c.alternativeExplanations.length > 0 && <Sub title={R.alternativeExplanations}><Bullets items={c.alternativeExplanations} /></Sub>}
    </div>
  );
}

export function Scenarios({ a }: { a: A }) {
  const order = ['favorable', 'neutral', 'unfavorable'] as const;
  const sorted = [...a.perspectives.scenarios].sort((x, y) => order.indexOf(x.kind) - order.indexOf(y.kind));
  return (
    <div className="space-y-6">
      {sorted.map((s, i) => (
        <Card key={i} tone={s.kind === 'unfavorable' ? 'amber' : 'plain'}>
          <p className="eyebrow">{R.scenarioKinds[s.kind]}</p>
          <h3 className="font-serif text-lg">{s.title}</h3>
          <p className="prose-p text-[15px]">{s.narrative}</p>
          <Bullets items={s.implications} />
        </Card>
      ))}
      {a.perspectives.informationThatCouldChangeConclusion.length > 0 && (
        <Sub title={R.couldChange}><Bullets items={a.perspectives.informationThatCouldChangeConclusion} /></Sub>
      )}
    </div>
  );
}

export function MatrixView({ a }: { a: A }) {
  const m = a.matrix;
  const totals = computeTotals(m);
  const weights = normalisedWeights(m);
  const names = totals.map((x) => x.alternative);
  const unc = { low: '●', medium: '◐', high: '○' } as const;
  return (
    <div className="space-y-6">
      <Notice tone="warn">{t.disclaimer.matrix}</Notice>

      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0" tabIndex={0} role="region" aria-label={R.sections.matrix}>
        <table className="w-full min-w-[34rem] text-left text-[15px] border-collapse">
          <thead>
            <tr className="border-b border-line text-ink-mute text-sm">
              <th scope="col" className="py-2 pr-3 font-medium">{R.matrixCriterion}</th>
              <th scope="col" className="py-2 px-2 font-medium text-right">{R.matrixWeight}</th>
              {names.map((n) => <th key={n} scope="col" className="py-2 px-2 font-medium">{n}</th>)}
            </tr>
          </thead>
          <tbody>
            {m.criteria.map((c, i) => (
              <tr key={i} className="border-b border-line/70 align-top">
                <th scope="row" className="py-3 pr-3 font-medium">{c.name}</th>
                <td className="py-3 px-2 text-right tabular-nums text-ink-soft">{weights[i]}%</td>
                {names.map((n) => {
                  const sc = c.scores.find((x) => x.alternative === n);
                  return (
                    <td key={n} className="py-3 px-2">
                      {sc ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="tabular-nums font-medium">{sc.score}</span>
                          <span className={sc.uncertainty === 'high' ? 'text-amber-risk' : 'text-ink-mute'} title={R.matrixUncertainty[sc.uncertainty]} aria-label={R.matrixUncertainty[sc.uncertainty]}>{unc[sc.uncertainty]}</span>
                        </span>
                      ) : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="font-medium">
              <th scope="row" className="py-3 pr-3">{R.matrixTotal}</th>
              <td />
              {totals.map((x) => <td key={x.alternative} className="py-3 px-2 tabular-nums">{x.total}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-mute">● {R.matrixUncertainty.low} · ◐ {R.matrixUncertainty.medium} · ○ {R.matrixUncertainty.high}</p>

      <Sub title={R.matrixReading}>
        <p className="prose-p text-[15px]">{R.matrixReadingBody} {m.caveat}</p>
      </Sub>

      <div className="space-y-4">
        {m.criteria.map((c, i) => (
          <Card key={i}>
            <div className="flex justify-between gap-3">
              <h3 className="font-serif text-lg">{c.name}</h3>
              <span className="text-sm text-ink-mute shrink-0">{R.matrixWeight} {weights[i]}%</span>
            </div>
            <p className="text-sm text-ink-mute">{c.description}</p>
            <ul className="divide-y divide-line/70">
              {c.scores.map((sc) => (
                <li key={sc.alternative} className="py-2.5 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 justify-between">
                    <span className="font-medium break-words">{sc.alternative}</span>
                    <span className="flex items-center gap-3">
                      <Meter score={sc.score} />
                      <Pill tone={sc.uncertainty === 'high' ? 'amber' : 'outline'}>{R.matrixUncertainty[sc.uncertainty]}</Pill>
                    </span>
                  </div>
                  <p className="text-[15px] text-ink-soft">{sc.justification}</p>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {a.report.alternativeNotes.length > 0 && (
        <Sub title={R.alternativeNotes}>
          <div className="space-y-3">
            {a.report.alternativeNotes.map((n) => (
              <Card key={n.alternative}>
                <h3 className="font-serif text-lg">{n.alternative}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><p className="text-sm font-medium mb-1">{R.strengths}</p>{n.strengths.length ? <Bullets items={n.strengths} /> : <Empty>—</Empty>}</div>
                  <div><p className="text-sm font-medium mb-1">{R.concerns}</p>{n.concerns.length ? <Bullets items={n.concerns} /> : <Empty>—</Empty>}</div>
                </div>
              </Card>
            ))}
          </div>
        </Sub>
      )}
    </div>
  );
}

export function RisksAndGaps({ a }: { a: A }) {
  const sev = { high: 'amber', medium: 'amber', low: 'outline' } as const;
  const all = a.challenge.risks;
  return (
    <div className="space-y-7">
      {all.length > 0 && (
        <Sub title={R.risks}>
          <div className="space-y-3">
            {all.map((r, i) => (
              <Card key={i}>
                <div className="flex flex-wrap gap-2 justify-between items-start">
                  <p className="font-medium break-words flex-1 min-w-0">{r.risk}</p>
                  <Pill tone={sev[r.severity]}>{R.severity[r.severity]}</Pill>
                </div>
                <p className="prose-p text-[15px]">{r.consequence}</p>
              </Card>
            ))}
          </div>
        </Sub>
      )}
      {a.report.mainRisks.length > 0 && <Sub title={R.mainRisks}><Bullets items={a.report.mainRisks} /></Sub>}
      {a.report.missingInformation.length > 0 && <Sub title={R.missingInfo}><Bullets items={a.report.missingInformation} /></Sub>}
    </div>
  );
}

export function NextSteps({ a }: { a: A }) {
  return a.report.nextActions.length ? (
    <ol className="space-y-3">
      {a.report.nextActions.map((x, i) => (
        <li key={i} className="flex gap-4">
          <span className="font-serif text-xl text-navy/70 w-6 shrink-0">{i + 1}</span>
          <span className="text-[16px] text-ink-soft break-words">{x}</span>
        </li>
      ))}
    </ol>
  ) : <Empty>{R.noItems}</Empty>;
}

export function Questions({ a }: { a: A }) {
  const top = a.report.topQuestions;
  const rest = a.report.questionsBeforeDeciding.filter((q) => !top.includes(q));
  return (
    <div className="space-y-6">
      {rest.length > 0 && <Sub title={R.moreQuestions}><Bullets items={rest} /></Sub>}
    </div>
  );
}
