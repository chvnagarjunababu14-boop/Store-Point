import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { branchRepository } from '@/lib/repositories/branchRepository'
import type { BranchEntity } from '@/types/database'

export function useBranches() {
  const { workspaceMode, refreshKey, notifyDataChanged } = useWorkspace()
  const [branches, setBranches] = useState<BranchEntity[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadBranches = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await branchRepository.getAll(workspaceMode)
      setBranches(data)
    } catch (err) {
      console.error('Failed to load branches:', err)
      setError(err instanceof Error ? err.message : 'Failed to load branches')
    } finally {
      setLoading(false)
    }
  }, [workspaceMode])

  useEffect(() => {
    loadBranches()
  }, [loadBranches, refreshKey])

  const addBranch = async (branchData: Omit<BranchEntity, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string }) => {
    const created = await branchRepository.create({
      ...branchData,
      workspaceId: workspaceMode,
      status: 'active',
    })
    notifyDataChanged()
    return created
  }

  const updateBranch = async (id: string, updates: Partial<Omit<BranchEntity, 'id' | 'workspaceId' | 'createdAt'>>) => {
    const updated = await branchRepository.update(id, updates)
    notifyDataChanged()
    return updated
  }

  const archiveBranch = async (id: string) => {
    const archived = await branchRepository.archive(id)
    notifyDataChanged()
    return archived
  }

  const deleteBranch = async (id: string) => {
    await branchRepository.delete(id)
    notifyDataChanged()
  }

  return {
    branches,
    loading,
    error,
    refresh: loadBranches,
    addBranch,
    updateBranch,
    archiveBranch,
    deleteBranch,
  }
}
