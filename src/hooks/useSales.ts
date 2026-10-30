import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { saleRepository, type CreateSaleInput } from '@/lib/repositories/saleRepository'
import { branchRepository } from '@/lib/repositories/branchRepository'
import type { SaleEntity, SaleLineItemEntity } from '@/types/database'

export interface EnrichedSale extends SaleEntity {
  branchName: string
  branchCode: string
}

export function useSales(overrideBranchId?: string) {
  const { workspaceMode, activeBranchId: contextBranchId, refreshKey, notifyDataChanged } = useWorkspace()
  const branchId = overrideBranchId !== undefined ? overrideBranchId : contextBranchId

  const [sales, setSales] = useState<EnrichedSale[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadSales = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [salesList, branches] = await Promise.all([
        saleRepository.getAll(workspaceMode, branchId),
        branchRepository.getAllIncludingArchived(workspaceMode),
      ])

      const branchMap = new Map(branches.map((b) => [b.id, b]))

      const enriched: EnrichedSale[] = salesList.map((sale) => {
        const branch = branchMap.get(sale.branchId)
        return {
          ...sale,
          branchName: branch ? branch.name : 'Unknown Branch',
          branchCode: branch ? branch.code : 'BR-XX',
        }
      })

      setSales(enriched)
    } catch (err) {
      console.error('Failed to load sales orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to load sales')
    } finally {
      setLoading(false)
    }
  }, [workspaceMode, branchId])

  useEffect(() => {
    loadSales()
  }, [loadSales, refreshKey])

  const createSale = async (params: Omit<CreateSaleInput, 'workspaceId'>) => {
    const res = await saleRepository.createSale({
      workspaceId: workspaceMode,
      ...params,
    })
    notifyDataChanged()
    return res
  }

  const refundSale = async (params: Parameters<typeof saleRepository.refundOrCancelSale>[0]) => {
    const res = await saleRepository.refundOrCancelSale(params)
    notifyDataChanged()
    return res
  }

  const getLineItems = async (saleId: string): Promise<SaleLineItemEntity[]> => {
    return saleRepository.getLineItems(saleId)
  }

  const getReturns = async (saleId: string) => {
    return saleRepository.getReturns(saleId)
  }

  return {
    sales,
    loading,
    error,
    refresh: loadSales,
    createSale,
    refundSale,
    getLineItems,
    getReturns,
  }
}
