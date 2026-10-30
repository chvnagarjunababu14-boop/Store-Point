import { describe, it, expect, beforeEach } from 'vitest'
import { closeDB, deleteDatabase } from '@/lib/db'
import { branchRepository } from '@/lib/repositories/branchRepository'
import { productRepository } from '@/lib/repositories/productRepository'
import { inventoryRepository } from '@/lib/repositories/inventoryRepository'
import { saleRepository } from '@/lib/repositories/saleRepository'
import { expenseRepository } from '@/lib/repositories/expenseRepository'
import { stockMovementRepository } from '@/lib/repositories/stockMovementRepository'
import { financialCalculationService } from '@/lib/services/financialCalculationService'

describe('Phase 7: Sales, Returns, and Operating Expense Tests', () => {
  beforeEach(async () => {
    closeDB()
    await deleteDatabase()
  })

  it('atomically commits multi-item POS sales with line & order discounts, payment metadata, and cost snapshots', async () => {
    // 1. Setup Branch & Products
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Mumbai Flagship Terminal',
      code: 'MUM-01',
      address: 'Bandra West, Mumbai',
      phone: '+91 98200 11223',
    })

    const prodA = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-PROD-A',
      name: 'Premium Wireless Headphones',
      category: 'Audio',
      unit: 'pcs',
      costPricePaise: 250000, // ₹2,500.00
      sellingPricePaise: 499900, // ₹4,999.00
    })

    const prodB = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-PROD-B',
      name: 'USB-C Braided Cable',
      category: 'Accessories',
      unit: 'pcs',
      costPricePaise: 15000, // ₹150.00
      sellingPricePaise: 49900, // ₹499.00
    })

    // Seed branch stock
    await inventoryRepository.ensureInventoryRecord({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prodA.id,
      initialQuantity: 10,
      unitCostPaise: 250000,
      reorderPoint: 2,
    })

    await inventoryRepository.ensureInventoryRecord({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prodB.id,
      initialQuantity: 25,
      unitCostPaise: 15000,
      reorderPoint: 5,
    })

    // 2. Commit a multi-item sale with line discount on Prod A and order-level discount
    const saleResult = await saleRepository.createSale({
      workspaceId: 'live',
      branchId: branch.id,
      receiptNumber: 'REC-MUM-1001',
      items: [
        {
          productId: prodA.id,
          quantity: 2,
          sellingPricePaise: 499900,
          discountPaise: 49900, // ₹499 line discount on headphones
        },
        {
          productId: prodB.id,
          quantity: 3,
          sellingPricePaise: 49900,
          discountPaise: 0,
        },
      ],
      discountPaise: 50000, // ₹500 order-level discount
      taxPaise: 0,
      paymentMethod: 'UPI',
      notes: 'Counter 1 transaction - GPay customer',
    })

    const { sale, lineItems } = saleResult
    expect(sale.receiptNumber).toBe('REC-MUM-1001')
    expect(sale.paymentMethod).toBe('UPI')
    expect(sale.notes).toBe('Counter 1 transaction - GPay customer')
    expect(sale.status).toBe('completed')

    // Line 1: (2 * 499900) - 49900 = 999800 - 49900 = 949900 paise
    // Line 2: 3 * 49900 = 149700 paise
    // Subtotal: 949900 + 149700 = 1099600 paise (₹10,996.00)
    expect(sale.subtotalPaise).toBe(1099600)
    expect(sale.discountPaise).toBe(50000) // ₹500 order discount
    // Final Total: 1099600 - 50000 = 1049600 paise (₹10,496.00)
    expect(sale.totalPaise).toBe(1049600)

    // COGS snapshot: (2 * 250000) + (3 * 15000) = 500000 + 45000 = 545000 paise (₹5,450.00)
    expect(sale.totalCostPaise).toBe(545000)
    // Net profit: 1049600 - 545000 = 504600 paise (₹5,046.00)
    expect(sale.netProfitPaise).toBe(504600)

    // Check line items snapshot
    expect(lineItems).toHaveLength(2)
    const liA = lineItems.find((l) => l.productId === prodA.id)!
    expect(liA.quantity).toBe(2)
    expect(liA.unitCostSnapshotPaise).toBe(250000)
    expect(liA.unitSellingPricePaise).toBe(499900)
    expect(liA.discountPaise).toBe(49900)
    expect(liA.totalPaise).toBe(949900)

    // Check inventory decrement
    const invA = await inventoryRepository.getByBranchAndProduct(branch.id, prodA.id)
    expect(invA?.quantity).toBe(8) // 10 - 2
    const invB = await inventoryRepository.getByBranchAndProduct(branch.id, prodB.id)
    expect(invB?.quantity).toBe(22) // 25 - 3

    // Check stock movement records
    const movements = await stockMovementRepository.listByWorkspace('live')
    const saleMovements = movements.filter((m) => m.referenceId === sale.id)
    expect(saleMovements).toHaveLength(2)
    expect(saleMovements[0].type).toBe('sale')
    expect(saleMovements.some((m) => m.productId === prodA.id && m.quantityDelta === -2)).toBe(true)
    expect(saleMovements.some((m) => m.productId === prodB.id && m.quantityDelta === -3)).toBe(true)
  })

  it('rejects sales with insufficient stock, negative amounts, or excessive discounts', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Delhi Store',
      code: 'DEL-01',
    })

    const prod = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-LIMITED',
      name: 'Limited Edition Smart Watch',
      costPricePaise: 800000,
      sellingPricePaise: 1200000,
    })

    await inventoryRepository.ensureInventoryRecord({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prod.id,
      initialQuantity: 2,
    })

    // 1. Insufficient stock rejection
    await expect(
      saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [{ productId: prod.id, quantity: 5 }],
        paymentMethod: 'Card',
      })
    ).rejects.toThrow('Insufficient stock')

    // 2. Empty items rejection
    await expect(
      saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [],
        paymentMethod: 'Cash',
      })
    ).rejects.toThrow('at least one line item')

    // 3. Negative quantity rejection
    await expect(
      saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [{ productId: prod.id, quantity: -1 }],
        paymentMethod: 'Cash',
      })
    ).rejects.toThrow('greater than zero')

    // 4. Excessive line discount rejection
    await expect(
      saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [{ productId: prod.id, quantity: 1, sellingPricePaise: 1200000, discountPaise: 1500000 }],
        paymentMethod: 'Cash',
      })
    ).rejects.toThrow('cannot exceed')

    // 5. Excessive order discount rejection
    await expect(
      saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [{ productId: prod.id, quantity: 1, sellingPricePaise: 1200000 }],
        discountPaise: 2000000, // ₹20,000 on a ₹12,000 sale
        paymentMethod: 'Cash',
      })
    ).rejects.toThrow('cannot exceed sale subtotal')
  })

  it('manages repeated partial returns, cumulative caps, restock toggles, and status transitions', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Bengaluru Branch',
      code: 'BLR-01',
    })

    const prod = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-SHIRT',
      name: 'Cotton Casual Shirt',
      costPricePaise: 40000, // ₹400.00
      sellingPricePaise: 99900, // ₹999.00
    })

    await inventoryRepository.ensureInventoryRecord({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prod.id,
      initialQuantity: 10,
      unitCostPaise: 40000,
    })

    // Sale of 4 shirts at ₹999 each = ₹3,996.00 (399600 paise)
    const { sale } = await saleRepository.createSale({
      workspaceId: 'live',
      branchId: branch.id,
      receiptNumber: 'REC-BLR-501',
      items: [{ productId: prod.id, quantity: 4, sellingPricePaise: 99900 }],
      paymentMethod: 'Card',
      notes: 'Customer buying 4 shirts',
    })

    let inv = await inventoryRepository.getByBranchAndProduct(branch.id, prod.id)
    expect(inv?.quantity).toBe(6) // 10 - 4

    // ── First Partial Return: Return 1 shirt WITH restock ──
    const ret1 = await saleRepository.refundOrCancelSale({
      saleId: sale.id,
      reason: 'Wrong size requested',
      restockItems: true,
      items: [{ productId: prod.id, quantity: 1 }], // Defaults to pro-rata 99900 paise
    })

    expect(ret1.sale.status).toBe('partial_return')
    expect(ret1.returnRecord.refundAmountPaise).toBe(99900)
    expect(ret1.returnRecord.restockItems).toBe(true)

    // Stock should be restocked: 6 + 1 = 7
    inv = await inventoryRepository.getByBranchAndProduct(branch.id, prod.id)
    expect(inv?.quantity).toBe(7)

    // Check return stock movement
    let movements = await stockMovementRepository.listByWorkspace('live')
    expect(
      movements.some((m) => m.referenceId === ret1.returnRecord.id && m.type === 'sale_return' && m.quantityDelta === 1)
    ).toBe(true)

    // ── Second Partial Return: Return 2 shirts WITHOUT restock (damaged) ──
    const ret2 = await saleRepository.refundOrCancelSale({
      saleId: sale.id,
      reason: 'Torn fabric reported by customer',
      restockItems: false,
      items: [{ productId: prod.id, quantity: 2 }],
    })

    expect(ret2.sale.status).toBe('partial_return')
    expect(ret2.returnRecord.refundAmountPaise).toBe(199800) // 2 * 99900
    expect(ret2.returnRecord.restockItems).toBe(false)

    // Stock should NOT increase because restockItems is false: remains 7
    inv = await inventoryRepository.getByBranchAndProduct(branch.id, prod.id)
    expect(inv?.quantity).toBe(7)

    // ── Guard Check: Excessive quantity rejection ──
    // 3 shirts returned so far out of 4 sold. Only 1 remains returnable.
    await expect(
      saleRepository.refundOrCancelSale({
        saleId: sale.id,
        reason: 'Attempting to return 2 when only 1 left',
        items: [{ productId: prod.id, quantity: 2 }],
      })
    ).rejects.toThrow('only 1 unit(s) remain returnable')

    // ── Guard Check: Excessive refund amount rejection ──
    // Remaining refundable amount: 399600 - (99900 + 199800) = 99900 paise.
    await expect(
      saleRepository.refundOrCancelSale({
        saleId: sale.id,
        reason: 'Manual excessive refund attempt',
        items: [{ productId: prod.id, quantity: 1, refundAmountPaise: 200000 }], // ₹2,000 refund on a ₹999 shirt
      })
    ).rejects.toThrow('exceeds the remaining refundable amount')

    // ── Guard Check: Empty reason rejection ──
    await expect(
      saleRepository.refundOrCancelSale({
        saleId: sale.id,
        reason: '   ',
        items: [{ productId: prod.id, quantity: 1 }],
      })
    ).rejects.toThrow('Return reason is required')

    // ── Third Return: Return the final 1 shirt ──
    const ret3 = await saleRepository.refundOrCancelSale({
      saleId: sale.id,
      reason: 'Final unit return',
      restockItems: true,
      items: [{ productId: prod.id, quantity: 1 }],
    })

    // Now all 4 units have been returned: status advances to 'refunded'
    expect(ret3.sale.status).toBe('refunded')
    inv = await inventoryRepository.getByBranchAndProduct(branch.id, prod.id)
    expect(inv?.quantity).toBe(8) // 7 + 1

    // ── Guard Check: Cannot return once sale is fully refunded ──
    await expect(
      saleRepository.refundOrCancelSale({
        saleId: sale.id,
        reason: 'Duplicate refund attempt on fully refunded sale',
        items: [{ productId: prod.id, quantity: 1 }],
      })
    ).rejects.toThrow('already marked as refunded')

    // Verify all 3 returns are stored in audit trail
    const allReturns = await saleRepository.getReturns(sale.id)
    expect(allReturns).toHaveLength(3)
    const totalRefundIssued = allReturns.reduce((s, r) => s + (r.refundAmountPaise ?? 0), 0)
    expect(totalRefundIssued).toBe(399600) // Exactly matches original total
  })

  it('performs full Operating Expense CRUD and verifies consistency with financial calculations', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Pune Warehouse',
      code: 'PUN-01',
    })

    // 1. Create operating expenses
    const exp1 = await expenseRepository.create({
      workspaceId: 'live',
      branchId: branch.id,
      category: 'Rent & Facilities',
      description: 'Warehouse lease monthly payment',
      amountPaise: 7500000, // ₹75,000.00
      date: '2026-10-01',
      paymentMethod: 'Direct Debit',
      receiptRef: 'LEASE-PUN-OCT26',
    })

    const exp2 = await expenseRepository.create({
      workspaceId: 'live',
      branchId: branch.id,
      category: 'Utilities & Internet',
      description: 'Fiber internet connection',
      amountPaise: 299900, // ₹2,999.00
      date: '2026-10-05',
      paymentMethod: 'UPI',
      receiptRef: 'AIRTEL-77123',
    })

    expect(exp1.id).toBeDefined()
    expect(exp1.receiptRef).toBe('LEASE-PUN-OCT26')
    expect(exp2.amountPaise).toBe(299900)

    // 2. List & branch filter
    const liveExpenses = await expenseRepository.getAll('live', branch.id)
    expect(liveExpenses).toHaveLength(2)

    // Workspace isolation check: demo workspace should have 0 expenses
    const demoExpenses = await expenseRepository.getAll('demo', branch.id)
    expect(demoExpenses).toHaveLength(0)

    // 3. Update expense
    const updatedExp2 = await expenseRepository.update(exp2.id, {
      description: 'Fiber gigabit internet + static IP',
      amountPaise: 349900, // ₹3,499.00
      receiptRef: 'AIRTEL-77123-AMENDED',
    })

    expect(updatedExp2.description).toBe('Fiber gigabit internet + static IP')
    expect(updatedExp2.amountPaise).toBe(349900)
    expect(updatedExp2.receiptRef).toBe('AIRTEL-77123-AMENDED')

    // 4. Financial Calculation Service Integration
    // Operating expenses: 7500000 + 349900 = 7849900 paise
    const summary = await financialCalculationService.getSummary('live', branch.id)
    expect(summary.operatingExpensesPaise).toBe(7849900)

    // 5. Delete expense
    await expenseRepository.delete(exp2.id)
    const afterDelete = await expenseRepository.getAll('live', branch.id)
    expect(afterDelete).toHaveLength(1)
    expect(afterDelete[0].id).toBe(exp1.id)

    // Financial summary should update accordingly
    const summaryAfterDelete = await financialCalculationService.getSummary('live', branch.id)
    expect(summaryAfterDelete.operatingExpensesPaise).toBe(7500000)
  })

  it('accurately reconciles gross sales, discounts, returns, COGS, opex, and net operating profit', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Chennai Tech Hub',
      code: 'CHN-01',
    })

    const prod = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-MONITOR',
      name: '4K IPS Monitor',
      costPricePaise: 1800000, // ₹18,000.00
      sellingPricePaise: 2800000, // ₹28,000.00
    })

    await inventoryRepository.ensureInventoryRecord({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prod.id,
      initialQuantity: 5,
      unitCostPaise: 1800000,
    })

    // 1. Sale: 2 monitors with ₹2,000 order discount
    // Subtotal: 2 * 2800000 = 5600000 paise (₹56,000)
    // Order discount: 200000 paise (₹2,000)
    // Total Paid: 5400000 paise (₹54,000)
    // Initial COGS: 2 * 1800000 = 3600000 paise (₹36,000)
    const { sale } = await saleRepository.createSale({
      workspaceId: 'live',
      branchId: branch.id,
      receiptNumber: 'REC-CHN-901',
      items: [{ productId: prod.id, quantity: 2, sellingPricePaise: 2800000 }],
      discountPaise: 200000,
      paymentMethod: 'Card',
    })

    // 2. Operating Expense: ₹5,000 electricity
    await expenseRepository.create({
      workspaceId: 'live',
      branchId: branch.id,
      category: 'Utilities & Internet',
      description: 'Electricity power bill',
      amountPaise: 500000,
      date: '2026-10-10',
    })

    // Check initial summary before return
    let summary = await financialCalculationService.getSummary('live', branch.id)
    expect(summary.grossSalesPaise).toBe(5600000)
    expect(summary.discountsPaise).toBe(200000)
    expect(summary.returnsPaise).toBe(0)
    // Net sales: 5600000 - 200000 = 5400000 paise
    expect(summary.netSalesPaise).toBe(5400000)
    // COGS: 3600000 paise
    expect(summary.cogsPaise).toBe(3600000)
    // Gross profit: 5400000 - 3600000 = 1800000 paise (₹18,000)
    expect(summary.grossProfitPaise).toBe(1800000)
    // Operating expenses: 500000 paise (₹5,000)
    expect(summary.operatingExpensesPaise).toBe(500000)
    // Net operating profit: 1800000 - 500000 = 1300000 paise (₹13,000)
    expect(summary.netProfitPaise).toBe(1300000)

    // 3. Return 1 monitor WITH restock
    // Pro-rata refund for 1 monitor: 5600000 / 2 = 2800000 paise
    // But max refundable is capped at saleTotal = 5400000 paise
    await saleRepository.refundOrCancelSale({
      saleId: sale.id,
      reason: 'Customer returned 1 display',
      restockItems: true,
      items: [{ productId: prod.id, quantity: 1, refundAmountPaise: 2700000 }], // ₹27,000 refunded (accounting for pro-rata discount)
    })

    // Check summary after return and restocked COGS reversal
    summary = await financialCalculationService.getSummary('live', branch.id)
    expect(summary.returnsPaise).toBe(2700000)
    // Net Sales: 5600000 - 200000 - 2700000 = 2700000 paise
    expect(summary.netSalesPaise).toBe(2700000)
    // Reversal of restocked COGS: 3600000 - 1800000 = 1800000 paise
    expect(summary.cogsPaise).toBe(1800000)
    // Gross profit: 2700000 - 1800000 = 900000 paise (₹9,000)
    expect(summary.grossProfitPaise).toBe(900000)
    // Net operating profit: 900000 - 500000 = 400000 paise (₹4,000)
    expect(summary.netProfitPaise).toBe(400000)
  })
})
