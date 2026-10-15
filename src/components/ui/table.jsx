import React from 'react';
import { cn } from '../../lib/utils';

export function Table({ className, ...props }) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-xs', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn('[&_tr]:border-b border-zinc-200 dark:border-zinc-800', className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return (
    <tbody
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

export function TableFooter({ className, ...props }) {
  return (
    <tfoot
      className={cn('border-t border-zinc-200 bg-zinc-50 font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100', className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn(
        'border-b border-zinc-100 transition-colors hover:bg-zinc-50/70 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40 data-[state=selected]:bg-zinc-100 dark:data-[state=selected]:bg-zinc-800',
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={cn(
        'h-9 px-3 text-left align-middle font-medium text-zinc-500 uppercase tracking-wider text-[11px] dark:text-zinc-400 [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return (
    <td
      className={cn('p-3 align-middle [&:has([role=checkbox])]:pr-0 text-zinc-700 dark:text-zinc-300', className)}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }) {
  return (
    <caption
      className={cn('mt-3 text-xs text-zinc-500 dark:text-zinc-400', className)}
      {...props}
    />
  );
}
