import { IndianRupee, TrendingUp, Percent, Layers, Package, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { DashboardKPIs } from '@/types/dashboard'
import { formatMoney, rupeesToPaise } from '@/utils/money'
import { cn } from '@/utils/cn'

interface OverviewKPIsProps {
  kpis: DashboardKPIs
  branchName: string
}

export function OverviewKPIs({ kpis, branchName }: OverviewKPIsProps) {
  const cards = [
    {
      id: 'kpi-revenue',
      title: 'Gross Revenue',
      value: formatMoney(rupeesToPaise(kpis.revenue)),
      delta: `${kpis.revenueChange >= 0 ? '+' : ''}${kpis.revenueChange}%`,
      isPositive: kpis.revenueChange >= 0,
      subtext: 'vs prior 30 days',
      icon: IndianRupee,
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-200/60',
      accentGradient: 'from-blue-600 to-indigo-600',
    },
    {
      id: 'kpi-gross-profit',
      title: 'Gross Profit',
      value: formatMoney(rupeesToPaise(kpis.grossProfit)),
      delta: `${kpis.grossProfitMargin}%`,
      isPositive: true,
      subtext: 'gross margin on sales',
      icon: Percent,
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-200/60',
      accentGradient: 'from-indigo-600 to-violet-600',
    },
    {
      id: 'kpi-net-profit',
      title: 'Net Operating Profit',
      value: formatMoney(rupeesToPaise(kpis.netProfit)),
      delta: `${kpis.netProfitMargin}%`,
      isPositive: true,
      subtext: 'net operating margin',
      icon: TrendingUp,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
      accentGradient: 'from-emerald-600 to-teal-600',
    },
    {
      id: 'kpi-expenses',
      title: 'Operating Expenses',
      value: formatMoney(rupeesToPaise(kpis.expenses)),
      delta: `${kpis.expensesChange <= 0 ? '' : '+'}${kpis.expensesChange}%`,
      isPositive: kpis.expensesChange <= 0,
      subtext: 'rent, utilities & ops',
      icon: CreditCard,
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-200/60',
      accentGradient: 'from-amber-500 to-orange-500',
    },
    {
      id: 'kpi-inventory-val',
      title: 'Inventory Valuation',
      value: formatMoney(rupeesToPaise(kpis.inventoryValue)),
      delta: `${kpis.totalSkus.toLocaleString('en-IN')} SKUs`,
      isPositive: true,
      subtext: `active items in ${branchName}`,
      icon: Package,
      iconBg: 'bg-sky-50 text-sky-600 border border-sky-200/60',
      accentGradient: 'from-sky-500 to-blue-600',
    },
  ]

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-navy-500 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-600" aria-hidden="true" />
          <span>Financial &amp; Stock Telemetry</span>
        </h2>
        <span className="text-xs font-mono text-navy-400">
          Scope: <strong className="text-navy-800 font-semibold">{branchName}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.id}
              className="group relative bg-white rounded-xl border border-navy-200/90 p-4 sm:p-5 shadow-xs hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden"
            >
              {/* Subtle top gradient accent line */}
              <div
                className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-80 group-hover:opacity-100 transition-opacity', card.accentGradient)}
                aria-hidden="true"
              />

              <div className="flex items-center justify-between text-xs font-semibold text-navy-500 gap-2 mb-2">
                <span className="truncate">{card.title}</span>
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs', card.iconBg)}>
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
              </div>

              <div className="my-1">
                <div className="font-mono text-xl sm:text-2xl font-extrabold text-navy-950 tracking-tight">
                  {card.value}
                </div>
              </div>

              <div className="pt-2.5 mt-2 border-t border-navy-100 flex items-center justify-between text-xs">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 font-mono font-bold text-[11px] px-1.5 py-0.5 rounded-md',
                    card.isPositive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                  )}
                >
                  {card.isPositive ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-amber-600" aria-hidden="true" />
                  )}
                  {card.delta}
                </span>
                <span className="text-[11px] text-navy-400 truncate ml-2 font-normal">
                  {card.subtext}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
