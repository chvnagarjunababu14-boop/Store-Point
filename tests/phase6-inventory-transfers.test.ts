import { describe, it, expect, beforeEach } from 'vitest'
import { closeDB, deleteDatabase } from '@/lib/db'
import { branchRepository } from '@/lib/repositories/branchRepository'
import { productRepository } from '@/lib/repositories/productRepository'
import { inventoryRepository } from '@/lib/repositories/inventoryRepository'
import { stockTransferRepository } from '@/lib/repositories/stockTransferRepository'
import { purchaseRepository } from '@/lib/repositories/purchaseRepository'
import { saleRepository } from '@/lib/repositories/saleRepository'
import { stockMovementRepository } from '@/lib/repositories/stockMovementRepository'
import { backupService } from '@/lib/services/backupService'

describe('Phase 6: Inventory, Transfers & Product Management Tests', () => {
  beforeEach(async () => {
    closeDB()
    await deleteDatabase()
  })

  it('handles product creation, editing, duplicate SKU/barcode rejection, and safe archiving/unarchiving', async () => {
    const prod1 = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-PHASE6-A',
      barcode: '8901234567890',
      name: 'Mechanical Ergonomic Keyboard',
      category: 'Peripherals',
      unit: 'pcs',
      costPricePaise: 350000, // ₹3,500.00
      sellingPricePaise: 599900, // ₹5,999.00
      reorderPoint: 5,
    })

    expect(prod1.id).toBeDefined()
    expect(prod1.sku).toBe('SKU-PHASE6-A')
    expect(prod1.barcode).toBe('8901234567890')
    expect(prod1.unit).toBe('pcs')
    expect(prod1.status).toBe('active')

    // Duplicate SKU rejection in same workspace
    await expect(
      productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-PHASE6-A',
        barcode: '8901234567891',
        name: 'Another Keyboard',
      })
    ).rejects.toThrow('already exists')

    // Duplicate barcode rejection in same workspace
    await expect(
      productRepository.create({
        workspaceId: 'live',
        sku: 'SKU-PHASE6-B',
        barcode: '8901234567890',
        name: 'Different Keyboard Same Barcode',
      })
    ).rejects.toThrow('already exists')

    // Allowed same SKU/barcode in different workspace ('demo')
    const demoProd = await productRepository.create({
      workspaceId: 'demo',
      sku: 'SKU-PHASE6-A',
      barcode: '8901234567890',
      name: 'Demo Ergonomic Keyboard',
    })
    expect(demoProd.workspaceId).toBe('demo')

    // Editing product details (name, unit, selling price)
    const updated = await productRepository.update(prod1.id, {
      name: 'Mechanical Ergonomic Keyboard Pro',
      unit: 'box',
      sellingPricePaise: 649900, // ₹6,499.00
    })
    expect(updated.name).toBe('Mechanical Ergonomic Keyboard Pro')
    expect(updated.unit).toBe('box')
    expect(updated.sellingPricePaise).toBe(649900)

    // Archive and unarchive
    const archived = await productRepository.archive(prod1.id)
    expect(archived.status).toBe('archived')

    const activeList = await productRepository.getAll('live')
    expect(activeList.some((p) => p.id === prod1.id)).toBe(false)

    const allList = await productRepository.getAllIncludingArchived('live')
    expect(allList.some((p) => p.id === prod1.id)).toBe(true)

    const unarchived = await productRepository.unarchive(prod1.id)
    expect(unarchived.status).toBe('active')
  })

  it('calculates inventory valuation, enforces reorder threshold, and records write-offs', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      code: 'MUM-01',
      name: 'Mumbai Flagship',
      city: 'Mumbai',
      address: 'Bandra West',
      manager: 'Rajesh Sharma',
      locationType: 'Flagship',
      status: 'active',
    })

    const prod = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-VAL-01',
      name: 'USB-C Docking Station',
      category: 'Electronics',
      costPricePaise: 200000, // ₹2,000.00
      sellingPricePaise: 349900, // ₹3,499.00
      reorderPoint: 10,
    })

    // Allocate initial stock: 25 units @ ₹2,000
    const inv = await inventoryRepository.ensureInventoryRecord({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prod.id,
      initialQuantity: 25,
      reorderPoint: 10,
      unitCostPaise: 200000,
    })

    expect(inv.quantity).toBe(25)
    expect(inv.status).toBe('in_stock')

    // Valuation = 25 * 200000 = 5,000,000 paise (₹50,000.00)
    const valuationPaise = inv.quantity * (inv.averageCostPaise ?? 0)
    expect(valuationPaise).toBe(5000000)

    // Update reorder point to 30 => status becomes low_stock
    const updatedThreshold = await inventoryRepository.updateReorderPoint(inv.id, 30, 'Rack A-2')
    expect(updatedThreshold.reorderPoint).toBe(30)
    expect(updatedThreshold.locationBin).toBe('Rack A-2')
    expect(updatedThreshold.status).toBe('low_stock')

    // Record a write-off of 5 damaged units
    const { inventory: afterWriteOff, movement } = await inventoryRepository.adjustStock({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prod.id,
      quantityDelta: -5,
      type: 'write_off',
      notes: 'Water damaged in warehouse storm',
    })

    expect(afterWriteOff.quantity).toBe(20)
    expect(movement.type).toBe('write_off')
    expect(movement.quantityDelta).toBe(-5)
    expect(movement.resultingQuantity).toBe(20)
    expect(movement.notes).toBe('Water damaged in warehouse storm')

    // Reject adjustment that would cause negative stock
    await expect(
      inventoryRepository.adjustStock({
        workspaceId: 'live',
        branchId: branch.id,
        productId: prod.id,
        quantityDelta: -25, // Available is only 20
        type: 'adjustment',
        notes: 'Excessive subtraction test',
      })
    ).rejects.toThrow('Insufficient inventory stock')
  })

  it('manages cross-branch stock transfers with strict Draft → Dispatched → Received workflow and idempotency', async () => {
    const srcBranch = await branchRepository.create({
      workspaceId: 'live',
      code: 'BLR-01',
      name: 'Bengaluru Central',
      city: 'Bengaluru',
      address: 'Indiranagar',
      manager: 'Anil Kumar',
      locationType: 'Warehouse',
      status: 'active',
    })

    const dstBranch = await branchRepository.create({
      workspaceId: 'live',
      code: 'HYD-01',
      name: 'Hyderabad Retail',
      city: 'Hyderabad',
      address: 'Hitec City',
      manager: 'Pooja Reddy',
      locationType: 'Retail',
      status: 'active',
    })

    const prod = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-TRF-01',
      name: 'Noise Cancelling Headphones',
      costPricePaise: 400000, // ₹4,000.00
      sellingPricePaise: 799900,
    })

    // Seed 50 units at source branch
    await inventoryRepository.ensureInventoryRecord({
      workspaceId: 'live',
      branchId: srcBranch.id,
      productId: prod.id,
      initialQuantity: 50,
      unitCostPaise: 400000,
    })

    // Reject transfer with identical source and destination
    await expect(
      stockTransferRepository.create({
        workspaceId: 'live',
        sourceBranchId: srcBranch.id,
        destinationBranchId: srcBranch.id,
        productId: prod.id,
        quantity: 15,
      })
    ).rejects.toThrow('Source and destination branches must be different')

    // Reject invalid non-positive quantity
    await expect(
      stockTransferRepository.create({
        workspaceId: 'live',
        sourceBranchId: srcBranch.id,
        destinationBranchId: dstBranch.id,
        productId: prod.id,
        quantity: 0,
      })
    ).rejects.toThrow('positive integer')

    // 1. Create Draft Transfer
    const draft = await stockTransferRepository.create({
      workspaceId: 'live',
      sourceBranchId: srcBranch.id,
      destinationBranchId: dstBranch.id,
      productId: prod.id,
      quantity: 20,
      notes: 'Transfer 20 units for festive demand',
    })

    expect(draft.id).toBeDefined()
    expect(draft.status).toBe('draft')

    // In draft status, source stock should still be 50 (undeducted)
    const srcInvBefore = await inventoryRepository.getByBranchAndProduct(srcBranch.id, prod.id)
    expect(srcInvBefore?.quantity).toBe(50)

    // Cannot receive directly from draft
    await expect(stockTransferRepository.receive(draft.id)).rejects.toThrow('Only dispatched transfers can be received')

    // 2. Dispatch Transfer
    const dispatched = await stockTransferRepository.dispatch(draft.id)
    expect(dispatched.status).toBe('dispatched')
    expect(dispatched.dispatchedAt).toBeDefined()
    expect(dispatched.unitCostPaise).toBe(400000)

    // Source stock should now be 30 (50 - 20)
    const srcInvAfterDispatch = await inventoryRepository.getByBranchAndProduct(srcBranch.id, prod.id)
    expect(srcInvAfterDispatch?.quantity).toBe(30)

    // Check movement ledger for source transfer_out
    const movementsSrc = await stockMovementRepository.getAll('live', {
      branchId: srcBranch.id,
      productId: prod.id,
    })
    const outMovement = movementsSrc.find((m) => m.type === 'transfer_out')
    expect(outMovement).toBeDefined()
    expect(outMovement?.quantityDelta).toBe(-20)
    expect(outMovement?.resultingQuantity).toBe(30)

    // Duplicate dispatch guard
    await expect(stockTransferRepository.dispatch(draft.id)).rejects.toThrow('Only draft transfers can be dispatched')

    // Cannot cancel dispatched transfer
    await expect(stockTransferRepository.cancel(draft.id)).rejects.toThrow('only draft transfers can be cancelled')

    // 3. Receive Transfer at Destination
    const received = await stockTransferRepository.receive(draft.id)
    expect(received.status).toBe('received')
    expect(received.receivedAt).toBeDefined()

    // Destination stock should now have 20 units @ ₹4,000.00
    const dstInvAfterReceive = await inventoryRepository.getByBranchAndProduct(dstBranch.id, prod.id)
    expect(dstInvAfterReceive?.quantity).toBe(20)
    expect(dstInvAfterReceive?.averageCostPaise).toBe(400000)

    // Check movement ledger for destination transfer_in
    const movementsDst = await stockMovementRepository.getAll('live', {
      branchId: dstBranch.id,
      productId: prod.id,
    })
    const inMovement = movementsDst.find((m) => m.type === 'transfer_in')
    expect(inMovement).toBeDefined()
    expect(inMovement?.quantityDelta).toBe(20)
    expect(inMovement?.resultingQuantity).toBe(20)

    // Duplicate receive guard
    await expect(stockTransferRepository.receive(draft.id)).rejects.toThrow('Only dispatched transfers can be received')
  })

  it('rejects dispatching when source has insufficient stock', async () => {
    const srcBranch = await branchRepository.create({
      workspaceId: 'live',
      code: 'DEL-01',
      name: 'Delhi Warehouse',
      city: 'Delhi',
      address: 'Connaught Place',
      manager: 'Vikram Singh',
      locationType: 'Warehouse',
      status: 'active',
    })

    const dstBranch = await branchRepository.create({
      workspaceId: 'live',
      code: 'NOI-01',
      name: 'Noida Store',
      city: 'Noida',
      address: 'Sector 18',
      manager: 'Preeti Sharma',
      locationType: 'Retail',
      status: 'active',
    })

    const prod = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-LOW-01',
      name: 'Smart Watch',
    })

    // Seed only 5 units at source
    await inventoryRepository.ensureInventoryRecord({
      workspaceId: 'live',
      branchId: srcBranch.id,
      productId: prod.id,
      initialQuantity: 5,
    })

    // Create draft for 10 units (greater than 5)
    const draft = await stockTransferRepository.create({
      workspaceId: 'live',
      sourceBranchId: srcBranch.id,
      destinationBranchId: dstBranch.id,
      productId: prod.id,
      quantity: 10,
    })

    // Dispatching should throw insufficient stock
    await expect(stockTransferRepository.dispatch(draft.id)).rejects.toThrow('Insufficient stock')
  })

  it('persists supplier contact details and guarantees purchase receipt idempotency', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      code: 'CHE-01',
      name: 'Chennai Flagship',
      city: 'Chennai',
      address: 'T. Nagar',
      manager: 'Suresh Raman',
      locationType: 'Flagship',
      status: 'active',
    })

    const prod = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-PO-01',
      name: 'Wireless Mouse',
      costPricePaise: 80000,
    })

    const { purchase } = await purchaseRepository.create({
      workspaceId: 'live',
      branchId: branch.id,
      orderNumber: 'PO-PHASE6-001',
      supplierName: 'Apex Computer Supplies Ltd',
      supplierPhone: '+91 98400 12345',
      supplierEmail: 'orders@apexsupplies.in',
      supplierRef: 'INV-APEX-8842',
      items: [
        {
          productId: prod.id,
          quantityOrdered: 40,
          unitCostPaise: 85000, // ₹850.00
        },
      ],
    })

    expect(purchase.supplierName).toBe('Apex Computer Supplies Ltd')
    expect(purchase.supplierPhone).toBe('+91 98400 12345')
    expect(purchase.supplierEmail).toBe('orders@apexsupplies.in')
    expect(purchase.supplierRef).toBe('INV-APEX-8842')
    expect(purchase.status).toBe('ordered')

    // Receive purchase order
    const received = await purchaseRepository.receivePurchase(purchase.id)
    expect(received.status).toBe('received')

    const inv = await inventoryRepository.getByBranchAndProduct(branch.id, prod.id)
    expect(inv?.quantity).toBe(40)
    expect(inv?.averageCostPaise).toBe(85000)

    // Cannot receive twice (idempotency check)
    await expect(purchaseRepository.receivePurchase(purchase.id)).rejects.toThrow('already been received')
  })

  it('preserves historical sale prices and cost snapshots when product catalog price changes', async () => {
    const branch = await branchRepository.create({
      workspaceId: 'live',
      code: 'KOL-01',
      name: 'Kolkata Outlet',
      city: 'Kolkata',
      address: 'Park Street',
      manager: 'Amitava Sen',
      locationType: 'Outlet',
      status: 'active',
    })

    const prod = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-HIST-01',
      name: 'Ergonomic Mousepad',
      costPricePaise: 30000, // ₹300.00
      sellingPricePaise: 69900, // ₹699.00
    })

    // Seed stock
    await inventoryRepository.ensureInventoryRecord({
      workspaceId: 'live',
      branchId: branch.id,
      productId: prod.id,
      initialQuantity: 50,
      unitCostPaise: 30000,
    })

    // Execute a sale with the original price
    const { sale, lineItems } = await saleRepository.createSale({
      workspaceId: 'live',
      branchId: branch.id,
      receiptNumber: 'REC-HIST-01',
      paymentMethod: 'UPI',
      items: [
        {
          productId: prod.id,
          quantity: 2,
        },
      ],
    })

    expect(sale.totalPaise).toBe(139800) // 2 * 699.00
    expect(lineItems[0].unitSellingPricePaise).toBe(69900)
    expect(lineItems[0].unitCostSnapshotPaise).toBe(30000)

    // Now update the product catalog price and cost in the master catalog
    await productRepository.update(prod.id, {
      costPricePaise: 45000, // ₹450.00
      sellingPricePaise: 99900, // ₹999.00
    })

    // Verify historical sale remains untouched
    const historicalSale = await saleRepository.getById(sale.id)
    const historicalLines = await saleRepository.getLineItems(sale.id)

    expect(historicalSale?.totalPaise).toBe(139800)
    expect(historicalLines[0].unitSellingPricePaise).toBe(69900)
    expect(historicalLines[0].unitCostSnapshotPaise).toBe(30000)
  })

  it('supports backup export and restore of stock transfers with full workspace isolation', async () => {
    const b1 = await branchRepository.create({
      workspaceId: 'live',
      code: 'PUN-01',
      name: 'Pune Store',
      city: 'Pune',
      address: 'FC Road',
      manager: 'Sunita Patil',
      locationType: 'Retail',
      status: 'active',
    })

    const b2 = await branchRepository.create({
      workspaceId: 'live',
      code: 'PUN-02',
      name: 'Pune Hub',
      city: 'Pune',
      address: 'Kothrud',
      manager: 'Kiran Kale',
      locationType: 'Warehouse',
      status: 'active',
    })

    const prod = await productRepository.create({
      workspaceId: 'live',
      sku: 'SKU-BACKUP-01',
      name: 'Power Bank 20000mAh',
    })

    const transfer = await stockTransferRepository.create({
      workspaceId: 'live',
      sourceBranchId: b1.id,
      destinationBranchId: b2.id,
      productId: prod.id,
      quantity: 12,
      referenceNumber: 'TRF-BKUP-001',
    })

    // Export backup
    const backup = await backupService.createBackup('live')
    expect(backup.metadata.transfersCount).toBe(1)
    expect(backup.data.stockTransfers?.length).toBe(1)
    expect(backup.data.stockTransfers?.[0].referenceNumber).toBe('TRF-BKUP-001')

    // Mutate live transfer (cancel it)
    await stockTransferRepository.cancel(transfer.id)
    const cancelled = await stockTransferRepository.getById(transfer.id)
    expect(cancelled?.status).toBe('cancelled')

    // Restore backup into live
    await backupService.restoreBackup(backup, 'live')

    // Verify live workspace has restored the draft transfer
    const restored = await stockTransferRepository.getById(transfer.id)
    expect(restored?.status).toBe('draft')
    expect(restored?.referenceNumber).toBe('TRF-BKUP-001')
    expect(restored?.workspaceId).toBe('live')
  })
})
