import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { expenseRepository } from '@/lib/repositories/expenseRepository'
import { branchRepository } from '@/lib/repositories/branchRepository'
import type { OperatingExpenseEntity } from '@/types/database'

export interface EnrichedExpense extends OperatingExpenseEntity {
  branchName: string
}

export function useExpenses(overrideBranchId?: string) {
  const { workspaceMode, activeBranchId: contextBranchId, refreshKey, notifyDataChanged } = useWorkspace()
  const branchId = overrideBranchId !== undefined ? overrideBranchId : contextBranchId

  const [expenses, setExpenses] = useState<EnrichedExpense[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [list, branches] = await Promise.all([
        expenseRepository.getAll(workspaceMode, branchId),
        branchRepository.getAllIncludingArchived(workspaceMode),
      ])

      const branchMap = new Map(branches.map((b) => [b.id, b]))

      const enriched: EnrichedExpense[] = list.map((exp) => ({
        ...exp,
        branchName: exp.branchId === 'consolidated' ? 'Consolidated / HQ' : branchMap.get(exp.branchId)?.name || 'General Branch',
      }))

      setExpenses(enriched)
    } catch (err) {
      console.error('Failed to load operating expenses:', err)
      setError(err instanceof Error ? err.message : 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [workspaceMode, branchId])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses, refreshKey])

  const addExpense = async (expenseData: Omit<OperatingExpenseEntity, 'id' | 'workspaceId' | 'createdAt'> & { id?: string }) => {
    const created = await expenseRepository.create({
      ...expenseData,
      workspaceId: workspaceMode,
    })
    notifyDataChanged()
    return created
  }

  const updateExpense = async (id: string, updates: Partial<OperatingExpenseEntity>) => {
    const updated = await expenseRepository.update(id, updates)
    notifyDataChanged()
    return updated
  }

  const deleteExpense = async (id: string) => {
    await expenseRepository.delete(id)
    notifyDataChanged()
  }

  return {
    expenses,
    loading,
    error,
    refresh: loadExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
  }
}
