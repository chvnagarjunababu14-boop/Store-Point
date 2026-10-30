import { getDb } from '@/lib/db'
import type { BranchEntity, WorkspaceId } from '@/types/database'

export const branchRepository = {
  async getAll(workspaceId: WorkspaceId): Promise<BranchEntity[]> {
    const db = await getDb()
    const all = await db.getAllFromIndex('branches', 'by-workspace', workspaceId)
    return all.filter((b) => b.status !== 'archived')
  },

  async list(workspaceId: WorkspaceId): Promise<BranchEntity[]> {
    return this.getAll(workspaceId)
  },

  async getAllIncludingArchived(workspaceId: WorkspaceId): Promise<BranchEntity[]> {
    const db = await getDb()
    return db.getAllFromIndex('branches', 'by-workspace', workspaceId)
  },

  async getById(id: string): Promise<BranchEntity | undefined> {
    const db = await getDb()
    const b = await db.get('branches', id)
    if (!b) return undefined
    return {
      ...b,
      isActive: b.status !== 'archived',
    }
  },

  async getByCode(workspaceId: WorkspaceId, code: string): Promise<BranchEntity | undefined> {
    const db = await getDb()
    return db.getFromIndex('branches', 'by-code', [workspaceId, code])
  },

  async create(branch: Omit<BranchEntity, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; isActive?: boolean }): Promise<BranchEntity> {
    const db = await getDb()
    const existing = await this.getByCode(branch.workspaceId, branch.code)
    if (existing && existing.status !== 'archived') {
      throw new Error(`Branch with code "${branch.code}" already exists in this workspace.`)
    }

    const now = new Date().toISOString()
    const status = branch.status || (branch.isActive === false ? 'archived' : 'active')
    const entity: BranchEntity = {
      ...branch,
      status,
      isActive: status !== 'archived',
      id: branch.id || `br_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    }

    await db.put('branches', entity)
    return entity
  },

  async update(id: string, updates: Partial<Omit<BranchEntity, 'id' | 'workspaceId' | 'createdAt'>> & { isActive?: boolean }): Promise<BranchEntity> {
    const db = await getDb()
    const existing = await db.get('branches', id)
    if (!existing) {
      throw new Error(`Branch with id "${id}" not found.`)
    }

    if (updates.code && updates.code !== existing.code) {
      const codeCheck = await this.getByCode(existing.workspaceId, updates.code)
      if (codeCheck && codeCheck.id !== id && codeCheck.status !== 'archived') {
        throw new Error(`Branch with code "${updates.code}" already exists.`)
      }
    }

    const updatedStatus = updates.status || (updates.isActive === false ? 'archived' : updates.isActive === true ? 'active' : existing.status)
    const updated: BranchEntity = {
      ...existing,
      ...updates,
      status: updatedStatus,
      isActive: updatedStatus !== 'archived',
      updatedAt: new Date().toISOString(),
    }

    await db.put('branches', updated)
    return updated
  },

  async canDelete(id: string): Promise<{ canDelete: boolean; reason?: string }> {
    const db = await getDb()
    const invCount = (await db.getAllFromIndex('inventory', 'by-branch', id)).length
    if (invCount > 0) {
      return { canDelete: false, reason: `Branch has ${invCount} active inventory records.` }
    }
    const salesCount = (await db.getAllFromIndex('sales', 'by-branch', id)).length
    if (salesCount > 0) {
      return { canDelete: false, reason: `Branch has ${salesCount} transaction history records.` }
    }
    const expenseCount = (await db.getAllFromIndex('operatingExpenses', 'by-branch', id)).length
    if (expenseCount > 0) {
      return { canDelete: false, reason: `Branch has ${expenseCount} associated operating expense entries.` }
    }
    return { canDelete: true }
  },

  async archive(id: string): Promise<BranchEntity> {
    return this.update(id, { status: 'archived', isActive: false })
  },

  async delete(id: string, force = false): Promise<void> {
    const db = await getDb()
    if (!force) {
      const check = await this.canDelete(id)
      if (!check.canDelete) {
        throw new Error(check.reason)
      }
    }
    await db.delete('branches', id)
  },
}
