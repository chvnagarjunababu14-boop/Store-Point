import { Store, ArrowRight, CheckCircle2 } from 'lucide-react'
import { BRANCH_METRICS } from '@/data/dashboardData'
import type { BranchPerformanceSummary } from '@/lib/services/financialCalculationService'
import { useWorkspace } from '@/context/WorkspaceContext'
import { formatMoney, rupeesToPaise } from '@/utils/money'
import { cn } from '@/utils/cn'

interface BranchComparisonProps {
  activeBranchId: string
  onSelectBranch: (id: string) => void
  branches?: BranchPerformanceSummary[]
}

export function BranchComparisonTable({ activeBranchId, onSelectBranch, branches }: BranchComparisonProps) {
  const { workspaceMode } = useWorkspace()
  // In live mode, only use persisted branches; do not fall back to fabricated demo metrics
  const displayBranches = branches && branches.length > 0 ? branches : workspaceMode === 'demo' ? null : []

  return (
    <div className="bg-white rounded-xl border border-navy-200/90 p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-navy-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-navy-950 flex items-center gap-2">
            <Store className="w-4 h-4 text-brand-600" aria-hidden="true" />
            <span>Branch Performance &amp; Margin Benchmarking</span>
          </h3>
          <p className="text-xs text-navy-500 mt-0.5">
            Compare store profitability, sales volume, and shelf inventory health across all retail locations.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => onSelectBranch('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer shadow-2xs',
              activeBranchId === 'all'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-navy-50 text-navy-600 border border-navy-200/80 hover:bg-navy-100/80'
            )}
          >
            Show All (Consolidated)
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-navy-200">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-navy-50/80 border-b border-navy-200 text-navy-600 font-semibold uppercase tracking-wider text-[11px]">
              <th scope="col" className="py-3 px-4">Location / Code</th>
              <th scope="col" className="py-3 px-4 hidden md:table-cell">City</th>
              <th scope="col" className="py-3 px-4 hidden lg:table-cell">Manager</th>
              <th scope="col" className="py-3 px-4 text-right">Gross Sales</th>
              <th scope="col" className="py-3 px-4 text-right">Net Profit</th>
              <th scope="col" className="py-3 px-4 text-right">Margin %</th>
              <th scope="col" className="py-3 px-4 text-right hidden sm:table-cell">Orders</th>
              <th scope="col" className="py-3 px-4 text-center">Stock Health</th>
              <th scope="col" className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100 text-navy-800">
            {displayBranches && displayBranches.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-navy-400 text-xs">
                  No retail locations found in live ledger. Create branches to benchmark performance.
                </td>
              </tr>
            ) : displayBranches ? (
              displayBranches.map((branch) => {
                const isSelected = activeBranchId === branch.branchId
                return (
                  <tr
                    key={branch.branchId}
                    className={cn(
                      'transition-colors',
                      isSelected ? 'bg-brand-50/60 font-medium' : 'hover:bg-navy-50/50'
                    )}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-bold text-navy-950">{branch.branchName}</div>
                          <div className="font-mono text-[10px] text-navy-500">
                            {branch.branchCode} · {branch.locationType}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 hidden md:table-cell text-navy-600">
                      <div>{branch.city}</div>
                    </td>
                    <td className="py-3.5 px-4 hidden lg:table-cell text-navy-600">
                      {branch.manager}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-navy-950">
                      {formatMoney(branch.grossSalesPaise ?? branch.grossSalesCents)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                      +{formatMoney(branch.netProfitPaise ?? branch.netProfitCents)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-brand-600">
                      {branch.netMarginPercent}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-navy-600 hidden sm:table-cell">
                      {branch.orderCount}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {branch.stockHealthPercent}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectBranch(branch.branchId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-brand-50 text-brand-600 border border-navy-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <span>{isSelected ? 'Active' : 'Filter'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              BRANCH_METRICS.map((branch) => {
                const isSelected = activeBranchId === branch.id
                return (
                  <tr
                    key={branch.id}
                    className={cn(
                      'transition-colors',
                      isSelected ? 'bg-brand-50/60 font-medium' : 'hover:bg-navy-50/50'
                    )}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-bold text-navy-950">{branch.name}</div>
                          <div className="font-mono text-[10px] text-navy-500">
                            {branch.code} · {branch.locationType}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 hidden md:table-cell text-navy-600">
                      <div>{branch.city}</div>
                    </td>
                    <td className="py-3.5 px-4 hidden lg:table-cell text-navy-600">
                      {branch.manager}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-navy-950">
                      {formatMoney(rupeesToPaise(branch.revenue))}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                      +{formatMoney(rupeesToPaise(branch.netProfit))}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-brand-600">
                      {branch.marginPercent}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-navy-600 hidden sm:table-cell">
                      {branch.orderCount}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {branch.stockHealthPercent}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectBranch(branch.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-brand-50 text-brand-600 border border-navy-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <span>{isSelected ? 'Active' : 'Filter'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
