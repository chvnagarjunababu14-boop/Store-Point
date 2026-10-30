import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { stockTransferRepository } from '@/lib/repositories/stockTransferRepository'
import type { StockTransferEntity, StockTransferStatus } from '@/types/database'

export function useTransfers(options?: {
  sourceBranchId?: string
  destinationBranchId?: string
  status?: StockTransferStatus
}) {
  const { workspaceMode, refreshKey, notifyDataChanged } = useWorkspace()
  const [transfers, setTransfers] = useState<StockTransferEntity[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const sourceBranchId = options?.sourceBranchId
  const destinationBranchId = options?.destinationBranchId
  const status = options?.status

  const loadTransfers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await stockTransferRepository.getAll(workspaceMode, {
        sourceBranchId,
        destinationBranchId,
        status,
      })
      setTransfers(data)
    } catch (err) {
      console.error('Failed to load stock transfers:', err)
      setError(err instanceof Error ? err.message : 'Failed to load stock transfers')
    } finally {
      setLoading(false)
    }
  }, [workspaceMode, sourceBranchId, destinationBranchId, status])

  useEffect(() => {
    loadTransfers()
  }, [loadTransfers, refreshKey])

  const createTransfer = async (params: {
    sourceBranchId: string
    destinationBranchId: string
    productId: string
    quantity: number
    notes?: string
    referenceNumber?: string
  }) => {
    const created = await stockTransferRepository.create({
      ...params,
      workspaceId: workspaceMode,
    })
    notifyDataChanged()
    return created
  }

  const dispatchTransfer = async (transferId: string) => {
    const dispatched = await stockTransferRepository.dispatch(transferId)
    notifyDataChanged()
    return dispatched
  }

  const receiveTransfer = async (transferId: string) => {
    const received = await stockTransferRepository.receive(transferId)
    notifyDataChanged()
    return received
  }

  const cancelTransfer = async (transferId: string) => {
    const cancelled = await stockTransferRepository.cancel(transferId)
    notifyDataChanged()
    return cancelled
  }

  return {
    transfers,
    loading,
    error,
    refresh: loadTransfers,
    createTransfer,
    dispatchTransfer,
    receiveTransfer,
    cancelTransfer,
  }
}
