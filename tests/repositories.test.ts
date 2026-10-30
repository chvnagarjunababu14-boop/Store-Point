import { describe, it, expect, beforeEach } from 'vitest'
import { getDB, closeDB, deleteDatabase } from '@/lib/db'
import { branchRepository } from '@/lib/repositories/branchRepository'
import { productRepository } from '@/lib/repositories/productRepository'
import { inventoryRepository } from '@/lib/repositories/inventoryRepository'
import { saleRepository } from '@/lib/repositories/saleRepository'
import { expenseRepository } from '@/lib/repositories/expenseRepository'
import { purchaseRepository } from '@/lib/repositories/purchaseRepository'

describe('IndexedDB Repositories & Data Integrity', () => {
  beforeEach(async () => {
    closeDB()
    await deleteDatabase()
  })

  it('initializes the database with schema stores and indices', async () => {
    const db = await getDB()
    expect(db.name).toBe('storepoint_local_db')
    expect(db.objectStoreNames.contains('branches')).toBe(true)
    expect(db.objectStoreNames.contains('products')).toBe(true)
    expect(db.objectStoreNames.contains('inventory')).toBe(true)
    expect(db.objectStoreNames.contains('sales')).toBe(true)
    expect(db.objectStoreNames.contains('saleLineItems')).toBe(true)
    expect(db.objectStoreNames.contains('purchases')).toBe(true)
    expect(db.objectStoreNames.contains('purchaseLineItems')).toBe(true)
    expect(db.objectStoreNames.contains('operatingExpenses')).toBe(true)
    expect(db.objectStoreNames.contains('stockMovements')).toBe(true)
    expect(db.objectStoreNames.contains('settings')).toBe(true)
  })

  it('performs Branch CRUD and enforces code uniqueness and archive safety', async () => {
    const branch1 = await branchRepository.create({
      workspaceId: 'live',
      name: 'Downtown Flagship',
      code: 'DT-01',
      city: 'Seattle',
      state: 'WA',
      address: '100 Pike St',
      phone: '206-555-0100',
      email: 'downtown@storepoint.app',
      isActive: true,
    })

    expect(branch1.id).toBeDefined()
    expect(branch1.code).toBe('DT-01')

    // Duplicate code check in same workspace
    await expect(
      branchRepository.create({
        workspaceId: 'live',
        name: 'Another Downtown',
        code: 'DT-01',
        city: 'Seattle',
        state: 'WA',
        address: '102 Pike St',
        phone: '206-555-0101',
        email: 'downtown2@storepoint.app',
        isActive: true,
      })
    ).rejects.toThrow('already exists')

    // Update branch
    const updated = await branchRepository.update(branch1.id, {
      city: 'Bellevue',
    })
    expect(updated.city).toBe('Bellevue')

    // Check dependency safety (can delete when no inventory)
    const canDel = await branchRepository.canDelete(branch1.id)
    expect(canDel.canDelete).toBe(true)

    // Archive
    await branchRepository.archive(branch1.id)
    const fetched = await branchRepository.getById(branch1.id)
    expect(fetched?.isActive).toBe(false)
  })

  it('performs Product CRUD and enforces SKU uniqueness', async () => {
    const p1 = await productRepository.create({
      workspaceId: 'live',
      name: 'Espresso Roast Beans',
      sku: 'COF-ESP-01',
      category: 'Beverages',
      costPriceCents: 1250, // $12.50
      sellingPriceCents: 2200, // $22.00
      reorderPoint: 15,
      isActive: true,
    })

    expect(p1.id).toBeDefined()
    expect(p1.sku).toBe('COF-ESP-01')

    // Duplicate SKU check
    await expect(
      productRepository.create({
        workspaceId: 'live',
        name: 'Espresso Clone',
        sku: 'cof-esp-01', // case-insensitive check
        category: 'Beverages',
        costPriceCents: 1000,
        sellingPriceCents: 2000,
        reorderPoint: 10,
        isActive: true,
      })
    ).rejects.toThrow('already exists')

    const list = await productRepository.list('live')
    expect(list.length).toBe(1)
  })

  it('tracks inventory movements and strictly prevents negative stock', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'West Branch',
      code: 'WB-01',
      city: 'Portland',
      state: 'OR',
      address: '500 Pearl St',
      phone: '503-555-0199',
      email: 'west@storepoint.app',
      isActive: true,
    })

    const prod = await productRepository.create({
      workspaceId: 'live',
      name: 'Ceramic Mug',
      sku: 'MUG-CRM-01',
      category: 'Merch',
      costPriceCents: 500,
      sellingPriceCents: 1500,
      reorderPoint: 5,
      isActive: true,
    })

    // Initial stock
    await inventoryRepository.adjustStock({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prod.id,
      delta: 10,
      type: 'purchase_receipt',
      reason: 'Opening stock shipment',
    })

    let inv = await inventoryRepository.get(branch.id, prod.id)
    expect(inv?.quantityOnHand).toBe(10)

    // Deduct 4
    await inventoryRepository.adjustStock({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prod.id,
      delta: -4,
      type: 'sale',
      reason: 'POS Sale',
    })

    inv = await inventoryRepository.get(branch.id, prod.id)
    expect(inv?.quantityOnHand).toBe(6)

    // Attempting to deduct 10 when only 6 available MUST fail
    await expect(
      inventoryRepository.adjustStock({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prod.id,
        delta: -10,
        type: 'sale',
        reason: 'Oversale attempt',
      })
    ).rejects.toThrow('Insufficient inventory stock')

    // Inventory must remain exactly 6
    inv = await inventoryRepository.get(branch.id, prod.id)
    expect(inv?.quantityOnHand).toBe(6)
  })

  it('records atomic multi-item sales and preserves unit cost snapshots', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'East Hub',
      code: 'EH-01',
      city: 'Spokane',
      state: 'WA',
      address: '200 River St',
      phone: '509-555-0100',
      email: 'east@storepoint.app',
      isActive: true,
    })

    const p1 = await productRepository.create({
      workspaceId: 'live',
      name: 'Product 1',
      sku: 'P1-SKU',
      category: 'Cat1',
      costPriceCents: 1000, // $10.00
      sellingPriceCents: 2500, // $25.00
      reorderPoint: 5,
      isActive: true,
    })

    const p2 = await productRepository.create({
      workspaceId: 'live',
      name: 'Product 2',
      sku: 'P2-SKU',
      category: 'Cat2',
      costPriceCents: 2000, // $20.00
      sellingPriceCents: 4000, // $40.00
      reorderPoint: 5,
      isActive: true,
    })

    // Seed stock: 5 units of P1, 2 units of P2
    await inventoryRepository.adjustStock({
      workspaceId: 'live',
      branchId: branch.id,
      productId: p1.id,
      delta: 5,
      type: 'adjustment',
    })
    await inventoryRepository.adjustStock({
      workspaceId: 'live',
      branchId: branch.id,
      productId: p2.id,
      delta: 2,
      type: 'adjustment',
    })

    // Attempt a sale where P2 requests 3 units (only 2 in stock)
    await expect(
      saleRepository.createSale({
        workspaceId: 'live',
        branchId: branch.id,
        discountCents: 0,
        paymentMethod: 'card',
        items: [
          { productId: p1.id, quantity: 2, unitPriceCents: 2500 },
          { productId: p2.id, quantity: 3, unitPriceCents: 4000 },
        ],
      })
    ).rejects.toThrow('Insufficient stock')

    // Stock for P1 must NOT have been partially deducted
    let inv1 = await inventoryRepository.get(branch.id, p1.id)
    expect(inv1?.quantityOnHand).toBe(5)

    // Valid sale: 2 of P1, 1 of P2
    const saleResult = await saleRepository.createSale({
      workspaceId: 'live',
      branchId: branch.id,
      discountCents: 500, // $5 discount
      paymentMethod: 'card',
      items: [
        { productId: p1.id, quantity: 2, unitPriceCents: 2500 },
        { productId: p2.id, quantity: 1, unitPriceCents: 4000 },
      ],
    })

    expect(saleResult.sale.subtotalCents).toBe(2 * 2500 + 1 * 4000) // 9000
    expect(saleResult.sale.totalCents).toBe(9000 - 500) // 8500
    expect(saleResult.lineItems.length).toBe(2)
    // Unit cost snapshots captured at time of sale
    expect(saleResult.lineItems[0].unitCostSnapshotCents).toBe(1000)
    expect(saleResult.lineItems[1].unitCostSnapshotCents).toBe(2000)

    // Stock successfully decremented
    inv1 = await inventoryRepository.get(branch.id, p1.id)
    const inv2 = await inventoryRepository.get(branch.id, p2.id)
    expect(inv1?.quantityOnHand).toBe(3)
    expect(inv2?.quantityOnHand).toBe(1)

    // Now test safe refund / return
    const refundResult = await saleRepository.processReturn({
      workspaceId: 'live',
      saleId: saleResult.sale.id,
      branchId: branch.id,
      reason: 'Customer exchange',
      items: [{ productId: p1.id, quantity: 1, refundAmountCents: 2500 }],
    })

    expect(refundResult.returnRecord.totalRefundCents).toBe(2500)
    // Stock of P1 returned back into inventory (3 + 1 = 4)
    inv1 = await inventoryRepository.get(branch.id, p1.id)
    expect(inv1?.quantityOnHand).toBe(4)
  })

  it('records expenses by branch and category', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'South Branch',
      code: 'SB-01',
      city: 'Tacoma',
      state: 'WA',
      address: '77 Pacific Ave',
      phone: '253-555-0111',
      email: 'south@storepoint.app',
      isActive: true,
    })

    await expenseRepository.create({
      workspaceId: 'live',
      branchId: branch.id,
      category: 'rent',
      amountCents: 250000, // $2,500.00
      date: '2026-10-01',
      description: 'Monthly store lease',
    })

    await expenseRepository.create({
      workspaceId: 'live',
      branchId: branch.id,
      category: 'utilities',
      amountCents: 35000, // $350.00
      date: '2026-10-05',
      description: 'Power & Water bill',
    })

    const branchExpenses = await expenseRepository.list('live', branch.id)
    expect(branchExpenses.length).toBe(2)
    const total = branchExpenses.reduce((s, e) => s + (e.amountPaise ?? e.amountCents ?? 0), 0)
    expect(total).toBe(285000)
  })

  it('handles canonical paise amounts (₹0.01, ₹125.50, ₹1,00,000.00) across products, sales, and expenses', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Mumbai Central',
      code: 'MUM-01',
      city: 'Mumbai',
      state: 'MH',
      address: 'Nariman Point',
      isActive: true,
    })

    // Product with exact paise amounts:
    // Wholesale ₹125.50 (12550 paise), Selling Price ₹1,00,000.00 (10000000 paise)
    const prod = await productRepository.create({
      workspaceId: 'live',
      name: 'High Precision Sensor',
      sku: 'SNS-HPS-01',
      category: 'Hardware',
      costPricePaise: 12550, // ₹125.50
      sellingPricePaise: 10000000, // ₹1,00,000.00
      reorderPoint: 2,
      isActive: true,
    })

    expect(prod.costPricePaise).toBe(12550)
    expect(prod.costPriceCents).toBe(12550) // backward compatibility
    expect(prod.sellingPricePaise).toBe(10000000)

    // Micro product: ₹0.01 (1 paise)
    const microProd = await productRepository.create({
      workspaceId: 'live',
      name: 'Washer Ring',
      sku: 'WSH-01',
      category: 'Hardware',
      costPricePaise: 1, // ₹0.01
      sellingPricePaise: 50, // ₹0.50
      reorderPoint: 10,
      isActive: true,
    })
    expect(microProd.costPricePaise).toBe(1)

    // Stock both
    await inventoryRepository.adjustStock({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prod.id,
      delta: 5,
      type: 'adjustment',
      unitCostPaise: 12550,
    })
    await inventoryRepository.adjustStock({
      workspaceId: 'live',
      branchId: branch.id,
      productId: microProd.id,
      delta: 100,
      type: 'adjustment',
      unitCostPaise: 1,
    })

    // Multi-item sale with paise
    const saleRes = await saleRepository.createSale({
      workspaceId: 'live',
      branchId: branch.id,
      paymentMethod: 'UPI',
      items: [
        { productId: prod.id, quantity: 1, sellingPricePaise: 10000000 },
        { productId: microProd.id, quantity: 2, sellingPricePaise: 50 },
      ],
      discountPaise: 100, // ₹1.00 discount
      taxPaise: 1800000, // ₹18,000.00 tax
    })

    expect(saleRes.sale.subtotalPaise).toBe(10000000 + 100)
    expect(saleRes.sale.discountPaise).toBe(100)
    expect(saleRes.sale.taxPaise).toBe(1800000)
    expect(saleRes.sale.totalPaise).toBe(10000000 + 1800000)

    // Check expense with paise (₹1,00,000.00)
    const exp = await expenseRepository.create({
      workspaceId: 'live',
      branchId: branch.id,
      category: 'Rent',
      amountPaise: 10000000, // ₹1,00,000.00
      date: '2026-10-22',
      description: 'Office commercial lease Mumbai',
    })
    expect(exp.amountPaise).toBe(10000000)
    expect(exp.amountCents).toBe(10000000)

    // Safe Partial Refund & Idempotency Check
    const retRes = await saleRepository.refundOrCancelSale({
      saleId: saleRes.sale.id,
      reason: 'Returned washer ring only',
      restockItems: true,
      items: [{ productId: microProd.id, quantity: 2, refundAmountPaise: 100 }],
    })

    // Returning only microProd leaves prod (qty=1) unreturned → partial_return
    expect(retRes.sale.status).toBe('partial_return')
    expect(retRes.returnRecord.refundAmountPaise).toBe(100)

    // Restock verified for microProd (100 - 2 + 2 = 100)
    const microInv = await inventoryRepository.get(branch.id, microProd.id)
    expect(microInv?.quantityOnHand).toBe(100)

    // Prod stock remains 4 (5 - 1 = 4, not restocked — not in return items)
    const prodInv = await inventoryRepository.get(branch.id, prod.id)
    expect(prodInv?.quantityOnHand).toBe(4)

    // Return the remaining sensor to fully close the sale
    const finalRet = await saleRepository.refundOrCancelSale({
      saleId: saleRes.sale.id,
      reason: 'Returned sensor too',
      restockItems: false,
      items: [{ productId: prod.id, quantity: 1, refundAmountPaise: 10000000 }],
    })
    expect(finalRet.sale.status).toBe('refunded') // now fully returned

    // Attempting duplicate refund on fully-refunded sale MUST fail
    await expect(
      saleRepository.refundOrCancelSale({
        saleId: saleRes.sale.id,
        reason: 'Duplicate refund attempt',
      })
    ).rejects.toThrow('Cannot refund twice')
  })


  it('enforces partial return quantity cap across multiple sequential partial returns', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Hyderabad South',
      code: 'HYD-S1',
      city: 'Hyderabad',
      state: 'TS',
      address: 'Banjara Hills',
      isActive: true,
    })

    const prod = await productRepository.create({
      workspaceId: 'live',
      name: 'Drill Bit Set',
      sku: 'DRILL-BS-01',
      category: 'Tools',
      costPricePaise: 50000, // ₹500
      sellingPricePaise: 100000, // ₹1000
      reorderPoint: 3,
      isActive: true,
    })

    // Seed 10 units
    await inventoryRepository.adjustStock({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prod.id,
      delta: 10,
      type: 'purchase_receipt',
      unitCostPaise: 50000,
    })

    // Sell 5 units
    const saleRes = await saleRepository.createSale({
      workspaceId: 'live',
      branchId: branch.id,
      paymentMethod: 'Cash',
      items: [{ productId: prod.id, quantity: 5, sellingPricePaise: 100000 }],
    })
    expect(saleRes.sale.totalPaise).toBe(500000) // ₹5000

    let inv = await inventoryRepository.get(branch.id, prod.id)
    expect(inv?.quantityOnHand).toBe(5) // 10 - 5 sold

    // --- Partial return 1: return 2 of 5 ---
    const ret1 = await saleRepository.refundOrCancelSale({
      saleId: saleRes.sale.id,
      reason: 'Customer changed mind on 2',
      items: [{ productId: prod.id, quantity: 2, refundAmountPaise: 200000 }],
    })
    expect(ret1.sale.status).toBe('partial_return') // not fully returned yet
    expect(ret1.returnRecord.refundAmountPaise).toBe(200000)

    inv = await inventoryRepository.get(branch.id, prod.id)
    expect(inv?.quantityOnHand).toBe(7) // 5 + 2 restocked

    // --- Partial return 2: return another 2 ---
    const ret2 = await saleRepository.refundOrCancelSale({
      saleId: saleRes.sale.id,
      reason: 'More items rejected',
      items: [{ productId: prod.id, quantity: 2, refundAmountPaise: 200000 }],
    })
    expect(ret2.sale.status).toBe('partial_return') // still 1 unit out
    expect(ret2.returnRecord.refundReceiptNumber).toContain('-P2') // numbered suffix

    inv = await inventoryRepository.get(branch.id, prod.id)
    expect(inv?.quantityOnHand).toBe(9) // 7 + 2 restocked

    // --- Over-return attempt: trying to return 3 more, but only 1 remains returnable ---
    await expect(
      saleRepository.refundOrCancelSale({
        saleId: saleRes.sale.id,
        reason: 'Over-return attempt',
        items: [{ productId: prod.id, quantity: 3, refundAmountPaise: 300000 }],
      })
    ).rejects.toThrow('only 1 unit(s) remain returnable')

    // Stock must NOT change after rejected over-return
    inv = await inventoryRepository.get(branch.id, prod.id)
    expect(inv?.quantityOnHand).toBe(9)

    // --- Final valid return: return the last 1 unit ---
    const ret3 = await saleRepository.refundOrCancelSale({
      saleId: saleRes.sale.id,
      reason: 'Final unit returned',
      items: [{ productId: prod.id, quantity: 1, refundAmountPaise: 100000 }],
    })
    expect(ret3.sale.status).toBe('refunded') // all 5 units returned across 3 partial returns

    inv = await inventoryRepository.get(branch.id, prod.id)
    expect(inv?.quantityOnHand).toBe(10) // back to original stock

    // Total refunded = 200000 + 200000 + 100000 = 500000 (exactly matches sale total)
  })

  it('rejects refund amounts exceeding the original sale total', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Chennai East',
      code: 'CHE-E1',
      city: 'Chennai',
      state: 'TN',
      address: 'Anna Nagar',
      isActive: true,
    })

    const prod = await productRepository.create({
      workspaceId: 'live',
      name: 'USB Cable',
      sku: 'USB-C-01',
      category: 'Electronics',
      costPricePaise: 500, // ₹5
      sellingPricePaise: 1000, // ₹10
      reorderPoint: 5,
      isActive: true,
    })

    await inventoryRepository.adjustStock({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prod.id,
      delta: 20,
      type: 'purchase_receipt',
      unitCostPaise: 500,
    })

    const saleRes = await saleRepository.createSale({
      workspaceId: 'live',
      branchId: branch.id,
      paymentMethod: 'card',
      items: [{ productId: prod.id, quantity: 3, sellingPricePaise: 1000 }],
    })
    expect(saleRes.sale.totalPaise).toBe(3000) // ₹30

    // Attempt refund exceeding sale total (4000 > 3000)
    await expect(
      saleRepository.refundOrCancelSale({
        saleId: saleRes.sale.id,
        reason: 'Over-refund test',
        items: [{ productId: prod.id, quantity: 1, refundAmountPaise: 4000 }],
      })
    ).rejects.toThrow('exceeds the remaining refundable amount')
  })

  it('prevents purchase order double-receive and computes weighted-average cost correctly', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      name: 'Bengaluru Warehouse',
      code: 'BLR-WH1',
      city: 'Bengaluru',
      state: 'KA',
      address: 'Whitefield',
      isActive: true,
    })

    const prod = await productRepository.create({
      workspaceId: 'live',
      name: 'Steel Bolt M8',
      sku: 'BOLT-M8-01',
      category: 'Hardware',
      costPricePaise: 200, // ₹2.00
      sellingPricePaise: 500, // ₹5.00
      reorderPoint: 50,
      isActive: true,
    })

    // Create a PO (not auto-received)
    const { purchase } = await purchaseRepository.create({
      workspaceId: 'live',
      branchId: branch.id,
      orderNumber: 'PO-TEST-001',
      supplierName: 'FastenerCo',
      items: [{ productId: prod.id, quantityOrdered: 100, unitCostPaise: 180 }], // ₹1.80 each
    })

    expect(purchase.status).toBe('ordered')

    // Receive the PO
    const received = await purchaseRepository.receivePurchase(purchase.id)
    expect(received.status).toBe('received')

    // Verify inventory updated and weighted-average cost correct
    const inv = await inventoryRepository.get(branch.id, prod.id)
    expect(inv?.quantityOnHand).toBe(100)
    // Starting qty 0 × old cost + 100 × 180 / 100 = 180 (rounded)
    expect(inv?.averageCostPaise).toBe(180)

    // Attempting to receive the SAME PO again MUST throw
    await expect(
      purchaseRepository.receivePurchase(purchase.id)
    ).rejects.toThrow('already been received')

    // Inventory must NOT have doubled
    const invAfter = await inventoryRepository.get(branch.id, prod.id)
    expect(invAfter?.quantityOnHand).toBe(100)

    // Receive a second PO at a different cost to test weighted average
    const { purchase: po2 } = await purchaseRepository.create({
      workspaceId: 'live',
      branchId: branch.id,
      orderNumber: 'PO-TEST-002',
      supplierName: 'FastenerCo',
      items: [{ productId: prod.id, quantityOrdered: 100, unitCostPaise: 220 }], // ₹2.20 each
    })
    await purchaseRepository.receivePurchase(po2.id)

    // Weighted average: (100×180 + 100×220) / 200 = 40000/200 = 200
    const invFinal = await inventoryRepository.get(branch.id, prod.id)
    expect(invFinal?.quantityOnHand).toBe(200)
    expect(invFinal?.averageCostPaise).toBe(200)
  })
})
