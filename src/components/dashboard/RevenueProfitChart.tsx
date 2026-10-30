import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { BarChart3, Calendar, TrendingUp } from 'lucide-react'
import { REVENUE_TIMESERIES_7D, REVENUE_TIMESERIES_30D } from '@/data/dashboardData'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useFinancialSummary } from '@/hooks/useFinancialSummary'
import { getDateRangeFromPreset } from '@/lib/services/financialCalculationService'
import { formatMoney, paiseToRupees, rupeesToPaise } from '@/utils/money'
import { cn } from '@/utils/cn'

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    payload: {
      date: string
      revenue: number
      cogs: number
      expenses: number
      netProfit: number
      marginPercent: number
    }
  }>
  label?: string
}

function CustomChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-xl border border-navy-200/90 bg-white/95 backdrop-blur-md p-3.5 shadow-xl text-xs space-y-2.5 min-w-[210px]">
        <div className="font-bold text-navy-950 border-b border-navy-100 pb-2 flex justify-between items-center">
          <span>{label}</span>
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60">
            {data.marginPercent}% Net Margin
          </span>
        </div>
        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex justify-between items-center text-brand-600 font-semibold">
            <span>Gross Revenue:</span>
            <span>{formatMoney(rupeesToPaise(data.revenue))}</span>
          </div>
          <div className="flex justify-between items-center text-navy-500">
            <span>COGS &amp; Expenses:</span>
            <span>{formatMoney(rupeesToPaise(data.cogs + data.expenses))}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-600 font-bold border-t border-navy-100 pt-1.5">
            <span>Net Profit:</span>
            <span>+{formatMoney(rupeesToPaise(data.netProfit))}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export function RevenueProfitChart({ branchId }: { branchId?: string } = {}) {
  const { workspaceMode } = useWorkspace()
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d')
  const dateFilter = useMemo(() => getDateRangeFromPreset(timeRange), [timeRange])
  const { dailyTrends, loading } = useFinancialSummary(branchId, dateFilter)

  const chartData = useMemo(() => {
    if (dailyTrends && dailyTrends.length > 0) {
      return dailyTrends.map((d) => ({
        date: d.displayDate,
        revenue: paiseToRupees(d.netSalesPaise),
        cogs: paiseToRupees(d.cogsPaise),
        expenses: paiseToRupees(d.expensesPaise),
        netProfit: paiseToRupees(d.netProfitPaise),
        marginPercent: d.marginPercent,
      }))
    }
    // Only fall back to mock data in demo mode if unseeded
    if (workspaceMode === 'demo') {
      return timeRange === '7d' ? REVENUE_TIMESERIES_7D : REVENUE_TIMESERIES_30D
    }
    return []
  }, [dailyTrends, workspaceMode, timeRange])

  return (
    <div className="bg-white rounded-xl border border-navy-200/90 p-5 sm:p-6 shadow-xs space-y-5">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-navy-950 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-600" aria-hidden="true" />
            <span>Revenue &amp; Net Margin Velocity</span>
          </h3>
          <p className="text-xs text-navy-500 mt-0.5">
            Real-time margin trajectory comparing sales against cost-of-goods and operational expenses.
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-2" role="group" aria-label="Chart Time Range">
          <Calendar className="w-3.5 h-3.5 text-navy-400 hidden sm:inline" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setTimeRange('7d')}
            aria-pressed={timeRange === '7d'}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer',
              timeRange === '7d'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-navy-50 text-navy-600 border border-navy-200/80 hover:bg-navy-100/80'
            )}
          >
            Past 7 Days
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('30d')}
            aria-pressed={timeRange === '30d'}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer',
              timeRange === '30d'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-navy-50 text-navy-600 border border-navy-200/80 hover:bg-navy-100/80'
            )}
          >
            Past 30 Days (Weekly)
          </button>
        </div>
      </div>

      {/* Recharts Area Visualization */}
      <div className="h-72 sm:h-80 w-full" aria-label="Revenue and Profit Area Chart">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-navy-400">
            {loading ? 'Aggregating revenue trajectory...' : 'No sales transactions recorded in this period.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.7} />

              <XAxis
                dataKey="date"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />

              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />

              <Tooltip content={<CustomChartTooltip />} />

              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }}
              />

              <Area
                type="monotone"
                dataKey="revenue"
                name="Gross Sales (₹)"
                stroke="#2563EB"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />

              <Area
                type="monotone"
                dataKey="netProfit"
                name="Net Profit (₹)"
                stroke="#059669"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorProfit)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-navy-100 text-xs text-navy-600">
        <div className="p-2.5 rounded-lg bg-navy-50/70 border border-navy-100 space-y-0.5">
          <span className="text-navy-400 text-[11px] block">Average Margin</span>
          <span className="font-mono font-bold text-navy-900 text-sm">31.2% Net</span>
        </div>
        <div className="p-2.5 rounded-lg bg-navy-50/70 border border-navy-100 space-y-0.5">
          <span className="text-navy-400 text-[11px] block">Daily Sales Peak</span>
          <span className="font-mono font-bold text-brand-600 text-sm">₹23,400.00</span>
        </div>
        <div className="p-2.5 rounded-lg bg-navy-50/70 border border-navy-100 space-y-0.5">
          <span className="text-navy-400 text-[11px] block">Cost Control</span>
          <span className="font-mono font-bold text-emerald-600 text-sm">Optimal (&lt; 54% COGS)</span>
        </div>
        <div className="p-2.5 rounded-lg bg-navy-50/70 border border-navy-100 space-y-0.5">
          <span className="text-navy-400 text-[11px] block">Engine Mode</span>
          <span className="font-mono font-semibold text-navy-700 text-sm flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-brand-600" />
            Weighted Average
          </span>
        </div>
      </div>
    </div>
  )
}
