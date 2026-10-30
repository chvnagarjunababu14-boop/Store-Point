import { getDb } from '@/lib/db'
import type { OperatingExpenseEntity, WorkspaceId } from '@/types/database'

function normalizeExpense(e: OperatingExpenseEntity): OperatingExpenseEntity {
  const amt = e.amountPaise ?? e.amountCents ?? 0
  return {
    ...e,
    amountPaise: amt,
    amountCents: amt,
  }
}

export const expenseRepository = {
  async getAll(workspaceId: WorkspaceId, branchId?: string): Promise<OperatingExpenseEntity[]> {
    const db = await getDb()
    const all = await db.getAllFromIndex('operatingExpenses', 'by-workspace', workspaceId)
    const filtered =
      branchId && branchId !== 'all'
        ? all.filter((e) => e.branchId === branchId || e.branchId === 'consolidated')
        : all
    return filtered.map(normalizeExpense).sort((a, b) => b.date.localeCompare(a.date))
  },

  async list(workspaceId: WorkspaceId, branchId?: string): Promise<OperatingExpenseEntity[]> {
    return this.getAll(workspaceId, branchId)
  },

  async getById(id: string): Promise<OperatingExpenseEntity | undefined> {
    const db = await getDb()
    const exp = await db.get('operatingExpenses', id)
    return exp ? normalizeExpense(exp) : undefined
  },

  async create(expense: Partial<OperatingExpenseEntity> & { workspaceId: WorkspaceId; branchId: string; category: any; description: string; date: string }): Promise<OperatingExpenseEntity> {
    const db = await getDb()
    const now = new Date().toISOString()
    const amt = expense.amountPaise ?? expense.amountCents ?? 0
    const entity: OperatingExpenseEntity = {
      ...expense,
      amountPaise: amt,
      amountCents: amt,
      id: expense.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
    }

    await db.put('operatingExpenses', entity)
    return entity
  },

  async update(id: string, updates: Partial<OperatingExpenseEntity>): Promise<OperatingExpenseEntity> {
    const db = await getDb()
    const existing = await db.get('operatingExpenses', id)
    if (!existing) {
      throw new Error(`Expense entry with id "${id}" not found.`)
    }

    const amt = updates.amountPaise ?? updates.amountCents ?? existing.amountPaise ?? existing.amountCents ?? 0
    const updated: OperatingExpenseEntity = {
      ...existing,
      ...updates,
      amountPaise: amt,
      amountCents: amt,
    }

    await db.put('operatingExpenses', updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    const db = await getDb()
    await db.delete('operatingExpenses', id)
  },
}

