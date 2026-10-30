import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { IconButton } from './IconButton'

interface DialogHeaderProps {
  icon?: ReactNode
  title: string
  titleId: string
  description?: string
  onClose: () => void
  className?: string
}

export function DialogHeader({
  icon,
  title,
  titleId,
  description,
  onClose,
  className,
}: DialogHeaderProps) {
  return (
    <div
      className={cn(
        'px-5 sm:px-6 py-4 border-b border-navy-200 flex items-center justify-between gap-3 bg-navy-50 shrink-0',
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center shadow-xs shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 id={titleId} className="font-bold text-navy-900 text-sm truncate">
            {title}
          </h3>
          {description && (
            <p className="text-[11px] text-navy-500 truncate">{description}</p>
          )}
        </div>
      </div>
      <IconButton label="Close dialog" onClick={onClose} className="hover:bg-white">
        <X className="w-4 h-4" aria-hidden="true" />
      </IconButton>
    </div>
  )
}

interface DialogFooterProps {
  children: ReactNode
  className?: string
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div
      className={cn(
        'px-5 sm:px-6 py-3.5 border-t border-navy-100 bg-navy-50/60 flex flex-wrap items-center justify-end gap-2.5 shrink-0',
        className
      )}
    >
      {children}
    </div>
  )
}
