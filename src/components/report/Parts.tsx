import type { ReactNode } from 'react';
import { Badge } from '../ui/Badge';

export function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[13px] uppercase tracking-[0.1em] text-ink-mute font-sans font-medium">{title}</h3>
      {children}
    </div>
  );
}

export function Bullets({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((x, i) => (
        <li key={i} className="flex gap-3 text-[16px] text-ink-soft leading-relaxed">
          <span className="mt-[0.7em] h-1 w-1 rounded-full bg-ink-mute shrink-0" aria-hidden />
          <span className="break-words">{x}</span>
        </li>
      ))}
    </ul>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-ink-mute italic text-[15px]">{children}</p>;
}

export function Card({ tone = 'plain', children }: { tone?: 'plain' | 'amber'; children: ReactNode }) {
  return (
    <div className={`rounded-lg border p-4 sm:p-5 space-y-3 ${tone === 'amber' ? 'border-amber-line bg-amber-soft/50' : 'border-line bg-surface'}`}>
      {children}
    </div>
  );
}

export function Meter({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label={`${score} su 10`}>
      <span className="h-1.5 w-16 rounded-full bg-line overflow-hidden" aria-hidden>
        <span className="block h-full bg-navy" style={{ width: `${score * 10}%` }} />
      </span>
      <span className="tabular-nums text-sm font-medium">{score}</span>
    </span>
  );
}

export function Pill({ tone, children }: { tone: 'neutral' | 'amber' | 'navy' | 'outline'; children: ReactNode }) {
  return <Badge tone={tone}>{children}</Badge>;
}
