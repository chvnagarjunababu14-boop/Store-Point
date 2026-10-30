import { getDb } from '@/lib/db'
import type {
  PurchaseEntity,
  PurchaseLineItemEntity,
  StockMovementEntity,
  WorkspaceId,
} from '@/types/database'

function normalizePurchase(p: PurchaseEntity): PurchaseEntity {
  const cost = p.totalCostPaise ?? p.totalCostCents ?? 0
  return {
    ...p,
    totalCostPaise: cost,
    totalCostCents: cost,
  }
}

function normalizeLineItem(item: PurchaseLineItemEntity): PurchaseLineItemEntity {
  const unit = item.unitCostPaise ?? item.unitCostCents ?? 0
  const total = item.totalCostPaise ?? item.totalCostCents ?? 0
  return {
    ...item,
    unitCostPaise: unit,
    unitCostCents: unit,
    totalCostPaise: total,
    totalCostCents: total,
  }
}

export const purchaseRepository = {
  async getAll(workspaceId: WorkspaceId, branchId?: string): Promise<PurchaseEntity[]> {
    const db = await getDb()
    const all = await db.getAllFromIndex('purchases', 'by-workspace', workspaceId)
    const filtered = branchId && branchId !== 'all' ? all.filter((p) => p.branchId === branchId) : all
    return filtered.map(normalizePurchase).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async getById(id: string): Promise<PurchaseEntity | undefined> {
    const db = await getDb()
    const p = await db.get('purchases', id)
    return p ? normalizePurchase(p) : undefined
  },

  async getLineItems(purchaseId: string): Promise<PurchaseLineItemEntity[]> {
    const db = await getDb()
    const items = await db.getAllFromIndex('purchaseLineItems', 'by-purchase', purchaseId)
    return items.map(normalizeLineItem)
  },

  async create(params: {
    workspaceId: WorkspaceId
    branchId: string
    orderNumber: string
    supplierName: string
    supplierPhone?: string
    supplierEmail?: string
    supplierRef?: string
    items: Array<{
      productId: string
      quantityOrdered: number
      unitCostPaise?: number
      unitCostCents?: number
    }>
    notes?: string
    orderedAt?: string
    autoReceive?: boolean
  }): Promise<{ purchase: PurchaseEntity; lineItems: PurchaseLineItemEntity[] }> {
    const db = await getDb()
    const now = new Date().toISOString()
    const purchaseId = `po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    let totalCost = 0
    const lineItems: PurchaseLineItemEntity[] = params.items.map((item) => {
      const unitCost = item.unitCostPaise ?? item.unitCostCents ?? 0
      const lineCost = item.quantityOrdered * unitCost
      totalCost += lineCost
      return {
        id: `poi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        workspaceId: params.workspaceId,
        purchaseId: purchaseId,
        productId: item.productId,
        quantityOrdered: item.quantityOrdered,
        quantityReceived: params.autoReceive ? item.quantityOrdered : 0,
        unitCostPaise: unitCost,
        unitCostCents: unitCost,
        totalCostPaise: lineCost,
        totalCostCents: lineCost,
      }
    })

    const purchase: PurchaseEntity = {
      id: purchaseId,
      workspaceId: params.workspaceId,
      branchId: params.branchId,
      orderNumber: params.orderNumber.trim().toUpperCase(),
      supplierName: params.supplierName,
      supplierPhone: params.supplierPhone,
      supplierEmail: params.supplierEmail,
      supplierRef: params.supplierRef,
      status: params.autoReceive ? 'received' : 'ordered',
      totalCostPaise: totalCost,
      totalCostCents: totalCost,
      notes: params.notes,
      orderedAt: params.orderedAt || now,
      receivedAt: params.autoReceive ? now : undefined,
      createdAt: now,
      updatedAt: now,
    }

    if (params.autoReceive) {
      // Execute atomically with inventory adjustments
      const tx = db.transaction(
        ['purchases', 'purchaseLineItems', 'inventory', 'stockMovements', 'products'],
        'readwrite'
      )

      await tx.objectStore('purchases').put(purchase)
      for (const item of lineItems) {
        await tx.objectStore('purchaseLineItems').put(item)

        let inv = await tx
          .objectStore('inventory')
          .index('by-branch-product')
          .get([params.branchId, item.productId])

        const itemCost = item.unitCostPaise ?? item.unitCostCents ?? 0

        if (!inv) {
          inv = {
            id: `inv_${params.branchId}_${item.productId}`,
            workspaceId: params.workspaceId,
            branchId: params.branchId,
            productId: item.productId,
            quantity: 0,
            quantityOnHand: 0,
            reorderPoint: 10,
            locationBin: 'Storage Receiving Bay',
            averageCostPaise: itemCost,
            averageCostCents: itemCost,
            status: 'out_of_stock',
            updatedAt: now,
          }
        }

        const currentCost = inv.averageCostPaise ?? inv.averageCostCents ?? 0
        const currentVal = inv.quantity * currentCost
        const addedVal = item.quantityReceived * itemCost
        const newTotalQty = inv.quantity + item.quantityReceived
        const newAverageCost = newTotalQty > 0 ? Math.round((currentVal + addedVal) / newTotalQty) : itemCost

        inv.averageCostPaise = newAverageCost
        inv.averageCostCents = newAverageCost
        inv.quantity = newTotalQty
        inv.quantityOnHand = newTotalQty
        inv.status = newTotalQty <= 0 ? 'out_of_stock' : newTotalQty <= inv.reorderPoint ? 'low_stock' : 'in_stock'
        inv.lastRestockedAt = now
        inv.updatedAt = now

        await tx.objectStore('inventory').put(inv)

        // Update product master catalog cost
        const prod = await tx.objectStore('products').get(item.productId)
        if (prod) {
          prod.costPricePaise = newAverageCost
          prod.costPriceCents = newAverageCost
          prod.updatedAt = now
          await tx.objectStore('products').put(prod)
        }

        const movement: StockMovementEntity = {
          id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          workspaceId: params.workspaceId,
          branchId: params.branchId,
          productId: item.productId,
          inventoryId: inv.id,
          type: 'purchase_received',
          quantityDelta: item.quantityReceived,
          resultingQuantity: newTotalQty,
          unitCostPaise: itemCost,
          unitCostCents: itemCost,
          referenceType: 'purchase',
          referenceId: purchase.id,
          notes: `Received from PO ${purchase.orderNumber}`,
          createdAt: now,
        }
        await tx.objectStore('stockMovements').put(movement)
      }

      await tx.done
    } else {
      const tx = db.transaction(['purchases', 'purchaseLineItems'], 'readwrite')
      await tx.objectStore('purchases').put(purchase)
      for (const item of lineItems) {
        await tx.objectStore('purchaseLineItems').put(item)
      }
      await tx.done
    }

    return { purchase, lineItems }
  },

  async createPurchaseOrder(params: {
    workspaceId: WorkspaceId
    branchId: string
    supplierName: string
    supplierPhone?: string
    supplierEmail?: string
    supplierRef?: string
    items: Array<{
      productId: string
      quantity: number
      unitCostPaise?: number
      unitCostCents?: number
    }>
    orderNumber?: string
    notes?: string
  }): Promise<{ purchase: PurchaseEntity; lineItems: PurchaseLineItemEntity[] }> {
    return this.create({
      workspaceId: params.workspaceId,
      branchId: params.branchId,
      supplierName: params.supplierName,
      supplierPhone: params.supplierPhone,
      supplierEmail: params.supplierEmail,
      supplierRef: params.supplierRef,
      orderNumber: params.orderNumber || `PO-${Date.now().toString().slice(-6)}`,
      notes: params.notes,
      items: params.items.map((i) => ({
        productId: i.productId,
        quantityOrdered: i.quantity,
        unitCostPaise: i.unitCostPaise ?? i.unitCostCents ?? 0,
        unitCostCents: i.unitCostPaise ?? i.unitCostCents ?? 0,
      })),
    })
  },

  /**
   * Receive goods for an ordered purchase order idempotent check
   */
  async receivePurchase(purchaseId: string): Promise<PurchaseEntity> {
    const db = await getDb()
    const purchase = await db.get('purchases', purchaseId)
    if (!purchase) {
      throw new Error(`Purchase order "${purchaseId}" not found.`)
    }
    if (purchase.status === 'received') {
      throw new Error(`Purchase order "${purchase.orderNumber}" has already been received. Cannot record twice.`)
    }
    if (purchase.status === 'cancelled') {
      throw new Error(`Cannot receive a cancelled purchase order.`)
    }

    const lineItems = await this.getLineItems(purchaseId)
    const now = new Date().toISOString()

    const tx = db.transaction(
      ['purchases', 'purchaseLineItems', 'inventory', 'stockMovements', 'products'],
      'readwrite'
    )

    purchase.status = 'received'
    purchase.receivedAt = now
    purchase.updatedAt = now
    await tx.objectStore('purchases').put(purchase)

    for (const item of lineItems) {
      item.quantityReceived = item.quantityOrdered
      await tx.objectStore('purchaseLineItems').put(item)

      let inv = await tx
        .objectStore('inventory')
        .index('by-branch-product')
        .get([purchase.branchId, item.productId])

      const itemCost = item.unitCostPaise ?? item.unitCostCents ?? 0

      if (!inv) {
        inv = {
          id: `inv_${purchase.branchId}_${item.productId}`,
          workspaceId: purchase.workspaceId,
          branchId: purchase.branchId,
          productId: item.productId,
          quantity: 0,
          quantityOnHand: 0,
          reorderPoint: 10,
          locationBin: 'Receiving Dock',
          averageCostPaise: itemCost,
          averageCostCents: itemCost,
          status: 'out_of_stock',
          updatedAt: now,
        }
      }

      const currentCost = inv.averageCostPaise ?? inv.averageCostCents ?? 0
      const currentVal = inv.quantity * currentCost
      const addedVal = item.quantityReceived * itemCost
      const newTotalQty = inv.quantity + item.quantityReceived
      const newAverageCost = newTotalQty > 0 ? Math.round((currentVal + addedVal) / newTotalQty) : itemCost

      inv.averageCostPaise = newAverageCost
      inv.averageCostCents = newAverageCost
      inv.quantity = newTotalQty
      inv.quantityOnHand = newTotalQty
      inv.status = newTotalQty <= 0 ? 'out_of_stock' : newTotalQty <= inv.reorderPoint ? 'low_stock' : 'in_stock'
      inv.lastRestockedAt = now
      inv.updatedAt = now

      await tx.objectStore('inventory').put(inv)

      // Update product master catalog cost with the new weighted average cost
      const prod = await tx.objectStore('products').get(item.productId)
      if (prod) {
        prod.costPricePaise = newAverageCost
        prod.costPriceCents = newAverageCost
        prod.updatedAt = now
        await tx.objectStore('products').put(prod)
      }

      const movement: StockMovementEntity = {
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        workspaceId: purchase.workspaceId,
        branchId: purchase.branchId,
        productId: item.productId,
        inventoryId: inv.id,
        type: 'purchase_received',
        quantityDelta: item.quantityReceived,
        resultingQuantity: newTotalQty,
        unitCostPaise: itemCost,
        unitCostCents: itemCost,
        referenceType: 'purchase',
        referenceId: purchase.id,
        notes: `Received from PO ${purchase.orderNumber}`,
        createdAt: now,
      }
      await tx.objectStore('stockMovements').put(movement)
    }

    await tx.done
    return normalizePurchase(purchase)
  },

  async receivePurchaseOrder(purchaseId: string): Promise<PurchaseEntity> {
    return this.receivePurchase(purchaseId)
  },
}


