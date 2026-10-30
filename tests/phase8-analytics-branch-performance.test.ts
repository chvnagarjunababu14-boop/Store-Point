import { describe, it, expect, beforeEach } from 'vitest'
import { closeDB, deleteDatabase } from '@/lib/db'
import { branchRepository } from '@/lib/repositories/branchRepository'
import { productRepository } from '@/lib/repositories/productRepository'
import { inventoryRepository } from '@/lib/repositories/inventoryRepository'
import { saleRepository } from '@/lib/repositories/saleRepository'
import { expenseRepository } from '@/lib/repositories/expenseRepository'
import {
  financialCalculationService,
  getDateRangeFromPreset,
  isDateInRange,
} from '@/lib/services/financialCalculationService'
import { formatINR } from '@/utils/money'

describe('Phase 8: Financial Analytics & Branch Performance Tests', () => {
  beforeEach(async () => {
    closeDB()
    await deleteDatabase()
  })

  describe('1. Date Presets and Boundary Filtering', () => {
    it('accurately computes date presets with inclusive boundaries', () => {
      // Use fixed reference date: 2026-10-22
      const refDate = new Date('2026-10-22T14:30:00')

      // Today
      const today = getDateRangeFromPreset('today', refDate)
      expect(today.startDate).toBe('2026-10-22')
      expect(today.endDate).toBe('2026-10-22')

      // Yesterday
      const yesterday = getDateRangeFromPreset('yesterday', refDate)
      expect(yesterday.startDate).toBe('2026-10-21')
      expect(yesterday.endDate).toBe('2026-10-21')

      // 7 Days (inclusive 7 days: 22 - 6 = 16)
      const last7d = getDateRangeFromPreset('7d', refDate)
      expect(last7d.endDate).toBe('2026-10-22')
      expect(last7d.startDate).toBe('2026-10-16')

      // 30 Days (inclusive 30 days: 22 - 29 = Sept 23)
      const last30d = getDateRangeFromPreset('30d', refDate)
      expect(last30d.endDate).toBe('2026-10-22')
      expect(last30d.startDate).toBe('2026-09-23')

      // Current Month (Month-to-date)
      const thisMonth = getDateRangeFromPreset('month', refDate)
      expect(thisMonth.startDate).toBe('2026-10-01')
      expect(thisMonth.endDate).toBe('2026-10-22')

      // Previous Month
      const prevMonth = getDateRangeFromPreset('prev_month', refDate)
      expect(prevMonth.startDate).toBe('2026-09-01')
      expect(prevMonth.endDate).toBe('2026-09-30')

      // All
      const all = getDateRangeFromPreset('all', refDate)
      expect(all.startDate).toBeUndefined()
      expect(all.endDate).toBeUndefined()
    })

    it('correctly tests date inclusion within range boundaries', () => {
      const filter = { startDate: '2026-10-01', endDate: '2026-10-15' }

      // Inclusive start and end
      expect(isDateInRange('2026-10-01T00:00:00.000Z', filter)).toBe(true)
      expect(isDateInRange('2026-10-15T23:59:59.000Z', filter)).toBe(true)
      expect(isDateInRange('2026-10-08', filter)).toBe(true)

      // Outside bounds
      expect(isDateInRange('2026-09-30T23:59:59.000Z', filter)).toBe(false)
      expect(isDateInRange('2026-10-16T00:00:00.000Z', filter)).toBe(false)

      // Unbounded filters
      expect(isDateInRange('2026-05-01', {})).toBe(true)
      expect(isDateInRange('2026-05-01', { startDate: '2026-05-01' })).toBe(true)
      expect(isDateInRange('2026-04-30', { startDate: '2026-05-01' })).toBe(false)
      expect(isDateInRange('2026-05-01', { endDate: '2026-05-01' })).toBe(true)
      expect(isDateInRange('2026-05-02', { endDate: '2026-05-01' })).toBe(false)
    })
  })

  describe('2. Comprehensive 11 KPI Calculations & Currency Precision', () => {
    it('computes all primary financial KPIs accurately in integer paise', async () => {
      const branch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Bengaluru HSR Layout Flagship',
        code: 'BLR-01',
        city: 'Bengaluru',
      })

      const prod1 = await productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-COFFEE-01',
        name: 'Artisan Filter Coffee',
        category: 'Beverages',
        unit: 'pack',
        costPricePaise: 15000, // ₹150.00
        sellingPricePaise: 35000, // ₹350.00
      })

      const prod2 = await productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-MUG-01',
        name: 'Ceramic Coffee Mug',
        category: 'Merchandise',
        unit: 'pcs',
        costPricePaise: 8000, // ₹80.00
        sellingPricePaise: 25000, // ₹250.00
      })

      // Seed initial inventory
      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prod1.id,
        initialQuantity: 50,
        unitCostPaise: 15000,
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prod2.id,
        initialQuantity: 20,
        unitCostPaise: 8000,
      })

      // 1. Create a sale: 2 Coffee packs + 1 Mug, line discount of ₹50 on Mug, order discount ₹50
      // Line 1: 2 x ₹350 = ₹700 (70000 paise), COGS = 2 x ₹150 = ₹300 (30000 paise)
      // Line 2: 1 x ₹250 = ₹250, discount ₹50 = ₹200 (20000 paise), COGS = 1 x ₹80 = ₹80 (8000 paise)
      // Subtotal = 70000 + 20000 = 90000 paise
      // Order Discount = ₹50 (5000 paise)
      // Total Gross Sales = ₹950 (95000 paise)
      // Total Discounts = ₹50 (line) + ₹50 (order) = ₹100 (10000 paise)
      // Net Sale = ₹850 (85000 paise)
      // COGS = ₹380 (38000 paise)
      await saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        receiptNumber: 'REC-001',
        items: [
          {
            productId: prod1.id,
            quantity: 2,
            sellingPricePaise: 35000,
            discountPaise: 0,
          },
          {
            productId: prod2.id,
            quantity: 1,
            sellingPricePaise: 25000,
            discountPaise: 5000,
          },
        ],
        discountPaise: 5000,
        paymentMethod: 'UPI',
      })

      // 2. Record an Operating Expense: ₹150.00 (15000 paise) for Electricity
      await expenseRepository.create({
        workspaceId: 'live',
        branchId: branch.id,
        category: 'Utilities',
        amountPaise: 15000,
        description: 'Store electricity bill',
        date: new Date().toISOString(),
      })

      // Execute summary
      const summary = await financialCalculationService.getSummary('live')

      // Verify all 11 KPIs:
      // 1. Gross sales (subtotal of lines after line discounts): 70000 + 20000 = 90000 paise
      expect(summary.grossSalesPaise).toBe(90000)

      // 2. Order Discounts: 5000 paise
      expect(summary.discountsPaise).toBe(5000)

      // 3. Returns: 0 paise
      expect(summary.returnsPaise).toBe(0)

      // 4. Net sales: 90000 - 5000 = 85000 paise (₹850.00)
      expect(summary.netSalesPaise).toBe(85000)

      // 5. COGS: 2 * 15000 + 1 * 8000 = 38000 paise (₹380.00)
      expect(summary.cogsPaise).toBe(38000)

      // 6. Gross Profit: Net Sales (85000) - COGS (38000) = 47000 paise (₹470.00)
      expect(summary.grossProfitPaise).toBe(47000)
      // Gross margin: (47000 / 85000) * 100 = 55.29%
      expect(summary.grossMarginPercent).toBeCloseTo(55.29, 1)

      // 7. Operating expenses: 15000 paise (₹150.00)
      expect(summary.operatingExpensesPaise).toBe(15000)

      // 8. Net operating profit: Gross Profit (47000) - OPEX (15000) = 32000 paise (₹320.00)
      expect(summary.netOperatingProfitPaise).toBe(32000)
      // Net operating margin: (32000 / 85000) * 100 = 37.65%
      expect(summary.netMarginPercent).toBeCloseTo(37.65, 1)

      // 9. Inventory value at cost:
      // Prod 1 remaining: 48 * 15000 = 720000 paise
      // Prod 2 remaining: 19 * 8000 = 152000 paise
      // Total inventory = 872000 paise (₹8,720.00)
      expect(summary.inventoryValuationPaise).toBe(872000)

      // 10. Average Transaction Value (ATV): 85000 / 1 = 85000 paise
      expect(summary.averageTransactionValuePaise).toBe(85000)

      // 11. Transactions and units sold:
      expect(summary.orderCount).toBe(1)
      expect(summary.unitsSold).toBe(3) // 2 + 1

      // Currency formatting test:
      expect(formatINR(summary.netSalesPaise)).toBe('₹850.00')
      expect(formatINR(summary.grossProfitPaise)).toBe('₹470.00')
      expect(formatINR(summary.netOperatingProfitPaise)).toBe('₹320.00')
      expect(formatINR(summary.inventoryValuationPaise)).toBe('₹8,720.00')
    })
  })

  describe('3. Partial Returns, Restock Handling, and COGS Reversal', () => {
    it('accurately reverses COGS when return is restocked and adjusts net sales and units sold', async () => {
      const branch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Delhi Connaught Place Hub',
        code: 'DEL-01',
      })

      const prod = await productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-JEANS-01',
        name: 'Denim Slim Jeans',
        costPricePaise: 60000, // ₹600.00
        sellingPricePaise: 150000, // ₹1,500.00
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prod.id,
        initialQuantity: 10,
        unitCostPaise: 60000,
      })

      // Sell 2 units: Gross 300000 paise (₹3,000.00), COGS 120000 paise (₹1,200.00)
      const { sale } = await saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [
          {
            productId: prod.id,
            quantity: 2,
            sellingPricePaise: 150000,
          },
        ],
        paymentMethod: 'Card',
      })

      // Return 1 unit with restockItems: true (refund 150000 paise)
      await saleRepository.refundOrCancelSale({
        saleId: sale.id,
        reason: 'Customer size exchange',
        restockItems: true,
        items: [
          {
            productId: prod.id,
            quantity: 1,
            refundAmountPaise: 150000,
          },
        ],
      })

      const summary = await financialCalculationService.getSummary('live')

      // Gross Sales remains total transaction volume: 300000 paise
      expect(summary.grossSalesPaise).toBe(300000)
      // Returns: 150000 paise
      expect(summary.returnsPaise).toBe(150000)
      // Net Sales: 300000 - 150000 = 150000 paise (₹1,500.00)
      expect(summary.netSalesPaise).toBe(150000)

      // COGS reversed because item was restocked: 120000 - 60000 = 60000 paise (₹600.00)
      expect(summary.cogsPaise).toBe(60000)

      // Gross Profit: 150000 - 60000 = 90000 paise (₹900.00)
      expect(summary.grossProfitPaise).toBe(90000)
      expect(summary.grossMarginPercent).toBe(60.0)

      // Net units sold: 2 sold - 1 returned = 1 unit
      expect(summary.unitsSold).toBe(1)
    })

    it('does NOT reverse COGS when damaged return is discarded (restockItems: false)', async () => {
      const branch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Kolkata Park Street',
        code: 'CCU-01',
      })

      const prod = await productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-CUP-01',
        name: 'Glass Tumbler',
        costPricePaise: 5000, // ₹50.00
        sellingPricePaise: 20000, // ₹200.00
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prod.id,
        initialQuantity: 10,
        unitCostPaise: 5000,
      })

      // Sell 1 cup
      const { sale } = await saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [
          {
            productId: prod.id,
            quantity: 1,
            sellingPricePaise: 20000,
          },
        ],
        paymentMethod: 'Cash',
      })

      // Return 1 cup broken in transit -> restockItems: false
      await saleRepository.refundOrCancelSale({
        saleId: sale.id,
        reason: 'Broken item',
        restockItems: false,
        items: [
          {
            productId: prod.id,
            quantity: 1,
            refundAmountPaise: 20000,
          },
        ],
      })

      const summary = await financialCalculationService.getSummary('live')

      // Net Sales is 20000 - 20000 = 0
      expect(summary.netSalesPaise).toBe(0)
      // COGS is NOT reversed because the item cannot be resold: 5000 paise remains cost
      expect(summary.cogsPaise).toBe(5000)
      // Gross Profit: 0 - 5000 = -5000 paise loss
      expect(summary.grossProfitPaise).toBe(-5000)
      expect(summary.grossMarginPercent).toBe(0)
    })
  })

  describe('4. Branch Performance Comparison', () => {
    it('aggregates branch performance metrics and computes return rates accurately', async () => {
      const branchA = await branchRepository.create({
        workspaceId: 'live',
        name: 'Mumbai Central',
        code: 'B-MUM',
        city: 'Mumbai',
      })

      const branchB = await branchRepository.create({
        workspaceId: 'live',
        name: 'Pune Shivaji Nagar',
        code: 'B-PUN',
        city: 'Pune',
      })

      const prod = await productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-TEE-01',
        name: 'Cotton T-Shirt',
        costPricePaise: 20000, // ₹200
        sellingPricePaise: 50000, // ₹500
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branchA.id,
        productId: prod.id,
        initialQuantity: 100,
        unitCostPaise: 20000,
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branchB.id,
        productId: prod.id,
        initialQuantity: 50,
        unitCostPaise: 20000,
      })

      // Mumbai sale: 4 shirts (Gross 200000, Net 200000, COGS 80000)
      const { sale: saleMUM } = await saleRepository.createSale({
        workspaceId: 'live',
        branchId: branchA.id,
        items: [
          {
            productId: prod.id,
            quantity: 4,
            sellingPricePaise: 50000,
          },
        ],
        paymentMethod: 'UPI',
      })

      // Mumbai return: 1 shirt returned (restocked)
      await saleRepository.refundOrCancelSale({
        saleId: saleMUM.id,
        reason: 'Color exchange',
        restockItems: true,
        items: [
          {
            productId: prod.id,
            quantity: 1,
            refundAmountPaise: 50000,
          },
        ],
      })

      // Pune sale: 2 shirts (Gross 100000, Net 100000, COGS 40000), no returns
      await saleRepository.createSale({
        workspaceId: 'live',
        branchId: branchB.id,
        items: [
          {
            productId: prod.id,
            quantity: 2,
            sellingPricePaise: 50000,
          },
        ],
        paymentMethod: 'Cash',
      })

      // Pune expense: ₹200 (20000 paise)
      await expenseRepository.create({
        workspaceId: 'live',
        branchId: branchB.id,
        category: 'Supplies',
        amountPaise: 20000,
        date: new Date().toISOString(),
      })

      const comparison = await financialCalculationService.getBranchPerformance('live')

      expect(comparison.length).toBe(2)

      const mum = comparison.find((b) => b.branchId === branchA.id)!
      expect(mum.grossSalesPaise).toBe(200000)
      expect(mum.returnsPaise).toBe(50000)
      expect(mum.netSalesPaise).toBe(150000) // ₹1,500
      expect(mum.cogsPaise).toBe(60000) // (4 - 1) * 20000 = 60000 paise
      expect(mum.grossProfitPaise).toBe(90000)
      expect(mum.unitsSold).toBe(3) // 4 - 1
      // Return rate = (50000 / 200000) * 100 = 25.0%
      expect(mum.returnRatePercent).toBe(25.0)

      const pun = comparison.find((b) => b.branchId === branchB.id)!
      expect(pun.grossSalesPaise).toBe(100000)
      expect(pun.returnsPaise).toBe(0)
      expect(pun.netSalesPaise).toBe(100000) // ₹1,000
      expect(pun.cogsPaise).toBe(40000)
      expect(pun.operatingExpensesPaise).toBe(20000)
      expect(pun.netOperatingProfitPaise).toBe(40000) // 60000 GP - 20000 OPEX
      expect(pun.returnRatePercent).toBe(0.0)
    })
  })

  describe('5. Product Performance, Rankings & Slow-Moving Stock', () => {
    it('ranks products by revenue, units, and gross profit correctly', async () => {
      const branch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Hyderabad Cyberabad Store',
        code: 'HYD-01',
      })

      const prodFast = await productRepository.create({
        workspaceId: 'live',
        sku: 'FAST-01',
        name: 'Fast Moving Chai',
        costPricePaise: 500, // ₹5
        sellingPricePaise: 2000, // ₹20
      })

      const prodHighProfit = await productRepository.create({
        workspaceId: 'live',
        sku: 'LUX-01',
        name: 'Luxury Tea Gift Box',
        costPricePaise: 50000, // ₹500
        sellingPricePaise: 150000, // ₹1500
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prodFast.id,
        initialQuantity: 100,
        unitCostPaise: 500,
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prodHighProfit.id,
        initialQuantity: 10,
        unitCostPaise: 50000,
      })

      // Sell 50 fast chai: Units 50, Revenue ₹1,000 (100000 paise), GP ₹750 (75000 paise)
      await saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [
          {
            productId: prodFast.id,
            quantity: 50,
            sellingPricePaise: 2000,
          },
        ],
        paymentMethod: 'UPI',
      })

      // Sell 2 luxury boxes: Units 2, Revenue ₹3,000 (300000 paise), GP ₹2,000 (200000 paise)
      await saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [
          {
            productId: prodHighProfit.id,
            quantity: 2,
            sellingPricePaise: 150000,
          },
        ],
        paymentMethod: 'Card',
      })

      const rankings = await financialCalculationService.getProductSalesRankings('live')

      // Luxury Tea has highest revenue (₹3,000 > ₹1,000)
      expect(rankings[0].productId).toBe(prodHighProfit.id)
      expect(rankings[0].revenuePaise).toBe(300000)
      expect(rankings[0].profitPaise).toBe(200000)

      // Fast Chai has highest units sold (50 > 2)
      expect(rankings[1].productId).toBe(prodFast.id)
      expect(rankings[1].unitsSold).toBe(50)
    })

    it('identifies slow-moving products and calculates capital tied up', async () => {
      const branch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Ahmedabad Warehouse Outlet',
        code: 'AMD-01',
      })

      const prodSlow = await productRepository.create({
        workspaceId: 'live',
        sku: 'SLOW-01',
        name: 'Antique Brass Lamp',
        costPricePaise: 400000, // ₹4,000
        sellingPricePaise: 800000, // ₹8,000
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prodSlow.id,
        initialQuantity: 15,
        unitCostPaise: 400000,
      })

      // No sales recorded for Antique Brass Lamp
      const slowProducts = await financialCalculationService.getSlowMovingProducts('live', undefined, 30)

      expect(slowProducts.length).toBeGreaterThanOrEqual(1)
      const item = slowProducts.find((p) => p.productId === prodSlow.id)
      expect(item).toBeDefined()
      expect(item!.currentStock).toBe(15)
      expect(item!.unitsSoldInWindow).toBe(0)
      // Capital tied up = 15 * 400000 = 6000000 paise (₹60,000)
      expect(item!.capitalTiedUpPaise).toBe(6000000)
    })
  })

  describe('6. Edge Cases: Negative Profit and Empty Periods', () => {
    it('handles negative profit safely when operating expenses exceed gross profit', async () => {
      const branch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Chandigarh Sector 17',
        code: 'IXC-01',
      })

      const prod = await productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-PEN-01',
        name: 'Gel Pen',
        costPricePaise: 500, // ₹5
        sellingPricePaise: 1000, // ₹10
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prod.id,
        initialQuantity: 10,
        unitCostPaise: 500,
      })

      // 1 sale: Gross ₹10, COGS ₹5 -> Gross Profit ₹5 (500 paise)
      await saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [
          {
            productId: prod.id,
            quantity: 1,
            sellingPricePaise: 1000,
          },
        ],
        paymentMethod: 'Cash',
      })

      // Big expense: Rent ₹5,000 (500000 paise)
      await expenseRepository.create({
        workspaceId: 'live',
        branchId: branch.id,
        category: 'Rent',
        amountPaise: 500000,
        date: new Date().toISOString(),
      })

      const summary = await financialCalculationService.getSummary('live')

      expect(summary.grossProfitPaise).toBe(500) // ₹5.00
      expect(summary.operatingExpensesPaise).toBe(500000) // ₹5,000.00
      // Net operating profit is negative: 500 - 500000 = -499500 paise (-₹4,995.00)
      expect(summary.netOperatingProfitPaise).toBe(-499500)
      expect(summary.netMarginPercent).toBeLessThan(0)
    })

    it('returns clean zeroed summary without NaN for empty date ranges', async () => {
      // Query a future date where no transactions exist
      const futureFilter = { startDate: '2099-01-01', endDate: '2099-01-31' }
      const summary = await financialCalculationService.getSummary('live', undefined, futureFilter)

      expect(summary.grossSalesPaise).toBe(0)
      expect(summary.netSalesPaise).toBe(0)
      expect(summary.cogsPaise).toBe(0)
      expect(summary.grossProfitPaise).toBe(0)
      expect(summary.grossMarginPercent).toBe(0)
      expect(summary.operatingExpensesPaise).toBe(0)
      expect(summary.netOperatingProfitPaise).toBe(0)
      expect(summary.netMarginPercent).toBe(0)
      expect(summary.averageTransactionValuePaise).toBe(0)
      expect(summary.orderCount).toBe(0)
      expect(summary.unitsSold).toBe(0)
      expect(isNaN(summary.grossMarginPercent)).toBe(false)
      expect(isNaN(summary.netMarginPercent)).toBe(false)
    })
  })

  describe('7. Workspace Isolation (Demo vs Live)', () => {
    it('strictly isolates live metrics from demo records', async () => {
      // 1. Create live branch & transaction
      const liveBranch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Live Chennai Terminal',
        code: 'MAA-LIVE',
      })

      const liveProd = await productRepository.create({
        workspaceId: 'live',
        sku: 'LIVE-SKU-01',
        name: 'Live Item',
        costPricePaise: 10000,
        sellingPricePaise: 25000,
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: liveBranch.id,
        productId: liveProd.id,
        initialQuantity: 10,
        unitCostPaise: 10000,
      })

      await saleRepository.createSale({
        workspaceId: 'live',
        branchId: liveBranch.id,
        items: [
          {
            productId: liveProd.id,
            quantity: 1,
            sellingPricePaise: 25000,
          },
        ],
        paymentMethod: 'UPI',
      })

      // 2. Create demo branch & massive fake sale
      const demoBranch = await branchRepository.create({
        workspaceId: 'demo',
        name: 'Demo Mock Terminal',
        code: 'DEMO-MOCK',
      })

      const demoProd = await productRepository.create({
        workspaceId: 'demo',
        sku: 'DEMO-SKU-99',
        name: 'Demo Product',
        costPricePaise: 500000,
        sellingPricePaise: 1000000,
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'demo',
        branchId: demoBranch.id,
        productId: demoProd.id,
        initialQuantity: 50,
        unitCostPaise: 500000,
      })

      await saleRepository.createSale({
        workspaceId: 'demo',
        branchId: demoBranch.id,
        items: [
          {
            productId: demoProd.id,
            quantity: 10,
            sellingPricePaise: 1000000, // ₹1,00,000
          },
        ],
        paymentMethod: 'Card',
      })

      // Summary for Live should only reflect Live transaction (25000 paise), not Demo
      const liveSummary = await financialCalculationService.getSummary('live')
      expect(liveSummary.grossSalesPaise).toBe(25000)
      expect(liveSummary.orderCount).toBe(1)

      // Summary for Demo should only reflect Demo transaction (10000000 paise)
      const demoSummary = await financialCalculationService.getSummary('demo')
      expect(demoSummary.grossSalesPaise).toBe(10000000)
      expect(demoSummary.orderCount).toBe(1)

      // Live branch performance should only have liveBranch
      const liveBranches = await financialCalculationService.getBranchPerformance('live')
      expect(liveBranches.length).toBe(1)
      expect(liveBranches[0].branchId).toBe(liveBranch.id)
    })
  })
})
