import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/utils/cn'

interface FilterBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  searchLabel?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  searchLabel = 'Search',
  children,
  footer,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'bg-white p-3.5 sm:p-4 rounded-xl border border-navy-200/80 shadow-card space-y-3',
        className
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className="sp-control w-full pl-9"
          />
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>
        )}
      </div>
      {footer}
    </div>
  )
}

interface FilterFieldProps {
  label: string
  children: ReactNode
  icon?: ReactNode
}

export function FilterField({ label, children, icon }: FilterFieldProps) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-navy-600">
      {icon}
      <span className="font-semibold shrink-0">{label}</span>
      {children}
    </label>
  )
}
