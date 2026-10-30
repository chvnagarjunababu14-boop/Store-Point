import { getDb } from '@/lib/db'
import type { StockMovementEntity, WorkspaceId } from '@/types/database'

export const stockMovementRepository = {
  async getAll(
    workspaceId: WorkspaceId,
    options: { branchId?: string; productId?: string; limit?: number } = {}
  ): Promise<StockMovementEntity[]> {
    const db = await getDb()
    let list = await db.getAllFromIndex('stockMovements', 'by-workspace', workspaceId)

    if (options.branchId && options.branchId !== 'all') {
      list = list.filter((m) => m.branchId === options.branchId)
    }
    if (options.productId) {
      list = list.filter((m) => m.productId === options.productId)
    }

    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    if (options.limit) {
      return list.slice(0, options.limit)
    }
    return list
  },

  async listByWorkspace(workspaceId: WorkspaceId): Promise<StockMovementEntity[]> {
    return this.getAll(workspaceId)
  },
}
