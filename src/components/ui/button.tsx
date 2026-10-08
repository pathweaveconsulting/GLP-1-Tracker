import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

/** Legacy button API kept for older screens; it renders with the design-system shapes and colours (see ds/Button). */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-55",
          {
            'border border-line-strong bg-surface text-ink hover:bg-sunken': variant === 'default' || variant === 'outline',
            'bg-sunken text-ink hover:bg-line': variant === 'secondary',
            'text-brand hover:bg-brand-soft': variant === 'ghost',
            'min-h-11 px-4': size === 'default' || size === 'lg',
            'min-h-9 px-3 text-[13px]': size === 'sm',
            'h-11 w-11': size === 'icon',
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
