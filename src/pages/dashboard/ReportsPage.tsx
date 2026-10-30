import { useMemo } from 'react'
import {
  FileText,
  Download,
  IndianRupee,
  Package,
  Layers,
  Store,
  Calendar,
  ShoppingCart,
  Boxes,
  Truck,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  Info,
  ShieldCheck,
  Percent,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useBranches } from '@/hooks/useBranches'
import { useProducts } from '@/hooks/useProducts'
import { useReports } from '@/hooks/useReports'
import type { ReportType } from '@/lib/services/reportService'
import type { DatePreset } from '@/lib/services/financialCalculationService'
import {
  PageHeader,
  EmptyState,
  StatusBadge,
  KpiStat,
  FilterBar,
  FilterField,
  Badge,
  Button,
} from '@/components/ui'

interface ReportNavItem {
  type: ReportType
  label: string
  group: 'Financial & Sales' | 'Inventory & Logistics' | 'Branch & Operations'
  icon: typeof FileText
  description: string
}

const REPORT_NAV_ITEMS: ReportNavItem[] = [
  // Financial & Sales
  {
    type: 'sales_summary',
    label: 'Sales & Transactions',
    group: 'Financial & Sales',
    icon: ShoppingCart,
    description: 'Chronological sales register with line items, tender, and discounts.',
  },
  {
    type: 'returns_refunds',
    label: 'Returns & Refunds',
    group: 'Financial & Sales',
    icon: RotateCcw,
    description: 'Customer returns, refund tenders, restock status, and reason codes.',
  },
  {
    type: 'product_profitability',
    label: 'Product Profitability',
    group: 'Financial & Sales',
    icon: Percent,
    description: 'Net sales, cost of goods, gross profit dollars, and margin percentages.',
  },
  {
    type: 'tax_summary',
    label: 'Tax Summary (Non-Statutory)',
    group: 'Financial & Sales',
    icon: IndianRupee,
    description: 'Factual sales tax collections and return adjustments recorded at POS.',
  },

  // Inventory & Logistics
  {
    type: 'inventory_valuation',
    label: 'Inventory on Hand & Valuation',
    group: 'Inventory & Logistics',
    icon: Package,
    description: 'Current physical balances valued at periodic weighted-average cost.',
  },
  {
    type: 'stock_movements',
    label: 'Stock Movements & Adjustments',
    group: 'Inventory & Logistics',
    icon: Layers,
    description: 'Inbound receipts, outbound sales, returns, transfers, and shrinkage write-offs.',
  },
  {
    type: 'stock_transfers',
    label: 'Inter-Branch Stock Transfers',
    group: 'Inventory & Logistics',
    icon: Truck,
    description: 'Stock relocated between locations, in-transit manifests, and receiving receipts.',
  },
  {
    type: 'purchases_receiving',
    label: 'Purchase Orders & Receiving',
    group: 'Inventory & Logistics',
    icon: Boxes,
    description: 'Supplier orders, inbound PO receipts, and procurement expenditure.',
  },

  // Branch & Operations
  {
    type: 'operating_expenses',
    label: 'Operating Expenses (OPEX)',
    group: 'Branch & Operations',
    icon: FileText,
    description: 'Overhead register for rent, payroll, utilities, logistics, and maintenance.',
  },
  {
    type: 'branch_performance',
    label: 'Branch Comparison League',
    group: 'Branch & Operations',
    icon: Store,
    description: 'Comparative performance ranking net revenue, profit, overhead, and ATV.',
  },
]

export function ReportsPage() {
  const { branches } = useBranches()
  const { products } = useProducts()

  const {
    reportType,
    setReportType,
    selectedBranchId,
    setSelectedBranchId,
    datePreset,
    setDatePreset,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    reportData,
    loading,
    error,
    refresh,
    exportCSV,
  } = useReports()

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const p of products) {
      if (p.category) set.add(p.category)
    }
    return Array.from(set).sort()
  }, [products])

  const activeNavItem = REPORT_NAV_ITEMS.find((item) => item.type === reportType) || REPORT_NAV_ITEMS[0]

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow={
          <>
            <FileText className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
            <span>Reports</span>
          </>
        }
        title="Reports & exports"
        description="Operational registers, valuations, and CSV exports generated from your local database."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={refresh}
              aria-label="Refresh active report"
              title="Refresh active report"
            >
              <RefreshCw
                className={cn('w-4 h-4', loading && 'animate-spin text-brand-600')}
                aria-hidden="true"
              />
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={exportCSV}
              disabled={loading || !reportData || reportData.rows.length === 0}
              leftIcon={<Download className="w-4 h-4" aria-hidden="true" />}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* ── Main Layout: Sidebar Navigation + Report Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Report Navigation Sidebar */}
        <nav
          className="bg-white rounded-xl border border-navy-200/80 p-4 shadow-card space-y-5 lg:sticky lg:top-4"
          aria-label="Report types"
        >
          <div className="text-[10px] font-bold text-navy-400 uppercase tracking-wider px-2">
            Standard reports
          </div>

          <div className="space-y-4">
            {(['Financial & Sales', 'Inventory & Logistics', 'Branch & Operations'] as const).map((groupName) => (
              <div key={groupName} className="space-y-1">
                <span className="text-[11px] font-bold text-navy-500 uppercase tracking-wider block px-2 mb-1">
                  {groupName}
                </span>

                {REPORT_NAV_ITEMS.filter((item) => item.group === groupName).map((item) => {
                  const Icon = item.icon
                  const isSelected = item.type === reportType
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setReportType(item.type)}
                      aria-current={isSelected ? 'page' : undefined}
                      className={cn(
                        'w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
                        isSelected
                          ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200/80'
                          : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900'
                      )}
                    >
                      <Icon
                        className={cn('w-4 h-4 shrink-0', isSelected ? 'text-brand-600' : 'text-navy-400')}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-navy-100 text-[11px] text-navy-500 space-y-1 px-2">
            <div className="flex items-center gap-1.5 font-semibold text-navy-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              <span>Local audit integrity</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              Amounts in integer paise. Voided sales excluded; refunds are not double-counted.
            </p>
          </div>
        </nav>

        {/* Right Column: Active Report Viewer & Filter Controls */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bg-white rounded-xl border border-navy-200/80 p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                  {activeNavItem.group}
                </span>
                <span className="text-navy-300" aria-hidden="true">
                  ·
                </span>
                <span className="text-xs text-navy-400 sp-num">
                  {reportData?.periodLabel || 'All time'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-navy-900">{activeNavItem.label}</h2>
              <p className="text-xs text-navy-500 mt-1 max-w-xl">{activeNavItem.description}</p>
            </div>

            <Badge tone="neutral" className="shrink-0">
              {reportData?.rows.length || 0} records
            </Badge>
          </div>

          {reportType === 'tax_summary' && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="leading-relaxed">
                <span className="font-bold">Non-statutory tax notice:</span>{' '}
                Shows sales tax collected at POS. StorePoint does not file taxes or produce statutory returns.
                Consult a tax professional for GST/VAT filings.
              </div>
            </div>
          )}

          <FilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Filter records…"
            searchLabel="Filter report rows"
            footer={
              datePreset === 'custom' ? (
                <div className="flex flex-wrap items-center gap-3 text-xs pt-2 border-t border-navy-100">
                  <span className="font-semibold text-navy-600">Custom range</span>
                  <input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="sp-control !py-1 sp-num"
                    aria-label="Start date"
                  />
                  <input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="sp-control !py-1 sp-num"
                    aria-label="End date"
                  />
                </div>
              ) : undefined
            }
          >
            <FilterField
              label="Branch"
              icon={<Store className="w-3.5 h-3.5 text-navy-400" aria-hidden="true" />}
            >
              <select
                id="report-branch-select"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="sp-control"
              >
                <option value="all">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField
              label="Period"
              icon={<Calendar className="w-3.5 h-3.5 text-navy-400" aria-hidden="true" />}
            >
              <select
                id="report-date-select"
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                className="sp-control"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="month">This month</option>
                <option value="prev_month">Previous month</option>
                <option value="all">All time</option>
                <option value="custom">Custom</option>
              </select>
            </FilterField>
            {(reportType === 'product_profitability' ||
              reportType === 'inventory_valuation' ||
              reportType === 'operating_expenses') && (
              <FilterField label="Category">
                <select
                  id="report-category-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="sp-control"
                >
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </FilterField>
            )}
          </FilterBar>

          {reportData && reportData.summaryKpis.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {reportData.summaryKpis.map((kpi, idx) => (
                <KpiStat
                  key={idx}
                  label={kpi.label}
                  value={kpi.value}
                  hint={kpi.hint}
                  tone={kpi.alert ? 'warning' : 'default'}
                />
              ))}
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="sp-table-wrap shadow-card overflow-hidden">
            {loading ? (
              <div className="p-12 space-y-3" aria-busy="true" aria-label="Loading report">
                <div className="h-8 sp-skeleton mx-4" />
                <div className="h-8 sp-skeleton mx-4" />
                <div className="h-8 sp-skeleton mx-4" />
              </div>
            ) : !reportData || reportData.rows.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<FileText className="w-5 h-5" aria-hidden="true" />}
                  title="No matching records"
                  description="Try another branch, period, or category filter."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="sp-table text-xs">
                  <thead>
                    <tr>
                      {reportData.columns.map((col) => (
                        <th
                          key={col.key}
                          className={cn(
                            col.align === 'right' && 'text-right',
                            col.align === 'center' && 'text-center'
                          )}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.rows.map((row: Record<string, unknown>, rIdx: number) => (
                      <tr key={String(row.id ?? rIdx)}>
                        {reportData.columns.map((col) => {
                          const val = row[col.key]

                          if (col.key === 'status') {
                            return (
                              <td key={col.key} className="text-center">
                                <StatusBadge status={String(val || '')} />
                              </td>
                            )
                          }

                          return (
                            <td
                              key={col.key}
                              className={cn(
                                col.align === 'right' && 'text-right sp-num',
                                col.align === 'center' && 'text-center'
                              )}
                            >
                              {typeof val === 'number'
                                ? col.key.toLowerCase().includes('rupees') ||
                                  col.key.toLowerCase().includes('sales')
                                  ? `₹${val.toLocaleString('en-IN', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}`
                                  : val
                                : String(val ?? '—')}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
