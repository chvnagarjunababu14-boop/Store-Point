import { useState } from 'react'
import { motion } from 'motion/react'
import {
  TrendingUp,
  IndianRupee,
  Package,
  Store,
  BarChart3,
  ListFilter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react'
import { MOCK_BRANCHES, MOCK_PRODUCTS, MOCK_DAILY_METRICS, FICTIONAL_DISCLAIMER } from '@/data/mockData'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/utils/cn'

export function ProductPreview() {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'chart' | 'inventory' | 'branches'>('chart')
  const shouldReduceMotion = useReducedMotion()

  const currentBranch =
    MOCK_BRANCHES.find((b) => b.id === selectedBranchId) || MOCK_BRANCHES[0]

  const filteredProducts =
    selectedBranchId === 'all'
      ? MOCK_PRODUCTS
      : MOCK_PRODUCTS.filter((p) => p.branch === currentBranch.name)

  const maxDailyRevenue = Math.max(...MOCK_DAILY_METRICS.map((m) => m.revenue))

  return (
    <section id="preview" className="py-16 lg:py-24 bg-slate-50/60 border-b border-navy-200/80 scroll-mt-16 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200/90 text-brand-700 text-xs font-semibold shadow-2xs">
            <BarChart3 className="w-3.5 h-3.5 text-brand-600" />
            <span>Interactive Product Preview</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-navy-950 tracking-tight leading-tight">
            See inventory, sales, and margins <span className="sp-gradient-text">at a glance</span>
          </h2>

          <p className="text-base sm:text-lg text-navy-600 leading-relaxed font-normal">
            Switch branches, inspect profit margins, and monitor stock health. Built from StorePoint&apos;s real product architecture — test the live telemetry below.
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-medium">
            <Info className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span>{FICTIONAL_DISCLAIMER}</span>
          </div>
        </div>

        {/* Branch Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto" role="group" aria-label="Branch Locations Filter">
          {MOCK_BRANCHES.map((branch) => {
            const isSelected = selectedBranchId === branch.id
            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => setSelectedBranchId(branch.id)}
                aria-pressed={isSelected}
                aria-label={`Filter metrics by ${branch.name}`}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 cursor-pointer shadow-2xs',
                  isSelected
                    ? 'bg-brand-600 text-white shadow-xs font-bold scale-[1.02]'
                    : 'bg-white text-navy-700 border border-navy-200/90 hover:bg-navy-50'
                )}
              >
                {branch.name}
              </button>
            )
          })}
        </div>

        {/* 4 Core KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* KPI 1: Gross Revenue */}
          <div className="bg-white rounded-xl border border-navy-200/90 p-5 shadow-xs hover:border-brand-300 hover:shadow-md transition-all space-y-2 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-80 group-hover:opacity-100" />
            <div className="flex items-center justify-between text-xs font-semibold text-navy-500 uppercase tracking-wider">
              <span>Gross Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
              ₹{currentBranch.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.4% vs last period</span>
            </div>
          </div>

          {/* KPI 2: Net Operating Profit */}
          <div className="bg-white rounded-xl border border-navy-200/90 p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all space-y-2 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600 opacity-80 group-hover:opacity-100" />
            <div className="flex items-center justify-between text-xs font-semibold text-navy-500 uppercase tracking-wider">
              <span>Net Profit</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
              ₹{currentBranch.profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-navy-500 flex items-center gap-1.5 font-medium">
              <span className="font-mono font-bold text-brand-600">{currentBranch.marginPercent}%</span>
              <span>net operating margin</span>
            </div>
          </div>

          {/* KPI 3: Inventory SKUs */}
          <div className="bg-white rounded-xl border border-navy-200/90 p-5 shadow-xs hover:border-sky-300 hover:shadow-md transition-all space-y-2 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-blue-600 opacity-80 group-hover:opacity-100" />
            <div className="flex items-center justify-between text-xs font-semibold text-navy-500 uppercase tracking-wider">
              <span>Active Inventory</span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
              {currentBranch.activeSkus.toLocaleString('en-US')} SKUs
            </div>
            <div className="text-xs text-navy-500 flex items-center gap-1.5 font-medium">
              <span className="font-mono font-bold text-emerald-600">{currentBranch.stockHealthPercent}%</span>
              <span>stock health index</span>
            </div>
          </div>

          {/* KPI 4: Connected Outlets */}
          <div className="bg-white rounded-xl border border-navy-200/90 p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all space-y-2 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-80 group-hover:opacity-100" />
            <div className="flex items-center justify-between text-xs font-semibold text-navy-500 uppercase tracking-wider">
              <span>Branch Coverage</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
              {selectedBranchId === 'all' ? '5 Locations' : currentBranch.locationType}
            </div>
            <div className="text-xs text-navy-500 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>{currentBranch.city}</span>
            </div>
          </div>
        </div>

        {/* Tabbed Interactive Preview Panel */}
        <div className="bg-white rounded-2xl border border-navy-200/90 shadow-sm overflow-hidden">
          {/* Tab Controls Bar */}
          <div className="border-b border-navy-200/80 px-4 sm:px-6 pt-3 flex flex-wrap items-center justify-between gap-3 bg-navy-50/50">
            <div className="flex gap-2" role="tablist" aria-label="Product Analytics Views">
              <button
                id="tab-chart"
                type="button"
                role="tab"
                aria-selected={activeTab === 'chart'}
                aria-controls="panel-chart"
                onClick={() => setActiveTab('chart')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer',
                  activeTab === 'chart'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-navy-500 hover:text-navy-900'
                )}
              >
                <BarChart3 className="w-4 h-4" />
                <span>7-Day Velocity Chart</span>
              </button>
              <button
                id="tab-inventory"
                type="button"
                role="tab"
                aria-selected={activeTab === 'inventory'}
                aria-controls="panel-inventory"
                onClick={() => setActiveTab('inventory')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer',
                  activeTab === 'inventory'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-navy-500 hover:text-navy-900'
                )}
              >
                <ListFilter className="w-4 h-4" />
                <span>Live Stock &amp; SKU Ledger</span>
              </button>
              <button
                id="tab-branches"
                type="button"
                role="tab"
                aria-selected={activeTab === 'branches'}
                aria-controls="panel-branches"
                onClick={() => setActiveTab('branches')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer',
                  activeTab === 'branches'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-navy-500 hover:text-navy-900'
                )}
              >
                <Store className="w-4 h-4" />
                <span>Branch Benchmarks</span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-navy-500 py-1">
              Active Scope: <strong className="text-navy-900">{currentBranch.name}</strong>
            </div>
          </div>

          {/* Tab 1: 7-Day Velocity Chart View */}
          {activeTab === 'chart' && (
            <div
              id="panel-chart"
              role="tabpanel"
              aria-labelledby="tab-chart"
              className="p-6 sm:p-8 space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-navy-950">
                    Daily Sales &amp; Margin Trajectory (Past 7 Days)
                  </h3>
                  <p className="text-xs text-navy-500">
                    Calculated locally per checkout transaction without sending unencrypted sales data to external clouds.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-brand-600 inline-block" />
                    <span className="text-navy-700">Daily Revenue (₹)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                    <span className="text-navy-700">Net Profit (₹)</span>
                  </div>
                </div>
              </div>

              {/* Bar Chart Visualization */}
              <div className="pt-4 pb-2">
                <div className="h-56 sm:h-64 flex items-end justify-between gap-2 sm:gap-4 border-b border-navy-200 pb-2">
                  {MOCK_DAILY_METRICS.map((metric) => {
                    const revenueHeight = Math.round((metric.revenue / maxDailyRevenue) * 100)
                    const profitHeight = Math.round((metric.profit / maxDailyRevenue) * 100)

                    return (
                      <div
                        key={metric.day}
                        className="flex-1 flex flex-col items-center justify-end h-full gap-1 group relative"
                      >
                        {/* Tooltip on Hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-16 z-20 pointer-events-none bg-navy-950 text-white rounded-lg px-2.5 py-1.5 text-[11px] font-mono whitespace-nowrap shadow-lg">
                          <div>{metric.day}: ₹{metric.revenue.toLocaleString('en-IN')} Rev</div>
                          <div className="text-emerald-400">+₹{metric.profit.toLocaleString('en-IN')} Profit ({metric.transactions} tx)</div>
                        </div>

                        {/* Bar Pair */}
                        <div className="w-full max-w-[48px] flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                          <motion.div
                            initial={shouldReduceMotion ? false : { height: 0 }}
                            animate={{ height: `${revenueHeight}%` }}
                            transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: 'easeOut' }}
                            className="w-1/2 bg-brand-600 rounded-t-sm hover:bg-brand-700 transition-colors shadow-2xs"
                          />
                          <motion.div
                            initial={shouldReduceMotion ? false : { height: 0 }}
                            animate={{ height: `${profitHeight}%` }}
                            transition={{ duration: shouldReduceMotion ? 0 : 0.4, delay: shouldReduceMotion ? 0 : 0.05, ease: 'easeOut' }}
                            className="w-1/2 bg-emerald-500 rounded-t-sm hover:bg-emerald-600 transition-colors shadow-2xs"
                          />
                        </div>

                        {/* Day Label */}
                        <span className="text-xs font-semibold text-navy-600 mt-2">
                          {metric.day}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Trajectory Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3.5 rounded-xl bg-navy-50/70 border border-navy-100">
                  <div className="text-navy-500">Peak Sales Volume</div>
                  <div className="font-mono font-bold text-navy-950 text-sm mt-0.5">Friday (₹23,400.00)</div>
                </div>
                <div className="p-3.5 rounded-xl bg-navy-50/70 border border-navy-100">
                  <div className="text-navy-500">Average Profit Rate</div>
                  <div className="font-mono font-bold text-emerald-600 text-sm mt-0.5">31.2% Consistent Margin</div>
                </div>
                <div className="p-3.5 rounded-xl bg-navy-50/70 border border-navy-100">
                  <div className="text-navy-500">Weekly Checkout Transactions</div>
                  <div className="font-mono font-bold text-navy-950 text-sm mt-0.5">1,621 Recorded Orders</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Live Stock & SKU Ledger View */}
          {activeTab === 'inventory' && (
            <div
              id="panel-inventory"
              role="tabpanel"
              aria-labelledby="tab-inventory"
              className="p-4 sm:p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-navy-950">
                    Product Catalog &amp; Reorder Health
                  </h3>
                  <p className="text-xs text-navy-500">
                    Live SKU records with automated margin calculation and low-stock threshold triggers.
                  </p>
                </div>
                <span className="text-xs font-mono text-navy-500">
                  Showing {filteredProducts.length} Items for {currentBranch.name}
                </span>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto rounded-xl border border-navy-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-navy-50/80 border-b border-navy-200 text-navy-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th scope="col" className="py-3 px-4">SKU / Item</th>
                      <th scope="col" className="py-3 px-4 hidden md:table-cell">Category</th>
                      <th scope="col" className="py-3 px-4 hidden sm:table-cell">Branch Location</th>
                      <th scope="col" className="py-3 px-4 text-right">In Stock</th>
                      <th scope="col" className="py-3 px-4 text-right">Cost Price</th>
                      <th scope="col" className="py-3 px-4 text-right">Retail Price</th>
                      <th scope="col" className="py-3 px-4 text-right">Margin %</th>
                      <th scope="col" className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100 text-navy-800">
                    {filteredProducts.map((prod) => (
                      <tr key={prod.sku} className="hover:bg-navy-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-navy-950">{prod.name}</div>
                          <div className="font-mono text-[10px] text-navy-500">{prod.sku}</div>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell text-navy-600">
                          {prod.category}
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell text-navy-600">
                          {prod.branch}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-navy-950">
                          {prod.stockQuantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-navy-500">
                          ₹{prod.costPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-navy-950">
                          ₹{prod.retailPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">
                          {prod.marginPercent}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          {prod.status === 'in_stock' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              In Stock
                            </span>
                          )}
                          {prod.status === 'low_stock' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Low Stock ({prod.reorderLevel})
                            </span>
                          )}
                          {prod.status === 'out_of_stock' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                              <XCircle className="w-3 h-3 text-red-600" />
                              Out of Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Branch Performance Comparison */}
          {activeTab === 'branches' && (
            <div
              id="panel-branches"
              role="tabpanel"
              aria-labelledby="tab-branches"
              className="p-6 sm:p-8 space-y-6"
            >
              <div>
                <h3 className="text-base font-bold text-navy-950">
                  Cross-Branch Revenue &amp; Efficiency Comparison
                </h3>
                <p className="text-xs text-navy-500">
                  Compare performance across individual retail locations and distribution hubs.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MOCK_BRANCHES.filter((b) => b.id !== 'all').map((branch) => (
                  <div
                    key={branch.id}
                    className="p-5 rounded-xl border border-navy-200 bg-white hover:border-brand-300 transition-all shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-navy-950 text-sm">{branch.name}</div>
                        <div className="text-xs text-navy-500">{branch.city} · {branch.locationType}</div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-brand-50 text-brand-700 border border-brand-200/60">
                        {branch.stockHealthPercent}% In-Stock
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-navy-100 text-xs">
                      <div>
                        <span className="text-[11px] text-navy-500">Gross Sales</span>
                        <div className="font-mono font-bold text-navy-950 mt-0.5">
                          ₹{branch.revenue.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] text-navy-500">Net Profit</span>
                        <div className="font-mono font-bold text-emerald-600 mt-0.5">
                          ₹{branch.profit.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] text-navy-500">Margin</span>
                        <div className="font-mono font-bold text-brand-600 mt-0.5">
                          {branch.marginPercent}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
