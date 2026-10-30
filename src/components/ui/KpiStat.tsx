import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface KpiStatProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'muted'
  icon?: ReactNode
  className?: string
}

const valueTone: Record<NonNullable<KpiStatProps['tone']>, string> = {
  default: 'text-navy-900',
  brand: 'text-brand-600',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
  muted: 'text-navy-500',
}

export function KpiStat({
  label,
  value,
  hint,
  tone = 'default',
  icon,
  className,
}: KpiStatProps) {
  return (
    <div
      className={cn(
        'bg-white p-4 rounded-xl border border-navy-200/80 shadow-card space-y-1',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-navy-500 uppercase tracking-wider truncate">
          {label}
        </span>
        {icon && (
          <span className="shrink-0 text-navy-400" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className={cn('sp-num text-xl sm:text-2xl font-extrabold tracking-tight', valueTone[tone])}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-navy-400 leading-snug">{hint}</div>}
    </div>
  )
}
