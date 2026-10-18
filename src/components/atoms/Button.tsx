import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const styles = cva(
  'inline-flex min-h-12 items-center justify-center rounded-xl px-5 font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2',
  {
    variants: {
      variant: {
        primary: 'bg-cyan-300 text-slate-950 hover:bg-cyan-200',
        secondary: 'border border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-400',
        danger: 'bg-rose-500 text-white hover:bg-rose-400',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof styles> & { asChild?: boolean };

export function Button({ className, variant, asChild, ...props }: Props) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(styles({ variant }), className)} {...props} />;
}
