import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type IconButtonTone = 'neutral' | 'brand' | 'danger' | 'success'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  tone?: IconButtonTone
}

const toneClasses: Record<IconButtonTone, string> = {
  neutral: 'text-navy-400 hover:text-navy-800 hover:bg-navy-100',
  brand: 'text-navy-400 hover:text-brand-700 hover:bg-brand-50',
  danger: 'text-navy-400 hover:text-red-700 hover:bg-red-50',
  success: 'text-navy-400 hover:text-emerald-700 hover:bg-emerald-50',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, tone = 'neutral', children, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn(
          'p-1.5 rounded-lg transition-colors duration-150 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1',
          'disabled:opacity-40 disabled:pointer-events-none',
          toneClasses[tone],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'
