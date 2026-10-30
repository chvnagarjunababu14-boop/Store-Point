import { getDb } from '@/lib/db'
import type { WorkspaceId } from '@/types/database'
import { calculateMarginPercent } from '@/utils/money'
import { isDateInRange } from '@/lib/services/financialCalculationService'

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low'
export type AlertSeverity = 'critical' | 'warning' | 'info'
export type DataConfidence = 'high' | 'moderate' | 'insufficient_data'

export interface ReplenishmentRecommendation {
  id: string
  productId: string
  sku: string
  productName: string
  category: string
  branchId: string
  branchName: string
  currentStock: number
  reorderPoint: number
  unitsSoldInWindow: number
  observationDays: number
  salesVelocityPerDay: number
  estimatedDaysRemaining: number | null
  targetCoverageDays: number
  suggestedReorderQuantity: number
  unitCostPaise: number
  estimatedOrderCostPaise: number
  priority: RecommendationPriority
  confidence: DataConfidence
  evidence: string
  assumptions: string
  suggestedAction: string
  isDismissed?: boolean
}

export interface SlowMovingItem {
  id: string
  productId: string
  sku: string
  productName: string
  category: string
  branchId: string
  branchName: string
  currentStock: number
  unitsSoldInWindow: number
  observationDays: number
  lastSaleDate: string | null
  unitCostPaise: number
  capitalTiedUpPaise: number
  reorderPoint: number
  confidence: DataConfidence
  limitations: string
  suggestedAction: string
  potentialRemedies: string[]
  isDismissed?: boolean
}

export interface ProfitabilityAlert {
  id: string
  type:
    | 'below_cost'
    | 'negative_margin'
    | 'low_margin'
    | 'high_return'
    | 'margin_drag'
    | 'excessive_discount'
    | 'inventory_writeoff'
  severity: AlertSeverity
  productId?: string
  productName?: string
  sku?: string
  category?: string
  branchId?: string
  branchName?: string
  observationDays?: number
  evidenceMetric: string
  evidenceDetails: string
  rootCause: string
  suggestedRemedy: string
  isDismissed?: boolean
}

export interface ProductPerformanceIntelligenceItem {
  productId: string
  sku: string
  productName: string
  category: string
  branchId?: string
  branchName?: string
  netUnitsSold: number
  netRevenuePaise: number
  grossProfitPaise: number
  grossMarginPercent: number
  returnedUnits: number
  returnRatePercent: number
  salesVelocityPerDay: number
  currentStock: number
  unitCostPaise: number
  inventoryCostPaise: number
  revenueRank: number
  profitRank: number
  performanceTier: 'Star' | 'Cash Cow' | 'Opportunity' | 'Underperformer' | 'New / Low Data'
}

export interface IntelligenceSummaryCounts {
  totalAlerts: number
  criticalAlerts: number
  replenishmentNeeded: number
  slowMovingCount: number
  marginAndPriceRisks: number
  capitalTiedUpPaise: number
}

export interface IntelligenceConfig {
  observationDays?: number // default 30
  targetCoverageDays?: number // default 30
  branchId?: string
  includeDismissed?: boolean
}

const DISMISSAL_STORAGE_PREFIX = 'storepoint_dismissed_recommendations_'
const inMemoryDismissals = new Map<WorkspaceId, Set<string>>()

export const productIntelligenceService = {
  /**
   * Get dismissed recommendation IDs for a workspace (localStorage with in-memory fallback)
   */
  getDismissedIds(workspaceId: WorkspaceId): Set<string> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(`${DISMISSAL_STORAGE_PREFIX}${workspaceId}`)
        if (raw) {
          const parsed = JSON.parse(raw)
          return new Set(Array.isArray(parsed) ? parsed : [])
        }
      }
      return inMemoryDismissals.get(workspaceId) || new Set()
    } catch {
      return inMemoryDismissals.get(workspaceId) || new Set()
    }
  },

  /**
   * Dismiss a recommendation or alert
   */
  dismissRecommendation(workspaceId: WorkspaceId, recommendationId: string): void {
    const dismissed = this.getDismissedIds(workspaceId)
    dismissed.add(recommendationId)
    inMemoryDismissals.set(workspaceId, dismissed)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(
          `${DISMISSAL_STORAGE_PREFIX}${workspaceId}`,
          JSON.stringify(Array.from(dismissed))
        )
      }
    } catch (e) {
      console.warn('Failed to persist recommendation dismissal:', e)
    }
  },

  /**
   * Restore a previously dismissed recommendation
   */
  restoreRecommendation(workspaceId: WorkspaceId, recommendationId: string): void {
    const dismissed = this.getDismissedIds(workspaceId)
    dismissed.delete(recommendationId)
    inMemoryDismissals.set(workspaceId, dismissed)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(
          `${DISMISSAL_STORAGE_PREFIX}${workspaceId}`,
          JSON.stringify(Array.from(dismissed))
        )
      }
    } catch (e) {
      console.warn('Failed to restore recommendation:', e)
    }
  },

  /**
   * Clear all dismissals for a workspace
   */
  clearAllDismissals(workspaceId: WorkspaceId): void {
    inMemoryDismissals.delete(workspaceId)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(`${DISMISSAL_STORAGE_PREFIX}${workspaceId}`)
      }
    } catch (e) {
      console.warn('Failed to clear dismissals:', e)
    }
  },

  /**
   * 1. REPLENISHMENT RECOMMENDATION ENGINE
   * Deterministic stock coverage and reorder suggestions with visible assumptions
   */
  async getReplenishmentRecommendations(
    workspaceId: WorkspaceId,
    config: IntelligenceConfig = {}
  ): Promise<ReplenishmentRecommendation[]> {
    const db = await getDb()
    const observationDays = config.observationDays ?? 30
    const targetCoverageDays = config.targetCoverageDays ?? 30
    const branchFilter = config.branchId && config.branchId !== 'all' ? config.branchId : undefined
    const dismissedIds = this.getDismissedIds(workspaceId)

    // Calculate observation window date boundary
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - (observationDays - 1))
    const startYMD = startDate.toISOString().slice(0, 10)
    const endYMD = now.toISOString().slice(0, 10)

    // 1. Fetch active branches & products
    const branches = await db.getAllFromIndex('branches', 'by-workspace', workspaceId)
    const branchMap = new Map(branches.map((b) => [b.id, b]))

    const products = await db.getAllFromIndex('products', 'by-workspace', workspaceId)
    const activeProducts = products.filter((p) => p.status !== 'archived')
    const productMap = new Map(activeProducts.map((p) => [p.id, p]))

    // 2. Fetch inventory records
    let inventory = await db.getAllFromIndex('inventory', 'by-workspace', workspaceId)
    if (branchFilter) {
      inventory = inventory.filter((i) => i.branchId === branchFilter)
    }

    // 3. Fetch sales & line items in observation window
    let sales = await db.getAllFromIndex('sales', 'by-workspace', workspaceId)
    sales = sales.filter((s) => s.status !== 'cancelled' && isDateInRange(s.createdAt, { startDate: startYMD, endDate: endYMD }))
    if (branchFilter) {
      sales = sales.filter((s) => s.branchId === branchFilter)
    }
    const matchingSaleIds = new Set(sales.map((s) => s.id))
    const saleBranchMap = new Map(sales.map((s) => [s.id, s.branchId]))

    const lineItems = await db.getAllFromIndex('saleLineItems', 'by-workspace', workspaceId)

    // Sum units sold per [branchId, productId]
    const unitsSoldKeyMap = new Map<string, number>()
    for (const li of lineItems) {
      if (matchingSaleIds.has(li.saleId)) {
        const bId = saleBranchMap.get(li.saleId) || 'unknown'
        const key = `${bId}::${li.productId}`
        unitsSoldKeyMap.set(key, (unitsSoldKeyMap.get(key) || 0) + li.quantity)
      }
    }

    // 4. Fetch returns in window to get net units sold
    let returns = await db.getAllFromIndex('saleReturns', 'by-workspace', workspaceId)
    returns = returns.filter((r) => isDateInRange(r.createdAt, { startDate: startYMD, endDate: endYMD }))
    if (branchFilter) {
      returns = returns.filter((r) => r.branchId === branchFilter)
    }
    for (const ret of returns) {
      if (ret.returnedItems) {
        for (const item of ret.returnedItems) {
          const key = `${ret.branchId}::${item.productId}`
          const cur = unitsSoldKeyMap.get(key) || 0
          unitsSoldKeyMap.set(key, Math.max(0, cur - item.quantity))
        }
      }
    }

    const recommendations: ReplenishmentRecommendation[] = []

    for (const inv of inventory) {
      const prod = productMap.get(inv.productId)
      if (!prod) continue

      const branch = branchMap.get(inv.branchId)
      const branchName = branch ? branch.name : 'Branch'

      const currentStock = inv.quantityOnHand ?? inv.quantity ?? 0
      const reorderPoint = inv.reorderPoint !== undefined ? inv.reorderPoint : prod.reorderPoint ?? 10
      const unitCost = inv.averageCostPaise ?? inv.averageCostCents ?? prod.costPricePaise ?? prod.costPriceCents ?? 0

      const key = `${inv.branchId}::${inv.productId}`
      const unitsSold = unitsSoldKeyMap.get(key) || 0
      const salesVelocityPerDay = Number((unitsSold / Math.max(1, observationDays)).toFixed(2))

      let daysRemaining: number | null = null
      if (salesVelocityPerDay > 0) {
        daysRemaining = Math.max(0, Math.round(currentStock / salesVelocityPerDay))
      }

      // Check data confidence
      const productAgeDays = Math.max(1, Math.round((now.getTime() - new Date(prod.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
      let confidence: DataConfidence = 'high'
      if (productAgeDays < 7 || (unitsSold === 0 && productAgeDays < 14)) {
        confidence = 'insufficient_data'
      } else if (unitsSold < 3) {
        confidence = 'moderate'
      }

      // Determine replenishment trigger:
      // Condition 1: Stock is at or below reorder threshold
      // Condition 2: Stock run-rate indicates depletion within target threshold
      const isAtOrBelowReorder = currentStock <= reorderPoint
      const isDepletingFast =
        daysRemaining !== null && (daysRemaining <= Math.max(14, Math.floor(targetCoverageDays * 0.75)))

      if (isAtOrBelowReorder || isDepletingFast) {
        // Calculate recommended order quantity
        // targetStock = (dailyVelocity * targetCoverageDays) + buffer (reorderPoint)
        const targetStock = Math.ceil(salesVelocityPerDay * targetCoverageDays) + reorderPoint
        let suggestedQty = Math.max(0, targetStock - currentStock)

        // Sensible fallback for zero-velocity items at/below reorder point
        if (suggestedQty <= 0 && isAtOrBelowReorder) {
          suggestedQty = Math.max(reorderPoint * 2, 5)
        }

        if (suggestedQty > 0) {
          let priority: RecommendationPriority = 'medium'
          if (currentStock === 0 || (daysRemaining !== null && daysRemaining <= 3)) {
            priority = 'critical'
          } else if (isAtOrBelowReorder || (daysRemaining !== null && daysRemaining <= 7)) {
            priority = 'high'
          } else if (daysRemaining !== null && daysRemaining <= 14) {
            priority = 'medium'
          } else {
            priority = 'low'
          }

          const recId = `rep_${inv.branchId}_${inv.productId}_${observationDays}`
          const isDismissed = dismissedIds.has(recId)

          if (!config.includeDismissed && isDismissed) {
            continue
          }

          const daysText = daysRemaining !== null ? `${daysRemaining} days` : 'Zero sales recorded in window'
          const evidence =
            currentStock === 0
              ? `Stockout! Currently 0 units on hand (Reorder point: ${reorderPoint}).`
              : `Current stock (${currentStock}) is ${isAtOrBelowReorder ? 'at or below reorder threshold' : 'selling quickly'} with ${daysText} remaining at a velocity of ${salesVelocityPerDay} units/day.`

          const assumptions = `Based on ${observationDays}-day observation (${unitsSold} net units sold) targeting ${targetCoverageDays} days of buffer coverage plus safety stock of ${reorderPoint} units.`

          const suggestedAction =
            currentStock === 0
              ? `Place emergency purchase order for ~${suggestedQty} units to restore shelf availability.`
              : `Order ~${suggestedQty} units to sustain stock through the next ${targetCoverageDays} days.`

          recommendations.push({
            id: recId,
            productId: inv.productId,
            sku: prod.sku,
            productName: prod.name,
            category: prod.category || 'General',
            branchId: inv.branchId,
            branchName,
            currentStock,
            reorderPoint,
            unitsSoldInWindow: unitsSold,
            observationDays,
            salesVelocityPerDay,
            estimatedDaysRemaining: daysRemaining,
            targetCoverageDays,
            suggestedReorderQuantity: suggestedQty,
            unitCostPaise: unitCost,
            estimatedOrderCostPaise: suggestedQty * unitCost,
            priority,
            confidence,
            evidence,
            assumptions,
            suggestedAction,
            isDismissed,
          })
        }
      }
    }

    // Sort by priority: critical -> high -> medium -> low, then by stock remaining ascending
    const priorityWeight: Record<RecommendationPriority, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    }

    return recommendations.sort((a, b) => {
      const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority]
      if (pDiff !== 0) return pDiff
      return (a.estimatedDaysRemaining ?? 999) - (b.estimatedDaysRemaining ?? 999)
    })
  },

  /**
   * 2. SLOW-MOVING AND EXCESS INVENTORY ENGINE
   * Identifies stagnant capital with data limitations, last sale date, and actionable remedies
   */
  async getSlowMovingInventory(
    workspaceId: WorkspaceId,
    config: IntelligenceConfig = {}
  ): Promise<SlowMovingItem[]> {
    const db = await getDb()
    const observationDays = config.observationDays ?? 30
    const branchFilter = config.branchId && config.branchId !== 'all' ? config.branchId : undefined
    const dismissedIds = this.getDismissedIds(workspaceId)

    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - (observationDays - 1))
    const startYMD = startDate.toISOString().slice(0, 10)
    const endYMD = now.toISOString().slice(0, 10)

    // Fetch branches, products, inventory
    const branches = await db.getAllFromIndex('branches', 'by-workspace', workspaceId)
    const branchMap = new Map(branches.map((b) => [b.id, b]))

    const products = await db.getAllFromIndex('products', 'by-workspace', workspaceId)
    const activeProducts = products.filter((p) => p.status !== 'archived')
    const productMap = new Map(activeProducts.map((p) => [p.id, p]))

    let inventory = await db.getAllFromIndex('inventory', 'by-workspace', workspaceId)
    if (branchFilter) {
      inventory = inventory.filter((i) => i.branchId === branchFilter)
    }

    // Fetch all sales for this workspace to find sales in window + last sale date
    let allSales = await db.getAllFromIndex('sales', 'by-workspace', workspaceId)
    allSales = allSales.filter((s) => s.status !== 'cancelled')
    allSales.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) // newest first

    const allLineItems = await db.getAllFromIndex('saleLineItems', 'by-workspace', workspaceId)

    // Build map of last sale date per [branchId, productId]
    const lastSaleDateMap = new Map<string, string>()
    const unitsSoldInWindowMap = new Map<string, number>()

    const saleMap = new Map(allSales.map((s) => [s.id, s]))

    for (const li of allLineItems) {
      const sale = saleMap.get(li.saleId)
      if (!sale) continue

      const key = `${sale.branchId}::${li.productId}`

      // Track newest sale date
      if (!lastSaleDateMap.has(key)) {
        lastSaleDateMap.set(key, sale.createdAt.slice(0, 10))
      }

      // Check if within observation window
      if (isDateInRange(sale.createdAt, { startDate: startYMD, endDate: endYMD })) {
        unitsSoldInWindowMap.set(key, (unitsSoldInWindowMap.get(key) || 0) + li.quantity)
      }
    }

    const slowMovingItems: SlowMovingItem[] = []

    for (const inv of inventory) {
      const currentStock = inv.quantityOnHand ?? inv.quantity ?? 0
      if (currentStock <= 0) continue

      const prod = productMap.get(inv.productId)
      if (!prod) continue

      const branch = branchMap.get(inv.branchId)
      const branchName = branch ? branch.name : 'Branch'

      const key = `${inv.branchId}::${inv.productId}`
      const unitsSold = unitsSoldInWindowMap.get(key) || 0

      // Criteria: Stock > 0 and 0 or fewer than 2 units sold in observation window
      if (unitsSold <= 2) {
        const unitCost = inv.averageCostPaise ?? inv.averageCostCents ?? prod.costPricePaise ?? prod.costPriceCents ?? 0
        const capitalTiedUpPaise = currentStock * unitCost
        const lastSaleDate = lastSaleDateMap.get(key) || null

        // Check product age
        const productAgeDays = Math.max(1, Math.round((now.getTime() - new Date(prod.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
        let confidence: DataConfidence = 'high'
        if (productAgeDays < 14) {
          confidence = 'insufficient_data'
        } else if (productAgeDays < observationDays) {
          confidence = 'moderate'
        }

        const id = `slow_${inv.branchId}_${inv.productId}_${observationDays}`
        const isDismissed = dismissedIds.has(id)

        if (!config.includeDismissed && isDismissed) {
          continue
        }

        const limitations =
          confidence === 'insufficient_data'
            ? `Product was added recently (< 14 days ago) within this observation window. Recent low sales reflect initial adoption rather than lack of demand.`
            : `Analysis is based on transaction volume over the last ${observationDays} days. Does not account for external seasonal demand cycles, localized footfall variations, or temporary stockouts.`

        const suggestedAction =
          unitsSold === 0
            ? 'Review physical display, verify price competitiveness, and consider a targeted promotion.'
            : 'Evaluate stock velocity. If demand remains stagnant, adjust reorder thresholds to prevent over-stocking.'

        const potentialRemedies = [
          'Review catalog reorder point to avoid auto-reordering surplus units.',
          'Feature item in prominent end-cap or store display.',
          'Bundle with high-velocity complement products to stimulate trial.',
          'Consider a limited-time promotional discount or seasonal clearance.',
        ]

        slowMovingItems.push({
          id,
          productId: inv.productId,
          sku: prod.sku,
          productName: prod.name,
          category: prod.category || 'General',
          branchId: inv.branchId,
          branchName,
          currentStock,
          unitsSoldInWindow: unitsSold,
          observationDays,
          lastSaleDate,
          unitCostPaise: unitCost,
          capitalTiedUpPaise,
          reorderPoint: inv.reorderPoint !== undefined ? inv.reorderPoint : prod.reorderPoint ?? 10,
          confidence,
          limitations,
          suggestedAction,
          potentialRemedies,
          isDismissed,
        })
      }
    }

    return slowMovingItems.sort((a, b) => b.capitalTiedUpPaise - a.capitalTiedUpPaise)
  },

  /**
   * 3. PROFITABILITY, PRICE AND RETURN ALERTS
   * Deterministic alerts with transparent evidence, sample sizes, and remediation steps
   */
  async getProfitabilityAlerts(
    workspaceId: WorkspaceId,
    config: IntelligenceConfig = {}
  ): Promise<ProfitabilityAlert[]> {
    const db = await getDb()
    const observationDays = config.observationDays ?? 30
    const branchFilter = config.branchId && config.branchId !== 'all' ? config.branchId : undefined
    const dismissedIds = this.getDismissedIds(workspaceId)

    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - (observationDays - 1))
    const startYMD = startDate.toISOString().slice(0, 10)
    const endYMD = now.toISOString().slice(0, 10)

    const branches = await db.getAllFromIndex('branches', 'by-workspace', workspaceId)
    const branchMap = new Map(branches.map((b) => [b.id, b]))

    const products = await db.getAllFromIndex('products', 'by-workspace', workspaceId)
    const activeProducts = products.filter((p) => p.status !== 'archived')
    const productMap = new Map(activeProducts.map((p) => [p.id, p]))

    const alerts: ProfitabilityAlert[] = []

    // ── Check A: Catalog Selling Price Below Current Cost ──
    for (const prod of activeProducts) {
      const cost = prod.costPricePaise ?? prod.costPriceCents ?? 0
      const price = prod.sellingPricePaise ?? prod.sellingPriceCents ?? 0

      if (price > 0 && cost > 0 && price < cost) {
        const lossPerUnit = cost - price
        const id = `alert_below_cost_${prod.id}`
        const isDismissed = dismissedIds.has(id)

        if (config.includeDismissed || !isDismissed) {
          alerts.push({
            id,
            type: 'below_cost',
            severity: 'critical',
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            category: prod.category,
            evidenceMetric: `Loss of ₹${(lossPerUnit / 100).toFixed(2)}/unit`,
            evidenceDetails: `Catalog selling price is ₹${(price / 100).toFixed(2)}, which is below current acquisition cost of ₹${(cost / 100).toFixed(2)}.`,
            rootCause: 'Product selling price was not adjusted following recent purchase cost increases.',
            suggestedRemedy: 'Update selling price in Products to at least match or exceed replacement cost.',
            isDismissed,
          })
        }
      }
    }

    // ── Check B: Sales Performance & Return Rate in Observation Window ──
    let sales = await db.getAllFromIndex('sales', 'by-workspace', workspaceId)
    sales = sales.filter((s) => s.status !== 'cancelled' && isDateInRange(s.createdAt, { startDate: startYMD, endDate: endYMD }))
    if (branchFilter) {
      sales = sales.filter((s) => s.branchId === branchFilter)
    }
    const matchingSaleIds = new Set(sales.map((s) => s.id))
    const lineItems = await db.getAllFromIndex('saleLineItems', 'by-workspace', workspaceId)

    let returns = await db.getAllFromIndex('saleReturns', 'by-workspace', workspaceId)
    returns = returns.filter((r) => isDateInRange(r.createdAt, { startDate: startYMD, endDate: endYMD }))
    if (branchFilter) {
      returns = returns.filter((r) => r.branchId === branchFilter)
    }

    // Aggregate returned units & refund amounts
    const returnedByProd = new Map<string, { units: number; refundPaise: number }>()
    for (const ret of returns) {
      if (ret.returnedItems) {
        for (const item of ret.returnedItems) {
          const cur = returnedByProd.get(item.productId) || { units: 0, refundPaise: 0 }
          cur.units += item.quantity
          cur.refundPaise += item.refundAmountPaise ?? item.refundAmountCents ?? 0
          returnedByProd.set(item.productId, cur)
        }
      }
    }

    // Aggregate sales by product
    const statsByProd = new Map<
      string,
      {
        unitsSold: number
        revenuePaise: number
        cogsPaise: number
        discountPaise: number
        orderCount: number
      }
    >()

    for (const li of lineItems) {
      if (matchingSaleIds.has(li.saleId)) {
        const cur = statsByProd.get(li.productId) || {
          unitsSold: 0,
          revenuePaise: 0,
          cogsPaise: 0,
          discountPaise: 0,
          orderCount: 0,
        }
        cur.unitsSold += li.quantity
        cur.revenuePaise += li.totalPaise ?? li.totalCents ?? 0
        cur.cogsPaise += li.quantity * (li.unitCostSnapshotPaise ?? li.unitCostSnapshotCents ?? 0)
        cur.discountPaise += li.discountPaise ?? li.discountCents ?? 0
        cur.orderCount++
        statsByProd.set(li.productId, cur)
      }
    }

    // Calculate revenue threshold for top 25% (for margin drag detection)
    const revenues = Array.from(statsByProd.values()).map((s) => s.revenuePaise)
    revenues.sort((a, b) => b - a)
    const top25RevIndex = Math.floor(revenues.length * 0.25)
    const top25Threshold = revenues.length > 3 ? revenues[top25RevIndex] : Infinity

    for (const [productId, stats] of statsByProd.entries()) {
      const prod = productMap.get(productId)
      if (!prod) continue

      const ret = returnedByProd.get(productId) || { units: 0, refundPaise: 0 }
      const netSales = Math.max(0, stats.revenuePaise - ret.refundPaise)
      const grossProfit = netSales - stats.cogsPaise
      const margin = calculateMarginPercent(netSales, grossProfit)
      const returnRate =
        stats.unitsSold > 0 ? Number(((ret.units / stats.unitsSold) * 100).toFixed(1)) : 0

      // Alert 1: Negative Gross Profit in Window
      if (grossProfit < 0 && (stats.revenuePaise > 0 || stats.unitsSold > 0)) {
        const id = `alert_neg_margin_${productId}_${observationDays}`
        const isDismissed = dismissedIds.has(id)
        if (config.includeDismissed || !isDismissed) {
          alerts.push({
            id,
            type: 'negative_margin',
            severity: 'critical',
            productId,
            productName: prod.name,
            sku: prod.sku,
            category: prod.category,
            observationDays,
            evidenceMetric: `Loss of ₹${(Math.abs(grossProfit) / 100).toFixed(2)} (${margin}%)`,
            evidenceDetails: `Over ${observationDays} days, generated ₹${(netSales / 100).toFixed(2)} in net sales against ₹${(stats.cogsPaise / 100).toFixed(2)} in product cost.`,
            rootCause: 'Returns or historical discounted prices eroded margin below product acquisition cost.',
            suggestedRemedy: 'Review return rates and discontinue promotional discounts on this item.',
            isDismissed,
          })
        }
      }
      // Alert 2: Unusually Low Gross Margin (< 10%)
      else if (netSales > 0 && margin >= 0 && margin < 10) {
        const id = `alert_low_margin_${productId}_${observationDays}`
        const isDismissed = dismissedIds.has(id)
        if (config.includeDismissed || !isDismissed) {
          alerts.push({
            id,
            type: 'low_margin',
            severity: 'warning',
            productId,
            productName: prod.name,
            sku: prod.sku,
            category: prod.category,
            observationDays,
            evidenceMetric: `Thin Gross Margin: ${margin.toFixed(1)}%`,
            evidenceDetails: `Yielded only ₹${(grossProfit / 100).toFixed(2)} gross profit on ₹${(netSales / 100).toFixed(2)} revenue across ${stats.unitsSold} units.`,
            rootCause: 'Low markup buffer leaves little contribution for store overhead or staff costs.',
            suggestedRemedy: 'Consider a modest 3-7% price adjustment or renegotiate wholesale rates.',
            isDismissed,
          })
        }
      }

      // Alert 3: Statistically Meaningful High Return Rate
      // Minimum 5 units sold and >= 20% return rate
      if (stats.unitsSold >= 5 && returnRate >= 20) {
        const id = `alert_high_return_${productId}_${observationDays}`
        const isDismissed = dismissedIds.has(id)
        if (config.includeDismissed || !isDismissed) {
          alerts.push({
            id,
            type: 'high_return',
            severity: 'warning',
            productId,
            productName: prod.name,
            sku: prod.sku,
            category: prod.category,
            observationDays,
            evidenceMetric: `Return Rate: ${returnRate}% (${ret.units} of ${stats.unitsSold} units)`,
            evidenceDetails: `₹${(ret.refundPaise / 100).toFixed(2)} refunded across ${ret.units} returns from ${stats.unitsSold} total units sold.`,
            rootCause: 'Frequent customer returns suggest potential defect, sizing issue, or product description mismatch.',
            suggestedRemedy: 'Inspect incoming supplier batches and gather specific return reasons from staff.',
            isDismissed,
          })
        }
      }

      // Alert 4: Margin Drag (Top Revenue Driver with Sub-15% Margin)
      if (stats.revenuePaise >= top25Threshold && margin < 15 && stats.unitsSold >= 10) {
        const id = `alert_margin_drag_${productId}_${observationDays}`
        const isDismissed = dismissedIds.has(id)
        if (config.includeDismissed || !isDismissed) {
          alerts.push({
            id,
            type: 'margin_drag',
            severity: 'warning',
            productId,
            productName: prod.name,
            sku: prod.sku,
            category: prod.category,
            observationDays,
            evidenceMetric: `High Volume / Weak Margin (${margin.toFixed(1)}%)`,
            evidenceDetails: `Generated ₹${(netSales / 100).toFixed(2)} in revenue (top 25%) but only contributed ₹${(grossProfit / 100).toFixed(2)} to gross profit.`,
            rootCause: 'High working capital velocity with disproportionately low profit retention.',
            suggestedRemedy: 'Leverage strong sales volume to negotiate bulk procurement discounts with vendor.',
            isDismissed,
          })
        }
      }

      // Alert 5: Unusually High Discounts (> 25% of gross sales with at least 3 orders)
      const grossSales = stats.revenuePaise + stats.discountPaise
      if (grossSales > 0 && stats.orderCount >= 3) {
        const discountRate = (stats.discountPaise / grossSales) * 100
        if (discountRate >= 25) {
          const id = `alert_excessive_discount_${productId}_${observationDays}`
          const isDismissed = dismissedIds.has(id)
          if (config.includeDismissed || !isDismissed) {
            alerts.push({
              id,
              type: 'excessive_discount',
              severity: 'info',
              productId,
              productName: prod.name,
              sku: prod.sku,
              category: prod.category,
              observationDays,
              evidenceMetric: `Heavy Discounting: ${discountRate.toFixed(1)}%`,
              evidenceDetails: `₹${(stats.discountPaise / 100).toFixed(2)} discounted on ₹${(grossSales / 100).toFixed(2)} gross sales volume across ${stats.orderCount} transactions.`,
              rootCause: 'Aggressive POS discounts or markdown promotions are eroding realized revenue.',
              suggestedRemedy: 'Verify if promotional campaigns are intentional and monitor margin impact.',
              isDismissed,
            })
          }
        }
      }
    }

    // ── Check C: Material Inventory Write-Offs in Observation Window ──
    let movements = await db.getAllFromIndex('stockMovements', 'by-workspace', workspaceId)
    movements = movements.filter((m) => isDateInRange(m.createdAt, { startDate: startYMD, endDate: endYMD }))
    if (branchFilter) {
      movements = movements.filter((m) => m.branchId === branchFilter)
    }

    // Look for write-offs (type 'damage' or negative 'adjustment')
    let totalWriteOffPaise = 0
    let writeOffUnits = 0
    for (const m of movements) {
      if (m.type === 'write_off' || (m.type === 'adjustment' && m.quantityDelta < 0)) {
        const qty = Math.abs(m.quantityDelta)
        const cost = m.unitCostPaise ?? m.unitCostCents ?? 0
        totalWriteOffPaise += qty * cost
        writeOffUnits += qty
      }
    }

    // Threshold: Material write-off of ₹5,000+ (500000 paise)
    if (totalWriteOffPaise >= 500000) {
      const id = `alert_writeoff_${observationDays}_${branchFilter || 'all'}`
      const isDismissed = dismissedIds.has(id)
      if (config.includeDismissed || !isDismissed) {
        const branchLabel = branchFilter ? branchMap.get(branchFilter)?.name || 'Branch' : 'All Branches'
        alerts.push({
          id,
          type: 'inventory_writeoff',
          severity: 'warning',
          branchId: branchFilter,
          branchName: branchLabel,
          observationDays,
          evidenceMetric: `Material Write-Off: ₹${(totalWriteOffPaise / 100).toFixed(2)}`,
          evidenceDetails: `Over ${observationDays} days, ${writeOffUnits} units totaling ₹${(totalWriteOffPaise / 100).toFixed(2)} at cost were written off due to damage or adjustments in ${branchLabel}.`,
          rootCause: 'Shrinkage, expiration, or physical handling loss directly impacts operating profitability.',
          suggestedRemedy: 'Conduct a physical inventory audit and review storage and transit protocols.',
          isDismissed,
        })
      }
    }

    // Sort: critical -> warning -> info
    const sevWeight: Record<AlertSeverity, number> = {
      critical: 3,
      warning: 2,
      info: 1,
    }

    return alerts.sort((a, b) => sevWeight[b.severity] - sevWeight[a.severity])
  },

  /**
   * 4. PRODUCT PERFORMANCE INTELLIGENCE RANKINGS
   * Multi-dimensional ranking comparing revenue vs profit performance tiers
   */
  async getProductPerformanceIntelligence(
    workspaceId: WorkspaceId,
    config: IntelligenceConfig = {}
  ): Promise<ProductPerformanceIntelligenceItem[]> {
    const db = await getDb()
    const observationDays = config.observationDays ?? 30
    const branchFilter = config.branchId && config.branchId !== 'all' ? config.branchId : undefined

    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - (observationDays - 1))
    const startYMD = startDate.toISOString().slice(0, 10)
    const endYMD = now.toISOString().slice(0, 10)

    const products = await db.getAllFromIndex('products', 'by-workspace', workspaceId)
    const activeProducts = products.filter((p) => p.status !== 'archived')

    let inventory = await db.getAllFromIndex('inventory', 'by-workspace', workspaceId)
    if (branchFilter) {
      inventory = inventory.filter((i) => i.branchId === branchFilter)
    }

    // Sum inventory stock and valuation per product
    const stockByProd = new Map<string, { quantity: number; costPaise: number }>()
    for (const inv of inventory) {
      const cur = stockByProd.get(inv.productId) || { quantity: 0, costPaise: 0 }
      const qty = inv.quantityOnHand ?? inv.quantity ?? 0
      const cost = inv.averageCostPaise ?? inv.averageCostCents ?? 0
      cur.quantity += qty
      cur.costPaise += qty * cost
      stockByProd.set(inv.productId, cur)
    }

    // Sales in window
    let sales = await db.getAllFromIndex('sales', 'by-workspace', workspaceId)
    sales = sales.filter((s) => s.status !== 'cancelled' && isDateInRange(s.createdAt, { startDate: startYMD, endDate: endYMD }))
    if (branchFilter) {
      sales = sales.filter((s) => s.branchId === branchFilter)
    }
    const matchingSaleIds = new Set(sales.map((s) => s.id))
    const lineItems = await db.getAllFromIndex('saleLineItems', 'by-workspace', workspaceId)

    // Returns in window
    let returns = await db.getAllFromIndex('saleReturns', 'by-workspace', workspaceId)
    returns = returns.filter((r) => isDateInRange(r.createdAt, { startDate: startYMD, endDate: endYMD }))
    if (branchFilter) {
      returns = returns.filter((r) => r.branchId === branchFilter)
    }

    const returnsByProd = new Map<string, { units: number; refundPaise: number }>()
    for (const ret of returns) {
      if (ret.returnedItems) {
        for (const item of ret.returnedItems) {
          const cur = returnsByProd.get(item.productId) || { units: 0, refundPaise: 0 }
          cur.units += item.quantity
          cur.refundPaise += item.refundAmountPaise ?? item.refundAmountCents ?? 0
          returnsByProd.set(item.productId, cur)
        }
      }
    }

    const salesByProd = new Map<
      string,
      {
        unitsSold: number
        revenuePaise: number
        cogsPaise: number
      }
    >()

    for (const li of lineItems) {
      if (matchingSaleIds.has(li.saleId)) {
        const cur = salesByProd.get(li.productId) || { unitsSold: 0, revenuePaise: 0, cogsPaise: 0 }
        cur.unitsSold += li.quantity
        cur.revenuePaise += li.totalPaise ?? li.totalCents ?? 0
        cur.cogsPaise += li.quantity * (li.unitCostSnapshotPaise ?? li.unitCostSnapshotCents ?? 0)
        salesByProd.set(li.productId, cur)
      }
    }

    const items: Array<Omit<ProductPerformanceIntelligenceItem, 'revenueRank' | 'profitRank' | 'performanceTier'>> = []

    for (const prod of activeProducts) {
      const saleStats = salesByProd.get(prod.id) || { unitsSold: 0, revenuePaise: 0, cogsPaise: 0 }
      const retStats = returnsByProd.get(prod.id) || { units: 0, refundPaise: 0 }
      const invStats = stockByProd.get(prod.id) || { quantity: 0, costPaise: 0 }

      const netUnits = Math.max(0, saleStats.unitsSold - retStats.units)
      const netRevenue = Math.max(0, saleStats.revenuePaise - retStats.refundPaise)
      const grossProfit = netRevenue - saleStats.cogsPaise
      const margin = calculateMarginPercent(netRevenue, grossProfit)
      const returnRate =
        saleStats.unitsSold > 0 ? Number(((retStats.units / saleStats.unitsSold) * 100).toFixed(1)) : 0
      const velocity = Number((netUnits / Math.max(1, observationDays)).toFixed(2))

      items.push({
        productId: prod.id,
        sku: prod.sku,
        productName: prod.name,
        category: prod.category || 'General',
        branchId: branchFilter,
        netUnitsSold: netUnits,
        netRevenuePaise: netRevenue,
        grossProfitPaise: grossProfit,
        grossMarginPercent: margin,
        returnedUnits: retStats.units,
        returnRatePercent: returnRate,
        salesVelocityPerDay: velocity,
        currentStock: invStats.quantity,
        unitCostPaise: prod.costPricePaise ?? prod.costPriceCents ?? 0,
        inventoryCostPaise: invStats.costPaise,
      })
    }

    // Rank by revenue
    const sortedByRevenue = [...items].sort((a, b) => b.netRevenuePaise - a.netRevenuePaise)
    const revRankMap = new Map(sortedByRevenue.map((item, idx) => [item.productId, idx + 1]))

    // Rank by gross profit
    const sortedByProfit = [...items].sort((a, b) => b.grossProfitPaise - a.grossProfitPaise)
    const profitRankMap = new Map(sortedByProfit.map((item, idx) => [item.productId, idx + 1]))

    const totalProducts = items.length
    const finalItems: ProductPerformanceIntelligenceItem[] = []

    for (const it of items) {
      const rRank = revRankMap.get(it.productId) || totalProducts
      const pRank = profitRankMap.get(it.productId) || totalProducts

      // Performance Tier Matrix
      let tier: 'Star' | 'Cash Cow' | 'Opportunity' | 'Underperformer' | 'New / Low Data' = 'Underperformer'

      if (it.netUnitsSold === 0 && it.netRevenuePaise === 0) {
        tier = 'New / Low Data'
      } else if (rRank <= Math.ceil(totalProducts * 0.3) && pRank <= Math.ceil(totalProducts * 0.3)) {
        // High revenue and high profit
        tier = 'Star'
      } else if (pRank <= Math.ceil(totalProducts * 0.4) && it.grossMarginPercent >= 30) {
        // High margin & solid profit
        tier = 'Cash Cow'
      } else if (rRank <= Math.ceil(totalProducts * 0.4) && it.grossMarginPercent < 20) {
        // High volume/revenue, but weak profit margin
        tier = 'Opportunity'
      } else {
        tier = 'Underperformer'
      }

      finalItems.push({
        ...it,
        revenueRank: rRank,
        profitRank: pRank,
        performanceTier: tier,
      })
    }

    return finalItems.sort((a, b) => b.netRevenuePaise - a.netRevenuePaise)
  },

  /**
   * 5. SUMMARY ACTION COUNTS
   */
  async getSummaryCounts(
    workspaceId: WorkspaceId,
    config: IntelligenceConfig = {}
  ): Promise<IntelligenceSummaryCounts> {
    const [replenishment, slowMoving, alerts] = await Promise.all([
      this.getReplenishmentRecommendations(workspaceId, config),
      this.getSlowMovingInventory(workspaceId, config),
      this.getProfitabilityAlerts(workspaceId, config),
    ])

    const criticalReplenish = replenishment.filter((r) => r.priority === 'critical').length
    const criticalAlertsCount = alerts.filter((a) => a.severity === 'critical').length
    const totalCritical = criticalReplenish + criticalAlertsCount

    const capitalTiedUp = slowMoving.reduce((sum, s) => sum + s.capitalTiedUpPaise, 0)
    const marginAndPriceRisks = alerts.filter((a) => a.type === 'below_cost' || a.type === 'negative_margin' || a.type === 'low_margin').length

    return {
      totalAlerts: alerts.length + replenishment.length + slowMoving.length,
      criticalAlerts: totalCritical,
      replenishmentNeeded: replenishment.length,
      slowMovingCount: slowMoving.length,
      marginAndPriceRisks,
      capitalTiedUpPaise: capitalTiedUp,
    }
  },
}
