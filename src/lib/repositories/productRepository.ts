import { getDb } from '@/lib/db'
import type { ProductEntity, WorkspaceId } from '@/types/database'

function normalizeProduct(p: ProductEntity): ProductEntity {
  const cost = p.costPricePaise ?? p.costPriceCents ?? 0
  const selling = p.sellingPricePaise ?? p.sellingPriceCents ?? 0
  return {
    ...p,
    costPricePaise: cost,
    costPriceCents: cost,
    sellingPricePaise: selling,
    sellingPriceCents: selling,
  }
}

export const productRepository = {
  async getAll(workspaceId: WorkspaceId): Promise<ProductEntity[]> {
    const db = await getDb()
    const all = await db.getAllFromIndex('products', 'by-workspace', workspaceId)
    return all.filter((p) => p.status !== 'archived').map(normalizeProduct)
  },

  async list(workspaceId: WorkspaceId): Promise<ProductEntity[]> {
    return this.getAll(workspaceId)
  },

  async getAllIncludingArchived(workspaceId: WorkspaceId): Promise<ProductEntity[]> {
    const db = await getDb()
    const all = await db.getAllFromIndex('products', 'by-workspace', workspaceId)
    return all.map(normalizeProduct)
  },

  async getById(id: string): Promise<ProductEntity | undefined> {
    const db = await getDb()
    const p = await db.get('products', id)
    return p ? normalizeProduct(p) : undefined
  },

  async getBySku(workspaceId: WorkspaceId, sku: string): Promise<ProductEntity | undefined> {
    const db = await getDb()
    const p = await db.getFromIndex('products', 'by-sku', [workspaceId, sku.trim().toUpperCase()])
    return p ? normalizeProduct(p) : undefined
  },

  async getByBarcode(workspaceId: WorkspaceId, barcode: string): Promise<ProductEntity | undefined> {
    if (!barcode?.trim()) return undefined
    const db = await getDb()
    const matches = await db.getAllFromIndex('products', 'by-barcode', barcode.trim())
    const p = matches.find((m) => m.workspaceId === workspaceId && m.status !== 'archived')
    return p ? normalizeProduct(p) : undefined
  },

  async create(product: Partial<ProductEntity> & { workspaceId: WorkspaceId; sku: string; name: string }): Promise<ProductEntity> {
    const db = await getDb()
    const normalizedSku = product.sku.trim().toUpperCase()

    if (!normalizedSku) {
      throw new Error('Product SKU is required.')
    }
    if (!product.name.trim()) {
      throw new Error('Product name is required.')
    }

    const existing = await this.getBySku(product.workspaceId, normalizedSku)
    if (existing && existing.status !== 'archived') {
      throw new Error(`Product with SKU "${normalizedSku}" already exists in this workspace.`)
    }

    const trimmedBarcode = product.barcode?.trim()
    if (trimmedBarcode) {
      const existingBarcode = await this.getByBarcode(product.workspaceId, trimmedBarcode)
      if (existingBarcode && existingBarcode.status !== 'archived') {
        throw new Error(`Product with barcode "${trimmedBarcode}" already exists in this workspace.`)
      }
    }

    const cost = product.costPricePaise ?? product.costPriceCents ?? 0
    const selling = product.sellingPricePaise ?? product.sellingPriceCents ?? 0
    const now = new Date().toISOString()
    const entity: ProductEntity = {
      id: product.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: product.workspaceId,
      sku: normalizedSku,
      barcode: trimmedBarcode || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      name: product.name.trim(),
      category: product.category || 'General',
      unit: product.unit?.trim() || 'pcs',
      description: product.description || '',
      costPricePaise: cost,
      costPriceCents: cost,
      sellingPricePaise: selling,
      sellingPriceCents: selling,
      reorderPoint: product.reorderPoint !== undefined ? product.reorderPoint : 10,
      status: product.status || 'active',
      createdAt: now,
      updatedAt: now,
    }

    await db.put('products', entity)
    return entity
  },

  async update(id: string, updates: Partial<ProductEntity>): Promise<ProductEntity> {
    const db = await getDb()
    const existing = await db.get('products', id)
    if (!existing) {
      throw new Error(`Product with id "${id}" not found.`)
    }

    if (updates.sku && updates.sku.trim().toUpperCase() !== existing.sku) {
      const normalizedSku = updates.sku.trim().toUpperCase()
      const skuCheck = await this.getBySku(existing.workspaceId, normalizedSku)
      if (skuCheck && skuCheck.id !== id && skuCheck.status !== 'archived') {
        throw new Error(`Product with SKU "${normalizedSku}" already exists.`)
      }
      updates.sku = normalizedSku
    }

    if (updates.barcode !== undefined) {
      const trimmedBarcode = updates.barcode.trim()
      if (trimmedBarcode && trimmedBarcode !== existing.barcode) {
        const barcodeCheck = await this.getByBarcode(existing.workspaceId, trimmedBarcode)
        if (barcodeCheck && barcodeCheck.id !== id && barcodeCheck.status !== 'archived') {
          throw new Error(`Product with barcode "${trimmedBarcode}" already exists in this workspace.`)
        }
      }
      updates.barcode = trimmedBarcode
    }

    const cost = updates.costPricePaise ?? updates.costPriceCents ?? existing.costPricePaise ?? existing.costPriceCents ?? 0
    const selling = updates.sellingPricePaise ?? updates.sellingPriceCents ?? existing.sellingPricePaise ?? existing.sellingPriceCents ?? 0

    const updated: ProductEntity = {
      ...existing,
      ...updates,
      costPricePaise: cost,
      costPriceCents: cost,
      sellingPricePaise: selling,
      sellingPriceCents: selling,
      updatedAt: new Date().toISOString(),
    }

    await db.put('products', updated)
    return updated
  },

  async archive(id: string): Promise<ProductEntity> {
    return this.update(id, { status: 'archived' })
  },

  async unarchive(id: string): Promise<ProductEntity> {
    const db = await getDb()
    const existing = await db.get('products', id)
    if (!existing) {
      throw new Error(`Product with id "${id}" not found.`)
    }
    // Check if active collision exists
    const skuCheck = await this.getBySku(existing.workspaceId, existing.sku)
    if (skuCheck && skuCheck.id !== id && skuCheck.status !== 'archived') {
      throw new Error(`Cannot unarchive: active product with SKU "${existing.sku}" already exists.`)
    }
    if (existing.barcode) {
      const barcodeCheck = await this.getByBarcode(existing.workspaceId, existing.barcode)
      if (barcodeCheck && barcodeCheck.id !== id && barcodeCheck.status !== 'archived') {
        throw new Error(`Cannot unarchive: active product with barcode "${existing.barcode}" already exists.`)
      }
    }
    return this.update(id, { status: 'active' })
  },

  async delete(id: string, force = false): Promise<void> {
    const db = await getDb()
    if (!force) {
      const invItems = await db.getAllFromIndex('inventory', 'by-product', id)
      const hasStock = invItems.some((i) => i.quantity > 0)
      if (hasStock) {
        throw new Error('Cannot delete a product with existing stock on hand. Archive it instead.')
      }
    }
    await db.delete('products', id)
  },
}

