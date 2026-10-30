import { getDb } from '@/lib/db'
import type {
  StockTransferEntity,
  StockTransferStatus,
  StockMovementEntity,
  WorkspaceId,
} from '@/types/database'

function normalizeTransfer(t: StockTransferEntity): StockTransferEntity {
  const cost = t.unitCostPaise ?? t.unitCostCents ?? 0
  return { ...t, unitCostPaise: cost, unitCostCents: cost }
}

export const stockTransferRepository = {
  async getAll(
    workspaceId: WorkspaceId,
    options: { sourceBranchId?: string; destinationBranchId?: string; status?: StockTransferStatus } = {}
  ): Promise<StockTransferEntity[]> {
    const db = await getDb()
    let list = await db.getAllFromIndex('stockTransfers', 'by-workspace', workspaceId)

    if (options.sourceBranchId && options.sourceBranchId !== 'all') {
      list = list.filter(
        (t) => t.sourceBranchId === options.sourceBranchId || t.destinationBranchId === options.sourceBranchId
      )
    }
    if (options.destinationBranchId) {
      list = list.filter((t) => t.destinationBranchId === options.destinationBranchId)
    }
    if (options.status) {
      list = list.filter((t) => t.status === options.status)
    }

    return list
      .map(normalizeTransfer)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async getById(id: string): Promise<StockTransferEntity | undefined> {
    const db = await getDb()
    const t = await db.get('stockTransfers', id)
    return t ? normalizeTransfer(t) : undefined
  },

  /**
   * Create a transfer in Draft status. No stock movement at this stage.
   */
  async create(params: {
    workspaceId: WorkspaceId
    sourceBranchId: string
    destinationBranchId: string
    productId: string
    quantity: number
    notes?: string
    referenceNumber?: string
  }): Promise<StockTransferEntity> {
    if (params.sourceBranchId === params.destinationBranchId) {
      throw new Error('Source and destination branches must be different.')
    }
    if (params.quantity <= 0 || !Number.isInteger(params.quantity)) {
      throw new Error('Transfer quantity must be a positive integer.')
    }

    const db = await getDb()
    const now = new Date().toISOString()
    const refNum =
      params.referenceNumber?.trim().toUpperCase() ||
      `TRF-${Date.now().toString().slice(-8)}`

    const transfer: StockTransferEntity = {
      id: `trf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: params.workspaceId,
      referenceNumber: refNum,
      sourceBranchId: params.sourceBranchId,
      destinationBranchId: params.destinationBranchId,
      productId: params.productId,
      quantity: params.quantity,
      status: 'draft',
      notes: params.notes,
      createdAt: now,
      updatedAt: now,
    }

    await db.put('stockTransfers', transfer)
    return normalizeTransfer(transfer)
  },

  /**
   * Dispatch a draft transfer: deduct stock from source branch exactly once.
   * Status: draft → dispatched
   */
  async dispatch(transferId: string): Promise<StockTransferEntity> {
    const db = await getDb()
    const raw = await db.get('stockTransfers', transferId)
    if (!raw) throw new Error(`Transfer "${transferId}" not found.`)
    const transfer = normalizeTransfer(raw)

    if (transfer.status !== 'draft') {
      throw new Error(
        `Cannot dispatch transfer "${transfer.referenceNumber}" — current status is "${transfer.status}". Only draft transfers can be dispatched.`
      )
    }

    const tx = db.transaction(
      ['stockTransfers', 'inventory', 'stockMovements'],
      'readwrite'
    )

    const now = new Date().toISOString()

    // Check source stock
    const srcInv = await tx
      .objectStore('inventory')
      .index('by-branch-product')
      .get([transfer.sourceBranchId, transfer.productId])

    if (!srcInv) {
      throw new Error(
        `No inventory record found for product at source branch. Cannot dispatch.`
      )
    }
    if (srcInv.quantity < transfer.quantity) {
      throw new Error(
        `Insufficient stock at source branch. Available: ${srcInv.quantity}, required: ${transfer.quantity}.`
      )
    }

    // Snapshot unit cost from source inventory
    const unitCost = srcInv.averageCostPaise ?? srcInv.averageCostCents ?? 0

    // Deduct from source
    const newSrcQty = srcInv.quantity - transfer.quantity
    const updatedSrc = {
      ...srcInv,
      quantity: newSrcQty,
      quantityOnHand: newSrcQty,
      status:
        newSrcQty <= 0
          ? 'out_of_stock'
          : newSrcQty <= srcInv.reorderPoint
            ? 'low_stock'
            : 'in_stock',
      updatedAt: now,
    } as typeof srcInv
    await tx.objectStore('inventory').put(updatedSrc)

    // Log transfer_out movement for source
    const movOut: StockMovementEntity = {
      id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: transfer.workspaceId,
      branchId: transfer.sourceBranchId,
      productId: transfer.productId,
      inventoryId: srcInv.id,
      type: 'transfer_out',
      quantityDelta: -transfer.quantity,
      resultingQuantity: newSrcQty,
      unitCostPaise: unitCost,
      unitCostCents: unitCost,
      referenceType: 'manual',
      referenceId: transfer.id,
      notes: `Dispatched via Transfer ${transfer.referenceNumber}`,
      createdAt: now,
    }
    await tx.objectStore('stockMovements').put(movOut)

    // Update transfer status
    const updated: StockTransferEntity = {
      ...transfer,
      status: 'dispatched',
      unitCostPaise: unitCost,
      unitCostCents: unitCost,
      dispatchedAt: now,
      updatedAt: now,
    }
    await tx.objectStore('stockTransfers').put(updated)

    await tx.done
    return normalizeTransfer(updated)
  },

  /**
   * Receive a dispatched transfer: add stock to destination branch exactly once.
   * Status: dispatched → received
   */
  async receive(transferId: string): Promise<StockTransferEntity> {
    const db = await getDb()
    const raw = await db.get('stockTransfers', transferId)
    if (!raw) throw new Error(`Transfer "${transferId}" not found.`)
    const transfer = normalizeTransfer(raw)

    if (transfer.status !== 'dispatched') {
      throw new Error(
        `Cannot receive transfer "${transfer.referenceNumber}" — current status is "${transfer.status}". Only dispatched transfers can be received.`
      )
    }

    const tx = db.transaction(
      ['stockTransfers', 'inventory', 'stockMovements'],
      'readwrite'
    )
    const now = new Date().toISOString()
    const unitCost = transfer.unitCostPaise ?? transfer.unitCostCents ?? 0

    // Get or create destination inventory record
    let dstInv = await tx
      .objectStore('inventory')
      .index('by-branch-product')
      .get([transfer.destinationBranchId, transfer.productId])

    if (!dstInv) {
      dstInv = {
        id: `inv_${transfer.destinationBranchId}_${transfer.productId}`,
        workspaceId: transfer.workspaceId,
        branchId: transfer.destinationBranchId,
        productId: transfer.productId,
        quantity: 0,
        quantityOnHand: 0,
        reorderPoint: 10,
        locationBin: 'Receiving Dock',
        averageCostPaise: unitCost,
        averageCostCents: unitCost,
        status: 'out_of_stock',
        updatedAt: now,
      }
    }

    // Weighted average cost update
    const currentCost = dstInv.averageCostPaise ?? dstInv.averageCostCents ?? 0
    const currentVal = dstInv.quantity * currentCost
    const addedVal = transfer.quantity * unitCost
    const newDstQty = dstInv.quantity + transfer.quantity
    const newAvgCost =
      newDstQty > 0
        ? Math.round((currentVal + addedVal) / newDstQty)
        : unitCost

    const updatedDst = {
      ...dstInv,
      quantity: newDstQty,
      quantityOnHand: newDstQty,
      averageCostPaise: newAvgCost,
      averageCostCents: newAvgCost,
      status:
        newDstQty <= 0
          ? 'out_of_stock'
          : newDstQty <= dstInv.reorderPoint
            ? 'low_stock'
            : 'in_stock',
      lastRestockedAt: now,
      updatedAt: now,
    } as typeof dstInv
    await tx.objectStore('inventory').put(updatedDst)

    // Log transfer_in movement for destination
    const movIn: StockMovementEntity = {
      id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: transfer.workspaceId,
      branchId: transfer.destinationBranchId,
      productId: transfer.productId,
      inventoryId: updatedDst.id,
      type: 'transfer_in',
      quantityDelta: transfer.quantity,
      resultingQuantity: newDstQty,
      unitCostPaise: unitCost,
      unitCostCents: unitCost,
      referenceType: 'manual',
      referenceId: transfer.id,
      notes: `Received via Transfer ${transfer.referenceNumber}`,
      createdAt: now,
    }
    await tx.objectStore('stockMovements').put(movIn)

    // Mark transfer as received
    const updated: StockTransferEntity = {
      ...transfer,
      status: 'received',
      receivedAt: now,
      updatedAt: now,
    }
    await tx.objectStore('stockTransfers').put(updated)

    await tx.done
    return normalizeTransfer(updated)
  },

  /**
   * Cancel a draft transfer (dispatched transfers cannot be cancelled — must receive or manually adjust).
   */
  async cancel(transferId: string): Promise<StockTransferEntity> {
    const db = await getDb()
    const raw = await db.get('stockTransfers', transferId)
    if (!raw) throw new Error(`Transfer "${transferId}" not found.`)
    const transfer = normalizeTransfer(raw)

    if (transfer.status !== 'draft') {
      throw new Error(
        `Cannot cancel transfer "${transfer.referenceNumber}" — only draft transfers can be cancelled. Current status: "${transfer.status}".`
      )
    }

    const updated: StockTransferEntity = {
      ...transfer,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    }
    await db.put('stockTransfers', updated)
    return normalizeTransfer(updated)
  },
}
