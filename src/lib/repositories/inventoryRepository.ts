import { getDb } from '@/lib/db'
import type {
  BranchInventoryEntity,
  StockMovementEntity,
  StockMovementType,
  StockStatus,
  WorkspaceId,
} from '@/types/database'

function determineStockStatus(quantity: number, reorderPoint: number): StockStatus {
  if (quantity <= 0) return 'out_of_stock'
  if (quantity <= reorderPoint) return 'low_stock'
  return 'in_stock'
}

function normalizeInventory(inv: BranchInventoryEntity): BranchInventoryEntity {
  const cost = inv.averageCostPaise ?? inv.averageCostCents ?? 0
  return {
    ...inv,
    averageCostPaise: cost,
    averageCostCents: cost,
    quantityOnHand: inv.quantityOnHand !== undefined ? inv.quantityOnHand : inv.quantity,
  }
}

export const inventoryRepository = {
  async getAll(workspaceId: WorkspaceId, branchId?: string): Promise<BranchInventoryEntity[]> {
    const db = await getDb()
    const all = await db.getAllFromIndex('inventory', 'by-workspace', workspaceId)
    const filtered = branchId && branchId !== 'all' ? all.filter((i) => i.branchId === branchId) : all
    return filtered.map(normalizeInventory)
  },

  async getById(id: string): Promise<BranchInventoryEntity | undefined> {
    const db = await getDb()
    const inv = await db.get('inventory', id)
    return inv ? normalizeInventory(inv) : undefined
  },

  async getByBranchAndProduct(
    branchId: string,
    productId: string
  ): Promise<BranchInventoryEntity | undefined> {
    const db = await getDb()
    const match = await db.getAllFromIndex('inventory', 'by-branch-product', [branchId, productId])
    if (!match[0]) return undefined
    return normalizeInventory(match[0])
  },

  async get(branchId: string, productId: string): Promise<BranchInventoryEntity | undefined> {
    return this.getByBranchAndProduct(branchId, productId)
  },

  /**
   * Initialize or ensure inventory record exists for a branch and product
   */
  async ensureInventoryRecord(params: {
    workspaceId: WorkspaceId
    branchId: string
    productId: string
    initialQuantity?: number
    reorderPoint?: number
    locationBin?: string
    unitCostPaise?: number
    unitCostCents?: number
  }): Promise<BranchInventoryEntity> {
    const db = await getDb()
    const existing = await this.getByBranchAndProduct(params.branchId, params.productId)
    if (existing) {
      return existing
    }

    const qty = params.initialQuantity || 0
    const reorder = params.reorderPoint !== undefined ? params.reorderPoint : 10
    const cost = params.unitCostPaise ?? params.unitCostCents ?? 0
    const now = new Date().toISOString()
    const entity: BranchInventoryEntity = {
      id: `inv_${params.branchId}_${params.productId}`,
      workspaceId: params.workspaceId,
      branchId: params.branchId,
      productId: params.productId,
      quantity: qty,
      quantityOnHand: qty,
      reorderPoint: reorder,
      locationBin: params.locationBin || 'Standard Storage',
      averageCostPaise: cost,
      averageCostCents: cost,
      status: determineStockStatus(qty, reorder),
      lastRestockedAt: qty > 0 ? now : undefined,
      updatedAt: now,
    }

    await db.put('inventory', entity)

    if (qty > 0) {
      const movement: StockMovementEntity = {
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        workspaceId: params.workspaceId,
        branchId: params.branchId,
        productId: params.productId,
        inventoryId: entity.id,
        type: 'opening_stock',
        quantityDelta: qty,
        resultingQuantity: qty,
        unitCostPaise: cost,
        unitCostCents: cost,
        notes: 'Initial opening stock allocation',
        createdAt: now,
      }
      await db.put('stockMovements', movement)
    }

    return entity
  },

  /**
   * Adjust stock level atomically and log auditable stock movement
   * Throws an Error if delta would cause negative stock on non-reconciled reductions
   */
  async adjustStock(params: {
    workspaceId: WorkspaceId
    branchId: string
    productId: string
    quantityDelta?: number
    delta?: number
    movementType?: StockMovementType
    type?: StockMovementType
    unitCostPaise?: number
    unitCostCents?: number
    referenceType?: 'purchase' | 'sale' | 'sale_return' | 'manual'
    referenceId?: string
    notes?: string
    reason?: string
    allowNegative?: boolean
  }): Promise<{ inventory: BranchInventoryEntity; movement: StockMovementEntity }> {
    const delta = params.quantityDelta ?? params.delta ?? 0
    const mType: StockMovementType = params.movementType ?? params.type ?? 'adjustment'
    const noteText = params.notes ?? params.reason ?? ''
    const unitCost = params.unitCostPaise ?? params.unitCostCents

    const db = await getDb()
    const tx = db.transaction(['inventory', 'stockMovements', 'products'], 'readwrite')

    let inv = await tx.objectStore('inventory').index('by-branch-product').get([params.branchId, params.productId])
    const now = new Date().toISOString()

    if (!inv) {
      let defaultCost = unitCost || 0
      if (!defaultCost) {
        const prod = await tx.objectStore('products').get(params.productId)
        defaultCost = prod ? (prod.costPricePaise ?? prod.costPriceCents ?? 0) : 0
      }
      inv = {
        id: `inv_${params.branchId}_${params.productId}`,
        workspaceId: params.workspaceId,
        branchId: params.branchId,
        productId: params.productId,
        quantity: 0,
        quantityOnHand: 0,
        reorderPoint: 10,
        locationBin: 'General Shelf',
        averageCostPaise: defaultCost,
        averageCostCents: defaultCost,
        status: 'out_of_stock',
        updatedAt: now,
      }
    } else {
      inv = normalizeInventory(inv)
    }

    const newQuantity = inv.quantity + delta

    if (newQuantity < 0 && !params.allowNegative) {
      throw new Error(
        `Insufficient inventory stock. Available: ${inv.quantity}, Requested reduction: ${Math.abs(delta)}`
      )
    }

    // Weighted average cost update on stock additions
    const currentAvg = inv.averageCostPaise ?? inv.averageCostCents ?? 0
    let newAverageCost = currentAvg
    if (delta > 0 && unitCost !== undefined && unitCost > 0) {
      const currentValuation = inv.quantity * currentAvg
      const addedValuation = delta * unitCost
      const totalUnits = inv.quantity + delta
      newAverageCost = totalUnits > 0 ? Math.round((currentValuation + addedValuation) / totalUnits) : unitCost
    }

    inv.quantity = newQuantity
    inv.quantityOnHand = newQuantity
    inv.averageCostPaise = newAverageCost
    inv.averageCostCents = newAverageCost
    inv.status = determineStockStatus(newQuantity, inv.reorderPoint)
    inv.updatedAt = now
    if (delta > 0) {
      inv.lastRestockedAt = now
    }

    await tx.objectStore('inventory').put(inv)

    const finalUnitCost = unitCost !== undefined ? unitCost : inv.averageCostPaise
    const movement: StockMovementEntity = {
      id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: params.workspaceId,
      branchId: params.branchId,
      productId: params.productId,
      inventoryId: inv.id,
      type: mType,
      quantityDelta: delta,
      resultingQuantity: newQuantity,
      unitCostPaise: finalUnitCost,
      unitCostCents: finalUnitCost,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      notes: noteText,
      createdAt: now,
    }
    await tx.objectStore('stockMovements').put(movement)

    await tx.done
    return { inventory: { ...inv, quantityOnHand: inv.quantity }, movement }
  },

  async updateReorderPoint(id: string, reorderPoint: number, locationBin?: string): Promise<BranchInventoryEntity> {
    const db = await getDb()
    const inv = await db.get('inventory', id)
    if (!inv) {
      throw new Error(`Inventory item with id "${id}" not found.`)
    }

    inv.reorderPoint = reorderPoint
    if (locationBin !== undefined) inv.locationBin = locationBin
    inv.status = determineStockStatus(inv.quantity, reorderPoint)
    inv.updatedAt = new Date().toISOString()

    const normalized = normalizeInventory(inv)
    await db.put('inventory', normalized)
    return normalized
  },
}

