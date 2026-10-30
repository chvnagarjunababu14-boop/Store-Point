import { describe, it, expect, beforeEach } from 'vitest'
import { closeDB, deleteDatabase } from '@/lib/db'
import { branchRepository } from '@/lib/repositories/branchRepository'
import { productRepository } from '@/lib/repositories/productRepository'
import { inventoryRepository } from '@/lib/repositories/inventoryRepository'
import { purchaseRepository } from '@/lib/repositories/purchaseRepository'
import { saleRepository } from '@/lib/repositories/saleRepository'
import { expenseRepository } from '@/lib/repositories/expenseRepository'
import { financialCalculationService } from '@/lib/services/financialCalculationService'

describe('Central Financial and Costing Calculations', () => {
  beforeEach(async () => {
    closeDB()
    await deleteDatabase()
  })

  it('calculates weighted-average cost when receiving purchases', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'North Store',
      code: 'NS-01',
      city: 'Spokane',
      state: 'WA',
      address: '100 North Way',
      phone: '509-555-0188',
      email: 'north@storepoint.app',
      isActive: true,
    })

    // Product starts with 10 units at $10.00 (1000 cents) = $100.00
    const prod = await productRepository.create({
      workspaceId: 'live',
      name: 'Olive Oil 1L',
      sku: 'OIL-OLV-01',
      category: 'Pantry',
      costPriceCents: 1000,
      sellingPriceCents: 2000,
      reorderPoint: 5,
      isActive: true,
    })

    await inventoryRepository.adjustStock({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prod.id,
      delta: 10,
      type: 'adjustment',
      unitCostCents: 1000,
    })

    // Now receive a purchase order: 10 new units at $15.00 (1500 cents)
    // Formula: (10 * 1000 + 10 * 1500) / (10 + 10) = (10000 + 15000) / 20 = 25000 / 20 = 1250 cents ($12.50)
    const po = await purchaseRepository.createPurchaseOrder({
      workspaceId: 'live',
      branchId: branch.id,
      supplierName: 'Mediterranean Imports',
      items: [{ productId: prod.id, quantity: 10, unitCostCents: 1500 }],
    })

    await purchaseRepository.receivePurchaseOrder(po.purchase.id)

    // Check updated product cost in catalog
    const refreshedProd = await productRepository.getById(prod.id)
    expect(refreshedProd?.costPriceCents).toBe(1250)

    // Check inventory stock on hand is now 20
    const inv = await inventoryRepository.get(branch.id, prod.id)
    expect(inv?.quantityOnHand).toBe(20)

    // Idempotency check: receiving the same PO again throws error and doesn't duplicate stock
    await expect(
      purchaseRepository.receivePurchaseOrder(po.purchase.id)
    ).rejects.toThrow('already been received')

    const invAfterAttempt = await inventoryRepository.get(branch.id, prod.id)
    expect(invAfterAttempt?.quantityOnHand).toBe(20)
  })

  it('preserves historical cost snapshots on sales when product catalog cost later changes', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Central Store',
      code: 'CS-01',
      city: 'Seattle',
      state: 'WA',
      address: '200 Pine St',
      phone: '206-555-0122',
      email: 'central@storepoint.app',
      isActive: true,
    })

    const prod = await productRepository.create({
      workspaceId: 'live',
      name: 'Artisan Honey',
      sku: 'HNY-01',
      category: 'Pantry',
      costPriceCents: 800, // $8.00 unit cost at time of sale
      sellingPriceCents: 1600, // $16.00
      reorderPoint: 5,
      isActive: true,
    })

    await inventoryRepository.adjustStock({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prod.id,
      delta: 10,
      type: 'adjustment',
    })

    // Make a sale of 2 units (Revenue = $32.00, Snapshot COGS = 2 * $8.00 = $16.00)
    await saleRepository.createSale({
      workspaceId: 'live',
      branchId: branch.id,
      discountCents: 0,
      paymentMethod: 'cash',
      items: [{ productId: prod.id, quantity: 2, unitPriceCents: 1600 }],
    })

    // Calculate initial summary
    let summary = await financialCalculationService.calculateSummary('live')
    expect(summary.grossSalesCents).toBe(3200)
    expect(summary.cogsCents).toBe(1600)
    expect(summary.grossProfitCents).toBe(1600) // 3200 - 1600

    // Now suppose the product wholesale price jumps to $14.00 (1400 cents) today
    await productRepository.update(prod.id, {
      costPriceCents: 1400,
    })

    // Recalculating financial summary MUST still report the historical COGS of 1600, NOT 2 * 1400
    summary = await financialCalculationService.calculateSummary('live')
    expect(summary.cogsCents).toBe(1600)
    expect(summary.grossProfitCents).toBe(1600)
  })

  it('computes net sales, gross profit, operating expenses, net operating profit and margins', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Metro Store',
      code: 'MS-01',
      city: 'Bellevue',
      state: 'WA',
      address: '400 106th Ave',
      phone: '425-555-0199',
      email: 'metro@storepoint.app',
      isActive: true,
    })

    const prod = await productRepository.create({
      workspaceId: 'live',
      name: 'Smart Speaker',
      sku: 'SPK-SMT-01',
      category: 'Electronics',
      costPriceCents: 4000, // $40.00
      sellingPriceCents: 10000, // $100.00
      reorderPoint: 5,
      isActive: true,
    })

    await inventoryRepository.adjustStock({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prod.id,
      delta: 20,
      type: 'adjustment',
    })

    // Sale of 5 speakers ($500 gross sales, $50 discount = $450 net, COGS = 5 * 40 = $200)
    const saleResult = await saleRepository.createSale({
      workspaceId: 'live',
      branchId: branch.id,
      discountCents: 5000,
      paymentMethod: 'card',
      items: [{ productId: prod.id, quantity: 5, unitPriceCents: 10000 }],
    })

    // Add operating expenses: $100 rent, $50 utilities = $150 opex
    await expenseRepository.create({
      workspaceId: 'live',
      branchId: branch.id,
      category: 'rent',
      amountCents: 10000,
      date: '2026-10-10',
    })
    await expenseRepository.create({
      workspaceId: 'live',
      branchId: branch.id,
      category: 'utilities',
      amountCents: 5000,
      date: '2026-10-12',
    })

    let summary = await financialCalculationService.calculateSummary('live')
    expect(summary.grossSalesCents).toBe(50000)
    expect(summary.discountsCents).toBe(5000)
    expect(summary.netSalesCents).toBe(45000)
    expect(summary.cogsCents).toBe(20000)
    expect(summary.grossProfitCents).toBe(25000) // 45000 - 20000
    expect(summary.operatingExpensesCents).toBe(15000)
    expect(summary.netOperatingProfitCents).toBe(10000) // 25000 - 15000 = $100.00
    // Gross Margin = 25000 / 45000 = 55.56%
    expect(summary.grossProfitMarginPercent).toBeCloseTo(55.56, 1)
    // Net Margin = 10000 / 45000 = 22.22%
    expect(summary.netProfitMarginPercent).toBeCloseTo(22.22, 1)

    // Now process a return of 1 item with $90 refund
    await saleRepository.processReturn({
      workspaceId: 'live',
      saleId: saleResult.sale.id,
      branchId: branch.id,
      reason: 'Customer return',
      items: [{ productId: prod.id, quantity: 1, refundAmountCents: 9000 }],
    })

    // Returns decrease net sales and reduce recognized COGS (because item was returned to stock)
    summary = await financialCalculationService.calculateSummary('live')
    expect(summary.returnsCents).toBe(9000)
    expect(summary.netSalesCents).toBe(36000) // 45000 - 9000
    expect(summary.cogsCents).toBe(16000) // 20000 - 4000
    expect(summary.grossProfitCents).toBe(20000) // 36000 - 16000
    expect(summary.netOperatingProfitCents).toBe(5000) // 20000 - 15000 = $50.00
  })
})
