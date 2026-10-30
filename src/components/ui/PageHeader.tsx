import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface PageHeaderProps {
  eyebrow?: ReactNode
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-navy-200/80 pb-5',
        className
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow && (
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-navy-500">
            {eyebrow}
          </div>
        )}
        <h1 className="text-xl sm:text-2xl font-bold text-navy-900 tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-navy-500 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </header>
  )
}
