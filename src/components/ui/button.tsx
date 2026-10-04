import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-[14px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D4AFF] disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          {
            'bg-[#111827] text-white shadow-xs hover:bg-[#1f2937]': variant === 'default',
            'bg-[#F8F9FC] text-[#111827] hover:bg-[#E5E7EB]': variant === 'secondary',
            'border border-[#E5E7EB] bg-white shadow-xs hover:bg-[#F8F9FC] text-[#111827]': variant === 'outline',
            'hover:bg-[#F8F9FC] text-[#111827]': variant === 'ghost',
            'h-10 px-4 py-2': size === 'default',
            'h-8 rounded-[10px] px-3 text-xs': size === 'sm',
            'h-12 rounded-[16px] px-8': size === 'lg',
            'h-10 w-10': size === 'icon',
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
