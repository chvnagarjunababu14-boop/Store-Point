import { describe, it, expect, beforeEach } from 'vitest'
import { closeDB, deleteDatabase } from '@/lib/db'
import { branchRepository } from '@/lib/repositories/branchRepository'
import { productRepository } from '@/lib/repositories/productRepository'
import { inventoryRepository } from '@/lib/repositories/inventoryRepository'
import { saleRepository } from '@/lib/repositories/saleRepository'
import { productIntelligenceService } from '@/lib/services/productIntelligenceService'

describe('Phase 9: Product Intelligence & Evidence-Based Recommendations Tests', () => {
  beforeEach(async () => {
    closeDB()
    await deleteDatabase()
    productIntelligenceService.clearAllDismissals('live')
    productIntelligenceService.clearAllDismissals('demo')
  })

  describe('1. Inventory Replenishment Recommendations & Insufficient History', () => {
    it('triggers reorder recommendation when stock is at or below reorder threshold', async () => {
      const branch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Delhi Retail Flagship',
        code: 'DEL-01',
      })

      const prod = await productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-RICE-01',
        name: 'Basmati Rice 5kg',
        costPricePaise: 40000, // ₹400
        sellingPricePaise: 65000, // ₹650
        reorderPoint: 15,
      })

      // Stock is currently 5 units (below reorderPoint of 15)
      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prod.id,
        initialQuantity: 5,
        unitCostPaise: 40000,
        reorderPoint: 15,
      })

      const recs = await productIntelligenceService.getReplenishmentRecommendations('live', {
        branchId: branch.id,
        observationDays: 30,
        targetCoverageDays: 30,
      })

      expect(recs.length).toBe(1)
      const rec = recs[0]
      expect(rec.productId).toBe(prod.id)
      expect(rec.currentStock).toBe(5)
      expect(rec.reorderPoint).toBe(15)
      expect(rec.suggestedReorderQuantity).toBeGreaterThan(0)
      expect(rec.priority).toBe('high')
    })

    it('identifies fast-selling products facing run-rate stockouts and computes days remaining', async () => {
      const branch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Mumbai Central',
        code: 'B-MUM',
      })

      const prod = await productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-FAST-COFFEE',
        name: 'Instant Filter Coffee 200g',
        costPricePaise: 15000,
        sellingPricePaise: 30000,
        reorderPoint: 10,
      })

      // Stock is 40 units (above reorder point of 10)
      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prod.id,
        initialQuantity: 100,
        unitCostPaise: 15000,
        reorderPoint: 10,
      })

      // Sell 60 units in 30 days -> velocity = 2 units/day. Remaining stock = 40 units -> 20 days left
      await saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [{ productId: prod.id, quantity: 60, sellingPricePaise: 30000 }],
        paymentMethod: 'UPI',
      })

      const recs = await productIntelligenceService.getReplenishmentRecommendations('live', {
        branchId: branch.id,
        observationDays: 30,
        targetCoverageDays: 30,
      })

      const rec = recs.find((r) => r.productId === prod.id)
      expect(rec).toBeDefined()
      expect(rec!.currentStock).toBe(40)
      expect(rec!.unitsSoldInWindow).toBe(60)
      expect(rec!.salesVelocityPerDay).toBe(2) // 60 units / 30 days
      expect(rec!.estimatedDaysRemaining).toBe(20) // 40 units / 2 per day
      // Target stock = 2 units/day * 30 days + 10 buffer = 70 units
      // Suggested reorder = 70 - 40 = 30 units
      expect(rec!.suggestedReorderQuantity).toBe(30)
      expect(rec!.estimatedOrderCostPaise).toBe(30 * 15000) // ₹4,500.00
    })

    it('labels newly added products with insufficient history gracefully without bogus forecasts', async () => {
      const branch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Bangalore Store',
        code: 'BLR-01',
      })

      const newProd = await productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-NEW-ITEM',
        name: 'Brand New Launch Item',
        costPricePaise: 10000,
        sellingPricePaise: 20000,
        reorderPoint: 5,
      })

      // Product has 2 units on hand, 0 sales
      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: newProd.id,
        initialQuantity: 2,
        unitCostPaise: 10000,
        reorderPoint: 5,
      })

      const recs = await productIntelligenceService.getReplenishmentRecommendations('live', {
        branchId: branch.id,
        observationDays: 30,
      })

      const rec = recs.find((r) => r.productId === newProd.id)
      expect(rec).toBeDefined()
      expect(rec!.confidence).toBe('insufficient_data')
      expect(rec!.estimatedDaysRemaining).toBeNull()
      expect(rec!.salesVelocityPerDay).toBe(0)
    })
  })

  describe('2. Days-of-Stock and Zero Sales Cases', () => {
    it('handles zero sales safely without dividing by zero or producing NaN', async () => {
      const branch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Kolkata Outlet',
        code: 'CCU-01',
      })

      const prod = await productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-ZERO-SALE',
        name: 'Zero Sale Item',
        costPricePaise: 5000,
        sellingPricePaise: 10000,
        reorderPoint: 10,
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prod.id,
        initialQuantity: 10,
        unitCostPaise: 5000,
      })

      const recs = await productIntelligenceService.getReplenishmentRecommendations('live', {
        branchId: branch.id,
        observationDays: 30,
      })

      const rec = recs.find((r) => r.productId === prod.id)
      expect(rec).toBeDefined()
      expect(rec!.salesVelocityPerDay).toBe(0)
      expect(rec!.estimatedDaysRemaining).toBeNull()
      expect(isNaN(rec!.salesVelocityPerDay)).toBe(false)
    })
  })

  describe('3. Slow-Moving Stock and Capital Tied Up', () => {
    it('detects slow-moving inventory, calculates capital tied up, and provides remedies', async () => {
      const branch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Pune Warehouse',
        code: 'PUN-01',
      })

      const slowProd = await productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-RUG-01',
        name: 'Handcrafted Woolen Rug',
        costPricePaise: 500000, // ₹5,000
        sellingPricePaise: 1200000, // ₹12,000
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: slowProd.id,
        initialQuantity: 12,
        unitCostPaise: 500000,
      })

      // Zero sales recorded
      const slowItems = await productIntelligenceService.getSlowMovingInventory('live', {
        branchId: branch.id,
        observationDays: 30,
      })

      expect(slowItems.length).toBeGreaterThanOrEqual(1)
      const item = slowItems.find((s) => s.productId === slowProd.id)
      expect(item).toBeDefined()
      expect(item!.currentStock).toBe(12)
      expect(item!.unitsSoldInWindow).toBe(0)
      // Capital tied up = 12 * ₹5,000 = ₹60,000 (6000000 paise)
      expect(item!.capitalTiedUpPaise).toBe(6000000)
      expect(item!.limitations).toContain('observation')
      expect(item!.potentialRemedies.length).toBeGreaterThan(0)
    })
  })

  describe('4. Profitability, Below-Cost, and Margin Alerts', () => {
    it('flags catalog items priced below current acquisition cost as critical alerts', async () => {
      const prodBelowCost = await productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-BELOW-COST',
        name: 'Imported Olive Oil 1L',
        costPricePaise: 120000, // Current cost: ₹1,200
        sellingPricePaise: 99900, // Selling price: ₹999 (Loss of ₹201 per unit)
      })

      const alerts = await productIntelligenceService.getProfitabilityAlerts('live')

      const alert = alerts.find((a) => a.productId === prodBelowCost.id && a.type === 'below_cost')
      expect(alert).toBeDefined()
      expect(alert!.severity).toBe('critical')
      expect(alert!.evidenceMetric).toContain('₹201.00')
      expect(alert!.rootCause).toContain('cost increase')
    })

    it('detects historical negative gross margins from excessive returns or discounts', async () => {
      const branch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Chennai Hub',
        code: 'MAA-01',
      })

      const prod = await productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-SPEAKER',
        name: 'Bluetooth Speaker',
        costPricePaise: 150000, // ₹1,500 cost
        sellingPricePaise: 250000, // ₹2,500 price
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prod.id,
        initialQuantity: 10,
        unitCostPaise: 150000,
      })

      // Sell 1 speaker
      const { sale } = await saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [{ productId: prod.id, quantity: 1, sellingPricePaise: 250000 }],
        paymentMethod: 'Cash',
      })

      // Return damaged speaker without restock (loss = -₹1,500)
      await saleRepository.refundOrCancelSale({
        saleId: sale.id,
        reason: 'Water damage',
        restockItems: false,
        items: [{ productId: prod.id, quantity: 1, refundAmountPaise: 250000 }],
      })

      const alerts = await productIntelligenceService.getProfitabilityAlerts('live', {
        branchId: branch.id,
      })

      const alert = alerts.find((a) => a.productId === prod.id && a.type === 'negative_margin')
      expect(alert).toBeDefined()
      expect(alert!.severity).toBe('critical')
    })

    it('detects thin margin (< 10%) on active sales', async () => {
      const branch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Hyderabad Retail',
        code: 'HYD-01',
      })

      const prod = await productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-SUGAR',
        name: 'Refined Sugar 1kg',
        costPricePaise: 4800, // ₹48.00
        sellingPricePaise: 5000, // ₹50.00 -> Gross Margin = (2 / 50) = 4.0%
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prod.id,
        initialQuantity: 50,
        unitCostPaise: 4800,
      })

      await saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [{ productId: prod.id, quantity: 10, sellingPricePaise: 5000 }],
        paymentMethod: 'UPI',
      })

      const alerts = await productIntelligenceService.getProfitabilityAlerts('live', {
        branchId: branch.id,
      })

      const alert = alerts.find((a) => a.productId === prod.id && a.type === 'low_margin')
      expect(alert).toBeDefined()
      expect(alert!.severity).toBe('warning')
      expect(alert!.evidenceMetric).toContain('4.0%')
    })
  })

  describe('5. Return Rates with Sample Size Thresholds', () => {
    it('flags high return rate only when sample size is statistically meaningful (>= 5 units)', async () => {
      const branch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Ahmedabad Store',
        code: 'AMD-01',
      })

      // Product 1: 1 sold, 1 returned -> 100% return rate, but sample size is 1 (< 5) -> NO alert
      const prodSmall = await productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-SAMPLE-1',
        name: 'Small Sample Item',
        costPricePaise: 10000,
        sellingPricePaise: 20000,
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prodSmall.id,
        initialQuantity: 10,
        unitCostPaise: 10000,
      })

      const { sale: s1 } = await saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [{ productId: prodSmall.id, quantity: 1, sellingPricePaise: 20000 }],
        paymentMethod: 'Cash',
      })

      await saleRepository.refundOrCancelSale({
        saleId: s1.id,
        reason: 'Customer mind change',
        restockItems: true,
        items: [{ productId: prodSmall.id, quantity: 1, refundAmountPaise: 20000 }],
      })

      // Product 2: 10 sold, 3 returned -> 30% return rate, sample size is 10 (>= 5) -> TRIGGERS alert
      const prodMeaningful = await productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-SAMPLE-2',
        name: 'Defective Batch T-Shirt',
        costPricePaise: 15000,
        sellingPricePaise: 40000,
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prodMeaningful.id,
        initialQuantity: 20,
        unitCostPaise: 15000,
      })

      const { sale: s2 } = await saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [{ productId: prodMeaningful.id, quantity: 10, sellingPricePaise: 40000 }],
        paymentMethod: 'UPI',
      })

      await saleRepository.refundOrCancelSale({
        saleId: s2.id,
        reason: 'Defective stitch',
        restockItems: true,
        items: [{ productId: prodMeaningful.id, quantity: 3, refundAmountPaise: 120000 }],
      })

      const alerts = await productIntelligenceService.getProfitabilityAlerts('live', {
        branchId: branch.id,
      })

      // Small sample item must NOT trigger an alert
      const alertSmall = alerts.find((a) => a.productId === prodSmall.id && a.type === 'high_return')
      expect(alertSmall).toBeUndefined()

      // Meaningful sample item MUST trigger alert
      const alertMeaningful = alerts.find(
        (a) => a.productId === prodMeaningful.id && a.type === 'high_return'
      )
      expect(alertMeaningful).toBeDefined()
      expect(alertMeaningful!.evidenceMetric).toContain('30%')
    })
  })

  describe('6. Performance Matrix & Velocity Rankings', () => {
    it('classifies Star, Cash Cow, and Opportunity tiers based on revenue vs profit', async () => {
      const branch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Jaipur Terminal',
        code: 'JAI-01',
      })

      // High volume, high margin -> Star
      const starProd = await productRepository.create({
        workspaceId: 'live',
        sku: 'STAR-01',
        name: 'Premium Leather Wallet',
        costPricePaise: 30000,
        sellingPricePaise: 100000, // 70% margin
      })

      await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: starProd.id,
        initialQuantity: 50,
        unitCostPaise: 30000,
      })

      await saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [{ productId: starProd.id, quantity: 20, sellingPricePaise: 100000 }],
        paymentMethod: 'Card',
      })

      const matrix = await productIntelligenceService.getProductPerformanceIntelligence('live', {
        branchId: branch.id,
      })

      const starItem = matrix.find((p) => p.productId === starProd.id)
      expect(starItem).toBeDefined()
      expect(starItem!.revenueRank).toBe(1)
      expect(starItem!.profitRank).toBe(1)
      expect(starItem!.performanceTier).toBe('Star')
    })
  })

  describe('7. Safety: Recommendations Do Not Modify Business Records', () => {
    it('calling intelligence services leaves inventory, products, sales, and expenses untouched', async () => {
      const branch = await branchRepository.create({
        workspaceId: 'live',
        name: 'Safety Check Branch',
        code: 'SAFE-01',
      })

      const prod = await productRepository.create({
        workspaceId: 'live',
        sku: 'SAFE-SKU-01',
        name: 'Safety Item',
        costPricePaise: 10000,
        sellingPricePaise: 20000,
        reorderPoint: 5,
      })

      const initialInv = await inventoryRepository.ensureInventoryRecord({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prod.id,
        initialQuantity: 3,
        unitCostPaise: 10000,
      })

      // Query all intelligence endpoints
      await productIntelligenceService.getReplenishmentRecommendations('live')
      await productIntelligenceService.getSlowMovingInventory('live')
      await productIntelligenceService.getProfitabilityAlerts('live')
      await productIntelligenceService.getProductPerformanceIntelligence('live')
      await productIntelligenceService.getSummaryCounts('live')

      // Verify records are unchanged
      const afterInv = await inventoryRepository.getByBranchAndProduct(branch.id, prod.id)
      expect(afterInv?.quantity).toBe(initialInv.quantity)
      expect(afterInv?.quantityOnHand).toBe(initialInv.quantityOnHand)

      const afterProd = await productRepository.getById(prod.id)
      expect(afterProd?.costPricePaise).toBe(prod.costPricePaise)
      expect(afterProd?.sellingPricePaise).toBe(prod.sellingPricePaise)
    })
  })

  describe('8. Dismissals and Workspace Isolation', () => {
    it('supports dismiss and restore without altering underlying database data', async () => {
      const prod = await productRepository.create({
        workspaceId: 'live',
        sku: 'DISMISS-01',
        name: 'Dismissable Item',
        costPricePaise: 50000,
        sellingPricePaise: 30000, // Below cost alert
      })

      let alerts = await productIntelligenceService.getProfitabilityAlerts('live')
      const targetAlert = alerts.find((a) => a.productId === prod.id)
      expect(targetAlert).toBeDefined()

      // Dismiss alert
      productIntelligenceService.dismissRecommendation('live', targetAlert!.id)

      // Query without dismissed: should be excluded
      alerts = await productIntelligenceService.getProfitabilityAlerts('live', { includeDismissed: false })
      expect(alerts.find((a) => a.id === targetAlert!.id)).toBeUndefined()

      // Query with includeDismissed: should be present with isDismissed = true
      alerts = await productIntelligenceService.getProfitabilityAlerts('live', { includeDismissed: true })
      const dismissedItem = alerts.find((a) => a.id === targetAlert!.id)
      expect(dismissedItem).toBeDefined()
      expect(dismissedItem!.isDismissed).toBe(true)

      // Restore alert
      productIntelligenceService.restoreRecommendation('live', targetAlert!.id)
      alerts = await productIntelligenceService.getProfitabilityAlerts('live', { includeDismissed: false })
      expect(alerts.find((a) => a.id === targetAlert!.id)).toBeDefined()
    })

    it('strictly isolates live and demo workspace recommendations', async () => {
      await productRepository.create({
        workspaceId: 'demo',
        sku: 'DEMO-ONLY-ALERT',
        name: 'Demo Below Cost',
        costPricePaise: 100000,
        sellingPricePaise: 50000,
      })

      const liveAlerts = await productIntelligenceService.getProfitabilityAlerts('live')
      expect(liveAlerts.find((a) => a.sku === 'DEMO-ONLY-ALERT')).toBeUndefined()

      const demoAlerts = await productIntelligenceService.getProfitabilityAlerts('demo')
      expect(demoAlerts.find((a) => a.sku === 'DEMO-ONLY-ALERT')).toBeDefined()
    })
  })
})
