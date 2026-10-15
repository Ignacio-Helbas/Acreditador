import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = {
  variant: {
    default: 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm',
    destructive: 'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-900/80 dark:hover:bg-rose-800 shadow-sm',
    outline: 'border border-zinc-200 bg-transparent hover:bg-zinc-100 text-zinc-900 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800/60',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700/80',
    ghost: 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-100',
    link: 'text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100 p-0 h-auto',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-sm',
  },
  size: {
    default: 'h-9 px-3.5 py-1.5 text-xs font-medium',
    sm: 'h-8 px-2.5 py-1 text-xs font-medium rounded-md',
    lg: 'h-10 px-4 py-2 text-sm font-medium',
    icon: 'h-9 w-9 p-0 flex items-center justify-center',
    'icon-sm': 'h-7 w-7 p-0 flex items-center justify-center rounded',
  },
};

export const Button = React.forwardRef(
  ({ className, variant = 'default', size = 'default', isLoading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-md transition-colors select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 disabled:pointer-events-none disabled:opacity-50',
          buttonVariants.variant[variant] || buttonVariants.variant.default,
          buttonVariants.size[size] || buttonVariants.size.default,
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
