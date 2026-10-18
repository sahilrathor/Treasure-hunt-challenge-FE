import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        'rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/20',
        className,
      )}
      {...props}
    />
  );
}
