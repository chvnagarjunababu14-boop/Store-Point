import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWorkspace } from '@/context/WorkspaceContext'
import {
  financialCalculationService,
  type FinancialSummary,
  type BranchPerformanceSummary,
  type ProductSalesRanking,
  type SlowMovingProduct,
  type DailyTrendPoint,
  type CategoryBreakdownItem,
  type PaymentMethodBreakdownItem,
  type MonthlyTrendItem,
  type DateRangeFilter,
} from '@/lib/services/financialCalculationService'

export function useFinancialSummary(
  overrideBranchId?: string,
  dateFilter?: DateRangeFilter
) {
  const { workspaceMode, activeBranchId: contextBranchId, refreshKey } = useWorkspace()
  const branchId = overrideBranchId !== undefined ? overrideBranchId : contextBranchId

  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [branchPerformance, setBranchPerformance] = useState<BranchPerformanceSummary[]>([])
  const [productRankings, setProductRankings] = useState<ProductSalesRanking[]>([])
  const [slowMovingProducts, setSlowMovingProducts] = useState<SlowMovingProduct[]>([])
  const [dailyTrends, setDailyTrends] = useState<DailyTrendPoint[]>([])
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownItem[]>([])
  const [paymentMethodBreakdown, setPaymentMethodBreakdown] = useState<PaymentMethodBreakdownItem[]>([])
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrendItem[]>([])

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const stableStartDate = dateFilter?.startDate
  const stableEndDate = dateFilter?.endDate
  const memoizedFilter = useMemo<DateRangeFilter | undefined>(() => {
    if (!stableStartDate && !stableEndDate) return undefined
    return { startDate: stableStartDate, endDate: stableEndDate }
  }, [stableStartDate, stableEndDate])

  const loadFinancialData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [
        sum,
        perf,
        rankings,
        slow,
        daily,
        cats,
        payments,
        monthly,
      ] = await Promise.all([
        financialCalculationService.getSummary(workspaceMode, branchId, memoizedFilter),
        financialCalculationService.getBranchPerformance(workspaceMode, memoizedFilter),
        financialCalculationService.getProductSalesRankings(workspaceMode, branchId, memoizedFilter),
        financialCalculationService.getSlowMovingProducts(workspaceMode, branchId, 30),
        financialCalculationService.getDailyTrends(workspaceMode, {
          branchId,
          startDate: memoizedFilter?.startDate,
          endDate: memoizedFilter?.endDate,
        }),
        financialCalculationService.getCategoryBreakdown(workspaceMode, {
          branchId,
          startDate: memoizedFilter?.startDate,
          endDate: memoizedFilter?.endDate,
        }),
        financialCalculationService.getPaymentMethodBreakdown(workspaceMode, {
          branchId,
          startDate: memoizedFilter?.startDate,
          endDate: memoizedFilter?.endDate,
        }),
        financialCalculationService.getMonthlyTrends(workspaceMode, {
          branchId,
          monthsCount: 6,
        }),
      ])

      setSummary(sum)
      setBranchPerformance(perf)
      setProductRankings(rankings)
      setSlowMovingProducts(slow)
      setDailyTrends(daily)
      setCategoryBreakdown(cats)
      setPaymentMethodBreakdown(payments)
      setMonthlyTrends(monthly)
    } catch (err) {
      console.error('Failed to load financial calculations:', err)
      setError(err instanceof Error ? err.message : 'Failed to calculate financials')
    } finally {
      setLoading(false)
    }
  }, [workspaceMode, branchId, memoizedFilter])

  useEffect(() => {
    loadFinancialData()
  }, [loadFinancialData, refreshKey])

  return {
    summary,
    branchPerformance,
    productRankings,
    slowMovingProducts,
    dailyTrends,
    categoryBreakdown,
    paymentMethodBreakdown,
    monthlyTrends,
    loading,
    error,
    refresh: loadFinancialData,
  }
}
