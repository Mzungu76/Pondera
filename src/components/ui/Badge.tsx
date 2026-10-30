import type { ReactNode } from 'react';

const tones = {
  neutral: 'bg-black/5 text-ink-soft border-transparent',
  navy: 'bg-navy-soft text-navy border-transparent',
  amber: 'bg-amber-soft text-amber-risk border-amber-line',
  outline: 'bg-transparent text-ink-mute border-line',
};
export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12.5px] font-medium whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}
