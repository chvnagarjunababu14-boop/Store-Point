import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWorkspace } from '@/context/WorkspaceContext'
import {
  productIntelligenceService,
  type ReplenishmentRecommendation,
  type SlowMovingItem,
  type ProfitabilityAlert,
  type ProductPerformanceIntelligenceItem,
  type IntelligenceSummaryCounts,
  type IntelligenceConfig,
} from '@/lib/services/productIntelligenceService'

export interface ProductIntelligenceFilters {
  branchId?: string
  categoryId?: string
  observationDays?: number
  targetCoverageDays?: number
  severityFilter?: string
  includeDismissed?: boolean
}

export function useProductIntelligence(filters: ProductIntelligenceFilters = {}) {
  const { workspaceMode, activeBranchId: contextBranchId, refreshKey } = useWorkspace()

  const branchId = filters.branchId ?? (contextBranchId === 'all' ? undefined : contextBranchId)
  const observationDays = filters.observationDays ?? 30
  const targetCoverageDays = filters.targetCoverageDays ?? 30
  const includeDismissed = filters.includeDismissed ?? false

  const [replenishment, setReplenishment] = useState<ReplenishmentRecommendation[]>([])
  const [slowMoving, setSlowMoving] = useState<SlowMovingItem[]>([])
  const [alerts, setAlerts] = useState<ProfitabilityAlert[]>([])
  const [performanceRankings, setPerformanceRankings] = useState<ProductPerformanceIntelligenceItem[]>([])
  const [summaryCounts, setSummaryCounts] = useState<IntelligenceSummaryCounts>({
    totalAlerts: 0,
    criticalAlerts: 0,
    replenishmentNeeded: 0,
    slowMovingCount: 0,
    marginAndPriceRisks: 0,
    capitalTiedUpPaise: 0,
  })

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const config: IntelligenceConfig = useMemo(
    () => ({
      branchId,
      observationDays,
      targetCoverageDays,
      includeDismissed,
    }),
    [branchId, observationDays, targetCoverageDays, includeDismissed]
  )

  const loadIntelligence = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [rep, slow, alt, perf, counts] = await Promise.all([
        productIntelligenceService.getReplenishmentRecommendations(workspaceMode, config),
        productIntelligenceService.getSlowMovingInventory(workspaceMode, config),
        productIntelligenceService.getProfitabilityAlerts(workspaceMode, config),
        productIntelligenceService.getProductPerformanceIntelligence(workspaceMode, config),
        productIntelligenceService.getSummaryCounts(workspaceMode, config),
      ])

      setReplenishment(rep)
      setSlowMoving(slow)
      setAlerts(alt)
      setPerformanceRankings(perf)
      setSummaryCounts(counts)
    } catch (err) {
      console.error('Failed to load product intelligence data:', err)
      setError(err instanceof Error ? err.message : 'Failed to calculate product intelligence')
    } finally {
      setLoading(false)
    }
  }, [workspaceMode, config])

  useEffect(() => {
    loadIntelligence()
  }, [loadIntelligence, refreshKey])

  const dismissRecommendation = useCallback(
    (recommendationId: string) => {
      productIntelligenceService.dismissRecommendation(workspaceMode, recommendationId)
      loadIntelligence()
    },
    [workspaceMode, loadIntelligence]
  )

  const restoreRecommendation = useCallback(
    (recommendationId: string) => {
      productIntelligenceService.restoreRecommendation(workspaceMode, recommendationId)
      loadIntelligence()
    },
    [workspaceMode, loadIntelligence]
  )

  const clearAllDismissals = useCallback(() => {
    productIntelligenceService.clearAllDismissals(workspaceMode)
    loadIntelligence()
  }, [workspaceMode, loadIntelligence])

  return {
    replenishment,
    slowMoving,
    alerts,
    performanceRankings,
    summaryCounts,
    loading,
    error,
    refresh: loadIntelligence,
    dismissRecommendation,
    restoreRecommendation,
    clearAllDismissals,
  }
}
