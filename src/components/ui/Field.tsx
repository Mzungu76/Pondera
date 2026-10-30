import { useId, useState, type ReactNode } from 'react';
import { t } from '../../i18n';

interface Props {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  error?: string;
  autoFocus?: boolean;
  /** Extra node rendered beside the label (e.g. "facoltativo"). */
  badge?: ReactNode;
}

/** Visible label, blur-first validation, error clears as soon as the value becomes valid. */
export function Field({ label, hint, value, onChange, max, multiline, rows = 4, placeholder, required, error, autoFocus, badge }: Props) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const empty = required && touched && !value.trim();
  const msg = error ?? (empty ? t.wizard.errRequired : value.length >= max ? t.wizard.errTooLong(max) : undefined);
  const shown = msg && (error || touched || value.length >= max) ? msg : undefined;
  const common = {
    id,
    value,
    placeholder,
    maxLength: max,
    autoFocus,
    'aria-invalid': shown ? true : undefined,
    'aria-describedby': `${id}-hint${shown ? ` ${id}-err` : ''}`,
    onBlur: () => setTouched(true),
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    className: 'input',
  } as const;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-medium text-[15px]">
          {label} {badge ?? (!required && <span className="font-normal text-ink-mute text-sm">({t.common.optional})</span>)}
        </label>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-mute">
          {hint}
        </p>
      )}
      {!hint && <span id={`${id}-hint`} className="hidden" />}
      {multiline ? <textarea {...common} rows={rows} className="input resize-y" /> : <input {...common} type="text" />}
      <div className="flex justify-between gap-3 min-h-[1.25rem]">
        <p id={`${id}-err`} role={shown ? 'alert' : undefined} className="text-sm text-[#b4452d]">
          {shown}
        </p>
        {value.length > max * 0.8 && (
          <p className="text-xs text-ink-mute tabular-nums shrink-0">
            {value.length}/{max} {t.common.characters}
          </p>
        )}
      </div>
    </div>
  );
}
