import { useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function Collapsible({
  title,
  eyebrow,
  open,
  onToggle,
  children,
  aside,
}: {
  title: string;
  eyebrow?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const id = useId();
  return (
    <section className="border-t border-line">
      <h2 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 py-5 text-left min-h-[44px]"
        >
          <span>
            {eyebrow && <span className="eyebrow block mb-1">{eyebrow}</span>}
            <span className="font-serif text-[22px] leading-snug">{title}</span>
          </span>
          <span className="flex items-center gap-3 shrink-0">
            {aside}
            <ChevronDown className={`h-5 w-5 text-ink-mute transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
          </span>
        </button>
      </h2>
      <div id={id} hidden={!open} className="pb-8 animate-rise">
        {open && children}
      </div>
    </section>
  );
}
