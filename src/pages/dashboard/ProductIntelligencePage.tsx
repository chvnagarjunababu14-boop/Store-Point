import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Package,
  Layers,
  Clock,
  Store,
  Calendar,
  Info,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Percent,
  Search,
  ShoppingCart,
  Boxes,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useBranches } from '@/hooks/useBranches'
import { useProducts } from '@/hooks/useProducts'
import {
  useProductIntelligence,
  type ProductIntelligenceFilters,
} from '@/hooks/useProductIntelligence'
import { formatINR } from '@/utils/money'
import { PageHeader, KpiStat } from '@/components/ui'

type IntelligenceTab = 'replenishment' | 'performance' | 'slow_moving' | 'alerts'

export function ProductIntelligencePage() {
  const { workspaceMode, activeBranchId: contextBranchId } = useWorkspace()
  const { branches } = useBranches()
  const { products } = useProducts()

  // Filters State
  const [activeTab, setActiveTab] = useState<IntelligenceTab>('replenishment')
  const [selectedBranchId, setSelectedBranchId] = useState<string>(contextBranchId || 'all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [observationDays, setObservationDays] = useState<number>(30)
  const [targetCoverageDays, setTargetCoverageDays] = useState<number>(30)
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [includeDismissed, setIncludeDismissed] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Build filter options
  const filterParams: ProductIntelligenceFilters = useMemo(
    () => ({
      branchId: selectedBranchId === 'all' ? undefined : selectedBranchId,
      observationDays,
      targetCoverageDays,
      includeDismissed,
    }),
    [selectedBranchId, observationDays, targetCoverageDays, includeDismissed]
  )

  const {
    replenishment,
    slowMoving,
    alerts,
    performanceRankings,
    summaryCounts,
    loading,
    error,
    dismissRecommendation,
    restoreRecommendation,
  } = useProductIntelligence(filterParams)

  // Unique product categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const p of products) {
      if (p.category) set.add(p.category)
    }
    return Array.from(set).sort()
  }, [products])

  // Filtered views by category, search query, and severity
  const filteredReplenishment = useMemo(() => {
    return replenishment.filter((r) => {
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false
      if (severityFilter !== 'all' && r.priority !== severityFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return r.productName.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q)
      }
      return true
    })
  }, [replenishment, selectedCategory, severityFilter, searchQuery])

  const filteredSlowMoving = useMemo(() => {
    return slowMoving.filter((s) => {
      if (selectedCategory !== 'all' && s.category !== selectedCategory) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return s.productName.toLowerCase().includes(q) || s.sku.toLowerCase().includes(q)
      }
      return true
    })
  }, [slowMoving, selectedCategory, searchQuery])

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (selectedCategory !== 'all' && a.category && a.category !== selectedCategory) return false
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          (a.productName && a.productName.toLowerCase().includes(q)) ||
          (a.sku && a.sku.toLowerCase().includes(q)) ||
          a.rootCause.toLowerCase().includes(q) ||
          a.evidenceMetric.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [alerts, selectedCategory, severityFilter, searchQuery])

  const filteredPerformance = useMemo(() => {
    return performanceRankings.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return p.productName.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      }
      return true
    })
  }, [performanceRankings, selectedCategory, searchQuery])

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow={
          <>
            <Sparkles className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
            <span>Intelligence</span>
            {workspaceMode === 'demo' && (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold normal-case tracking-normal">
                Demo
              </span>
            )}
          </>
        }
        title="Product intelligence"
        description="Replenishment triggers, velocity rankings, slow movers, and profitability alerts from your own records."
        actions={
          <button
            type="button"
            onClick={() => setIncludeDismissed(!includeDismissed)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer',
              includeDismissed
                ? 'bg-brand-50 text-brand-700 border-brand-200 shadow-xs'
                : 'bg-white text-navy-600 border-navy-200 hover:bg-navy-50'
            )}
            title="Toggle dismissed recommendations"
          >
            {includeDismissed ? (
              <EyeOff className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-navy-400" aria-hidden="true" />
            )}
            <span>{includeDismissed ? 'Showing dismissed' : 'Show dismissed'}</span>
          </button>
        }
      />

      {/* ── Analytical Disclaimer Banner ── */}
      <div className="p-3.5 rounded-xl bg-brand-50/60 border border-brand-100 text-xs text-brand-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-brand-950">Deterministic Evidence Policy:</span>{' '}
          Recommendations do not automatically alter stock or place orders. All figures represent factual calculations from historical sales, returns, and catalog costs. Recommendations indicate trends rather than absolute guarantees.
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiStat
          label="Action items"
          value={loading ? '…' : summaryCounts.totalAlerts}
          hint="Across all categories"
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
        />
        <KpiStat
          label="Critical risks"
          value={loading ? '…' : summaryCounts.criticalAlerts}
          tone="danger"
          hint="Stockouts or loss per unit"
          icon={<ShieldAlert className="w-3.5 h-3.5 text-red-500" />}
        />
        <KpiStat
          label="Needs reorder"
          value={loading ? '…' : summaryCounts.replenishmentNeeded}
          tone="warning"
          hint="At or below reorder point"
          icon={<Package className="w-3.5 h-3.5 text-amber-500" />}
        />
        <KpiStat
          label="Slow-moving value"
          value={loading ? '…' : formatINR(summaryCounts.capitalTiedUpPaise)}
          tone="brand"
          hint={`${summaryCounts.slowMovingCount} stagnant SKUs`}
          icon={<Layers className="w-3.5 h-3.5 text-brand-500" />}
        />
        <KpiStat
          label="Margin risks"
          value={loading ? '…' : summaryCounts.marginAndPriceRisks}
          hint="Below cost or thin margin"
          icon={<Percent className="w-3.5 h-3.5 text-brand-600" />}
        />
      </div>

      <div className="bg-white rounded-xl border border-navy-200/80 p-3.5 sm:p-4 shadow-card space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-navy-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search product or SKU…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search recommendations"
              className="sp-control w-full pl-9"
            />
          </div>

          {/* Configuration Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Branch Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <label htmlFor="branch-select" className="text-slate-500 text-[11px]">Branch:</label>
              <select
                id="branch-select"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">Consolidated (All Branches)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <Boxes className="w-3.5 h-3.5 text-slate-400" />
              <label htmlFor="cat-select" className="text-slate-500 text-[11px]">Category:</label>
              <select
                id="cat-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Observation Window Days */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <label htmlFor="window-select" className="text-slate-500 text-[11px]">Window:</label>
              <select
                id="window-select"
                value={observationDays}
                onChange={(e) => setObservationDays(Number(e.target.value))}
                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value={14}>14 Days</option>
                <option value={30}>30 Days (Standard)</option>
                <option value={60}>60 Days</option>
                <option value={90}>90 Days (Quarter)</option>
              </select>
            </div>

            {/* Target Stock Coverage Days */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <label htmlFor="coverage-select" className="text-slate-500 text-[11px]">Target Coverage:</label>
              <select
                id="coverage-select"
                value={targetCoverageDays}
                onChange={(e) => setTargetCoverageDays(Number(e.target.value))}
                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value={14}>14 Days</option>
                <option value={30}>30 Days (Standard)</option>
                <option value={45}>45 Days</option>
                <option value={60}>60 Days</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <label htmlFor="sev-select" className="text-slate-500 text-[11px]">Severity:</label>
              <select
                id="sev-select"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">All Levels</option>
                <option value="critical">Critical Only</option>
                <option value="high">High Only</option>
                <option value="warning">Warnings</option>
                <option value="info">Informational</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Tab Navigation ── */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-sm font-semibold" aria-label="Product Intelligence Views">
          <button
            type="button"
            onClick={() => setActiveTab('replenishment')}
            className={cn(
              'pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2',
              activeTab === 'replenishment'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <Package className="w-4 h-4" />
            <span>Replenishment Triggers</span>
            {filteredReplenishment.length > 0 && (
              <span className="bg-brand-100 text-brand-800 text-[11px] px-2 py-0.2 rounded-full font-bold">
                {filteredReplenishment.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={cn(
              'pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2',
              activeTab === 'performance'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Performance Matrix</span>
            <span className="bg-slate-100 text-slate-700 text-[11px] px-2 py-0.2 rounded-full font-bold">
              {filteredPerformance.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('slow_moving')}
            className={cn(
              'pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2',
              activeTab === 'slow_moving'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <Layers className="w-4 h-4" />
            <span>Slow-Moving & Stagnant Stock</span>
            {filteredSlowMoving.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-[11px] px-2 py-0.2 rounded-full font-bold">
                {filteredSlowMoving.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={cn(
              'pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2',
              activeTab === 'alerts'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Profitability & Return Alerts</span>
            {filteredAlerts.length > 0 && (
              <span className="bg-rose-100 text-rose-800 text-[11px] px-2 py-0.2 rounded-full font-bold">
                {filteredAlerts.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── TAB 1: Replenishment Recommendations ── */}
      {activeTab === 'replenishment' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {filteredReplenishment.length} replenishment suggestion{filteredReplenishment.length === 1 ? '' : 's'} based on {observationDays}-day velocity and {targetCoverageDays}-day target coverage.
            </span>
          </div>

          {filteredReplenishment.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900">All Products Safely Stocked</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                No active products are below their safety reorder threshold or depleting rapidly in the selected observation window.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReplenishment.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'bg-white rounded-xl border p-5 shadow-2xs space-y-4 transition-all',
                    item.priority === 'critical'
                      ? 'border-rose-300 ring-1 ring-rose-200/60'
                      : item.priority === 'high'
                      ? 'border-amber-300'
                      : 'border-slate-200'
                  )}
                >
                  {/* Top Bar: Title, Priority, Branch */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">{item.sku}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {item.category}
                        </span>
                        {item.confidence === 'insufficient_data' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                            Limited History
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mt-1">{item.productName}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.branchName}</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={cn(
                          'text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider',
                          item.priority === 'critical'
                            ? 'bg-rose-100 text-rose-800'
                            : item.priority === 'high'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        )}
                      >
                        {item.priority}
                      </span>
                      {item.isDismissed && (
                        <span className="text-[10px] text-slate-400 font-medium italic">Dismissed</span>
                      )}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-4 gap-2 bg-slate-50/80 p-3 rounded-lg border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">On Hand</span>
                      <span className={cn('font-mono font-bold text-sm', item.currentStock === 0 ? 'text-rose-600' : 'text-slate-800')}>
                        {item.currentStock}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Reorder At</span>
                      <span className="font-mono font-semibold text-slate-700 text-sm">{item.reorderPoint}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Daily Velocity</span>
                      <span className="font-mono font-semibold text-slate-700 text-sm">{item.salesVelocityPerDay} / day</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Days Left</span>
                      <span
                        className={cn(
                          'font-mono font-bold text-sm',
                          item.estimatedDaysRemaining !== null && item.estimatedDaysRemaining <= 3
                            ? 'text-rose-600'
                            : 'text-slate-800'
                        )}
                      >
                        {item.estimatedDaysRemaining !== null ? `${item.estimatedDaysRemaining}d` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Evidence & Logic Explanation */}
                  <div className="space-y-1.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-brand-50/40 border border-brand-100/60 text-brand-950">
                      <span className="font-bold">Calculated Trigger: </span>
                      <span>{item.evidence}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal italic">
                      {item.assumptions}
                    </p>
                  </div>

                  {/* Recommended Action & Cost */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Suggested Reorder:</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-black font-mono text-brand-700">
                          +{item.suggestedReorderQuantity} units
                        </span>
                        <span className="text-xs text-slate-400">
                          (Est. Cost: <span className="font-semibold text-slate-700">{formatINR(item.estimatedOrderCostPaise)}</span>)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.isDismissed ? (
                        <button
                          type="button"
                          onClick={() => restoreRecommendation(item.id)}
                          className="px-3 py-1.5 text-xs text-brand-600 hover:text-brand-800 font-semibold cursor-pointer"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => dismissRecommendation(item.id)}
                          className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Dismiss
                        </button>
                      )}

                      <Link
                        to="/app/inventory"
                        className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Create PO</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Performance Matrix & Velocity Rankings ── */}
      {activeTab === 'performance' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Multi-Dimensional Product Performance & Margin Retainage
              </h3>
              <p className="text-xs text-slate-500">
                Comparing revenue volume rank vs. gross profit contribution rank over {observationDays} days.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Product / SKU</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Net Units</th>
                  <th className="py-2.5 px-3 text-right">Velocity</th>
                  <th className="py-2.5 px-3 text-right">Net Revenue</th>
                  <th className="py-2.5 px-3 text-right">Gross Profit</th>
                  <th className="py-2.5 px-3 text-right">Margin %</th>
                  <th className="py-2.5 px-3 text-right">Return %</th>
                  <th className="py-2.5 px-3 text-center">Rev # / GP #</th>
                  <th className="py-2.5 px-3 text-center">Performance Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPerformance.map((item) => (
                  <tr key={item.productId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{item.productName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{item.sku}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{item.category}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                      {item.netUnitsSold}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {item.salesVelocityPerDay}/d
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(item.netRevenuePaise)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                      {formatINR(item.grossProfitPaise)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold">
                      <span className={cn(item.grossMarginPercent < 15 ? 'text-amber-600' : 'text-slate-800')}>
                        {item.grossMarginPercent}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <span className={cn(item.returnRatePercent >= 20 ? 'text-rose-600 font-bold' : 'text-slate-500')}>
                        {item.returnRatePercent}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600">
                      #{item.revenueRank} / #{item.profitRank}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full inline-block',
                          item.performanceTier === 'Star'
                            ? 'bg-amber-100 text-amber-800'
                            : item.performanceTier === 'Cash Cow'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.performanceTier === 'Opportunity'
                            ? 'bg-brand-100 text-brand-800'
                            : item.performanceTier === 'New / Low Data'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {item.performanceTier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: Slow-Moving & Stagnant Stock ── */}
      {activeTab === 'slow_moving' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-blue-950">Analytical Limitation Notice:</span> Stagnant stock labels reflect low units sold (&le; 2 units) over the {observationDays}-day window with stock on hand. Low recent volume does not necessarily mean a product is obsolete—always check for seasonality, recent restocks, or catalog changes before taking action.
            </div>
          </div>

          {filteredSlowMoving.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900">Optimal Stock Turnover</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                No active inventory records are stagnant or tying up excess capital beyond normal velocity thresholds in the last {observationDays} days.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSlowMoving.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">{item.sku}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {item.category}
                        </span>
                        {item.confidence === 'insufficient_data' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                            Recently Added
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mt-1">{item.productName}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.branchName}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Capital Tied Up</span>
                      <span className="text-base font-mono font-bold text-blue-600">
                        {formatINR(item.capitalTiedUpPaise)}
                      </span>
                    </div>
                  </div>

                  {/* Stock and Sales Evidence Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Current Stock</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">{item.currentStock} pcs</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Sold in {item.observationDays}d</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">{item.unitsSoldInWindow} pcs</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Last Sale Recorded</span>
                      <span className="font-mono text-slate-600 text-xs">
                        {item.lastSaleDate || 'No sales on record'}
                      </span>
                    </div>
                  </div>

                  {/* Limitations Disclaimer */}
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-md">
                    {item.limitations}
                  </p>

                  {/* Suggested Remedies */}
                  <div className="space-y-1.5 text-xs">
                    <span className="font-bold text-slate-700 block">Suggested Remediation:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px]">
                      {item.potentialRemedies.map((remedy, idx) => (
                        <li key={idx}>{remedy}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Footer Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-400 text-[11px]">Reorder Threshold: {item.reorderPoint}</span>
                    <div className="flex items-center gap-2">
                      {item.isDismissed ? (
                        <button
                          type="button"
                          onClick={() => restoreRecommendation(item.id)}
                          className="px-3 py-1 text-brand-600 hover:text-brand-800 font-semibold cursor-pointer"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => dismissRecommendation(item.id)}
                          className="px-2.5 py-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Dismiss
                        </button>
                      )}
                      <Link
                        to="/app/products"
                        className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-1"
                      >
                        <span>View Product</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Profitability & Return Alerts ── */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {filteredAlerts.length} explainable profitability, pricing, and return alerts.
            </span>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900">Zero Critical Profitability Alerts</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                No catalog items are priced below cost, no negative margins were incurred, and no statistically significant high-return spikes were detected.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'bg-white rounded-xl border p-5 shadow-2xs space-y-3.5',
                    alert.severity === 'critical'
                      ? 'border-rose-300 ring-1 ring-rose-200/60'
                      : alert.severity === 'warning'
                      ? 'border-amber-300'
                      : 'border-blue-200'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                            alert.severity === 'critical'
                              ? 'bg-rose-100 text-rose-800'
                              : alert.severity === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          )}
                        >
                          {alert.severity}
                        </span>
                        {alert.category && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                            {alert.category}
                          </span>
                        )}
                        {alert.sku && (
                          <span className="font-mono text-xs font-semibold text-slate-500">{alert.sku}</span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-slate-900 mt-1.5">
                        {alert.productName || alert.branchName || 'Operational Alert'}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black font-mono text-rose-600 block">
                        {alert.evidenceMetric}
                      </span>
                    </div>
                  </div>

                  {/* Evidence Box */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                    <div>
                      <span className="font-bold text-slate-700">Observed Evidence: </span>
                      <span className="text-slate-600">{alert.evidenceDetails}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Root Cause: </span>
                      <span className="text-slate-600">{alert.rootCause}</span>
                    </div>
                  </div>

                  {/* Suggested Action */}
                  <div className="p-3 rounded-lg bg-brand-50/50 border border-brand-100 text-xs text-brand-950 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Recommended Remedy: </span>
                      <span>{alert.suggestedRemedy}</span>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-400 text-[11px]">
                      {alert.observationDays ? `${alert.observationDays}-Day Evidence Window` : 'Catalog Snapshot'}
                    </span>

                    <div className="flex items-center gap-2">
                      {alert.isDismissed ? (
                        <button
                          type="button"
                          onClick={() => restoreRecommendation(alert.id)}
                          className="px-3 py-1 text-brand-600 hover:text-brand-800 font-semibold cursor-pointer"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => dismissRecommendation(alert.id)}
                          className="px-2.5 py-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Dismiss
                        </button>
                      )}

                      {alert.productId && (
                        <Link
                          to="/app/products"
                          className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1 transition-colors"
                        >
                          <span>Adjust Catalog</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
