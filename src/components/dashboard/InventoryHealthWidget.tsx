import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Package, CheckCircle2, XCircle, ArrowRight, RefreshCw } from 'lucide-react'
import { INVENTORY_ALERTS } from '@/data/dashboardData'
import { cn } from '@/utils/cn'

interface InventoryHealthProps {
  branchId: string
}

export function InventoryHealthWidget({ branchId }: InventoryHealthProps) {
  const [restockedIds, setRestockedIds] = useState<string[]>([])

  const filteredAlerts =
    branchId === 'all'
      ? INVENTORY_ALERTS
      : INVENTORY_ALERTS.filter((a) => {
          if (branchId === 'b-flagship') return a.branch.includes('Flagship')
          if (branchId === 'b-westside') return a.branch.includes('Westside')
          if (branchId === 'b-airport') return a.branch.includes('Airport')
          if (branchId === 'b-depot') return a.branch.includes('Warehouse') || a.branch.includes('Depot')
          return true
        })

  const handleSimulateRestock = (id: string) => {
    setRestockedIds((prev) => [...prev, id])
  }

  return (
    <div className="bg-white rounded-xl border border-navy-200/90 p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-navy-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-navy-950 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <span>Inventory Health &amp; Depletion</span>
          </h3>
          <p className="text-xs text-navy-500 mt-0.5">
            Real-time threshold alerts flagging items approaching stockout.
          </p>
        </div>

        <Link
          to="/app/inventory"
          className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1 transition-colors"
        >
          <span>Catalog</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Health Metric Progress Summary */}
      <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
        <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/70">
          <div className="font-mono font-bold text-base text-emerald-700">3,361</div>
          <div className="text-[11px] text-emerald-800 font-medium flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>In Stock</span>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/70">
          <div className="font-mono font-bold text-base text-amber-700">48</div>
          <div className="text-[11px] text-amber-800 font-medium flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Low Stock</span>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-red-50/80 border border-red-200/70">
          <div className="font-mono font-bold text-base text-red-700">3</div>
          <div className="text-[11px] text-red-800 font-medium flex items-center justify-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>Out of Stock</span>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-2 pt-1">
        {filteredAlerts.slice(0, 4).map((item) => {
          const isRestocked = restockedIds.includes(item.id)

          return (
            <div
              key={item.id}
              className={cn(
                'p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all',
                isRestocked
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : item.status === 'out_of_stock'
                  ? 'bg-red-50/60 border-red-200/80 text-red-950'
                  : 'bg-amber-50/60 border-amber-200/80 text-amber-950'
              )}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="mt-0.5 shrink-0">
                  {isRestocked ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : item.status === 'out_of_stock' ? (
                    <XCircle className="w-4 h-4 text-red-600" />
                  ) : (
                    <Package className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-navy-950 truncate">{item.name}</div>
                  <div className="font-mono text-[11px] text-navy-500">
                    {item.sku} · {item.branch}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <div className="text-right">
                  <div className="font-mono font-bold text-xs text-navy-900">
                    {isRestocked ? item.reorderLevel * 2 : item.currentStock} units
                  </div>
                  <div className="text-[10px] text-navy-500 font-mono">
                    {isRestocked ? 'Restocked locally' : `Reorder at: ${item.reorderLevel}`}
                  </div>
                </div>

                {!isRestocked ? (
                  <button
                    type="button"
                    onClick={() => handleSimulateRestock(item.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-navy-50 text-brand-600 border border-navy-200 font-semibold text-[11px] shadow-2xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Restock</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                    Restocked
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
