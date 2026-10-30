import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  BarChart3,
  TrendingUp,
  Layers,
  Calendar,
  Download,
  Store,
  Package,
  AlertTriangle,
  CreditCard,
  Clock,
  Info,
} from 'lucide-react'
import { PageHeader, Button, KpiStat, EmptyState } from '@/components/ui'
import {
  useFinancialSummary,
} from '@/hooks/useFinancialSummary'
import {
  getDateRangeFromPreset,
  type DatePreset,
  type DateRangeFilter,
} from '@/lib/services/financialCalculationService'
import { useBranches } from '@/hooks/useBranches'
import { useWorkspace } from '@/context/WorkspaceContext'
import { paiseToRupees, formatMoney } from '@/utils/money'
import { cn } from '@/utils/cn'

const CATEGORY_PALETTE = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#64748B']

export function AnalyticsPage() {
  const { workspaceMode, activeBranchId, setActiveBranchId } = useWorkspace()
  const { branches } = useBranches()

  // Date Range State
  const [datePreset, setDatePreset] = useState<DatePreset>('30d')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Compute active date range filter
  const activeDateFilter: DateRangeFilter = useMemo(() => {
    if (datePreset === 'custom') {
      return {
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
      }
    }
    return getDateRangeFromPreset(datePreset)
  }, [datePreset, customStartDate, customEndDate])

  // Active Tab
  const [activeTab, setActiveTab] = useState<'trends' | 'branches' | 'products'>('trends')

  // Branch Sorting State
  const [branchSortBy, setBranchSortBy] = useState<'sales' | 'profit' | 'margin' | 'orders' | 'returns'>('sales')

  // Slow moving observation window
  const [slowMovingWindowDays, setSlowMovingWindowDays] = useState<number>(30)

  // Fetch Authoritative Financial Data
  const {
    summary,
    branchPerformance,
    productRankings,
    slowMovingProducts,
    dailyTrends,
    categoryBreakdown,
    paymentMethodBreakdown,
    loading,
    error,
  } = useFinancialSummary(activeBranchId, activeDateFilter)

  // Filter slow moving products by chosen window days if needed
  const filteredSlowMoving = useMemo(() => {
    return slowMovingProducts.slice(0, 10)
  }, [slowMovingProducts])

  // Sorted branch performance
  const sortedBranches = useMemo(() => {
    const list = [...branchPerformance]
    list.sort((a, b) => {
      if (branchSortBy === 'sales') return b.netSalesPaise - a.netSalesPaise
      if (branchSortBy === 'profit') return b.netProfitPaise - a.netProfitPaise
      if (branchSortBy === 'margin') return b.netMarginPercent - a.netMarginPercent
      if (branchSortBy === 'orders') return b.orderCount - a.orderCount
      if (branchSortBy === 'returns') return b.returnRatePercent - a.returnRatePercent
      return 0
    })
    return list
  }, [branchPerformance, branchSortBy])

  // Chart data for daily trend (Net Sales vs COGS vs Expenses vs Net Profit)
  const chartDailyData = useMemo(() => {
    return dailyTrends.map((d) => ({
      date: d.displayDate,
      netSales: paiseToRupees(d.netSalesPaise),
      cogs: paiseToRupees(d.cogsPaise),
      expenses: paiseToRupees(d.expensesPaise),
      netProfit: paiseToRupees(d.netProfitPaise),
      margin: d.marginPercent,
    }))
  }, [dailyTrends])

  // Chart data for branch comparisons (top 8)
  const chartBranchData = useMemo(() => {
    return branchPerformance.slice(0, 8).map((b) => ({
      name: b.branchName.replace(' Central', '').replace(' Store', '').replace(' Hub', ''),
      fullName: b.branchName,
      netSales: paiseToRupees(b.netSalesPaise),
      netProfit: paiseToRupees(b.netProfitPaise),
      margin: b.netMarginPercent,
    }))
  }, [branchPerformance])

  // Chart data for category pie
  const chartCategoryData = useMemo(() => {
    return categoryBreakdown.map((c, idx) => ({
      name: c.name,
      value: paiseToRupees(c.revenuePaise),
      profit: paiseToRupees(c.profitPaise),
      units: c.unitsSold,
      share: c.percentageShare,
      color: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length],
    }))
  }, [categoryBreakdown])

  // Export Analytics to CSV
  const handleExportAnalyticsCSV = () => {
    if (!summary) return

    const periodLabel = datePreset.toUpperCase()
    let csv = `StorePoint Financial & Performance Analytics Statement\n`
    csv += `Workspace: ${workspaceMode.toUpperCase()} | Branch Filter: ${activeBranchId === 'all' ? 'Consolidated All' : activeBranchId} | Period: ${periodLabel}\n`
    if (activeDateFilter.startDate || activeDateFilter.endDate) {
      csv += `Date Range: ${activeDateFilter.startDate || 'Beginning'} to ${activeDateFilter.endDate || 'Today'}\n`
    }
    csv += `Generated At: ${new Date().toISOString()}\n\n`

    // Section 1: Executive KPIs
    csv += `EXECUTIVE FINANCIAL RECONCILIATION (INR)\n`
    csv += `Metric,Amount (INR)\n`
    csv += `Gross Merchandising Sales,${paiseToRupees(summary.grossSalesPaise).toFixed(2)}\n`
    csv += `Order & Line Discounts,-${paiseToRupees(summary.discountsPaise).toFixed(2)}\n`
    csv += `Customer Returns & Refunds,-${paiseToRupees(summary.returnsPaise).toFixed(2)}\n`
    csv += `Net Commercial Sales,${paiseToRupees(summary.netSalesPaise).toFixed(2)}\n`
    csv += `Cost of Goods Sold (COGS),-${paiseToRupees(summary.cogsPaise).toFixed(2)}\n`
    csv += `Gross Commercial Profit,${paiseToRupees(summary.grossProfitPaise).toFixed(2)}\n`
    csv += `Gross Profit Margin %,${summary.grossMarginPercent}%\n`
    csv += `Operating Overhead Expenses (OPEX),-${paiseToRupees(summary.operatingExpensesPaise).toFixed(2)}\n`
    csv += `Net Operating Profit,${paiseToRupees(summary.netOperatingProfitPaise).toFixed(2)}\n`
    csv += `Net Operating Margin %,${summary.netMarginPercent}%\n`
    csv += `Inventory Asset Valuation (At Cost),${paiseToRupees(summary.inventoryValuationPaise).toFixed(2)}\n`
    csv += `Average Transaction Value,${paiseToRupees(summary.averageTransactionValuePaise).toFixed(2)}\n`
    csv += `Completed Transactions Count,${summary.orderCount}\n`
    csv += `Net Units Sold,${summary.unitsSold}\n\n`

    // Section 2: Branch Comparison
    csv += `BRANCH PERFORMANCE BENCHMARKS\n`
    csv += `Branch Code,Branch Name,City,Net Sales (INR),Gross Profit (INR),Margin %,OPEX (INR),Net Operating Profit (INR),Orders,ATV (INR),Units Sold,Return Rate %\n`
    for (const b of branchPerformance) {
      csv += `"${b.branchCode}","${b.branchName}","${b.city}",${paiseToRupees(b.netSalesPaise).toFixed(2)},${paiseToRupees(b.grossProfitPaise).toFixed(2)},${b.grossMarginPercent}%,${paiseToRupees(b.operatingExpensesPaise).toFixed(2)},${paiseToRupees(b.netProfitPaise).toFixed(2)},${b.orderCount},${paiseToRupees(b.averageTransactionValuePaise).toFixed(2)},${b.unitsSold},${b.returnRatePercent}%\n`
    }
    csv += `\n`

    // Section 3: Product Rankings
    csv += `PRODUCT PERFORMANCE & VELOCITY (TOP PRODUCTS)\n`
    csv += `SKU,Product Name,Category,Net Units Sold,Returned Units,Revenue (INR),Gross Profit (INR),Margin %,Return Rate %\n`
    for (const p of productRankings.slice(0, 30)) {
      csv += `"${p.sku}","${p.name}","${p.category}",${p.netUnitsSold},${p.returnedUnits},${paiseToRupees(p.revenuePaise).toFixed(2)},${paiseToRupees(p.profitPaise).toFixed(2)},${p.marginPercent}%,${p.returnRatePercent}%\n`
    }

    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csv)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `storepoint_analytics_${workspaceMode}_${datePreset}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const activeBranchName =
    activeBranchId === 'all'
      ? 'All Locations (Consolidated Enterprise)'
      : branches.find((b) => b.id === activeBranchId)?.name || 'Active Location'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <BarChart3 className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
            <span>Analytics</span>
            <span className="text-navy-300">/</span>
            <span className="text-navy-700 normal-case tracking-normal">{activeBranchName}</span>
          </>
        }
        title="Financial analytics"
        description="Revenue, profit, expenses, and branch benchmarks for the selected date range."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAnalyticsCSV}
            disabled={loading || !summary}
            leftIcon={<Download className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Export CSV
          </Button>
        }
      />

      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-navy-200/80 shadow-card flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div
            className="flex items-center gap-1 bg-navy-100 p-1 rounded-lg text-xs overflow-x-auto"
            role="group"
            aria-label="Date range presets"
          >
            {(
              [
                ['today', 'Today'],
                ['yesterday', 'Yesterday'],
                ['7d', '7 days'],
                ['30d', '30 days'],
                ['month', 'This month'],
                ['prev_month', 'Prev month'],
                ['all', 'All time'],
                ['custom', 'Custom'],
              ] as [DatePreset, string][]
            ).map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDatePreset(preset)}
                className={cn(
                  'px-2.5 py-1.5 rounded-md font-semibold transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
                  datePreset === preset
                    ? 'bg-white text-brand-700 shadow-xs'
                    : 'text-navy-600 hover:text-navy-900'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0 text-xs">
            <Store className="w-3.5 h-3.5 text-navy-400" aria-hidden="true" />
            <label htmlFor="analytics-branch" className="font-semibold text-navy-600">
              Branch
            </label>
            <select
              id="analytics-branch"
              value={activeBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className="sp-control"
            >
              <option value="all">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-navy-100 text-xs text-navy-600">
            <Calendar className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
            <label className="font-semibold" htmlFor="analytics-from">
              From
            </label>
            <input
              id="analytics-from"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="sp-control !py-1 sp-num"
            />
            <label className="font-semibold" htmlFor="analytics-to">
              To
            </label>
            <input
              id="analytics-to"
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="sp-control !py-1 sp-num"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading analytics">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 sp-skeleton rounded-xl" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <KpiStat
              label="Gross sales"
              value={formatMoney(summary.grossSalesPaise)}
              hint="Before discounts"
            />
            <KpiStat
              label="Discounts"
              value={`−${formatMoney(summary.discountsPaise)}`}
              tone="warning"
              hint="Line & cart promos"
            />
            <KpiStat
              label="Refunds"
              value={`−${formatMoney(summary.returnsPaise)}`}
              tone="danger"
              hint="Netted from revenue"
            />
            <KpiStat
              label="Net sales"
              value={formatMoney(summary.netSalesPaise)}
              tone="brand"
              hint="Gross − discounts − refunds"
            />
            <KpiStat
              label="COGS"
              value={`−${formatMoney(summary.cogsPaise)}`}
              tone="danger"
              hint="Cost of units sold"
            />
            <KpiStat
              label="Gross profit"
              value={formatMoney(summary.grossProfitPaise)}
              hint={`${summary.grossMarginPercent}% gross margin`}
            />
            <KpiStat
              label="Operating expenses"
              value={`−${formatMoney(summary.operatingExpensesPaise)}`}
              tone="muted"
              hint="Rent, payroll, utilities"
            />
            <KpiStat
              label="Net operating profit"
              value={`${summary.netOperatingProfitPaise >= 0 ? '+' : ''}${formatMoney(summary.netOperatingProfitPaise)}`}
              tone={summary.netOperatingProfitPaise >= 0 ? 'success' : 'danger'}
              hint={`${summary.netMarginPercent}% net margin`}
            />
            <KpiStat
              label="Inventory at cost"
              value={formatMoney(summary.inventoryValuationPaise)}
              hint={`${summary.totalSkus} active SKUs`}
            />
            <KpiStat
              label="Avg transaction"
              value={formatMoney(summary.averageTransactionValuePaise)}
              tone="brand"
              hint="Net per checkout"
            />
            <KpiStat
              label="Transactions"
              value={summary.orderCount}
              className="col-span-1"
              hint={`${summary.unitsSold} units sold`}
            />
            <KpiStat label="Units sold" value={summary.unitsSold} hint="Net of returns" />
          </div>

          {/* Section Navigation Tabs */}
          <div className="border-b border-slate-200 flex items-center gap-2 pt-2 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('trends')}
              className={cn(
                'px-4 py-2 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5',
                activeTab === 'trends'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Trends & Cost Trajectory</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('branches')}
              className={cn(
                'px-4 py-2 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5',
                activeTab === 'branches'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              <Store className="w-4 h-4" />
              <span>Branch Comparison ({branchPerformance.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={cn(
                'px-4 py-2 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5',
                activeTab === 'products'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              <Package className="w-4 h-4" />
              <span>Product Velocity & Return Rates</span>
            </button>
          </div>

          {/* Tab 1: Trends & Cost Trajectory */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              {/* Daily Sales vs COGS vs Profit Area Chart */}
              <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      Revenue, Cost, and Profit Trajectory
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Daily tracking of net sales against cost of goods sold and net retained operating income.
                    </p>
                  </div>
                  <div className="font-mono text-xs text-slate-500">
                    Net Margin: <strong className="text-emerald-600">{summary.netMarginPercent}%</strong>
                  </div>
                </div>

                <div className="h-72 w-full">
                  {chartDailyData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No daily records found in selected window.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartDailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="areaNetSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="areaProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#64748B' }}
                          tickFormatter={(v: number) => `₹${v >= 100000 ? `${(v / 100000).toFixed(1)}L` : `${(v / 1000).toFixed(0)}k`}`}
                        />
                        <Tooltip
                          formatter={(value: any, name: any) => [
                            `₹${Number(value).toLocaleString('en-IN')}`,
                            name,
                          ]}
                          contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Area
                          type="monotone"
                          dataKey="netSales"
                          name="Net Sales"
                          stroke="#2563EB"
                          strokeWidth={2}
                          fill="url(#areaNetSales)"
                        />
                        <Area
                          type="monotone"
                          dataKey="cogs"
                          name="COGS"
                          stroke="#F59E0B"
                          strokeWidth={1.5}
                          fill="transparent"
                        />
                        <Area
                          type="monotone"
                          dataKey="netProfit"
                          name="Net Operating Profit"
                          stroke="#10B981"
                          strokeWidth={2}
                          fill="url(#areaProfit)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Two-Column Breakdown: Categories & Payment Methods */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Product Category Distribution */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      Sales by Merchandise Category
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Persisted sales distribution and gross profit yield per category.
                    </p>
                  </div>

                  <div className="h-64 w-full">
                    {chartCategoryData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No category transactions found in selected period.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartCategoryData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={45}
                            paddingAngle={3}
                          >
                            {chartCategoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: any, name: any, item: any) => [
                              `₹${Number(v).toLocaleString('en-IN')} (${item.payload.share}%)`,
                              name,
                            ]}
                            contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Payment Tender Breakdown */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      Payment Tender Settlement
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Distribution of cash, UPI, cards, and contactless store payments.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {paymentMethodBreakdown.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        No payment records found in this window.
                      </div>
                    ) : (
                      paymentMethodBreakdown.map((pm) => (
                        <div key={pm.method} className="space-y-1 text-xs">
                          <div className="flex items-center justify-between font-medium">
                            <span className="text-slate-700">{pm.method}</span>
                            <span className="font-mono font-bold text-slate-900">
                              {formatMoney(pm.revenuePaise)} ({pm.percentageShare}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${pm.percentageShare}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono text-right">
                            {pm.transactionCount} transactions
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Branch Comparison Benchmarks */}
          {activeTab === 'branches' && (
            <div className="space-y-6">
              {/* Branch Comparative Bar Chart */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Store className="w-4 h-4 text-blue-600" />
                    Branch Net Sales & Net Operating Profit Benchmarks
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Direct comparison of retail location yields for the active period.
                  </p>
                </div>

                <div className="h-64 w-full">
                  {chartBranchData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No branch performance records available.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartBranchData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#64748B' }}
                          tickFormatter={(v: number) => `₹${v >= 100000 ? `${(v / 100000).toFixed(1)}L` : `${(v / 1000).toFixed(0)}k`}`}
                        />
                        <Tooltip
                          formatter={(val: any, name: any) => [
                            `₹${Number(val).toLocaleString('en-IN')}`,
                            name,
                          ]}
                          contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Bar dataKey="netSales" name="Net Sales" fill="#2563EB" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="netProfit" name="Net Operating Profit" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Sortable Branch Comparison Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      Retail Locations League Table
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      All metrics strictly scoped to the active date filter ({datePreset.toUpperCase()}).
                    </p>
                  </div>

                  {/* Sorting controls */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-600">Sort By:</span>
                    <select
                      value={branchSortBy}
                      onChange={(e) => setBranchSortBy(e.target.value as any)}
                      className="px-2.5 py-1 border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
                    >
                      <option value="sales">Net Sales (High to Low)</option>
                      <option value="profit">Net Profit (High to Low)</option>
                      <option value="margin">Margin % (High to Low)</option>
                      <option value="orders">Orders Count</option>
                      <option value="returns">Return Rate %</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4 text-right">Net Sales (₹)</th>
                        <th className="py-3 px-4 text-right">Gross Profit</th>
                        <th className="py-3 px-4 text-right">OPEX</th>
                        <th className="py-3 px-4 text-right">Net Profit</th>
                        <th className="py-3 px-4 text-right">Margin</th>
                        <th className="py-3 px-4 text-center">Orders</th>
                        <th className="py-3 px-4 text-right">ATV (₹)</th>
                        <th className="py-3 px-4 text-center">Return %</th>
                        <th className="py-3 px-4 text-right">Inventory Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedBranches.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                            No branches found for this workspace.
                          </td>
                        </tr>
                      ) : (
                        sortedBranches.map((b) => (
                          <tr key={b.branchId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 block">{b.branchName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {b.branchCode} • {b.city}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              {formatMoney(b.netSalesPaise)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-700">
                              {formatMoney(b.grossProfitPaise)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-rose-600">
                              -{formatMoney(b.operatingExpensesPaise)}
                            </td>
                            <td
                              className={cn(
                                'py-3 px-4 text-right font-mono font-bold',
                                b.netProfitPaise >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              )}
                            >
                              {b.netProfitPaise >= 0 ? '+' : ''}
                              {formatMoney(b.netProfitPaise)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-blue-600">
                              {b.netMarginPercent}%
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-slate-700">
                              {b.orderCount}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-600">
                              {formatMoney(b.averageTransactionValuePaise)}
                            </td>
                            <td className="py-3 px-4 text-center font-mono">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-semibold',
                                  b.returnRatePercent > 5
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-emerald-50 text-emerald-700'
                                )}
                              >
                                {b.returnRatePercent}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-700">
                              {formatMoney(b.inventoryValuationPaise)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footnote on period equality */}
                <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 text-slate-500 text-[11px] flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Performance metrics reflect identical date range boundaries across all locations. Newly opened branches or temporary shutdowns should be benchmarked with consideration to their active operating days.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Product Performance & Velocity */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Product Leaderboard Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      Top Merchandise by Net Revenue & Profit Yield
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Units sold, commercial margin spread, and return rates for active catalog items.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-slate-500">
                    {productRankings.length} Products Tracked
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">Item & SKU</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-center">Units Sold</th>
                        <th className="py-3 px-4 text-right">Net Revenue (₹)</th>
                        <th className="py-3 px-4 text-right">COGS (₹)</th>
                        <th className="py-3 px-4 text-right">Gross Profit (₹)</th>
                        <th className="py-3 px-4 text-right">Margin %</th>
                        <th className="py-3 px-4 text-center">Return Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productRankings.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                            No product sales recorded in this period.
                          </td>
                        </tr>
                      ) : (
                        productRankings.slice(0, 15).map((p) => (
                          <tr key={p.productId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-900 block">{p.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{p.category}</td>
                            <td className="py-3 px-4 text-center font-mono font-medium">
                              {p.netUnitsSold}
                              {p.returnedUnits > 0 && (
                                <span className="text-[10px] text-rose-500 block">
                                  ({p.returnedUnits} ret)
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              {formatMoney(p.revenuePaise)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-600">
                              {formatMoney(p.cogsPaise)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                              +{formatMoney(p.profitPaise)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-blue-600">
                              {p.marginPercent}%
                            </td>
                            <td className="py-3 px-4 text-center font-mono">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-semibold',
                                  p.returnRatePercent > 5
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-slate-100 text-slate-600'
                                )}
                              >
                                {p.returnRatePercent}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Slow-Moving Stock & Capital Tied Up */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        Slow-Moving Products & Capital Allocation
                      </h3>
                      <p className="text-xs text-slate-500">
                        Products with available shelf stock but low turnover in the selected window.
                      </p>
                    </div>
                  </div>

                  {/* Window Selector */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-slate-600">Observation Window:</span>
                    {[14, 30, 60, 90].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setSlowMovingWindowDays(days)}
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors',
                          slowMovingWindowDays === days
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">Item & SKU</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-center">Shelf Stock</th>
                        <th className="py-3 px-4 text-right">Unit Wholesale Cost</th>
                        <th className="py-3 px-4 text-right">Capital Tied Up (₹)</th>
                        <th className="py-3 px-4 text-center">Units Sold ({slowMovingWindowDays}d)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSlowMoving.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                            No slow-moving inventory detected; stock velocity is healthy across items.
                          </td>
                        </tr>
                      ) : (
                        filteredSlowMoving.map((p) => (
                          <tr key={p.productId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-900 block">{p.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{p.category}</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-amber-700">
                              {p.currentStock} units
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-600">
                              {formatMoney(p.unitCostPaise)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              {formatMoney(p.capitalTiedUpPaise)}
                            </td>
                            <td className="py-3 px-4 text-center font-mono">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800">
                                {p.unitsSoldInWindow} sold
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Analytical Limitations Disclaimer */}
                <div className="p-3.5 bg-amber-50/50 border-t border-amber-200/60 text-amber-900 text-[11px] flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Inventory Velocity Analysis Note:</strong> Slow-moving status indicates low observed sales volume within the selected {slowMovingWindowDays}-day window. It does not measure seasonal demand or recent inventory restocks. Discontinuation decisions should consider supplier minimum orders and core catalog completeness.
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<BarChart3 className="w-5 h-5" aria-hidden="true" />}
          title="Insufficient data for this range"
          description="Record sales, expenses, or inventory activity, then adjust the date or branch filter."
        />
      )}

      {/* Compliance & Methodology Notice */}
      <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
        <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div>
            <strong className="text-slate-800">Persisted Analytics Engine:</strong> All metrics, time series trends, and branch performance rankings are computed deterministically from on-device IndexedDB transactions.
          </div>
          <div className="text-slate-500">
            Monetary figures are stored as integer paise to prevent floating-point rounding errors and formatted with Indian Rupee (INR / ₹) standard notation.
          </div>
        </div>
      </div>
    </div>
  )
}
