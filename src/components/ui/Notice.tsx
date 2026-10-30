import type { ReactNode } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export function Notice({ tone = 'neutral', children, role }: { tone?: 'neutral' | 'warn' | 'error'; children: ReactNode; role?: 'alert' | 'status' }) {
  const styles = {
    neutral: 'bg-navy-soft/60 border-navy/15 text-ink-soft',
    warn: 'bg-amber-soft border-amber-line text-[#5e3906]',
    error: 'bg-[#fbeceb] border-[#e5b7b1] text-[#7a2a21]',
  }[tone];
  const Icon = tone === 'neutral' ? Info : AlertTriangle;
  return (
    <div role={role} className={`flex gap-3 rounded-md border px-4 py-3 text-[14.5px] leading-snug ${styles}`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
