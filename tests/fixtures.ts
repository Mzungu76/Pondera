import type { Analysis, DecisionInput } from '../shared/schemas';

export const input: DecisionInput = {
  title: 'Cambiare città',
  decision: 'Accettare un lavoro a Milano o restare a Torino?',
  context: 'Ho 34 anni, contratto stabile a Torino. SEGRETO-CONTESTO-123',
  outcome: 'Crescere professionalmente',
  constraints: 'Affitto alto a Milano',
  doNothing: 'Resto dove sono',
  alternatives: [
    { name: 'Milano', description: 'Nuova offerta' },
    { name: 'Torino', description: '' },
  ],
};

const s = (alternative: string, score: number) => ({ alternative, score, justification: 'Perché sì.', uncertainty: 'medium' as const });

export const outputs = {
  understand: {
    problem: 'Scegliere tra crescita e stabilità.',
    mainObjective: 'Crescita professionale sostenibile.',
    statements: [{ kind: 'fact' as const, text: 'Contratto stabile a Torino.' }],
    criticalAssumptions: ['A Milano la carriera accelera.'],
    missingInformation: ['Stipendio offerto.'],
    ambiguities: [],
  },
  biases: {
    biases: [
      {
        id: 'status_quo' as const,
        name: 'Bias dello status quo',
        status: 'possible_indication' as const,
        meaning: 'Preferire ciò che già si conosce.',
        trigger: '"Resto dove sono"',
        why: 'Potrebbe sottovalutare i benefici del cambiamento.',
        testQuestion: 'Sceglieresti Torino se partissi da zero?',
      },
    ],
    notDetected: ['anchoring' as const],
  },
  challenge: {
    weakAssumptions: [{ assumption: 'La carriera accelera.', whyWeak: 'Nessuna evidenza fornita.' }],
    missingEvidence: ['Dati sulla crescita.'],
    logicalWeaknesses: [],
    unsupportedConclusions: [],
    risks: [{ risk: 'Costo della vita', consequence: 'Risparmi erosi.', severity: 'medium' as const }],
    alternativeExplanations: [],
    counterarguments: [{ argument: 'Il costo dell’affitto annulla il vantaggio.', reasoning: 'Vincolo dichiarato.', strength: 'strong' as const }],
  },
  perspectives: {
    scenarios: [
      { kind: 'favorable' as const, title: 'Tutto bene', narrative: 'Cresci.', implications: ['Più opportunità'] },
      { kind: 'unfavorable' as const, title: 'Tutto male', narrative: 'Costi alti.', implications: [] },
      { kind: 'neutral' as const, title: 'Terzo osservatore', narrative: 'Dipende.', implications: [] },
    ],
    informationThatCouldChangeConclusion: ['Stipendio offerto'],
  },
  matrix: {
    criteria: [
      { name: 'Crescita', description: 'Opportunità', weight: 8, scores: [s('Milano', 8), s('Torino', 5)] },
      { name: 'Costi', description: 'Spese', weight: 6, scores: [s('Milano', 4), s('Torino', 7)] },
    ],
    caveat: 'Stime approssimative.',
  },
  report: {
    summary: 'Sintesi.',
    mainObjective: 'Crescita.',
    evidenceSufficiency: 'partial' as const,
    evidenceNote: 'Mancano dati economici.',
    mainRisks: ['Costo della vita'],
    missingInformation: ['Stipendio'],
    questionsBeforeDeciding: ['Q1?', 'Q2?', 'Q3?', 'Q4?'],
    topQuestions: ['Q1?', 'Q2?', 'Q3?'],
    nextActions: ['Chiedere lo stipendio'],
    alternativeNotes: [{ alternative: 'Milano', strengths: ['Crescita'], concerns: ['Costi'] }],
  },
} satisfies Analysis;
