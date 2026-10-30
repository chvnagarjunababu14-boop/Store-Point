import { AlertTriangle, CheckCircle2, XCircle, Clock, Info } from 'lucide-react'
import { Badge, type BadgeTone } from './Badge'

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | string

const stockConfig: Record<
  string,
  { tone: BadgeTone; label: string; Icon: typeof CheckCircle2 }
> = {
  in_stock: { tone: 'success', label: 'In Stock', Icon: CheckCircle2 },
  low_stock: { tone: 'warning', label: 'Low Stock', Icon: AlertTriangle },
  out_of_stock: { tone: 'danger', label: 'Out of Stock', Icon: XCircle },
  completed: { tone: 'success', label: 'Completed', Icon: CheckCircle2 },
  partial_return: { tone: 'warning', label: 'Partial Return', Icon: AlertTriangle },
  refunded: { tone: 'info', label: 'Refunded', Icon: Info },
  cancelled: { tone: 'neutral', label: 'Cancelled', Icon: XCircle },
  pending: { tone: 'warning', label: 'Pending', Icon: Clock },
  draft: { tone: 'warning', label: 'Draft', Icon: Clock },
  archived: { tone: 'neutral', label: 'Archived', Icon: Clock },
  received: { tone: 'success', label: 'Received', Icon: CheckCircle2 },
  ordered: { tone: 'info', label: 'Ordered', Icon: Info },
  in_transit: { tone: 'info', label: 'In Transit', Icon: Info },
  dispatched: { tone: 'info', label: 'Dispatched', Icon: Info },
}

interface StatusBadgeProps {
  status: StockStatus
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = stockConfig[status] || {
    tone: 'neutral' as BadgeTone,
    label: status.replace(/_/g, ' '),
    Icon: Info,
  }
  const Icon = config.Icon

  return (
    <Badge
      tone={config.tone}
      className={className}
      icon={<Icon className="w-3 h-3" aria-hidden="true" />}
    >
      {label || config.label}
    </Badge>
  )
}
