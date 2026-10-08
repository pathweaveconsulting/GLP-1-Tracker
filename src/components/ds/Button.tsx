import * as React from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
export type ButtonSize = 'md' | 'sm';

/**
 * Shared button styling, also usable on links: one shape, one focus style, 44px tap height at the default size.
 * Uses plain clsx (no class merging) so the vault screen can use it without loading tailwind-merge up front;
 * callers add only non-conflicting classes such as width or margin.
 */
export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string) {
  return clsx(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors',
    'rounded-[var(--radius-control)] disabled:cursor-not-allowed disabled:opacity-55',
    size === 'md' ? 'min-h-11 px-3 text-sm sm:px-4' : 'min-h-9 px-3 text-[13px]',
    variant === 'primary' && 'bg-brand text-white hover:bg-brand-strong',
    variant === 'secondary' && 'border border-line-strong bg-surface text-ink hover:bg-sunken',
    variant === 'quiet' && 'text-brand hover:bg-brand-soft',
    variant === 'danger' && 'bg-danger text-white hover:bg-[#8f1c13]',
    className,
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />
  ),
);
Button.displayName = 'Button';
