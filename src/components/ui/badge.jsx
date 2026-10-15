import React from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = {
  default: 'border-transparent bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
  secondary: 'border-transparent bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
  destructive: 'border-transparent bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900',
  outline: 'text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
  info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900',
};

export function Badge({ className, variant = 'default', children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase transition-colors',
        badgeVariants[variant] || badgeVariants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
