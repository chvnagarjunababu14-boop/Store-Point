import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  icon?: ReactNode
  className?: string
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-navy-50 text-navy-700 border-navy-200/80',
  brand: 'bg-brand-50 text-brand-700 border-brand-200/80',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
  warning: 'bg-amber-50 text-amber-800 border-amber-200/60',
  danger: 'bg-red-50 text-red-800 border-red-200/60',
  info: 'bg-sky-50 text-sky-800 border-sky-200/60',
}

export function Badge({ children, tone = 'neutral', icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
        toneClasses[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  )
}
