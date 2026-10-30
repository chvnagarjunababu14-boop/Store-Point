import { describe, it, expect, beforeEach } from 'vitest'
import { closeDB, deleteDatabase } from '@/lib/db'
import { branchRepository } from '@/lib/repositories/branchRepository'
import { productRepository } from '@/lib/repositories/productRepository'
import { inventoryRepository } from '@/lib/repositories/inventoryRepository'
import { saleRepository } from '@/lib/repositories/saleRepository'
import { purchaseRepository } from '@/lib/repositories/purchaseRepository'
import { stockTransferRepository } from '@/lib/repositories/stockTransferRepository'
import { expenseRepository } from '@/lib/repositories/expenseRepository'
import { backupService } from '@/lib/services/backupService'
import { financialCalculationService } from '@/lib/services/financialCalculationService'
import { escapeCSVCell, buildCSV } from '@/utils/csv'

describe('Phase 11: Release Readiness, Security & Transaction Safety Tests', () => {
  beforeEach(async () => {
    closeDB()
    await deleteDatabase()
  })

  // 1. Checkout Idempotency & Stock Decrement
  it('safely decrements stock and snapshots immutable pricing and cost during checkout', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Central Mall Branch',
      code: 'CM-01',
    })

    const product = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-COFFEE-01',
      name: 'Artisan Roast Coffee Beans 500g',
      category: 'Beverages',
      unit: 'bag',
      costPricePaise: 40000, // ₹400.00
      sellingPricePaise: 75000, // ₹750.00
    })

    await inventoryRepository.ensureInventoryRecord({
      workspaceId: 'live',
      branchId: branch.id,
      productId: product.id,
      initialQuantity: 15,
      unitCostPaise: 40000,
    })

    // Process sale of 5 bags with ₹50 (5000 paise) line discount and ₹100 order discount
    const { sale, lineItems } = await saleRepository.createSale({
      workspaceId: 'live',
      branchId: branch.id,
      receiptNumber: 'REC-P11-001',
      items: [
        {
          productId: product.id,
          quantity: 5,
          sellingPricePaise: 75000,
          discountPaise: 5000,
        },
      ],
      paymentMethod: 'UPI',
      discountPaise: 10000, // ₹100 order discount
      taxPaise: 0,
    })

    // Subtotal: 5 * 75000 = 375000 - 5000 = 370000
    // Total: 370000 - 10000 = 360000 paise (₹3,600.00)
    expect(sale.totalPaise).toBe(360000)
    expect(sale.discountPaise).toBe(10000)
    expect(lineItems[0].unitCostSnapshotPaise).toBe(40000)
    expect(lineItems[0].unitSellingPricePaise).toBe(75000)

    // Stock on hand must be exactly 15 - 5 = 10
    const inv = await inventoryRepository.getByBranchAndProduct(branch.id, product.id)
    expect(inv?.quantity).toBe(10)
  })

  it('rejects checkout if stock is insufficient or items array is empty', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'North Branch',
      code: 'NB-01',
    })

    const product = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-LIMITED-01',
      name: 'Limited Edition Mug',
      category: 'Merchandise',
      unit: 'pcs',
      costPricePaise: 20000,
      sellingPricePaise: 50000,
    })

    await inventoryRepository.ensureInventoryRecord({
      workspaceId: 'live',
      branchId: branch.id,
      productId: product.id,
      initialQuantity: 2,
      unitCostPaise: 20000,
    })

    // Attempt to sell 5 items when only 2 exist
    await expect(
      saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [
          {
            productId: product.id,
            quantity: 5,
            sellingPricePaise: 50000,
          },
        ],
        paymentMethod: 'Cash',
      })
    ).rejects.toThrow(/insufficient stock/i)

    // Attempt to create empty sale
    await expect(
      saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        items: [],
        paymentMethod: 'Cash',
      })
    ).rejects.toThrow(/at least one line item/i)
  })

  // 2. Partial Returns Sequences & Cumulative Refund Caps
  it('enforces cumulative refund caps across multiple partial returns', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'South Branch',
      code: 'SB-01',
    })

    const product = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-TSHIRT',
      name: 'Cotton T-Shirt',
      category: 'Apparel',
      unit: 'pcs',
      costPricePaise: 30000,
      sellingPricePaise: 80000, // ₹800.00
    })

    await inventoryRepository.ensureInventoryRecord({
      workspaceId: 'live',
      branchId: branch.id,
      productId: product.id,
      initialQuantity: 10,
      unitCostPaise: 30000,
    })

    const { sale } = await saleRepository.createSale({
      workspaceId: 'live',
      branchId: branch.id,
      items: [
        {
          productId: product.id,
          quantity: 3,
          sellingPricePaise: 80000,
        },
      ],
      paymentMethod: 'Card',
      receiptNumber: 'REC-RET-01',
    })

    // Total sale: 3 * 80000 = 240000 paise (₹2,400.00). Stock is 7.
    let currentInv = await inventoryRepository.getByBranchAndProduct(branch.id, product.id)
    expect(currentInv?.quantity).toBe(7)

    // First partial return: 1 unit with ₹800 refund
    const ret1 = await saleRepository.refundOrCancelSale({
      saleId: sale.id,
      refundAmountPaise: 80000,
      items: [{ productId: product.id, quantity: 1 }],
      restockItems: true,
      reason: 'Customer size exchange',
    })
    expect(ret1.sale.status).toBe('partial_return')

    // Stock should be restored to 8
    currentInv = await inventoryRepository.getByBranchAndProduct(branch.id, product.id)
    expect(currentInv?.quantity).toBe(8)

    // Second partial return: 1 unit with ₹800 refund
    const ret2 = await saleRepository.refundOrCancelSale({
      saleId: sale.id,
      refundAmountPaise: 80000,
      items: [{ productId: product.id, quantity: 1 }],
      restockItems: true,
      reason: 'Color mismatch',
    })
    expect(ret2.sale.status).toBe('partial_return')

    // Stock should be restored to 9
    currentInv = await inventoryRepository.getByBranchAndProduct(branch.id, product.id)
    expect(currentInv?.quantity).toBe(9)

    // Third return attempt: Trying to return 2 units when only 1 unit is left returnable
    await expect(
      saleRepository.refundOrCancelSale({
        saleId: sale.id,
        items: [{ productId: product.id, quantity: 2 }],
        restockItems: true,
        reason: 'Excessive return test',
      })
    ).rejects.toThrow(/remain returnable/i)

    // Attempting to refund more money than remaining sale balance
    // Remaining sale balance is 240000 - 80000 - 80000 = 80000 paise.
    await expect(
      saleRepository.refundOrCancelSale({
        saleId: sale.id,
        items: [{ productId: product.id, quantity: 1, refundAmountPaise: 100000 }], // ₹1,000 exceeds ₹800 balance
        restockItems: true,
        reason: 'Over-refund test',
      })
    ).rejects.toThrow(/exceeds/i)
  })

  // 3. Duplicate Purchase Receiving Idempotency Guard
  it('prevents receiving the same purchase order twice', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Depot A',
      code: 'DEP-01',
    })

    const product = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-RICE-5K',
      name: 'Basmati Rice 5kg',
      category: 'Grains',
      unit: 'pack',
      costPricePaise: 35000,
      sellingPricePaise: 55000,
    })

    await inventoryRepository.ensureInventoryRecord({
      workspaceId: 'live',
      branchId: branch.id,
      productId: product.id,
      initialQuantity: 10,
      unitCostPaise: 35000,
    })

    // Create purchase order of 20 packs
    const { purchase: po } = await purchaseRepository.create({
      workspaceId: 'live',
      branchId: branch.id,
      supplierName: 'Agro Foods Ltd',
      orderNumber: 'PO-2026-001',
      items: [
        {
          productId: product.id,
          quantityOrdered: 20,
          unitCostPaise: 30000,
        },
      ],
    })

    expect(po.status).toBe('ordered')

    // Receive the purchase order
    await purchaseRepository.receivePurchase(po.id)

    const updatedPO = await purchaseRepository.getById(po.id)
    expect(updatedPO?.status).toBe('received')

    // Stock should now be 10 + 20 = 30
    let inv = await inventoryRepository.get(branch.id, product.id)
    expect(inv?.quantityOnHand).toBe(30)

    // Attempting to receive again must throw and NOT increment stock again
    await expect(
      purchaseRepository.receivePurchase(po.id)
    ).rejects.toThrow(/already been received/i)

    inv = await inventoryRepository.get(branch.id, product.id)
    expect(inv?.quantityOnHand).toBe(30) // Still 30, not 50!
  })

  // 4. Duplicate Transfer Dispatch & Receive Idempotency Guards
  it('guards stock transfer state machine against duplicate dispatch and duplicate receive', async () => {
    const branch1 = await branchRepository.create({
      workspaceId: 'live',
      name: 'Source Warehouse',
      code: 'WH-01',
    })

    const branch2 = await branchRepository.create({
      workspaceId: 'live',
      name: 'Retail Outlet',
      code: 'OUT-01',
    })

    const product = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-SPEAKER-BT',
      name: 'Portable Bluetooth Speaker',
      category: 'Electronics',
      unit: 'pcs',
      costPricePaise: 120000,
      sellingPricePaise: 249900,
    })

    // Seed stock: 50 at WH-01, 0 at OUT-01
    await inventoryRepository.ensureInventoryRecord({
      workspaceId: 'live',
      branchId: branch1.id,
      productId: product.id,
      initialQuantity: 50,
      unitCostPaise: 120000,
    })

    await inventoryRepository.ensureInventoryRecord({
      workspaceId: 'live',
      branchId: branch2.id,
      productId: product.id,
      initialQuantity: 0,
      unitCostPaise: 120000,
    })

    // Create transfer draft for 15 units
    const transfer = await stockTransferRepository.create({
      workspaceId: 'live',
      sourceBranchId: branch1.id,
      destinationBranchId: branch2.id,
      productId: product.id,
      quantity: 15,
      referenceNumber: 'TRF-001',
    })

    expect(transfer.status).toBe('draft')

    // Cannot receive a draft transfer directly
    await expect(
      stockTransferRepository.receive(transfer.id)
    ).rejects.toThrow(/only dispatched transfers can be received/i)

    // Dispatch transfer: WH-01 stock drops from 50 to 35
    await stockTransferRepository.dispatch(transfer.id)

    let sourceInv = await inventoryRepository.getByBranchAndProduct(branch1.id, product.id)
    expect(sourceInv?.quantity).toBe(35)

    // Duplicate dispatch must fail
    await expect(
      stockTransferRepository.dispatch(transfer.id)
    ).rejects.toThrow(/only draft transfers can be dispatched/i)

    // Source stock unchanged
    sourceInv = await inventoryRepository.getByBranchAndProduct(branch1.id, product.id)
    expect(sourceInv?.quantity).toBe(35)

    // Receive transfer at destination: OUT-01 stock increases from 0 to 15
    await stockTransferRepository.receive(transfer.id)

    let destInv = await inventoryRepository.getByBranchAndProduct(branch2.id, product.id)
    expect(destInv?.quantity).toBe(15)

    // Duplicate receive must fail
    await expect(
      stockTransferRepository.receive(transfer.id)
    ).rejects.toThrow(/only dispatched transfers can be received/i)

    // Destination stock unchanged
    destInv = await inventoryRepository.getByBranchAndProduct(branch2.id, product.id)
    expect(destInv?.quantity).toBe(15)
  })

  // 5. Demo / Live Workspace Separation
  it('maintains strict isolation between live and demo workspaces', async () => {
    // Create branch in live
    const liveBranch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Live Headquarters',
      code: 'LIVE-01',
    })

    // Create branch in demo
    const demoBranch = await branchRepository.create({
      workspaceId: 'demo',
      name: 'Demo Sandboxed Store',
      code: 'DEMO-01',
    })

    const liveBranches = await branchRepository.list('live')
    const demoBranches = await branchRepository.list('demo')

    expect(liveBranches.some((b) => b.id === liveBranch.id)).toBe(true)
    expect(liveBranches.some((b) => b.id === demoBranch.id)).toBe(false)

    expect(demoBranches.some((b) => b.id === demoBranch.id)).toBe(true)
    expect(demoBranches.some((b) => b.id === liveBranch.id)).toBe(false)
  })

  // 6. Backup Round Trips & Corrupted Restore Preservation
  it('validates backup schema and protects active database when invalid backup is provided', async () => {
    const liveBranch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Primary Hub',
      code: 'HUB-01',
    })

    // Create a product
    const product = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-REAL-DATA',
      name: 'Critical Asset',
      category: 'Assets',
      unit: 'pcs',
      costPricePaise: 100000,
      sellingPricePaise: 200000,
    })

    // Malformed backup payload (negative/non-numeric prices, missing keys)
    const corruptedBackup = {
      format: 'storepoint-backup',
      version: 1,
      workspaceId: 'live',
      data: {
        branches: [{ id: 'b-999', name: 'Corrupt Branch' }], // missing code
        products: [{ id: 'p-999', sku: 'CORRUPT', sellingPricePaise: 'invalid-not-a-number' }],
        inventory: [{ id: 'inv-1', branchId: 'missing-branch', productId: 'missing-prod', quantity: 'NaN' }],
      },
    }

    const validation = backupService.validateBackup(JSON.stringify(corruptedBackup))
    expect(validation.valid).toBe(false)

    // Attempting restore throws
    await expect(
      backupService.restoreBackup(JSON.stringify(corruptedBackup), 'live')
    ).rejects.toThrow()

    // Active database records must still exist completely intact!
    const branchesAfter = await branchRepository.list('live')
    const productsAfter = await productRepository.list('live')
    expect(branchesAfter.some((b) => b.id === liveBranch.id)).toBe(true)
    expect(productsAfter.some((p) => p.id === product.id)).toBe(true)
  })

  // 7. CSV Formula Injection Defense
  it('sanitizes formula injection vectors while preserving numbers and text', () => {
    // Malicious spreadsheet formula triggers
    expect(escapeCSVCell('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"')
    expect(escapeCSVCell('+cmd|"/C calc"!A0')).toBe('"\' +cmd|""/C calc""!A0"'.replace(/ \+/, '+'))
    expect(escapeCSVCell('@malicious')).toBe('"\'@malicious"')
    expect(escapeCSVCell('\tTAB_INJECT')).toBe('"\'\tTAB_INJECT"')
    expect(escapeCSVCell('\rCR_INJECT')).toBe('"\'\rCR_INJECT"')

    // Regular numbers should remain valid unquoted or standard numbers
    expect(escapeCSVCell(1250)).toBe('1250')
    expect(escapeCSVCell(0)).toBe('0')
    expect(escapeCSVCell(-45.5)).toBe('-45.5')

    // Valid negative numeric string should NOT be quote-prepended
    expect(escapeCSVCell('-150.00')).toBe('"-150.00"')

    // Regular text without formula prefix
    expect(escapeCSVCell('Standard Product Name')).toBe('"Standard Product Name"')

    // Full CSV Build
    const csv = buildCSV({
      headers: ['Product', 'Price'],
      rows: [
        ['=cmd|calc', 100],
        ['Regular Item', 250],
      ],
    })
    expect(csv).toContain('"\'=cmd|calc"')
    expect(csv).toContain('"Regular Item"')
  })

  // 8. Financial Reconciliation Across KPIs and Reports
  it('accurately reconciles financial KPIs without double-counting discounts or returns', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Financial Audit Branch',
      code: 'FIN-01',
    })

    const prod = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-AUDIT',
      name: 'Audit Widget',
      category: 'Hardware',
      unit: 'pcs',
      costPricePaise: 50000, // ₹500.00
      sellingPricePaise: 100000, // ₹1,000.00
    })

    await inventoryRepository.ensureInventoryRecord({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prod.id,
      initialQuantity: 100,
      unitCostPaise: 50000,
    })

    // Sale 1: 10 units with ₹500 discount (Subtotal: ₹10,000, Discount: ₹500, Net: ₹9,500, COGS: ₹5,000)
    const { sale: sale1 } = await saleRepository.createSale({
      workspaceId: 'live',
      branchId: branch.id,
      items: [
        {
          productId: prod.id,
          quantity: 10,
          sellingPricePaise: 100000,
        },
      ],
      discountPaise: 50000,
      paymentMethod: 'UPI',
      receiptNumber: 'REC-AUDIT-1',
    })

    // Return 2 units with ₹2,000 refund (Refund: ₹2,000, Returned COGS: ₹1,000)
    await saleRepository.refundOrCancelSale({
      saleId: sale1.id,
      refundAmountPaise: 200000,
      items: [{ productId: prod.id, quantity: 2 }],
      restockItems: true,
      reason: 'Customer return',
    })

    // Expense: ₹1,500 electricity
    await expenseRepository.create({
      workspaceId: 'live',
      branchId: branch.id,
      category: 'Utilities',
      amountPaise: 150000,
      description: 'Monthly electricity bill',
      expenseDate: new Date().toISOString().slice(0, 10),
    })

    // Financial KPI Summary
    const summary = await financialCalculationService.getSummary('live', branch.id)

    // Gross Sales: ₹10,000.00 (1000000 paise)
    expect(summary.grossSalesPaise).toBe(1000000)
    // Discounts: ₹500.00 (50000 paise)
    expect(summary.discountsPaise).toBe(50000)
    // Returns: ₹2,000.00 (200000 paise)
    expect(summary.returnsPaise).toBe(200000)
    // Net Sales: 1000000 - 50000 - 200000 = 750000 paise (₹7,500.00)
    expect(summary.netSalesPaise).toBe(750000)

    // Effective COGS: Sold 10 units at ₹500 = ₹5,000 - returned 2 units at ₹500 = ₹4,000 (400000 paise)
    expect(summary.cogsPaise).toBe(400000)

    // Gross Profit: Net Sales (750000) - COGS (400000) = 350000 paise (₹3,500.00)
    expect(summary.grossProfitPaise).toBe(350000)

    // Operating Expenses: ₹1,500.00 (150000 paise)
    expect(summary.operatingExpensesPaise).toBe(150000)

    // Net Operating Profit: Gross Profit (350000) - Expenses (150000) = 200000 paise (₹2,000.00)
    expect(summary.netOperatingProfitPaise).toBe(200000)
  })
})
