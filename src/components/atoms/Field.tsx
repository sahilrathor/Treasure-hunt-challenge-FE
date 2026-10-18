import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function Field({ label, hint, className, ...props }: Props) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-200">
      <span>{label}</span>
      <input
        className={cn(
          'min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white placeholder:text-slate-600 focus:border-cyan-300',
          className,
        )}
        {...props}
      />
      {hint ? <span className="text-xs font-normal text-slate-500">{hint}</span> : null}
    </label>
  );
}
