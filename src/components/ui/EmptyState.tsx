import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center gap-3 py-12 px-6 rounded-xl border border-dashed border-navy-200 bg-navy-50/40',
        className
      )}
    >
      {icon && (
        <div className="w-11 h-11 rounded-xl bg-white border border-navy-200 text-brand-600 flex items-center justify-center shadow-xs">
          {icon}
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
        {description && <p className="text-xs text-navy-500 leading-relaxed">{description}</p>}
      </div>
      {action}
    </div>
  )
}
