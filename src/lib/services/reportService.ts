import { getDb } from '@/lib/db'
import type { WorkspaceId } from '@/types/database'
import { isDateInRange } from '@/lib/services/financialCalculationService'
import { paiseToRupees, formatINR, calculateMarginPercent } from '@/utils/money'

export type ReportType =
  | 'sales_summary'
  | 'returns_refunds'
  | 'product_profitability'
  | 'inventory_valuation'
  | 'stock_movements'
  | 'stock_transfers'
  | 'purchases_receiving'
  | 'operating_expenses'
  | 'branch_performance'
  | 'tax_summary'

export interface ReportFilterOptions {
  branchId?: string
  startDate?: string
  endDate?: string
  searchQuery?: string
  category?: string
  status?: string
}

export interface ReportColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
}

export interface ReportSummaryKpi {
  label: string
  value: string
  hint?: string
  alert?: boolean
}

export interface ReportData<T = any> {
  reportType: ReportType
  title: string
  subtitle: string
  periodLabel: string
  branchLabel: string
  generatedAt: string
  disclaimer?: string
  columns: ReportColumn[]
  rows: T[]
  summaryKpis: ReportSummaryKpi[]
  csvData: {
    headers: string[]
    rows: (string | number | boolean | null | undefined)[][]
    summaryRow?: (string | number | boolean | null | undefined)[]
  }
}

export const reportService = {
  /**
   * 1. SALES & TRANSACTION SUMMARY REPORT
   */
  async getSalesSummaryReport(
    workspaceId: WorkspaceId,
    options: ReportFilterOptions = {}
  ): Promise<ReportData> {
    const db = await getDb()
    const branches = await db.getAllFromIndex('branches', 'by-workspace', workspaceId)
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))

    let sales = await db.getAllFromIndex('sales', 'by-workspace', workspaceId)
    if (options.branchId && options.branchId !== 'all') {
      sales = sales.filter((s) => s.branchId === options.branchId)
    }

    // Filter date range
    sales = sales.filter((s) => isDateInRange(s.createdAt, { startDate: options.startDate, endDate: options.endDate }))

    // Status filter
    if (options.status && options.status !== 'all') {
      sales = sales.filter((s) => s.status === options.status)
    }

    // Search query
    if (options.searchQuery?.trim()) {
      const q = options.searchQuery.toLowerCase().trim()
      sales = sales.filter(
        (s) =>
          s.receiptNumber.toLowerCase().includes(q) ||
          (s.paymentMethod && s.paymentMethod.toLowerCase().includes(q)) ||
          (s.notes && s.notes.toLowerCase().includes(q))
      )
    }

    sales.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    let totalGrossPaise = 0
    let totalDiscountPaise = 0
    let totalTaxPaise = 0
    let totalNetPaise = 0
    let totalCogsPaise = 0

    const rows = sales.map((s) => {
      const subtotal = s.subtotalPaise ?? s.subtotalCents ?? 0
      const discount = s.discountPaise ?? s.discountCents ?? 0
      const tax = s.taxPaise ?? s.taxCents ?? 0
      const total = s.totalPaise ?? s.totalCents ?? 0
      const cogs = s.totalCostPaise ?? s.totalCostCents ?? 0
      const netProfit = s.netProfitPaise ?? s.netProfitCents ?? total - cogs

      if (s.status !== 'cancelled') {
        totalGrossPaise += subtotal
        totalDiscountPaise += discount
        totalTaxPaise += tax
        totalNetPaise += total
        totalCogsPaise += cogs
      }

      return {
        id: s.id,
        receiptNumber: s.receiptNumber,
        date: s.createdAt.slice(0, 10),
        time: s.createdAt.slice(11, 16),
        branchName: branchMap.get(s.branchId) || 'Unknown Location',
        subtotalRupees: paiseToRupees(subtotal),
        discountRupees: paiseToRupees(discount),
        taxRupees: paiseToRupees(tax),
        totalRupees: paiseToRupees(total),
        cogsRupees: paiseToRupees(cogs),
        netProfitRupees: paiseToRupees(netProfit),
        paymentMethod: s.paymentMethod || 'UPI',
        status: s.status,
      }
    })

    const grossProfitPaise = totalNetPaise - totalCogsPaise
    const overallMargin = calculateMarginPercent(totalNetPaise, grossProfitPaise)

    const branchLabel = options.branchId && options.branchId !== 'all'
      ? branchMap.get(options.branchId) || 'Branch'
      : 'All Branches (Consolidated)'

    const periodLabel = `${options.startDate || 'Beginning'} to ${options.endDate || 'Latest'}`

    return {
      reportType: 'sales_summary',
      title: 'Sales & Transaction Summary Ledger',
      subtitle: 'Complete chronological register of completed, refunded, and cancelled POS sales transactions.',
      periodLabel,
      branchLabel,
      generatedAt: new Date().toISOString(),
      columns: [
        { key: 'receiptNumber', label: 'Receipt #' },
        { key: 'date', label: 'Date' },
        { key: 'branchName', label: 'Branch' },
        { key: 'paymentMethod', label: 'Tender' },
        { key: 'subtotalRupees', label: 'Subtotal (₹)', align: 'right' },
        { key: 'discountRupees', label: 'Discount (₹)', align: 'right' },
        { key: 'taxRupees', label: 'Tax (₹)', align: 'right' },
        { key: 'totalRupees', label: 'Total (₹)', align: 'right' },
        { key: 'status', label: 'Status', align: 'center' },
      ],
      rows,
      summaryKpis: [
        { label: 'Total Gross Volume', value: formatINR(totalGrossPaise), hint: 'Before discounts' },
        { label: 'Total Discounts Given', value: formatINR(totalDiscountPaise) },
        { label: 'Net Sales Realized', value: formatINR(totalNetPaise), hint: 'Excludes cancelled' },
        { label: 'Total Sales Tax', value: formatINR(totalTaxPaise), hint: 'Recorded tax' },
        { label: 'Gross Commercial Profit', value: formatINR(grossProfitPaise), hint: `${overallMargin}% Margin` },
        { label: 'Transactions Count', value: String(rows.filter((r) => r.status !== 'cancelled').length) },
      ],
      csvData: {
        headers: [
          'Receipt Number',
          'Date',
          'Time',
          'Branch Name',
          'Payment Method',
          'Subtotal (INR)',
          'Discount (INR)',
          'Tax (INR)',
          'Total Amount (INR)',
          'COGS (INR)',
          'Net Profit (INR)',
          'Transaction Status',
        ],
        rows: rows.map((r) => [
          r.receiptNumber,
          r.date,
          r.time,
          r.branchName,
          r.paymentMethod,
          r.subtotalRupees.toFixed(2),
          r.discountRupees.toFixed(2),
          r.taxRupees.toFixed(2),
          r.totalRupees.toFixed(2),
          r.cogsRupees.toFixed(2),
          r.netProfitRupees.toFixed(2),
          r.status,
        ]),
        summaryRow: [
          'TOTALS',
          '',
          '',
          '',
          '',
          paiseToRupees(totalGrossPaise).toFixed(2),
          paiseToRupees(totalDiscountPaise).toFixed(2),
          paiseToRupees(totalTaxPaise).toFixed(2),
          paiseToRupees(totalNetPaise).toFixed(2),
          paiseToRupees(totalCogsPaise).toFixed(2),
          paiseToRupees(grossProfitPaise).toFixed(2),
          '',
        ],
      },
    }
  },

  /**
   * 2. RETURNS AND REFUNDS REPORT
   */
  async getReturnsReport(
    workspaceId: WorkspaceId,
    options: ReportFilterOptions = {}
  ): Promise<ReportData> {
    const db = await getDb()
    const branches = await db.getAllFromIndex('branches', 'by-workspace', workspaceId)
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))

    let returns = await db.getAllFromIndex('saleReturns', 'by-workspace', workspaceId)
    if (options.branchId && options.branchId !== 'all') {
      returns = returns.filter((r) => r.branchId === options.branchId)
    }

    returns = returns.filter((r) => isDateInRange(r.createdAt, { startDate: options.startDate, endDate: options.endDate }))

    // Map sale IDs to receipt numbers and payment methods
    const sales = await db.getAllFromIndex('sales', 'by-workspace', workspaceId)
    const saleReceiptMap = new Map(sales.map((s) => [s.id, s.receiptNumber]))
    const salePaymentMap = new Map(sales.map((s) => [s.id, s.paymentMethod]))

    if (options.searchQuery?.trim()) {
      const q = options.searchQuery.toLowerCase().trim()
      returns = returns.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.saleId.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q) ||
          (salePaymentMap.get(r.saleId)?.toLowerCase().includes(q) ?? false)
      )
    }

    returns.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    let totalRefundPaise = 0
    let totalUnitsReturned = 0
    let restockedCount = 0

    const rows = returns.map((r) => {
      const refundAmt = r.refundAmountPaise ?? r.refundAmountCents ?? 0
      totalRefundPaise += refundAmt

      let units = 0
      if (r.returnedItems) {
        for (const item of r.returnedItems) {
          units += item.quantity
        }
      }
      totalUnitsReturned += units
      if (r.restockItems) restockedCount++

      return {
        id: r.id,
        date: r.createdAt.slice(0, 10),
        time: r.createdAt.slice(11, 16),
        receiptNumber: saleReceiptMap.get(r.saleId) || r.saleId,
        branchName: branchMap.get(r.branchId) || 'Location',
        unitsReturned: units,
        refundRupees: paiseToRupees(refundAmt),
        refundMethod: salePaymentMap.get(r.saleId) || 'Original Payment',
        restockStatus: r.restockItems ? 'Restocked (COGS reversed)' : 'Damaged / Discarded (COGS retained)',
        reason: r.reason || 'Customer Return',
      }
    })

    const branchLabel = options.branchId && options.branchId !== 'all'
      ? branchMap.get(options.branchId) || 'Branch'
      : 'All Branches'

    return {
      reportType: 'returns_refunds',
      title: 'Customer Returns & Refunds Ledger',
      subtitle: 'Audit log of items returned, customer payment refunds, restock status, and reason codes.',
      periodLabel: `${options.startDate || 'Beginning'} to ${options.endDate || 'Latest'}`,
      branchLabel,
      generatedAt: new Date().toISOString(),
      columns: [
        { key: 'date', label: 'Return Date' },
        { key: 'receiptNumber', label: 'Original Receipt' },
        { key: 'branchName', label: 'Branch' },
        { key: 'unitsReturned', label: 'Units', align: 'right' },
        { key: 'refundRupees', label: 'Refund Amount (₹)', align: 'right' },
        { key: 'refundMethod', label: 'Refund Method' },
        { key: 'restockStatus', label: 'Restock Handling' },
        { key: 'reason', label: 'Return Reason' },
      ],
      rows,
      summaryKpis: [
        { label: 'Total Refunds Paid', value: formatINR(totalRefundPaise), alert: totalRefundPaise > 0 },
        { label: 'Units Returned', value: String(totalUnitsReturned) },
        { label: 'Total Return Events', value: String(returns.length) },
        { label: 'Restocked Items Rate', value: returns.length > 0 ? `${Math.round((restockedCount / returns.length) * 100)}%` : '0%' },
      ],
      csvData: {
        headers: [
          'Return ID',
          'Date',
          'Time',
          'Original Receipt',
          'Branch Name',
          'Units Returned',
          'Refund Amount (INR)',
          'Refund Method',
          'Restock Handling',
          'Return Reason',
        ],
        rows: rows.map((r) => [
          r.id,
          r.date,
          r.time,
          r.receiptNumber,
          r.branchName,
          r.unitsReturned,
          r.refundRupees.toFixed(2),
          r.refundMethod,
          r.restockStatus,
          r.reason,
        ]),
        summaryRow: [
          'TOTALS',
          '',
          '',
          '',
          '',
          totalUnitsReturned,
          paiseToRupees(totalRefundPaise).toFixed(2),
          '',
          '',
          '',
        ],
      },
    }
  },

  /**
   * 3. PRODUCT PERFORMANCE & PROFITABILITY REPORT
   */
  async getProductProfitabilityReport(
    workspaceId: WorkspaceId,
    options: ReportFilterOptions = {}
  ): Promise<ReportData> {
    const db = await getDb()
    const products = await db.getAllFromIndex('products', 'by-workspace', workspaceId)
    const activeProducts = products.filter((p) => p.status !== 'archived')

    let sales = await db.getAllFromIndex('sales', 'by-workspace', workspaceId)
    sales = sales.filter((s) => s.status !== 'cancelled' && isDateInRange(s.createdAt, { startDate: options.startDate, endDate: options.endDate }))
    if (options.branchId && options.branchId !== 'all') {
      sales = sales.filter((s) => s.branchId === options.branchId)
    }
    const matchingSaleIds = new Set(sales.map((s) => s.id))

    const lineItems = await db.getAllFromIndex('saleLineItems', 'by-workspace', workspaceId)

    let returns = await db.getAllFromIndex('saleReturns', 'by-workspace', workspaceId)
    returns = returns.filter((r) => isDateInRange(r.createdAt, { startDate: options.startDate, endDate: options.endDate }))
    if (options.branchId && options.branchId !== 'all') {
      returns = returns.filter((r) => r.branchId === options.branchId)
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

    const statsByProd = new Map<
      string,
      {
        unitsSold: number
        revenuePaise: number
        cogsPaise: number
      }
    >()

    for (const li of lineItems) {
      if (matchingSaleIds.has(li.saleId)) {
        const cur = statsByProd.get(li.productId) || { unitsSold: 0, revenuePaise: 0, cogsPaise: 0 }
        cur.unitsSold += li.quantity
        cur.revenuePaise += li.totalPaise ?? li.totalCents ?? 0
        cur.cogsPaise += li.quantity * (li.unitCostSnapshotPaise ?? li.unitCostSnapshotCents ?? 0)
        statsByProd.set(li.productId, cur)
      }
    }

    let totalNetRevenuePaise = 0
    let totalCogsPaise = 0
    let totalGrossProfitPaise = 0
    let totalUnitsSold = 0

    let rows = activeProducts.map((p) => {
      const stats = statsByProd.get(p.id) || { unitsSold: 0, revenuePaise: 0, cogsPaise: 0 }
      const ret = returnsByProd.get(p.id) || { units: 0, refundPaise: 0 }

      const netUnits = Math.max(0, stats.unitsSold - ret.units)
      const netSales = Math.max(0, stats.revenuePaise - ret.refundPaise)
      const profit = netSales - stats.cogsPaise
      const margin = calculateMarginPercent(netSales, profit)
      const returnRate =
        stats.unitsSold > 0 ? Number(((ret.units / stats.unitsSold) * 100).toFixed(1)) : 0

      totalNetRevenuePaise += netSales
      totalCogsPaise += stats.cogsPaise
      totalGrossProfitPaise += profit
      totalUnitsSold += netUnits

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category || 'General',
        grossUnits: stats.unitsSold,
        returnedUnits: ret.units,
        netUnitsSold: netUnits,
        netSalesRupees: paiseToRupees(netSales),
        cogsRupees: paiseToRupees(stats.cogsPaise),
        profitRupees: paiseToRupees(profit),
        marginPercent: margin,
        returnRatePercent: returnRate,
      }
    })

    // Apply category filter
    if (options.category && options.category !== 'all') {
      rows = rows.filter((r) => r.category === options.category)
    }

    // Apply search query
    if (options.searchQuery?.trim()) {
      const q = options.searchQuery.toLowerCase().trim()
      rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q))
    }

    rows.sort((a, b) => b.netSalesRupees - a.netSalesRupees)

    const overallMargin = calculateMarginPercent(totalNetRevenuePaise, totalGrossProfitPaise)

    return {
      reportType: 'product_profitability',
      title: 'Product Performance & Gross Profitability',
      subtitle: 'Merchandise profitability breakdown detailing realized sales, cost of goods, gross margins, and returns.',
      periodLabel: `${options.startDate || 'Beginning'} to ${options.endDate || 'Latest'}`,
      branchLabel: options.branchId && options.branchId !== 'all' ? options.branchId : 'All Branches',
      generatedAt: new Date().toISOString(),
      columns: [
        { key: 'sku', label: 'SKU' },
        { key: 'name', label: 'Product Name' },
        { key: 'category', label: 'Category' },
        { key: 'netUnitsSold', label: 'Net Units', align: 'right' },
        { key: 'netSalesRupees', label: 'Net Sales (₹)', align: 'right' },
        { key: 'cogsRupees', label: 'COGS (₹)', align: 'right' },
        { key: 'profitRupees', label: 'Gross Profit (₹)', align: 'right' },
        { key: 'marginPercent', label: 'Margin %', align: 'right' },
        { key: 'returnRatePercent', label: 'Return %', align: 'right' },
      ],
      rows,
      summaryKpis: [
        { label: 'Total Net Revenue', value: formatINR(totalNetRevenuePaise) },
        { label: 'Cost of Goods Sold', value: formatINR(totalCogsPaise) },
        { label: 'Gross Profit Contribution', value: formatINR(totalGrossProfitPaise) },
        { label: 'Overall Gross Margin', value: `${overallMargin}%` },
        { label: 'Total Units Sold', value: String(totalUnitsSold) },
      ],
      csvData: {
        headers: [
          'SKU',
          'Product Name',
          'Category',
          'Gross Units Sold',
          'Returned Units',
          'Net Units Sold',
          'Net Sales (INR)',
          'COGS (INR)',
          'Gross Profit (INR)',
          'Gross Margin %',
          'Return Rate %',
        ],
        rows: rows.map((r) => [
          r.sku,
          r.name,
          r.category,
          r.grossUnits,
          r.returnedUnits,
          r.netUnitsSold,
          r.netSalesRupees.toFixed(2),
          r.cogsRupees.toFixed(2),
          r.profitRupees.toFixed(2),
          `${r.marginPercent}%`,
          `${r.returnRatePercent}%`,
        ]),
        summaryRow: [
          'TOTALS',
          '',
          '',
          '',
          '',
          totalUnitsSold,
          paiseToRupees(totalNetRevenuePaise).toFixed(2),
          paiseToRupees(totalCogsPaise).toFixed(2),
          paiseToRupees(totalGrossProfitPaise).toFixed(2),
          `${overallMargin}%`,
          '',
        ],
      },
    }
  },

  /**
   * 4. INVENTORY ON HAND AND VALUATION AT COST
   */
  async getInventoryValuationReport(
    workspaceId: WorkspaceId,
    options: ReportFilterOptions = {}
  ): Promise<ReportData> {
    const db = await getDb()
    const branches = await db.getAllFromIndex('branches', 'by-workspace', workspaceId)
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))

    const products = await db.getAllFromIndex('products', 'by-workspace', workspaceId)
    const activeProducts = products.filter((p) => p.status !== 'archived')
    const productMap = new Map(activeProducts.map((p) => [p.id, p]))

    let inventory = await db.getAllFromIndex('inventory', 'by-workspace', workspaceId)
    if (options.branchId && options.branchId !== 'all') {
      inventory = inventory.filter((i) => i.branchId === options.branchId)
    }

    let totalUnits = 0
    let totalValuationPaise = 0
    let lowStockCount = 0
    let outOfStockCount = 0

    let rows = inventory
      .map((inv) => {
        const prod = productMap.get(inv.productId)
        if (!prod) return null

        const currentStock = inv.quantityOnHand ?? inv.quantity ?? 0
        const unitCost = inv.averageCostPaise ?? inv.averageCostCents ?? prod.costPricePaise ?? prod.costPriceCents ?? 0
        const valuationPaise = currentStock * unitCost
        const reorder = inv.reorderPoint !== undefined ? inv.reorderPoint : prod.reorderPoint ?? 10

        let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock'
        if (currentStock <= 0) {
          status = 'out_of_stock'
          outOfStockCount++
        } else if (currentStock <= reorder) {
          status = 'low_stock'
          lowStockCount++
        }

        totalUnits += Math.max(0, currentStock)
        totalValuationPaise += Math.max(0, valuationPaise)

        return {
          id: inv.id,
          branchName: branchMap.get(inv.branchId) || 'Branch',
          sku: prod.sku,
          productName: prod.name,
          category: prod.category || 'General',
          currentStock,
          reorderPoint: reorder,
          unitCostRupees: paiseToRupees(unitCost),
          valuationRupees: paiseToRupees(valuationPaise),
          status,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (options.category && options.category !== 'all') {
      rows = rows.filter((r) => r.category === options.category)
    }

    if (options.status && options.status !== 'all') {
      rows = rows.filter((r) => r.status === options.status)
    }

    if (options.searchQuery?.trim()) {
      const q = options.searchQuery.toLowerCase().trim()
      rows = rows.filter((r) => r.productName.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q))
    }

    rows.sort((a, b) => b.valuationRupees - a.valuationRupees)

    return {
      reportType: 'inventory_valuation',
      title: 'Inventory on Hand & Valuation at Cost',
      subtitle: 'Stock balances valued at periodic weighted-average acquisition cost per location.',
      periodLabel: 'Current Real-Time Balance',
      branchLabel: options.branchId && options.branchId !== 'all' ? branchMap.get(options.branchId) || 'Branch' : 'All Branches',
      generatedAt: new Date().toISOString(),
      columns: [
        { key: 'branchName', label: 'Branch' },
        { key: 'sku', label: 'SKU' },
        { key: 'productName', label: 'Product Name' },
        { key: 'category', label: 'Category' },
        { key: 'currentStock', label: 'On Hand', align: 'right' },
        { key: 'reorderPoint', label: 'Reorder At', align: 'right' },
        { key: 'unitCostRupees', label: 'Unit Cost (₹)', align: 'right' },
        { key: 'valuationRupees', label: 'Asset Valuation (₹)', align: 'right' },
        { key: 'status', label: 'Health', align: 'center' },
      ],
      rows,
      summaryKpis: [
        { label: 'Total Inventory Assets', value: formatINR(totalValuationPaise), hint: 'At acquisition cost' },
        { label: 'Total Units on Hand', value: String(totalUnits) },
        { label: 'Tracked SKU Records', value: String(rows.length) },
        { label: 'Low / Out of Stock', value: `${lowStockCount + outOfStockCount} SKUs`, alert: lowStockCount + outOfStockCount > 0 },
      ],
      csvData: {
        headers: [
          'Branch Name',
          'SKU',
          'Product Name',
          'Category',
          'On Hand Quantity',
          'Reorder Threshold',
          'Weighted Average Unit Cost (INR)',
          'Asset Valuation at Cost (INR)',
          'Stock Status',
        ],
        rows: rows.map((r) => [
          r.branchName,
          r.sku,
          r.productName,
          r.category,
          r.currentStock,
          r.reorderPoint,
          r.unitCostRupees.toFixed(2),
          r.valuationRupees.toFixed(2),
          r.status,
        ]),
        summaryRow: [
          'TOTALS',
          '',
          '',
          '',
          totalUnits,
          '',
          '',
          paiseToRupees(totalValuationPaise).toFixed(2),
          '',
        ],
      },
    }
  },

  /**
   * 5. STOCK MOVEMENT AND ADJUSTMENT HISTORY
   */
  async getStockMovementsReport(
    workspaceId: WorkspaceId,
    options: ReportFilterOptions = {}
  ): Promise<ReportData> {
    const db = await getDb()
    const branches = await db.getAllFromIndex('branches', 'by-workspace', workspaceId)
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))

    const products = await db.getAllFromIndex('products', 'by-workspace', workspaceId)
    const productMap = new Map(products.map((p) => [p.id, p]))

    let movements = await db.getAllFromIndex('stockMovements', 'by-workspace', workspaceId)
    if (options.branchId && options.branchId !== 'all') {
      movements = movements.filter((m) => m.branchId === options.branchId)
    }

    movements = movements.filter((m) => isDateInRange(m.createdAt, { startDate: options.startDate, endDate: options.endDate }))

    if (options.status && options.status !== 'all') {
      movements = movements.filter((m) => m.type === options.status)
    }

    movements.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    let netUnitsDelta = 0

    const rows = movements.map((m) => {
      const prod = productMap.get(m.productId)
      const delta = m.quantityDelta
      netUnitsDelta += delta
      const cost = m.unitCostPaise ?? m.unitCostCents ?? 0

      return {
        id: m.id,
        date: m.createdAt.slice(0, 10),
        time: m.createdAt.slice(11, 16),
        branchName: branchMap.get(m.branchId) || 'Location',
        sku: prod?.sku || 'SKU',
        productName: prod?.name || 'Item',
        type: m.type,
        quantityDelta: delta,
        resultingQuantity: m.resultingQuantity,
        unitCostRupees: paiseToRupees(cost),
        referenceType: m.referenceType || 'manual',
        referenceId: m.referenceId || '-',
        notes: m.notes || '-',
      }
    })

    return {
      reportType: 'stock_movements',
      title: 'Stock Movement & Adjustment Ledger',
      subtitle: 'Complete chronological audit log of all inbound receipts, outbound sales, returns, transfers, and stock adjustments.',
      periodLabel: `${options.startDate || 'Beginning'} to ${options.endDate || 'Latest'}`,
      branchLabel: options.branchId && options.branchId !== 'all' ? branchMap.get(options.branchId) || 'Branch' : 'All Branches',
      generatedAt: new Date().toISOString(),
      columns: [
        { key: 'date', label: 'Timestamp' },
        { key: 'branchName', label: 'Branch' },
        { key: 'sku', label: 'SKU' },
        { key: 'productName', label: 'Product' },
        { key: 'type', label: 'Movement Type' },
        { key: 'quantityDelta', label: 'Delta', align: 'right' },
        { key: 'resultingQuantity', label: 'Resulting Stock', align: 'right' },
        { key: 'notes', label: 'Notes / Reference' },
      ],
      rows,
      summaryKpis: [
        { label: 'Total Movement Events', value: String(rows.length) },
        { label: 'Net Units Changed', value: `${netUnitsDelta > 0 ? '+' : ''}${netUnitsDelta} pcs` },
      ],
      csvData: {
        headers: [
          'Movement ID',
          'Date',
          'Time',
          'Branch Name',
          'SKU',
          'Product Name',
          'Movement Type',
          'Quantity Delta',
          'Resulting Quantity',
          'Unit Cost (INR)',
          'Reference Type',
          'Reference ID',
          'Notes',
        ],
        rows: rows.map((r) => [
          r.id,
          r.date,
          r.time,
          r.branchName,
          r.sku,
          r.productName,
          r.type,
          r.quantityDelta,
          r.resultingQuantity,
          r.unitCostRupees.toFixed(2),
          r.referenceType,
          r.referenceId,
          r.notes,
        ]),
        summaryRow: ['TOTALS', '', '', '', '', '', '', netUnitsDelta, '', '', '', '', ''],
      },
    }
  },

  /**
   * 6. INTER-BRANCH STOCK TRANSFERS REPORT
   */
  async getStockTransfersReport(
    workspaceId: WorkspaceId,
    options: ReportFilterOptions = {}
  ): Promise<ReportData> {
    const db = await getDb()
    const branches = await db.getAllFromIndex('branches', 'by-workspace', workspaceId)
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))

    const products = await db.getAllFromIndex('products', 'by-workspace', workspaceId)
    const productMap = new Map(products.map((p) => [p.id, p]))

    let transfers = await db.getAllFromIndex('stockTransfers', 'by-workspace', workspaceId)
    if (options.branchId && options.branchId !== 'all') {
      transfers = transfers.filter(
        (t) => t.sourceBranchId === options.branchId || t.destinationBranchId === options.branchId
      )
    }

    transfers = transfers.filter((t) => isDateInRange(t.createdAt, { startDate: options.startDate, endDate: options.endDate }))

    if (options.status && options.status !== 'all') {
      transfers = transfers.filter((t) => t.status === options.status)
    }

    transfers.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    let totalTransferUnits = 0
    let totalTransferValuePaise = 0

    const rows = transfers.map((t) => {
      const prod = productMap.get(t.productId)
      const cost = t.unitCostPaise ?? t.unitCostCents ?? 0
      const value = t.quantity * cost

      if (t.status !== 'cancelled') {
        totalTransferUnits += t.quantity
        totalTransferValuePaise += value
      }

      return {
        id: t.id,
        transferNumber: t.referenceNumber,
        date: t.createdAt.slice(0, 10),
        sourceBranch: branchMap.get(t.sourceBranchId) || 'Source',
        destinationBranch: branchMap.get(t.destinationBranchId) || 'Destination',
        sku: prod?.sku || 'SKU',
        productName: prod?.name || 'Product',
        quantity: t.quantity,
        unitCostRupees: paiseToRupees(cost),
        totalValueRupees: paiseToRupees(value),
        status: t.status,
        notes: t.notes || '-',
      }
    })

    return {
      reportType: 'stock_transfers',
      title: 'Inter-Branch Stock Transfers Ledger',
      subtitle: 'Audit trail of internal stock relocations, in-transit manifests, and receiving receipts between store locations.',
      periodLabel: `${options.startDate || 'Beginning'} to ${options.endDate || 'Latest'}`,
      branchLabel: options.branchId && options.branchId !== 'all' ? branchMap.get(options.branchId) || 'Branch' : 'All Branches',
      generatedAt: new Date().toISOString(),
      columns: [
        { key: 'transferNumber', label: 'Transfer #' },
        { key: 'date', label: 'Date' },
        { key: 'sourceBranch', label: 'From Location' },
        { key: 'destinationBranch', label: 'To Location' },
        { key: 'productName', label: 'Product Transferred' },
        { key: 'quantity', label: 'Qty', align: 'right' },
        { key: 'totalValueRupees', label: 'Transfer Value (₹)', align: 'right' },
        { key: 'status', label: 'Status', align: 'center' },
      ],
      rows,
      summaryKpis: [
        { label: 'Total Transfers Executed', value: String(transfers.length) },
        { label: 'Units Relocated', value: `${totalTransferUnits} pcs` },
        { label: 'Total Transferred Value', value: formatINR(totalTransferValuePaise) },
      ],
      csvData: {
        headers: [
          'Transfer Number',
          'Date',
          'Origin Branch',
          'Destination Branch',
          'SKU',
          'Product Name',
          'Quantity',
          'Unit Cost (INR)',
          'Total Value (INR)',
          'Status',
          'Notes',
        ],
        rows: rows.map((r) => [
          r.transferNumber,
          r.date,
          r.sourceBranch,
          r.destinationBranch,
          r.sku,
          r.productName,
          r.quantity,
          r.unitCostRupees.toFixed(2),
          r.totalValueRupees.toFixed(2),
          r.status,
          r.notes,
        ]),
        summaryRow: [
          'TOTALS',
          '',
          '',
          '',
          '',
          '',
          totalTransferUnits,
          '',
          paiseToRupees(totalTransferValuePaise).toFixed(2),
          '',
          '',
        ],
      },
    }
  },

  /**
   * 7. PURCHASE ORDERS & INBOUND RECEIVING
   */
  async getPurchasesReport(
    workspaceId: WorkspaceId,
    options: ReportFilterOptions = {}
  ): Promise<ReportData> {
    const db = await getDb()
    const branches = await db.getAllFromIndex('branches', 'by-workspace', workspaceId)
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))

    let purchases = await db.getAllFromIndex('purchases', 'by-workspace', workspaceId)
    if (options.branchId && options.branchId !== 'all') {
      purchases = purchases.filter((p) => p.branchId === options.branchId)
    }

    purchases = purchases.filter((p) => isDateInRange(p.orderedAt || p.createdAt, { startDate: options.startDate, endDate: options.endDate }))

    if (options.status && options.status !== 'all') {
      purchases = purchases.filter((p) => p.status === options.status)
    }

    if (options.searchQuery?.trim()) {
      const q = options.searchQuery.toLowerCase().trim()
      purchases = purchases.filter(
        (p) =>
          p.orderNumber.toLowerCase().includes(q) ||
          p.supplierName.toLowerCase().includes(q) ||
          (p.supplierRef && p.supplierRef.toLowerCase().includes(q))
      )
    }

    purchases.sort((a, b) => (b.orderedAt || b.createdAt).localeCompare(a.orderedAt || a.createdAt))

    let totalSpendPaise = 0
    let receivedCount = 0

    const rows = purchases.map((p) => {
      const cost = p.totalCostPaise ?? p.totalCostCents ?? 0
      if (p.status !== 'cancelled') {
        totalSpendPaise += cost
      }
      if (p.status === 'received') {
        receivedCount++
      }

      return {
        id: p.id,
        orderNumber: p.orderNumber,
        orderedDate: (p.orderedAt || p.createdAt).slice(0, 10),
        receivedDate: p.receivedAt ? p.receivedAt.slice(0, 10) : '-',
        supplierName: p.supplierName,
        branchName: branchMap.get(p.branchId) || 'Location',
        totalCostRupees: paiseToRupees(cost),
        status: p.status,
        supplierRef: p.supplierRef || '-',
      }
    })

    return {
      reportType: 'purchases_receiving',
      title: 'Purchase Orders & Supplier Procurement',
      subtitle: 'Inbound purchase receipts, supplier commitments, and inventory restocking expenditure.',
      periodLabel: `${options.startDate || 'Beginning'} to ${options.endDate || 'Latest'}`,
      branchLabel: options.branchId && options.branchId !== 'all' ? branchMap.get(options.branchId) || 'Branch' : 'All Branches',
      generatedAt: new Date().toISOString(),
      columns: [
        { key: 'orderNumber', label: 'PO #' },
        { key: 'orderedDate', label: 'Ordered' },
        { key: 'supplierName', label: 'Supplier Name' },
        { key: 'branchName', label: 'Receiving Branch' },
        { key: 'receivedDate', label: 'Received' },
        { key: 'totalCostRupees', label: 'Total Cost (₹)', align: 'right' },
        { key: 'status', label: 'Status', align: 'center' },
      ],
      rows,
      summaryKpis: [
        { label: 'Total Purchase Spend', value: formatINR(totalSpendPaise) },
        { label: 'Orders Placed', value: String(purchases.length) },
        { label: 'Fully Received POs', value: String(receivedCount) },
      ],
      csvData: {
        headers: [
          'Order Number',
          'Ordered Date',
          'Supplier Name',
          'Receiving Branch',
          'Received Date',
          'Total Cost (INR)',
          'Status',
          'Supplier Reference',
        ],
        rows: rows.map((r) => [
          r.orderNumber,
          r.orderedDate,
          r.supplierName,
          r.branchName,
          r.receivedDate,
          r.totalCostRupees.toFixed(2),
          r.status,
          r.supplierRef,
        ]),
        summaryRow: ['TOTALS', '', '', '', '', paiseToRupees(totalSpendPaise).toFixed(2), '', ''],
      },
    }
  },

  /**
   * 8. OPERATING EXPENSES REPORT
   */
  async getOperatingExpensesReport(
    workspaceId: WorkspaceId,
    options: ReportFilterOptions = {}
  ): Promise<ReportData> {
    const db = await getDb()
    const branches = await db.getAllFromIndex('branches', 'by-workspace', workspaceId)
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))

    let expenses = await db.getAllFromIndex('operatingExpenses', 'by-workspace', workspaceId)
    if (options.branchId && options.branchId !== 'all') {
      expenses = expenses.filter((e) => e.branchId === options.branchId)
    }

    expenses = expenses.filter((e) => isDateInRange(e.date, { startDate: options.startDate, endDate: options.endDate }))

    if (options.category && options.category !== 'all') {
      expenses = expenses.filter((e) => e.category === options.category)
    }

    if (options.searchQuery?.trim()) {
      const q = options.searchQuery.toLowerCase().trim()
      expenses = expenses.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          (e.receiptRef && e.receiptRef.toLowerCase().includes(q)) ||
          (e.paymentMethod && e.paymentMethod.toLowerCase().includes(q))
      )
    }

    expenses.sort((a, b) => b.date.localeCompare(a.date))

    let totalExpensePaise = 0
    const catMap = new Map<string, number>()

    const rows = expenses.map((e) => {
      const amt = e.amountPaise ?? e.amountCents ?? 0
      totalExpensePaise += amt
      catMap.set(e.category, (catMap.get(e.category) || 0) + amt)

      return {
        id: e.id,
        date: e.date.slice(0, 10),
        branchName: branchMap.get(e.branchId) || (e.branchId === 'consolidated' ? 'Consolidated All' : 'Location'),
        category: e.category,
        description: e.description,
        paymentMethod: e.paymentMethod || 'Bank Transfer',
        receiptRef: e.receiptRef || '-',
        amountRupees: paiseToRupees(amt),
      }
    })

    return {
      reportType: 'operating_expenses',
      title: 'Operating Expenses Ledger (OPEX)',
      subtitle: 'Complete register of branch operational overhead, rent, payroll, utilities, and marketing costs.',
      periodLabel: `${options.startDate || 'Beginning'} to ${options.endDate || 'Latest'}`,
      branchLabel: options.branchId && options.branchId !== 'all' ? branchMap.get(options.branchId) || 'Branch' : 'All Branches',
      generatedAt: new Date().toISOString(),
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'branchName', label: 'Branch' },
        { key: 'category', label: 'Expense Category' },
        { key: 'description', label: 'Description' },
        { key: 'paymentMethod', label: 'Payment Method' },
        { key: 'receiptRef', label: 'Reference #' },
        { key: 'amountRupees', label: 'Amount (₹)', align: 'right' },
      ],
      rows,
      summaryKpis: [
        { label: 'Total Operating Expenses', value: formatINR(totalExpensePaise) },
        { label: 'Expense Entries Count', value: String(rows.length) },
        { label: 'Active Categories', value: String(catMap.size) },
      ],
      csvData: {
        headers: [
          'Date',
          'Branch Name',
          'Category',
          'Description',
          'Payment Method',
          'Receipt Reference',
          'Amount (INR)',
        ],
        rows: rows.map((r) => [
          r.date,
          r.branchName,
          r.category,
          r.description,
          r.paymentMethod,
          r.receiptRef,
          r.amountRupees.toFixed(2),
        ]),
        summaryRow: ['TOTALS', '', '', '', '', '', paiseToRupees(totalExpensePaise).toFixed(2)],
      },
    }
  },

  /**
   * 9. BRANCH PERFORMANCE COMPARISON REPORT
   */
  async getBranchPerformanceReport(
    workspaceId: WorkspaceId,
    options: ReportFilterOptions = {}
  ): Promise<ReportData> {
    const db = await getDb()
    const branches = await db.getAllFromIndex('branches', 'by-workspace', workspaceId)

    const dateFilter = { startDate: options.startDate, endDate: options.endDate }

    let allSales = await db.getAllFromIndex('sales', 'by-workspace', workspaceId)
    allSales = allSales.filter((s) => s.status !== 'cancelled' && isDateInRange(s.createdAt, dateFilter))

    let allReturns = await db.getAllFromIndex('saleReturns', 'by-workspace', workspaceId)
    allReturns = allReturns.filter((r) => isDateInRange(r.createdAt, dateFilter))

    let allExpenses = await db.getAllFromIndex('operatingExpenses', 'by-workspace', workspaceId)
    allExpenses = allExpenses.filter((e) => isDateInRange(e.date, dateFilter))

    let allInventory = await db.getAllFromIndex('inventory', 'by-workspace', workspaceId)

    let totalEnterpriseNetSales = 0
    let totalEnterpriseProfit = 0
    let totalEnterpriseOpex = 0

    let rows = branches.map((b) => {
      const branchSales = allSales.filter((s) => s.branchId === b.id)
      const branchReturns = allReturns.filter((r) => r.branchId === b.id)
      const branchExpenses = allExpenses.filter((e) => e.branchId === b.id)
      const branchInv = allInventory.filter((i) => i.branchId === b.id)

      let grossSales = 0
      let discounts = 0
      let cogs = 0

      for (const s of branchSales) {
        grossSales += s.subtotalPaise ?? s.subtotalCents ?? 0
        discounts += s.discountPaise ?? s.discountCents ?? 0
        cogs += s.totalCostPaise ?? s.totalCostCents ?? 0
      }

      let returnsPaise = 0
      for (const r of branchReturns) {
        returnsPaise += r.refundAmountPaise ?? r.refundAmountCents ?? 0
      }

      let opex = 0
      for (const e of branchExpenses) {
        opex += e.amountPaise ?? e.amountCents ?? 0
      }

      let invVal = 0
      for (const i of branchInv) {
        const qty = i.quantityOnHand ?? i.quantity ?? 0
        const cost = i.averageCostPaise ?? i.averageCostCents ?? 0
        invVal += Math.max(0, qty * cost)
      }

      const netSales = Math.max(0, grossSales - discounts - returnsPaise)
      const grossProfit = netSales - cogs
      const netOperatingProfit = grossProfit - opex
      const margin = calculateMarginPercent(netSales, grossProfit)
      const returnRate = grossSales > 0 ? Number(((returnsPaise / grossSales) * 100).toFixed(1)) : 0
      const atv = branchSales.length > 0 ? Math.round(netSales / branchSales.length) : 0

      totalEnterpriseNetSales += netSales
      totalEnterpriseProfit += netOperatingProfit
      totalEnterpriseOpex += opex

      return {
        id: b.id,
        code: b.code,
        name: b.name,
        city: b.city || 'City',
        ordersCount: branchSales.length,
        netSalesRupees: paiseToRupees(netSales),
        cogsRupees: paiseToRupees(cogs),
        grossProfitRupees: paiseToRupees(grossProfit),
        grossMarginPercent: margin,
        opexRupees: paiseToRupees(opex),
        netOperatingProfitRupees: paiseToRupees(netOperatingProfit),
        atvRupees: paiseToRupees(atv),
        returnRatePercent: returnRate,
        inventoryCostRupees: paiseToRupees(invVal),
      }
    })

    if (options.branchId && options.branchId !== 'all') {
      rows = rows.filter((r) => r.id === options.branchId)
    }

    rows.sort((a, b) => b.netSalesRupees - a.netSalesRupees)

    return {
      reportType: 'branch_performance',
      title: 'Branch Comparison & Performance League',
      subtitle: 'Comparative evaluation of commercial revenue, gross margins, operating overhead, and return rates.',
      periodLabel: `${options.startDate || 'Beginning'} to ${options.endDate || 'Latest'}`,
      branchLabel: options.branchId && options.branchId !== 'all' ? options.branchId : 'All Locations',
      generatedAt: new Date().toISOString(),
      columns: [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Branch Name' },
        { key: 'city', label: 'City' },
        { key: 'ordersCount', label: 'Orders', align: 'right' },
        { key: 'netSalesRupees', label: 'Net Sales (₹)', align: 'right' },
        { key: 'grossProfitRupees', label: 'Gross Profit (₹)', align: 'right' },
        { key: 'grossMarginPercent', label: 'Margin %', align: 'right' },
        { key: 'opexRupees', label: 'OPEX (₹)', align: 'right' },
        { key: 'netOperatingProfitRupees', label: 'Net Operating Profit (₹)', align: 'right' },
        { key: 'returnRatePercent', label: 'Return %', align: 'right' },
      ],
      rows,
      summaryKpis: [
        { label: 'Enterprise Net Sales', value: formatINR(totalEnterpriseNetSales) },
        { label: 'Total Operating Overhead', value: formatINR(totalEnterpriseOpex) },
        { label: 'Net Commercial Operating Profit', value: formatINR(totalEnterpriseProfit) },
        { label: 'Active Branches', value: String(rows.length) },
      ],
      csvData: {
        headers: [
          'Branch Code',
          'Branch Name',
          'City',
          'Orders Count',
          'Net Sales (INR)',
          'COGS (INR)',
          'Gross Profit (INR)',
          'Gross Margin %',
          'Operating Expenses (INR)',
          'Net Operating Profit (INR)',
          'Average Transaction Value (INR)',
          'Return Rate %',
          'Inventory Valuation at Cost (INR)',
        ],
        rows: rows.map((r) => [
          r.code,
          r.name,
          r.city,
          r.ordersCount,
          r.netSalesRupees.toFixed(2),
          r.cogsRupees.toFixed(2),
          r.grossProfitRupees.toFixed(2),
          `${r.grossMarginPercent}%`,
          r.opexRupees.toFixed(2),
          r.netOperatingProfitRupees.toFixed(2),
          r.atvRupees.toFixed(2),
          `${r.returnRatePercent}%`,
          r.inventoryCostRupees.toFixed(2),
        ]),
        summaryRow: [
          'TOTALS',
          '',
          '',
          '',
          paiseToRupees(totalEnterpriseNetSales).toFixed(2),
          '',
          '',
          '',
          paiseToRupees(totalEnterpriseOpex).toFixed(2),
          paiseToRupees(totalEnterpriseProfit).toFixed(2),
          '',
          '',
          '',
        ],
      },
    }
  },

  /**
   * 10. TAX COLLECTIONS & ESTIMATES REPORT
   */
  async getTaxSummaryReport(
    workspaceId: WorkspaceId,
    options: ReportFilterOptions = {}
  ): Promise<ReportData> {
    const db = await getDb()
    const branches = await db.getAllFromIndex('branches', 'by-workspace', workspaceId)
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))

    let sales = await db.getAllFromIndex('sales', 'by-workspace', workspaceId)
    sales = sales.filter((s) => s.status !== 'cancelled' && isDateInRange(s.createdAt, { startDate: options.startDate, endDate: options.endDate }))
    if (options.branchId && options.branchId !== 'all') {
      sales = sales.filter((s) => s.branchId === options.branchId)
    }

    let returns = await db.getAllFromIndex('saleReturns', 'by-workspace', workspaceId)
    returns = returns.filter((r) => isDateInRange(r.createdAt, { startDate: options.startDate, endDate: options.endDate }))
    if (options.branchId && options.branchId !== 'all') {
      returns = returns.filter((r) => r.branchId === options.branchId)
    }

    let totalTaxableSalesPaise = 0
    let totalTaxCollectedPaise = 0
    let totalReturnRefundPaise = 0

    // Group tax by branch
    const branchTaxMap = new Map<
      string,
      {
        salesVolumePaise: number
        taxCollectedPaise: number
        refundsPaise: number
        orderCount: number
      }
    >()

    for (const s of sales) {
      const cur = branchTaxMap.get(s.branchId) || {
        salesVolumePaise: 0,
        taxCollectedPaise: 0,
        refundsPaise: 0,
        orderCount: 0,
      }
      const total = s.totalPaise ?? s.totalCents ?? 0
      const tax = s.taxPaise ?? s.taxCents ?? 0
      cur.salesVolumePaise += total
      cur.taxCollectedPaise += tax
      cur.orderCount++
      branchTaxMap.set(s.branchId, cur)

      totalTaxableSalesPaise += total
      totalTaxCollectedPaise += tax
    }

    for (const r of returns) {
      const cur = branchTaxMap.get(r.branchId) || {
        salesVolumePaise: 0,
        taxCollectedPaise: 0,
        refundsPaise: 0,
        orderCount: 0,
      }
      const ref = r.refundAmountPaise ?? r.refundAmountCents ?? 0
      cur.refundsPaise += ref
      branchTaxMap.set(r.branchId, cur)
      totalReturnRefundPaise += ref
    }

    const rows = Array.from(branchTaxMap.entries()).map(([branchId, data]) => {
      const netTaxPaise = Math.max(0, data.taxCollectedPaise)
      return {
        branchId,
        branchName: branchMap.get(branchId) || 'Branch Location',
        salesRupees: paiseToRupees(data.salesVolumePaise),
        taxCollectedRupees: paiseToRupees(data.taxCollectedPaise),
        refundsRupees: paiseToRupees(data.refundsPaise),
        netTaxRupees: paiseToRupees(netTaxPaise),
        orderCount: data.orderCount,
        taxStatus: data.taxCollectedPaise > 0 ? 'Recorded' : 'Non-Taxable / Exempt',
      }
    })

    return {
      reportType: 'tax_summary',
      title: 'Tax Summary & Collections Register',
      subtitle: 'Recorded transaction sales taxes collected, refund adjustments, and non-statutory estimates.',
      periodLabel: `${options.startDate || 'Beginning'} to ${options.endDate || 'Latest'}`,
      branchLabel: options.branchId && options.branchId !== 'all' ? branchMap.get(options.branchId) || 'Branch' : 'All Branches',
      generatedAt: new Date().toISOString(),
      disclaimer:
        'IMPORTANT: This tax report represents factual figures recorded during POS checkout and non-statutory calculations. It does not constitute certified tax advice. Consult a qualified chartered accountant for statutory GST/VAT filing.',
      columns: [
        { key: 'branchName', label: 'Branch Location' },
        { key: 'orderCount', label: 'Transactions', align: 'right' },
        { key: 'salesRupees', label: 'Net Sales Volume (₹)', align: 'right' },
        { key: 'taxCollectedRupees', label: 'Recorded Tax Collected (₹)', align: 'right' },
        { key: 'refundsRupees', label: 'Customer Refunds (₹)', align: 'right' },
        { key: 'taxStatus', label: 'Tax Treatment', align: 'center' },
      ],
      rows,
      summaryKpis: [
        { label: 'Total Recorded Tax Collected', value: formatINR(totalTaxCollectedPaise), hint: 'Not counted as revenue' },
        { label: 'Gross Commercial Sales', value: formatINR(totalTaxableSalesPaise) },
        { label: 'Customer Refunds Issued', value: formatINR(totalReturnRefundPaise) },
      ],
      csvData: {
        headers: [
          'Branch Location',
          'Transactions Count',
          'Net Sales Volume (INR)',
          'Recorded Tax Collected (INR)',
          'Customer Refunds (INR)',
          'Tax Treatment Status',
        ],
        rows: rows.map((r) => [
          r.branchName,
          r.orderCount,
          r.salesRupees.toFixed(2),
          r.taxCollectedRupees.toFixed(2),
          r.refundsRupees.toFixed(2),
          r.taxStatus,
        ]),
        summaryRow: [
          'TOTALS',
          '',
          paiseToRupees(totalTaxableSalesPaise).toFixed(2),
          paiseToRupees(totalTaxCollectedPaise).toFixed(2),
          paiseToRupees(totalReturnRefundPaise).toFixed(2),
          '',
        ],
      },
    }
  },

  /**
   * Router to fetch any of the 10 report types
   */
  async getReport(
    reportType: ReportType,
    workspaceId: WorkspaceId,
    options: ReportFilterOptions = {}
  ): Promise<ReportData> {
    switch (reportType) {
      case 'sales_summary':
        return this.getSalesSummaryReport(workspaceId, options)
      case 'returns_refunds':
        return this.getReturnsReport(workspaceId, options)
      case 'product_profitability':
        return this.getProductProfitabilityReport(workspaceId, options)
      case 'inventory_valuation':
        return this.getInventoryValuationReport(workspaceId, options)
      case 'stock_movements':
        return this.getStockMovementsReport(workspaceId, options)
      case 'stock_transfers':
        return this.getStockTransfersReport(workspaceId, options)
      case 'purchases_receiving':
        return this.getPurchasesReport(workspaceId, options)
      case 'operating_expenses':
        return this.getOperatingExpensesReport(workspaceId, options)
      case 'branch_performance':
        return this.getBranchPerformanceReport(workspaceId, options)
      case 'tax_summary':
        return this.getTaxSummaryReport(workspaceId, options)
      default:
        throw new Error(`Unsupported report type: ${reportType}`)
    }
  },
}
