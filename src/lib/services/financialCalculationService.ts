import { getDb } from '@/lib/db'
import type { WorkspaceId } from '@/types/database'
import { calculateMarginPercent } from '@/utils/money'

export interface DateRangeFilter {
  startDate?: string // YYYY-MM-DD inclusive
  endDate?: string // YYYY-MM-DD inclusive
}

export type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'prev_month' | 'custom' | 'all'

export interface FinancialSummary {
  workspaceId: WorkspaceId
  branchId?: string
  dateRange?: DateRangeFilter
  grossSalesPaise: number
  grossSalesCents: number
  discountsPaise: number
  discountsCents: number
  returnsPaise: number
  returnsCents: number
  netSalesPaise: number
  netSalesCents: number
  cogsPaise: number
  cogsCents: number
  grossProfitPaise: number
  grossProfitCents: number
  grossMarginPercent: number
  grossProfitMarginPercent: number
  operatingExpensesPaise: number
  operatingExpensesCents: number
  netProfitPaise: number
  netProfitCents: number
  netOperatingProfitPaise: number
  netOperatingProfitCents: number
  netMarginPercent: number
  netProfitMarginPercent: number
  inventoryValuationPaise: number
  inventoryValuationCents: number
  averageTransactionValuePaise: number
  averageTransactionValueCents: number
  totalSkus: number
  orderCount: number
  unitsSold: number
  lowStockCount: number
  outOfStockCount: number
  healthyStockCount: number
}

export interface BranchPerformanceSummary {
  branchId: string
  branchCode: string
  branchName: string
  locationType: string
  city: string
  manager: string
  grossSalesPaise: number
  grossSalesCents: number
  discountsPaise: number
  discountsCents: number
  returnsPaise: number
  returnsCents: number
  netSalesPaise: number
  netSalesCents: number
  cogsPaise: number
  cogsCents: number
  grossProfitPaise: number
  grossProfitCents: number
  grossMarginPercent: number
  operatingExpensesPaise: number
  operatingExpensesCents: number
  netProfitPaise: number
  netProfitCents: number
  netOperatingProfitPaise: number
  netOperatingProfitCents: number
  netMarginPercent: number
  orderCount: number
  averageTransactionValuePaise: number
  unitsSold: number
  returnRatePercent: number
  activeSkus: number
  inventoryValuationPaise: number
  inventoryValuationCents: number
  lowStockCount: number
  stockHealthPercent: number
}

export interface ProductSalesRanking {
  productId: string
  sku: string
  name: string
  category: string
  unitsSold: number
  returnedUnits: number
  netUnitsSold: number
  revenuePaise: number
  revenueCents: number
  cogsPaise: number
  cogsCents: number
  profitPaise: number
  profitCents: number
  marginPercent: number
  returnRatePercent: number
  velocity: 'High' | 'Moderate' | 'Slow'
}

export interface SlowMovingProduct {
  productId: string
  sku: string
  name: string
  category: string
  currentStock: number
  unitCostPaise: number
  capitalTiedUpPaise: number
  unitsSoldInWindow: number
  lastSoldDate?: string
  observationWindowDays: number
}

export interface DailyTrendPoint {
  date: string // YYYY-MM-DD
  displayDate: string // e.g. Oct 22
  grossSalesPaise: number
  netSalesPaise: number
  cogsPaise: number
  expensesPaise: number
  grossProfitPaise: number
  netProfitPaise: number
  marginPercent: number
  orderCount: number
  unitsSold: number
}

export interface CategoryBreakdownItem {
  name: string
  revenuePaise: number
  unitsSold: number
  profitPaise: number
  marginPercent: number
  percentageShare: number
}

export interface PaymentMethodBreakdownItem {
  method: string
  revenuePaise: number
  transactionCount: number
  percentageShare: number
}

export interface MonthlyTrendItem {
  month: string // YYYY-MM
  displayMonth: string // e.g. Oct 2026
  grossSalesPaise: number
  netSalesPaise: number
  cogsPaise: number
  expensesPaise: number
  grossProfitPaise: number
  netProfitPaise: number
  marginPercent: number
  orderCount: number
}

export function getDateRangeFromPreset(preset: DatePreset, referenceDate = new Date()): DateRangeFilter {
  const pad = (n: number) => String(n).padStart(2, '0')
  const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const ref = new Date(referenceDate)
  const todayStr = toYMD(ref)

  switch (preset) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr }
    case 'yesterday': {
      const y = new Date(ref)
      y.setDate(y.getDate() - 1)
      const yStr = toYMD(y)
      return { startDate: yStr, endDate: yStr }
    }
    case '7d': {
      const past = new Date(ref)
      past.setDate(past.getDate() - 6)
      return { startDate: toYMD(past), endDate: todayStr }
    }
    case '30d': {
      const past = new Date(ref)
      past.setDate(past.getDate() - 29)
      return { startDate: toYMD(past), endDate: todayStr }
    }
    case 'month': {
      const startOfMonth = new Date(ref.getFullYear(), ref.getMonth(), 1)
      return { startDate: toYMD(startOfMonth), endDate: todayStr }
    }
    case 'prev_month': {
      const startOfPrevMonth = new Date(ref.getFullYear(), ref.getMonth() - 1, 1)
      const endOfPrevMonth = new Date(ref.getFullYear(), ref.getMonth(), 0)
      return { startDate: toYMD(startOfPrevMonth), endDate: toYMD(endOfPrevMonth) }
    }
    case 'all':
    default:
      return {}
  }
}

export function isDateInRange(dateIsoOrYmd: string, filter?: DateRangeFilter): boolean {
  if (!filter) return true
  const dateStr = dateIsoOrYmd.slice(0, 10)
  if (filter.startDate && dateStr < filter.startDate) return false
  if (filter.endDate && dateStr > filter.endDate) return false
  return true
}

export const financialCalculationService = {
  async calculateSummary(
    workspaceId: WorkspaceId,
    branchId?: string,
    dateFilter?: DateRangeFilter
  ): Promise<FinancialSummary> {
    return this.getSummary(workspaceId, branchId, dateFilter)
  },

  /**
   * Compute comprehensive financial metrics for a workspace, optional branch filter, and optional date range
   * Formulas:
   *  Gross Sales = sum of subtotal before order discount
   *  Net Sales = Gross Sales - Discounts - Customer Returns
   *  COGS = wholesale cost of items sold, net of restocked returns
   *  Gross Profit = Net Sales - COGS
   *  Net Operating Profit = Gross Profit - Operating Expenses
   *  Gross Margin % = (Gross Profit / Net Sales) * 100
   *  Net Margin % = (Net Operating Profit / Net Sales) * 100
   */
  async getSummary(
    workspaceId: WorkspaceId,
    branchId?: string,
    dateFilter?: DateRangeFilter
  ): Promise<FinancialSummary> {
    const db = await getDb()

    // 1. Sales & Line Items
    let allSales = await db.getAllFromIndex('sales', 'by-workspace', workspaceId)
    if (branchId && branchId !== 'all') {
      allSales = allSales.filter((s) => s.branchId === branchId)
    }

    // Filter valid statuses and date range
    const filteredSales = allSales.filter((s) => {
      if (s.status === 'cancelled') return false
      return isDateInRange(s.createdAt, dateFilter)
    })

    const matchingSaleIds = new Set(filteredSales.map((s) => s.id))

    let grossSales = 0
    let totalDiscounts = 0
    let totalCogs = 0
    let completedOrderCount = 0

    for (const sale of filteredSales) {
      if (sale.status === 'completed' || sale.status === 'partial_return' || sale.status === 'refunded') {
        const subtotal = sale.subtotalPaise ?? sale.subtotalCents ?? 0
        const discount = sale.discountPaise ?? sale.discountCents ?? 0
        const cost = sale.totalCostPaise ?? sale.totalCostCents ?? 0
        grossSales += subtotal
        totalDiscounts += discount
        totalCogs += cost
        completedOrderCount++
      }
    }

    // Line items for units sold calculation
    const allLineItems = await db.getAllFromIndex('saleLineItems', 'by-workspace', workspaceId)
    let totalGrossUnitsSold = 0
    for (const li of allLineItems) {
      if (matchingSaleIds.has(li.saleId)) {
        totalGrossUnitsSold += li.quantity
      }
    }

    // 2. Returns & COGS reversal on restocked goods
    let allReturns = await db.getAllFromIndex('saleReturns', 'by-workspace', workspaceId)
    if (branchId && branchId !== 'all') {
      allReturns = allReturns.filter((r) => r.branchId === branchId)
    }

    const filteredReturns = allReturns.filter((r) => isDateInRange(r.createdAt, dateFilter))

    const totalReturns = filteredReturns.reduce(
      (sum, r) => sum + (r.refundAmountPaise ?? r.refundAmountCents ?? 0),
      0
    )

    let totalReturnedUnits = 0
    for (const ret of filteredReturns) {
      if (ret.returnedItems) {
        for (const item of ret.returnedItems) {
          totalReturnedUnits += item.quantity
        }
      }
    }

    let totalRestockedCogs = 0
    if (filteredReturns.length > 0) {
      const movements = await db.getAllFromIndex('stockMovements', 'by-workspace', workspaceId)
      const retIdSet = new Set(filteredReturns.map((r) => r.id))
      for (const m of movements) {
        if (m.type === 'sale_return' && retIdSet.has(m.referenceId || '')) {
          const unitCost = m.unitCostPaise ?? m.unitCostCents ?? 0
          totalRestockedCogs += m.quantityDelta * unitCost
        }
      }
    }
    const netCogs = Math.max(0, totalCogs - totalRestockedCogs)
    const netUnitsSold = Math.max(0, totalGrossUnitsSold - totalReturnedUnits)

    // 3. Operating Expenses (Inventory PO purchases enter assets, not opex)
    let allExpenses = await db.getAllFromIndex('operatingExpenses', 'by-workspace', workspaceId)
    if (branchId && branchId !== 'all') {
      allExpenses = allExpenses.filter((e) => e.branchId === branchId || e.branchId === 'consolidated')
    }

    const filteredExpenses = allExpenses.filter((e) => isDateInRange(e.date, dateFilter))
    const totalExpenses = filteredExpenses.reduce(
      (sum, e) => sum + (e.amountPaise ?? e.amountCents ?? 0),
      0
    )

    // 4. Inventory Valuation & Stock Counts (current snapshot at branch)
    let inventory = await db.getAllFromIndex('inventory', 'by-workspace', workspaceId)
    if (branchId && branchId !== 'all') {
      inventory = inventory.filter((i) => i.branchId === branchId)
    }

    let inventoryValuation = 0
    let lowStock = 0
    let outOfStock = 0
    let healthyStock = 0

    for (const item of inventory) {
      const itemCost = item.averageCostPaise ?? item.averageCostCents ?? 0
      inventoryValuation += item.quantity * itemCost
      if (item.quantity <= 0) {
        outOfStock++
      } else if (item.quantity <= item.reorderPoint) {
        lowStock++
      } else {
        healthyStock++
      }
    }

    // 5. Margin and Net Calculations
    const netSales = Math.max(0, grossSales - totalDiscounts - totalReturns)
    const grossProfit = netSales - netCogs
    const netProfit = grossProfit - totalExpenses
    const grossMarginPercent = calculateMarginPercent(netSales, grossProfit)
    const netMarginPercent = calculateMarginPercent(netSales, netProfit)
    const averageTransactionValue = completedOrderCount > 0 ? Math.round(netSales / completedOrderCount) : 0

    return {
      workspaceId,
      branchId,
      dateRange: dateFilter,
      grossSalesPaise: grossSales,
      grossSalesCents: grossSales,
      discountsPaise: totalDiscounts,
      discountsCents: totalDiscounts,
      returnsPaise: totalReturns,
      returnsCents: totalReturns,
      netSalesPaise: netSales,
      netSalesCents: netSales,
      cogsPaise: netCogs,
      cogsCents: netCogs,
      grossProfitPaise: grossProfit,
      grossProfitCents: grossProfit,
      grossMarginPercent,
      grossProfitMarginPercent: grossMarginPercent,
      operatingExpensesPaise: totalExpenses,
      operatingExpensesCents: totalExpenses,
      netProfitPaise: netProfit,
      netProfitCents: netProfit,
      netOperatingProfitPaise: netProfit,
      netOperatingProfitCents: netProfit,
      netMarginPercent,
      netProfitMarginPercent: netMarginPercent,
      inventoryValuationPaise: inventoryValuation,
      inventoryValuationCents: inventoryValuation,
      averageTransactionValuePaise: averageTransactionValue,
      averageTransactionValueCents: averageTransactionValue,
      totalSkus: inventory.length,
      orderCount: completedOrderCount,
      unitsSold: netUnitsSold,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
      healthyStockCount: healthyStock,
    }
  },

  /**
   * Branch performance benchmarking summary with date filtering
   */
  async getBranchPerformance(
    workspaceId: WorkspaceId,
    dateFilter?: DateRangeFilter
  ): Promise<BranchPerformanceSummary[]> {
    const db = await getDb()
    const branches = (await db.getAllFromIndex('branches', 'by-workspace', workspaceId)).filter(
      (b) => b.status !== 'archived'
    )

    const summaries: BranchPerformanceSummary[] = []

    for (const b of branches) {
      const summary = await this.getSummary(workspaceId, b.id, dateFilter)
      const totalInventoryItems = summary.healthyStockCount + summary.lowStockCount + summary.outOfStockCount
      const healthPct =
        totalInventoryItems > 0
          ? Number(((summary.healthyStockCount / totalInventoryItems) * 100).toFixed(1))
          : 100

      const returnRate =
        summary.grossSalesPaise > 0
          ? Number(((summary.returnsPaise / summary.grossSalesPaise) * 100).toFixed(1))
          : 0

      summaries.push({
        branchId: b.id,
        branchCode: b.code,
        branchName: b.name,
        locationType: b.locationType,
        city: b.city,
        manager: b.manager,
        grossSalesPaise: summary.grossSalesPaise,
        grossSalesCents: summary.grossSalesCents,
        discountsPaise: summary.discountsPaise,
        discountsCents: summary.discountsCents,
        returnsPaise: summary.returnsPaise,
        returnsCents: summary.returnsCents,
        netSalesPaise: summary.netSalesPaise,
        netSalesCents: summary.netSalesCents,
        cogsPaise: summary.cogsPaise,
        cogsCents: summary.cogsCents,
        grossProfitPaise: summary.grossProfitPaise,
        grossProfitCents: summary.grossProfitCents,
        grossMarginPercent: summary.grossMarginPercent,
        operatingExpensesPaise: summary.operatingExpensesPaise,
        operatingExpensesCents: summary.operatingExpensesCents,
        netProfitPaise: summary.netProfitPaise,
        netProfitCents: summary.netProfitCents,
        netOperatingProfitPaise: summary.netProfitPaise,
        netOperatingProfitCents: summary.netProfitCents,
        netMarginPercent: summary.netMarginPercent,
        orderCount: summary.orderCount,
        averageTransactionValuePaise: summary.averageTransactionValuePaise,
        unitsSold: summary.unitsSold,
        returnRatePercent: returnRate,
        activeSkus: summary.totalSkus,
        inventoryValuationPaise: summary.inventoryValuationPaise,
        inventoryValuationCents: summary.inventoryValuationCents,
        lowStockCount: summary.lowStockCount,
        stockHealthPercent: healthPct,
      })
    }

    return summaries.sort((a, b) => b.netSalesPaise - a.netSalesPaise)
  },

  /**
   * Product velocity, profit contribution, and sales ranking with date filtering
   */
  async getProductSalesRankings(
    workspaceId: WorkspaceId,
    branchId?: string,
    dateFilter?: DateRangeFilter
  ): Promise<ProductSalesRanking[]> {
    const db = await getDb()
    let sales = await db.getAllFromIndex('sales', 'by-workspace', workspaceId)
    if (branchId && branchId !== 'all') {
      sales = sales.filter((s) => s.branchId === branchId)
    }

    const filteredSales = sales.filter((s) => {
      if (s.status === 'cancelled') return false
      return isDateInRange(s.createdAt, dateFilter)
    })
    const validSaleIds = new Set(filteredSales.map((s) => s.id))

    const allLineItems = await db.getAllFromIndex('saleLineItems', 'by-workspace', workspaceId)
    const matchingLineItems = allLineItems.filter((item) => validSaleIds.has(item.saleId))

    // Track returns per product
    let allReturns = await db.getAllFromIndex('saleReturns', 'by-workspace', workspaceId)
    if (branchId && branchId !== 'all') {
      allReturns = allReturns.filter((r) => r.branchId === branchId)
    }
    const filteredReturns = allReturns.filter((r) => isDateInRange(r.createdAt, dateFilter))
    const returnedQtyByProd = new Map<string, number>()
    for (const ret of filteredReturns) {
      if (ret.returnedItems) {
        for (const item of ret.returnedItems) {
          returnedQtyByProd.set(
            item.productId,
            (returnedQtyByProd.get(item.productId) || 0) + item.quantity
          )
        }
      }
    }

    const productStats = new Map<
      string,
      {
        sku: string
        name: string
        unitsSold: number
        revenuePaise: number
        cogsPaise: number
      }
    >()

    for (const item of matchingLineItems) {
      const existing = productStats.get(item.productId) || {
        sku: item.sku,
        name: item.productName,
        unitsSold: 0,
        revenuePaise: 0,
        cogsPaise: 0,
      }
      const itemRev = item.totalPaise ?? item.totalCents ?? 0
      const itemCostSnapshot = item.unitCostSnapshotPaise ?? item.unitCostSnapshotCents ?? 0
      existing.unitsSold += item.quantity
      existing.revenuePaise += itemRev
      existing.cogsPaise += item.quantity * itemCostSnapshot
      productStats.set(item.productId, existing)
    }

    const products = await db.getAllFromIndex('products', 'by-workspace', workspaceId)
    const productCategoryMap = new Map(products.map((p) => [p.id, p.category]))

    const rankings: ProductSalesRanking[] = []
    for (const [productId, stats] of productStats.entries()) {
      const returned = returnedQtyByProd.get(productId) || 0
      const netUnits = Math.max(0, stats.unitsSold - returned)
      const profit = stats.revenuePaise - stats.cogsPaise
      const margin = calculateMarginPercent(stats.revenuePaise, profit)
      const returnRate =
        stats.unitsSold > 0 ? Number(((returned / stats.unitsSold) * 100).toFixed(1)) : 0

      let velocity: 'High' | 'Moderate' | 'Slow' = 'Moderate'
      if (stats.unitsSold >= 50) velocity = 'High'
      else if (stats.unitsSold <= 10) velocity = 'Slow'

      rankings.push({
        productId,
        sku: stats.sku,
        name: stats.name,
        category: productCategoryMap.get(productId) || 'General',
        unitsSold: stats.unitsSold,
        returnedUnits: returned,
        netUnitsSold: netUnits,
        revenuePaise: stats.revenuePaise,
        revenueCents: stats.revenuePaise,
        cogsPaise: stats.cogsPaise,
        cogsCents: stats.cogsPaise,
        profitPaise: profit,
        profitCents: profit,
        marginPercent: margin,
        returnRatePercent: returnRate,
        velocity,
      })
    }

    return rankings.sort((a, b) => b.revenuePaise - a.revenuePaise)
  },

  /**
   * Identifies slow-moving products and capital tied up on shelves
   */
  async getSlowMovingProducts(
    workspaceId: WorkspaceId,
    branchId?: string,
    observationDays = 30
  ): Promise<SlowMovingProduct[]> {
    const db = await getDb()
    const now = new Date()
    const past = new Date(now)
    past.setDate(past.getDate() - observationDays)

    const dateFilter: DateRangeFilter = {
      startDate: past.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
    }

    const rankings = await this.getProductSalesRankings(workspaceId, branchId, dateFilter)
    const salesMap = new Map(rankings.map((r) => [r.productId, r]))

    let inventory = await db.getAllFromIndex('inventory', 'by-workspace', workspaceId)
    if (branchId && branchId !== 'all') {
      inventory = inventory.filter((i) => i.branchId === branchId)
    }

    const products = await db.getAllFromIndex('products', 'by-workspace', workspaceId)
    const productMap = new Map(products.map((p) => [p.id, p]))

    const slowMoving: SlowMovingProduct[] = []

    for (const inv of inventory) {
      if (inv.quantity > 0) {
        const prod = productMap.get(inv.productId)
        if (!prod || prod.status === 'archived') continue

        const saleStats = salesMap.get(inv.productId)
        const unitsSold = saleStats ? saleStats.unitsSold : 0

        // Slow-moving threshold: 0 or fewer than 2 units sold in observation period
        if (unitsSold <= 2) {
          const cost = inv.averageCostPaise ?? inv.averageCostCents ?? prod.costPricePaise ?? 0
          const tiedUp = inv.quantity * cost

          slowMoving.push({
            productId: inv.productId,
            sku: prod.sku,
            name: prod.name,
            category: prod.category || 'General',
            currentStock: inv.quantity,
            unitCostPaise: cost,
            capitalTiedUpPaise: tiedUp,
            unitsSoldInWindow: unitsSold,
            observationWindowDays: observationDays,
          })
        }
      }
    }

    return slowMoving.sort((a, b) => b.capitalTiedUpPaise - a.capitalTiedUpPaise)
  },

  /**
   * Generate daily timeseries points for trends charts
   */
  async getDailyTrends(
    workspaceId: WorkspaceId,
    options?: { branchId?: string; startDate?: string; endDate?: string }
  ): Promise<DailyTrendPoint[]> {
    const db = await getDb()

    // 1. Fetch sales
    let sales = await db.getAllFromIndex('sales', 'by-workspace', workspaceId)
    if (options?.branchId && options.branchId !== 'all') {
      sales = sales.filter((s) => s.branchId === options.branchId)
    }
    sales = sales.filter((s) => s.status !== 'cancelled')

    // 2. Fetch returns
    let returns = await db.getAllFromIndex('saleReturns', 'by-workspace', workspaceId)
    if (options?.branchId && options.branchId !== 'all') {
      returns = returns.filter((r) => r.branchId === options.branchId)
    }

    // 3. Fetch expenses
    let expenses = await db.getAllFromIndex('operatingExpenses', 'by-workspace', workspaceId)
    if (options?.branchId && options.branchId !== 'all') {
      expenses = expenses.filter((e) => e.branchId === options.branchId || e.branchId === 'consolidated')
    }

    // Determine date range for time series
    let startStr = options?.startDate
    let endStr = options?.endDate

    if (!startStr || !endStr) {
      const now = new Date()
      endStr = now.toISOString().slice(0, 10)
      const past = new Date(now)
      past.setDate(past.getDate() - 29)
      startStr = past.toISOString().slice(0, 10)
    }

    // Generate continuous date array
    const dateMap = new Map<
      string,
      {
        grossSalesPaise: number
        discountsPaise: number
        returnsPaise: number
        cogsPaise: number
        expensesPaise: number
        orderCount: number
        unitsSold: number
      }
    >()

    const curr = new Date(startStr)
    const end = new Date(endStr)
    while (curr <= end) {
      const ymd = curr.toISOString().slice(0, 10)
      dateMap.set(ymd, {
        grossSalesPaise: 0,
        discountsPaise: 0,
        returnsPaise: 0,
        cogsPaise: 0,
        expensesPaise: 0,
        orderCount: 0,
        unitsSold: 0,
      })
      curr.setDate(curr.getDate() + 1)
    }

    // Aggregate sales
    for (const s of sales) {
      const ymd = s.createdAt.slice(0, 10)
      if (dateMap.has(ymd)) {
        const item = dateMap.get(ymd)!
        item.grossSalesPaise += s.subtotalPaise ?? s.subtotalCents ?? 0
        item.discountsPaise += s.discountPaise ?? s.discountCents ?? 0
        item.cogsPaise += s.totalCostPaise ?? s.totalCostCents ?? 0
        item.orderCount++
      }
    }

    // Aggregate returns
    for (const r of returns) {
      const ymd = r.createdAt.slice(0, 10)
      if (dateMap.has(ymd)) {
        const item = dateMap.get(ymd)!
        item.returnsPaise += r.refundAmountPaise ?? r.refundAmountCents ?? 0
      }
    }

    // Aggregate expenses
    for (const e of expenses) {
      const ymd = e.date.slice(0, 10)
      if (dateMap.has(ymd)) {
        const item = dateMap.get(ymd)!
        item.expensesPaise += e.amountPaise ?? e.amountCents ?? 0
      }
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const result: DailyTrendPoint[] = []

    for (const [ymd, data] of dateMap.entries()) {
      const parts = ymd.split('-')
      const mIdx = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const displayDate = `${monthNames[mIdx]} ${day}`

      const netSales = Math.max(0, data.grossSalesPaise - data.discountsPaise - data.returnsPaise)
      const grossProfit = netSales - data.cogsPaise
      const netProfit = grossProfit - data.expensesPaise
      const margin = calculateMarginPercent(netSales, netProfit)

      result.push({
        date: ymd,
        displayDate,
        grossSalesPaise: data.grossSalesPaise,
        netSalesPaise: netSales,
        cogsPaise: data.cogsPaise,
        expensesPaise: data.expensesPaise,
        grossProfitPaise: grossProfit,
        netProfitPaise: netProfit,
        marginPercent: margin,
        orderCount: data.orderCount,
        unitsSold: data.unitsSold,
      })
    }

    return result
  },

  /**
   * Persisted category sales and profit breakdown
   */
  async getCategoryBreakdown(
    workspaceId: WorkspaceId,
    options?: { branchId?: string; startDate?: string; endDate?: string }
  ): Promise<CategoryBreakdownItem[]> {
    const rankings = await this.getProductSalesRankings(workspaceId, options?.branchId, {
      startDate: options?.startDate,
      endDate: options?.endDate,
    })

    const catMap = new Map<string, { revenuePaise: number; unitsSold: number; profitPaise: number }>()
    let totalRev = 0

    for (const r of rankings) {
      const cat = r.category || 'General'
      const existing = catMap.get(cat) || { revenuePaise: 0, unitsSold: 0, profitPaise: 0 }
      existing.revenuePaise += r.revenuePaise
      existing.unitsSold += r.unitsSold
      existing.profitPaise += r.profitPaise
      totalRev += r.revenuePaise
      catMap.set(cat, existing)
    }

    const result: CategoryBreakdownItem[] = []
    for (const [name, stats] of catMap.entries()) {
      const share = totalRev > 0 ? Number(((stats.revenuePaise / totalRev) * 100).toFixed(1)) : 0
      const margin = calculateMarginPercent(stats.revenuePaise, stats.profitPaise)
      result.push({
        name,
        revenuePaise: stats.revenuePaise,
        unitsSold: stats.unitsSold,
        profitPaise: stats.profitPaise,
        marginPercent: margin,
        percentageShare: share,
      })
    }

    return result.sort((a, b) => b.revenuePaise - a.revenuePaise)
  },

  /**
   * Persisted payment tender distribution
   */
  async getPaymentMethodBreakdown(
    workspaceId: WorkspaceId,
    options?: { branchId?: string; startDate?: string; endDate?: string }
  ): Promise<PaymentMethodBreakdownItem[]> {
    const db = await getDb()
    let sales = await db.getAllFromIndex('sales', 'by-workspace', workspaceId)
    if (options?.branchId && options.branchId !== 'all') {
      sales = sales.filter((s) => s.branchId === options.branchId)
    }

    const dateFilter: DateRangeFilter = {
      startDate: options?.startDate,
      endDate: options?.endDate,
    }
    const filtered = sales.filter((s) => s.status !== 'cancelled' && isDateInRange(s.createdAt, dateFilter))

    const methodMap = new Map<string, { revenuePaise: number; count: number }>()
    let totalRev = 0

    for (const s of filtered) {
      const m = s.paymentMethod || 'UPI'
      const rev = s.totalPaise ?? s.totalCents ?? 0
      const existing = methodMap.get(m) || { revenuePaise: 0, count: 0 }
      existing.revenuePaise += rev
      existing.count++
      totalRev += rev
      methodMap.set(m, existing)
    }

    const result: PaymentMethodBreakdownItem[] = []
    for (const [method, data] of methodMap.entries()) {
      const share = totalRev > 0 ? Number(((data.revenuePaise / totalRev) * 100).toFixed(1)) : 0
      result.push({
        method,
        revenuePaise: data.revenuePaise,
        transactionCount: data.count,
        percentageShare: share,
      })
    }

    return result.sort((a, b) => b.revenuePaise - a.revenuePaise)
  },

  /**
   * Monthly trend trajectory for previous months
   */
  async getMonthlyTrends(
    workspaceId: WorkspaceId,
    options?: { branchId?: string; monthsCount?: number }
  ): Promise<MonthlyTrendItem[]> {
    const db = await getDb()
    let sales = await db.getAllFromIndex('sales', 'by-workspace', workspaceId)
    if (options?.branchId && options.branchId !== 'all') {
      sales = sales.filter((s) => s.branchId === options.branchId)
    }
    sales = sales.filter((s) => s.status !== 'cancelled')

    let expenses = await db.getAllFromIndex('operatingExpenses', 'by-workspace', workspaceId)
    if (options?.branchId && options.branchId !== 'all') {
      expenses = expenses.filter((e) => e.branchId === options.branchId || e.branchId === 'consolidated')
    }

    const months = options?.monthsCount || 6
    const monthMap = new Map<
      string,
      {
        grossSalesPaise: number
        cogsPaise: number
        expensesPaise: number
        orderCount: number
      }
    >()

    const now = new Date()
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap.set(key, {
        grossSalesPaise: 0,
        cogsPaise: 0,
        expensesPaise: 0,
        orderCount: 0,
      })
    }

    for (const s of sales) {
      const key = s.createdAt.slice(0, 7)
      if (monthMap.has(key)) {
        const item = monthMap.get(key)!
        item.grossSalesPaise += s.totalPaise ?? s.totalCents ?? 0
        item.cogsPaise += s.totalCostPaise ?? s.totalCostCents ?? 0
        item.orderCount++
      }
    }

    for (const e of expenses) {
      const key = e.date.slice(0, 7)
      if (monthMap.has(key)) {
        const item = monthMap.get(key)!
        item.expensesPaise += e.amountPaise ?? e.amountCents ?? 0
      }
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const result: MonthlyTrendItem[] = []

    for (const [monthKey, data] of monthMap.entries()) {
      const [year, mStr] = monthKey.split('-')
      const displayMonth = `${monthNames[parseInt(mStr, 10) - 1]} ${year}`
      const netSales = data.grossSalesPaise
      const grossProfit = netSales - data.cogsPaise
      const netProfit = grossProfit - data.expensesPaise
      const margin = calculateMarginPercent(netSales, netProfit)

      result.push({
        month: monthKey,
        displayMonth,
        grossSalesPaise: data.grossSalesPaise,
        netSalesPaise: netSales,
        cogsPaise: data.cogsPaise,
        expensesPaise: data.expensesPaise,
        grossProfitPaise: grossProfit,
        netProfitPaise: netProfit,
        marginPercent: margin,
        orderCount: data.orderCount,
      })
    }

    return result
  },
}
