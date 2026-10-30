import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { inventoryRepository } from '@/lib/repositories/inventoryRepository'
import { productRepository } from '@/lib/repositories/productRepository'
import { branchRepository } from '@/lib/repositories/branchRepository'
import type { BranchInventoryEntity, StockMovementType } from '@/types/database'

export interface EnrichedInventoryItem extends BranchInventoryEntity {
  productName: string
  sku: string
  barcode: string
  category: string
  unit?: string
  description?: string
  retailPricePaise: number
  retailPriceCents: number
  costPricePaise?: number
  costPriceCents?: number
  sellingPricePaise?: number
  sellingPriceCents?: number
  branchName: string
  branchCode: string
}

export function useInventory(overrideBranchId?: string) {
  const { workspaceMode, activeBranchId: contextBranchId, refreshKey, notifyDataChanged } = useWorkspace()
  const branchId = overrideBranchId !== undefined ? overrideBranchId : contextBranchId

  const [items, setItems] = useState<EnrichedInventoryItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [invList, prodList, branchList] = await Promise.all([
        inventoryRepository.getAll(workspaceMode, branchId),
        productRepository.getAllIncludingArchived(workspaceMode),
        branchRepository.getAllIncludingArchived(workspaceMode),
      ])

      const prodMap = new Map(prodList.map((p) => [p.id, p]))
      const branchMap = new Map(branchList.map((b) => [b.id, b]))

      const enriched: EnrichedInventoryItem[] = invList.map((item) => {
        const prod = prodMap.get(item.productId)
        const branch = branchMap.get(item.branchId)

        const sellingPrice = prod ? (prod.sellingPricePaise ?? prod.sellingPriceCents ?? 0) : 0
        const costPrice = prod ? (prod.costPricePaise ?? prod.costPriceCents ?? 0) : (item.averageCostPaise ?? item.averageCostCents ?? 0)

        return {
          ...item,
          productName: prod ? prod.name : 'Unknown Product',
          sku: prod ? prod.sku : 'SKU-UNKNOWN',
          barcode: prod ? prod.barcode : '',
          category: prod ? prod.category : 'General',
          unit: prod?.unit || 'pcs',
          description: prod?.description || '',
          retailPricePaise: sellingPrice,
          retailPriceCents: sellingPrice,
          sellingPricePaise: sellingPrice,
          sellingPriceCents: sellingPrice,
          costPricePaise: costPrice,
          costPriceCents: costPrice,
          branchName: branch ? branch.name : 'Unknown Branch',
          branchCode: branch ? branch.code : 'BR-XX',
        }
      })

      setItems(enriched)
    } catch (err) {
      console.error('Failed to load inventory:', err)
      setError(err instanceof Error ? err.message : 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [workspaceMode, branchId])


  useEffect(() => {
    loadInventory()
  }, [loadInventory, refreshKey])

  const adjustStock = async (params: {
    branchId: string
    productId: string
    quantityDelta: number
    movementType: StockMovementType
    notes?: string
    unitCostPaise?: number
    unitCostCents?: number
  }) => {
    const res = await inventoryRepository.adjustStock({
      workspaceId: workspaceMode,
      ...params,
    })
    notifyDataChanged()
    return res
  }

  const updateReorderPoint = async (id: string, reorderPoint: number, locationBin?: string) => {
    const res = await inventoryRepository.updateReorderPoint(id, reorderPoint, locationBin)
    notifyDataChanged()
    return res
  }

  const quickRestock = async (inventoryId: string, quantityToAdd = 15) => {
    const item = items.find((i) => i.id === inventoryId)
    if (!item) {
      throw new Error(`Inventory item "${inventoryId}" not found.`)
    }

    const res = await inventoryRepository.adjustStock({
      workspaceId: workspaceMode,
      branchId: item.branchId,
      productId: item.productId,
      quantityDelta: quantityToAdd,
      movementType: 'adjustment',
      unitCostPaise: item.averageCostPaise,
      unitCostCents: item.averageCostPaise,
      notes: `Quick restock (+${quantityToAdd} units)`,
    })
    notifyDataChanged()
    return res
  }

  return {
    items,
    loading,
    error,
    refresh: loadInventory,
    adjustStock,
    updateReorderPoint,
    quickRestock,
  }
}
