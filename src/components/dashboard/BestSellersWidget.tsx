import { Link } from 'react-router-dom'
import { Flame, ArrowRight, TrendingUp } from 'lucide-react'
import { BEST_SELLING_PRODUCTS } from '@/data/dashboardData'
import { formatMoney, rupeesToPaise } from '@/utils/money'

export function BestSellersWidget() {
  return (
    <div className="bg-white rounded-xl border border-navy-200/90 p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-navy-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-navy-950 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" aria-hidden="true" />
            <span>Top Revenue &amp; Margin Contributors</span>
          </h3>
          <p className="text-xs text-navy-500 mt-0.5">
            High-velocity products driving the largest percentage of net business profit.
          </p>
        </div>

        <Link
          to="/app/products"
          className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1 transition-colors"
        >
          <span>Catalog</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Product List */}
      <div className="space-y-2.5">
        {BEST_SELLING_PRODUCTS.map((prod, index) => (
          <div
            key={prod.sku}
            className="p-3 rounded-lg border border-navy-100 bg-navy-50/40 hover:bg-navy-50/80 transition-colors flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-6 h-6 rounded-lg bg-brand-50 text-brand-700 font-mono font-bold text-[11px] flex items-center justify-center shrink-0 border border-brand-200/60">
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="font-bold text-navy-900 truncate">{prod.name}</div>
                <div className="font-mono text-[11px] text-navy-500">
                  {prod.sku} · {prod.category}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 shrink-0 text-right">
              <div>
                <div className="font-mono font-bold text-navy-950">
                  {formatMoney(rupeesToPaise(prod.revenue))}
                </div>
                <div className="font-mono text-[11px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +{formatMoney(rupeesToPaise(prod.profit))} ({prod.marginPercent}%)
                </div>
              </div>

              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200/60 font-mono">
                {prod.unitsSold} sold
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
