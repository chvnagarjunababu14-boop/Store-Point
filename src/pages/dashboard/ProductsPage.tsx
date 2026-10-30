import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Boxes,
  Plus,
  Barcode,
  Percent,
  X,
  Layers,
  Sparkles,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Edit3,
  Eye,
  ArrowUpDown,
  Filter,
  Package,
} from 'lucide-react'
import {
  PageHeader,
  Button,
  KpiStat,
  FilterBar,
  FilterField,
  StatusBadge,
  IconButton,
  EmptyState,
  DialogHeader,
} from '@/components/ui'
import { useProducts } from '@/hooks/useProducts'
import { useInventory } from '@/hooks/useInventory'
import { useWorkspace } from '@/context/WorkspaceContext'
import { stockMovementRepository } from '@/lib/repositories/stockMovementRepository'
import { productRepository } from '@/lib/repositories/productRepository'
import { rupeesToPaise, paiseToRupees, formatMoney, calculateMarginPercent } from '@/utils/money'
import { cn } from '@/utils/cn'
import type { ProductEntity, StockMovementEntity } from '@/types/database'
import { useModalA11y } from '@/hooks/useModalA11y'

type SortField = 'name' | 'sku' | 'sellingPrice' | 'costPrice' | 'stock'
type SortOrder = 'asc' | 'desc'
type StatusFilter = 'active' | 'archived' | 'all'
type StockHealthFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

export function ProductsPage() {
  const { workspaceMode } = useWorkspace()
  const { products, loading, addProduct, updateProduct, archiveProduct, unarchiveProduct } = useProducts({ includeArchived: true })
  const { items: inventoryItems } = useInventory('all')
  const [searchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') || ''

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState(urlQuery)
  const [syncedUrlQuery, setSyncedUrlQuery] = useState(urlQuery)
  if (urlQuery !== syncedUrlQuery) {
    setSyncedUrlQuery(urlQuery)
    setSearchQuery(urlQuery)
  }
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [stockHealthFilter, setStockHealthFilter] = useState<StockHealthFilter>('all')
  const [sortBy, setSortBy] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Product Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const productModalRef = useRef<HTMLDivElement>(null)
  const [editingProduct, setEditingProduct] = useState<ProductEntity | null>(null)
  const [formSku, setFormSku] = useState('')
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('Hardware')
  const [formUnit, setFormUnit] = useState('pcs')
  const [formDescription, setFormDescription] = useState('')
  const [formCost, setFormCost] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formBarcode, setFormBarcode] = useState('')
  const [formReorderPoint, setFormReorderPoint] = useState('10')
  const [formErrorMsg, setFormErrorMsg] = useState('')
  const [formSuccessMsg, setFormSuccessMsg] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Product Detail Drawer
  const [selectedProduct, setSelectedProduct] = useState<ProductEntity | null>(null)
  const detailDrawerRef = useRef<HTMLDivElement>(null)
  const [productMovements, setProductMovements] = useState<StockMovementEntity[]>([])
  const [movementsLoading, setMovementsLoading] = useState(false)

  // Confirm Action Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    action: () => Promise<void>
    confirmText: string
    variant: 'danger' | 'primary'
  } | null>(null)
  const confirmModalRef = useRef<HTMLDivElement>(null)

  // Modal A11y
  useModalA11y({
    isOpen: isModalOpen,
    onClose: () => !formSubmitting && setIsModalOpen(false),
    containerRef: productModalRef,
  })

  useModalA11y({
    isOpen: Boolean(selectedProduct),
    onClose: () => setSelectedProduct(null),
    containerRef: detailDrawerRef,
  })

  useModalA11y({
    isOpen: Boolean(confirmDialog?.open),
    onClose: () => setConfirmDialog(null),
    containerRef: confirmModalRef,
  })

  // Map inventory aggregated by productId
  const inventoryByProduct = useMemo(() => {
    const map = new Map<string, { totalStock: number; branchEntries: typeof inventoryItems }>()
    for (const inv of inventoryItems) {
      const entry = map.get(inv.productId) || { totalStock: 0, branchEntries: [] }
      entry.totalStock += inv.quantity
      entry.branchEntries.push(inv)
      map.set(inv.productId, entry)
    }
    return map
  }, [inventoryItems])

  // Unique categories
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map((p) => p.category)))]
  }, [products])

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return products
      .filter((prod) => {
        // Status filter
        if (statusFilter !== 'all') {
          const isArchived = prod.status === 'archived'
          if (statusFilter === 'active' && isArchived) return false
          if (statusFilter === 'archived' && !isArchived) return false
        }

        // Category filter
        if (categoryFilter !== 'All' && prod.category !== categoryFilter) {
          return false
        }

        // Stock health filter
        const invInfo = inventoryByProduct.get(prod.id)
        const totalStock = invInfo ? invInfo.totalStock : 0
        const reorderLevel = prod.reorderPoint || 10

        if (stockHealthFilter === 'out_of_stock' && totalStock > 0) return false
        if (stockHealthFilter === 'low_stock' && (totalStock <= 0 || totalStock > reorderLevel)) return false
        if (stockHealthFilter === 'in_stock' && totalStock <= reorderLevel) return false

        // Search query
        if (q) {
          const nameMatch = prod.name.toLowerCase().includes(q)
          const skuMatch = prod.sku.toLowerCase().includes(q)
          const barcodeMatch = prod.barcode ? prod.barcode.toLowerCase().includes(q) : false
          if (!nameMatch && !skuMatch && !barcodeMatch) return false
        }

        return true
      })
      .sort((a, b) => {
        let valA: string | number = 0
        let valB: string | number = 0

        switch (sortBy) {
          case 'name':
            valA = a.name.toLowerCase()
            valB = b.name.toLowerCase()
            break
          case 'sku':
            valA = a.sku.toLowerCase()
            valB = b.sku.toLowerCase()
            break
          case 'sellingPrice':
            valA = a.sellingPricePaise ?? a.sellingPriceCents ?? 0
            valB = b.sellingPricePaise ?? b.sellingPriceCents ?? 0
            break
          case 'costPrice':
            valA = a.costPricePaise ?? a.costPriceCents ?? 0
            valB = b.costPricePaise ?? b.costPriceCents ?? 0
            break
          case 'stock':
            valA = inventoryByProduct.get(a.id)?.totalStock ?? 0
            valB = inventoryByProduct.get(b.id)?.totalStock ?? 0
            break
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
        }
        return sortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number)
      })
  }, [products, statusFilter, categoryFilter, stockHealthFilter, searchQuery, sortBy, sortOrder, inventoryByProduct])

  // Aggregate metrics
  const activeProducts = useMemo(() => products.filter((p) => p.status !== 'archived'), [products])

  const avgMargin = useMemo(() => {
    if (activeProducts.length === 0) return '0.0'
    const totalMargin = activeProducts.reduce((acc, p) => {
      const sell = p.sellingPricePaise ?? p.sellingPriceCents ?? 0
      const cost = p.costPricePaise ?? p.costPriceCents ?? 0
      const profit = sell - cost
      return acc + calculateMarginPercent(sell, profit)
    }, 0)
    return (totalMargin / activeProducts.length).toFixed(1)
  }, [activeProducts])

  // Load movements for detail drawer
  useEffect(() => {
    if (!selectedProduct) {
      setProductMovements([])
      return
    }
    let cancelled = false
    setMovementsLoading(true)
    stockMovementRepository
      .getAll(workspaceMode, { productId: selectedProduct.id, limit: 10 })
      .then((data) => {
        if (!cancelled) {
          setProductMovements(data)
          setMovementsLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load movements for product:', err)
        if (!cancelled) setMovementsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedProduct, workspaceMode])

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingProduct(null)
    setFormSku('')
    setFormName('')
    setFormCategory('Hardware')
    setFormUnit('pcs')
    setFormDescription('')
    setFormCost('')
    setFormPrice('')
    setFormBarcode('')
    setFormReorderPoint('10')
    setFormErrorMsg('')
    setFormSuccessMsg('')
    setIsModalOpen(true)
  }

  // Open modal for Edit
  const handleOpenEditModal = (product: ProductEntity) => {
    setEditingProduct(product)
    setFormSku(product.sku)
    setFormName(product.name)
    setFormCategory(product.category)
    setFormUnit(product.unit || 'pcs')
    setFormDescription(product.description || '')
    setFormCost(paiseToRupees(product.costPricePaise ?? product.costPriceCents ?? 0).toFixed(2))
    setFormPrice(paiseToRupees(product.sellingPricePaise ?? product.sellingPriceCents ?? 0).toFixed(2))
    setFormBarcode(product.barcode || '')
    setFormReorderPoint(String(product.reorderPoint ?? 10))
    setFormErrorMsg('')
    setFormSuccessMsg('')
    setIsModalOpen(true)
  }

  // Form Submit Handler
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrorMsg('')
    setFormSuccessMsg('')

    const trimmedSku = formSku.trim().toUpperCase()
    const trimmedName = formName.trim()
    const trimmedBarcode = formBarcode.trim()
    const costPaise = rupeesToPaise(formCost)
    const pricePaise = rupeesToPaise(formPrice)
    const reorderVal = parseInt(formReorderPoint, 10)

    if (!trimmedSku) {
      setFormErrorMsg('SKU code is required.')
      return
    }
    if (!trimmedName) {
      setFormErrorMsg('Product name is required.')
      return
    }
    if (isNaN(costPaise) || costPaise < 0) {
      setFormErrorMsg('Purchase cost must be ₹0 or greater.')
      return
    }
    if (isNaN(pricePaise) || pricePaise < 0) {
      setFormErrorMsg('Selling price must be ₹0 or greater.')
      return
    }
    if (isNaN(reorderVal) || reorderVal < 0) {
      setFormErrorMsg('Reorder level must be 0 or greater.')
      return
    }

    try {
      setFormSubmitting(true)

      // Duplicate validations via repository before saving
      if (editingProduct) {
        // Checking duplicate SKU
        if (trimmedSku !== editingProduct.sku) {
          const existingSku = await productRepository.getBySku(workspaceMode, trimmedSku)
          if (existingSku && existingSku.id !== editingProduct.id && existingSku.status !== 'archived') {
            setFormErrorMsg(`Product with SKU "${trimmedSku}" already exists in this workspace.`)
            setFormSubmitting(false)
            return
          }
        }
        // Checking duplicate barcode
        if (trimmedBarcode && trimmedBarcode !== editingProduct.barcode) {
          const existingBarcode = await productRepository.getByBarcode(workspaceMode, trimmedBarcode)
          if (existingBarcode && existingBarcode.id !== editingProduct.id && existingBarcode.status !== 'archived') {
            setFormErrorMsg(`Product with barcode "${trimmedBarcode}" already exists in this workspace.`)
            setFormSubmitting(false)
            return
          }
        }

        const updated = await updateProduct(editingProduct.id, {
          sku: trimmedSku,
          name: trimmedName,
          category: formCategory,
          unit: formUnit.trim() || 'pcs',
          description: formDescription.trim(),
          costPricePaise: costPaise,
          costPriceCents: costPaise,
          sellingPricePaise: pricePaise,
          sellingPriceCents: pricePaise,
          barcode: trimmedBarcode,
          reorderPoint: reorderVal,
        })

        setFormSuccessMsg(`Product "${updated.name}" updated successfully!`)
        if (selectedProduct?.id === updated.id) {
          setSelectedProduct(updated)
        }
      } else {
        // Duplicate SKU check
        const existingSku = await productRepository.getBySku(workspaceMode, trimmedSku)
        if (existingSku && existingSku.status !== 'archived') {
          setFormErrorMsg(`Product with SKU "${trimmedSku}" already exists in this workspace.`)
          setFormSubmitting(false)
          return
        }
        // Duplicate barcode check
        if (trimmedBarcode) {
          const existingBarcode = await productRepository.getByBarcode(workspaceMode, trimmedBarcode)
          if (existingBarcode && existingBarcode.status !== 'archived') {
            setFormErrorMsg(`Product with barcode "${trimmedBarcode}" already exists in this workspace.`)
            setFormSubmitting(false)
            return
          }
        }

        const created = await addProduct({
          sku: trimmedSku,
          name: trimmedName,
          category: formCategory,
          unit: formUnit.trim() || 'pcs',
          description: formDescription.trim(),
          costPricePaise: costPaise,
          costPriceCents: costPaise,
          sellingPricePaise: pricePaise,
          sellingPriceCents: pricePaise,
          barcode: trimmedBarcode || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          reorderPoint: reorderVal,
        })

        setFormSuccessMsg(`Product "${created.name}" created in catalog!`)
      }

      setTimeout(() => {
        setIsModalOpen(false)
        setFormSubmitting(false)
        setFormSuccessMsg('')
      }, 1000)
    } catch (err) {
      setFormErrorMsg(err instanceof Error ? err.message : 'Failed to save product.')
      setFormSubmitting(false)
    }
  }

  // Handle Archive Confirmation
  const promptArchive = (product: ProductEntity) => {
    setConfirmDialog({
      open: true,
      title: 'Archive Product',
      message: `Are you sure you want to archive "${product.name}" (${product.sku})? It will be hidden from new sales and purchase orders, but all historical transaction records will be preserved.`,
      variant: 'danger',
      confirmText: 'Archive Product',
      action: async () => {
        await archiveProduct(product.id)
        if (selectedProduct?.id === product.id) {
          setSelectedProduct(null)
        }
      },
    })
  }

  // Handle Unarchive Confirmation
  const promptUnarchive = (product: ProductEntity) => {
    setConfirmDialog({
      open: true,
      title: 'Restore Product to Catalog',
      message: `Restore "${product.name}" (${product.sku}) to active catalog? It will become available for sales, transfers, and purchase orders.`,
      variant: 'primary',
      confirmText: 'Restore Product',
      action: async () => {
        await unarchiveProduct(product.id)
        if (selectedProduct?.id === product.id) {
          setSelectedProduct(null)
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Boxes className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
            <span>Products</span>
            <span className="text-navy-300">/</span>
            <span className="text-navy-700 normal-case tracking-normal">
              {workspaceMode === 'demo' ? 'Demo catalog' : 'Live catalog'}
            </span>
          </>
        }
        title="Product catalog"
        description="SKUs, pricing, margins, and archive status for your merchandise master list."
        actions={
          <Button size="sm" onClick={handleOpenCreateModal} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>
            Add product
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiStat label="Active SKUs" value={activeProducts.length} hint="Merchandise in catalog" />
        <KpiStat
          label="Archived"
          value={products.length - activeProducts.length}
          tone="muted"
          hint="Preserved historical lines"
        />
        <KpiStat label="Avg margin" value={`${avgMargin}%`} tone="success" hint="Across active lines" />
        <KpiStat
          label="Categories"
          value={Math.max(0, categories.length - 1)}
          tone="brand"
          hint="Active classifications"
        />
      </div>

      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name, SKU, or barcode…"
        searchLabel="Search products"
      >
        <FilterField label="Status" icon={<Filter className="w-3.5 h-3.5 text-navy-400" aria-hidden="true" />}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="sp-control"
            aria-label="Filter by product status"
          >
            <option value="active">Active only</option>
            <option value="archived">Archived only</option>
            <option value="all">All products</option>
          </select>
        </FilterField>
        <FilterField label="Category">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="sp-control"
            aria-label="Filter by category"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Stock">
          <select
            value={stockHealthFilter}
            onChange={(e) => setStockHealthFilter(e.target.value as StockHealthFilter)}
            className="sp-control"
            aria-label="Filter by stock health"
          >
            <option value="all">All health</option>
            <option value="in_stock">In stock</option>
            <option value="low_stock">Low stock</option>
            <option value="out_of_stock">Out of stock</option>
          </select>
        </FilterField>
        <FilterField
          label="Sort"
          icon={<ArrowUpDown className="w-3.5 h-3.5 text-navy-400" aria-hidden="true" />}
        >
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            className="sp-control"
            aria-label="Sort products by"
          >
            <option value="name">Name</option>
            <option value="sku">SKU</option>
            <option value="sellingPrice">Selling price</option>
            <option value="costPrice">Cost</option>
            <option value="stock">Stock on hand</option>
          </select>
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="sp-control !py-1.5 font-semibold cursor-pointer"
            aria-label={`Sort order ${sortOrder}`}
          >
            {sortOrder.toUpperCase()}
          </button>
        </FilterField>
      </FilterBar>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {loading ? (
          <div className="col-span-full space-y-3" aria-busy="true" aria-label="Loading products">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-36 sp-skeleton rounded-xl" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<Boxes className="w-5 h-5" aria-hidden="true" />}
              title={products.length === 0 ? 'No products yet' : 'No products match'}
              description={
                products.length === 0
                  ? 'Add your first product to start tracking inventory and sales.'
                  : 'Try adjusting search terms or filters.'
              }
              action={
                products.length === 0 ? (
                  <Button size="sm" onClick={handleOpenCreateModal} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                    Create first product
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          filteredProducts.map((product) => {
            const costPaise = product.costPricePaise ?? product.costPriceCents ?? 0
            const sellPaise = product.sellingPricePaise ?? product.sellingPriceCents ?? 0
            const profitPaise = sellPaise - costPaise
            const margin = calculateMarginPercent(sellPaise, profitPaise)
            const isArchived = product.status === 'archived'

            const invData = inventoryByProduct.get(product.id)
            const totalStock = invData ? invData.totalStock : 0
            const reorderPt = product.reorderPoint || 10
            const isOutOfStock = totalStock <= 0
            const isLowStock = !isOutOfStock && totalStock <= reorderPt
            const stockStatus = isArchived
              ? 'archived'
              : isOutOfStock
                ? 'out_of_stock'
                : isLowStock
                  ? 'low_stock'
                  : 'in_stock'

            return (
              <div
                key={product.id}
                className={cn(
                  'bg-white rounded-xl border p-4 sm:p-5 shadow-card transition-colors flex flex-col justify-between gap-3',
                  'focus-within:ring-2 focus-within:ring-brand-600/30',
                  isArchived
                    ? 'border-navy-200 bg-navy-50/50'
                    : 'border-navy-200/80 hover:border-brand-200'
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="sp-num text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
                        {product.sku}
                      </span>
                      <StatusBadge status={stockStatus} />
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <IconButton
                        label="View branch stock and movements"
                        tone="brand"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      </IconButton>
                      <IconButton label="Edit product" onClick={() => handleOpenEditModal(product)}>
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      </IconButton>
                      {isArchived ? (
                        <IconButton
                          label="Restore to active catalog"
                          tone="success"
                          onClick={() => promptUnarchive(product)}
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" aria-hidden="true" />
                        </IconButton>
                      ) : (
                        <IconButton
                          label="Archive product"
                          tone="danger"
                          onClick={() => promptArchive(product)}
                        >
                          <Archive className="w-3.5 h-3.5" aria-hidden="true" />
                        </IconButton>
                      )}
                    </div>
                  </div>

                  <div className="sp-product-cell mb-3">
                    <h3 className="sp-product-name text-sm">{product.name}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-navy-400">
                      <span>{product.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>Unit: {product.unit || 'pcs'}</span>
                      <span aria-hidden="true">·</span>
                      <span>Reorder ≤ {reorderPt}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-navy-50/80 p-3 rounded-lg border border-navy-100 text-xs mb-3">
                    <div>
                      <span className="text-navy-400 block text-[10px] uppercase font-semibold">Cost</span>
                      <span className="sp-num font-semibold text-navy-700">{formatMoney(costPaise)}</span>
                    </div>
                    <div>
                      <span className="text-navy-400 block text-[10px] uppercase font-semibold">Retail</span>
                      <span className="sp-num font-bold text-navy-900">{formatMoney(sellPaise)}</span>
                    </div>
                    <div>
                      <span className="text-navy-400 block text-[10px] uppercase font-semibold">Profit</span>
                      <span className="sp-num font-bold text-emerald-600">+{formatMoney(profitPaise)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-navy-50 rounded-lg">
                    <span className="text-navy-600 font-medium">On hand (all branches)</span>
                    <span
                      className={cn(
                        'sp-num font-bold',
                        isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-navy-900'
                      )}
                    >
                      {totalStock} {product.unit || 'pcs'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-navy-100 flex items-center justify-between text-xs text-navy-500">
                  <div className="flex items-center gap-1.5 sp-num text-[11px]">
                    <Barcode className="w-3.5 h-3.5 text-navy-400" aria-hidden="true" />
                    <span>{product.barcode || 'No barcode'}</span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-navy-700">
                    <Percent className="w-3 h-3 text-brand-600" aria-hidden="true" />
                    <span className="sp-num">{margin}% margin</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Product Detail Drawer / Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-detail-title"
        >
          <div
            className="fixed inset-0 bg-navy-950/55"
            onClick={() => setSelectedProduct(null)}
            aria-hidden="true"
          />

          <div
            ref={detailDrawerRef}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-navy-200 overflow-hidden z-10 max-h-[90vh] flex flex-col"
          >
            <DialogHeader
              titleId="product-detail-title"
              title="Product detail"
              description="Pricing, branch stock, and recent movements"
              icon={<Boxes className="w-4 h-4" aria-hidden="true" />}
              onClose={() => setSelectedProduct(null)}
            />

            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
              {/* Product Summary */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded">
                      {selectedProduct.sku}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{selectedProduct.category}</span>
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded uppercase',
                      selectedProduct.status === 'archived' ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'
                    )}>
                      {selectedProduct.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedProduct.name}</h2>
                  {selectedProduct.description && (
                    <p className="text-xs text-slate-600 mt-1">{selectedProduct.description}</p>
                  )}
                  <div className="text-xs text-slate-500 mt-2 flex items-center gap-3">
                    <span>Barcode: <strong className="font-mono text-slate-700">{selectedProduct.barcode || 'N/A'}</strong></span>
                    <span>Unit: <strong className="text-slate-700">{selectedProduct.unit || 'pcs'}</strong></span>
                    <span>Reorder Threshold: <strong className="font-mono text-slate-700">{selectedProduct.reorderPoint || 10}</strong></span>
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const p = selectedProduct
                      setSelectedProduct(null)
                      handleOpenEditModal(p)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </button>
                  {selectedProduct.status === 'archived' ? (
                    <button
                      type="button"
                      onClick={() => promptUnarchive(selectedProduct)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => promptArchive(selectedProduct)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Pricing Notice */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold">Wholesale Cost</span>
                  <span className="text-base font-bold text-slate-800">
                    {formatMoney(selectedProduct.costPricePaise ?? selectedProduct.costPriceCents ?? 0)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold">Retail Price</span>
                  <span className="text-base font-bold text-blue-700">
                    {formatMoney(selectedProduct.sellingPricePaise ?? selectedProduct.sellingPriceCents ?? 0)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold">Gross Margin</span>
                  <span className="text-base font-bold text-emerald-700">
                    {calculateMarginPercent(
                      selectedProduct.sellingPricePaise ?? selectedProduct.sellingPriceCents ?? 0,
                      (selectedProduct.sellingPricePaise ?? selectedProduct.sellingPriceCents ?? 0) -
                        (selectedProduct.costPricePaise ?? selectedProduct.costPriceCents ?? 0)
                    )}%
                  </span>
                </div>
              </div>

              {/* Branch Inventory Breakdown */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  <span>Stock Distribution Across Branches</span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="px-3 py-2">Branch</th>
                        <th className="px-3 py-2">Storage Bin</th>
                        <th className="px-3 py-2 text-right">Quantity</th>
                        <th className="px-3 py-2 text-right">Avg Cost</th>
                        <th className="px-3 py-2 text-right">Valuation</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inventoryByProduct.get(selectedProduct.id)?.branchEntries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                            No branch inventory records created yet.
                          </td>
                        </tr>
                      ) : (
                        inventoryByProduct.get(selectedProduct.id)?.branchEntries.map((branchItem) => {
                          const costPaise = branchItem.averageCostPaise ?? branchItem.averageCostCents ?? 0
                          const valuationPaise = branchItem.quantity * costPaise

                          return (
                            <tr key={branchItem.id} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-medium text-slate-800">
                                {branchItem.branchName} <span className="text-slate-400 text-[11px]">({branchItem.branchCode})</span>
                              </td>
                              <td className="px-3 py-2 text-slate-500">{branchItem.locationBin || 'Standard'}</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                                {branchItem.quantity}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-700">
                                {formatMoney(costPaise)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                                {formatMoney(valuationPaise)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={cn(
                                  'text-[10px] font-semibold px-2 py-0.5 rounded',
                                  branchItem.status === 'in_stock' ? 'bg-emerald-50 text-emerald-700' :
                                  branchItem.status === 'low_stock' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                                )}>
                                  {branchItem.status.replace('_', ' ')}
                                </span>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Movement History */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Recent Stock Movements (Audit Trail)</span>
                </h4>

                {movementsLoading ? (
                  <div className="py-4 text-center text-slate-400 text-xs font-mono">
                    Loading movements ledger...
                  </div>
                ) : productMovements.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 text-xs bg-slate-50 rounded-lg">
                    No movement records logged for this product.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {productMovements.map((mov) => (
                      <div
                        key={mov.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'font-bold text-[10px] px-1.5 py-0.5 rounded uppercase',
                              mov.quantityDelta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            )}>
                              {mov.type.replace('_', ' ')}
                            </span>
                            <span className="text-slate-600 font-medium">{mov.notes || 'Routine movement'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(mov.createdAt).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className={cn('font-bold', mov.quantityDelta > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                            {mov.quantityDelta > 0 ? `+${mov.quantityDelta}` : mov.quantityDelta}
                          </span>
                          <span className="text-slate-400 text-[10px] block">
                            Bal: {mov.resultingQuantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => !formSubmitting && setIsModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingProduct ? 'Edit Catalog Product' : 'Create New Product Master'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !formSubmitting && setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 text-xs sm:text-sm">
              {formErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formErrorMsg}</span>
                </div>
              )}

              {formSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{formSuccessMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Apple Magic Keyboard with Touch ID"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="e.g. SKU-9042-A"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Hardware, Peripherals, etc."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="pcs, kg, box, litre"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Barcode / UPC
                  </label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="e.g. 019425287410"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Wholesale Cost (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Retail Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reorder Point
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formReorderPoint}
                    onChange={(e) => setFormReorderPoint(e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional product details, specifications, notes..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200/60 text-[11px] text-blue-900 leading-relaxed">
                <strong>Pricing Integrity Notice:</strong> Updating catalog retail or wholesale price only applies to future purchases and sales. Historical transactions and cost snapshots remain strictly immutable.
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={formSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {formSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Save Product to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setConfirmDialog(null)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 z-10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2.5 rounded-full',
                confirmDialog.variant === 'danger' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
              )}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">{confirmDialog.title}</h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {confirmDialog.message}
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await confirmDialog.action()
                    setConfirmDialog(null)
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Action failed.')
                  }
                }}
                className={cn(
                  'px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-xs cursor-pointer',
                  confirmDialog.variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                )}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistence Notice */}
      <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
        <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800">Local Persistence:</strong> Products are saved with integer-paise pricing to prevent rounding issues and guarantee audit accuracy. Historical transactions always preserve their recorded snapshot prices and costs.
        </div>
      </div>
    </div>
  )
}
