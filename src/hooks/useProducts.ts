import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { productRepository } from '@/lib/repositories/productRepository'
import type { ProductEntity } from '@/types/database'

export function useProducts(options?: { includeArchived?: boolean }) {
  const { workspaceMode, refreshKey, notifyDataChanged } = useWorkspace()
  const [products, setProducts] = useState<ProductEntity[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = options?.includeArchived
        ? await productRepository.getAllIncludingArchived(workspaceMode)
        : await productRepository.getAll(workspaceMode)
      setProducts(data)
    } catch (err) {
      console.error('Failed to load products:', err)
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [workspaceMode, options?.includeArchived])

  useEffect(() => {
    loadProducts()
  }, [loadProducts, refreshKey])

  const addProduct = async (productData: Omit<ProductEntity, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string; unit?: string; description?: string }) => {
    const created = await productRepository.create({
      ...productData,
      workspaceId: workspaceMode,
      status: 'active',
    })
    notifyDataChanged()
    return created
  }

  const updateProduct = async (id: string, updates: Partial<Omit<ProductEntity, 'id' | 'workspaceId' | 'createdAt'>>) => {
    const updated = await productRepository.update(id, updates)
    notifyDataChanged()
    return updated
  }

  const archiveProduct = async (id: string) => {
    const archived = await productRepository.archive(id)
    notifyDataChanged()
    return archived
  }

  const unarchiveProduct = async (id: string) => {
    const unarchived = await productRepository.unarchive(id)
    notifyDataChanged()
    return unarchived
  }

  return {
    products,
    loading,
    error,
    refresh: loadProducts,
    addProduct,
    updateProduct,
    archiveProduct,
    unarchiveProduct,
  }
}
