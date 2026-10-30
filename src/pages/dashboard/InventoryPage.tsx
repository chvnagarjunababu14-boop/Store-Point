import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Package,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  PlusCircle,
  ArrowUpDown,
  RotateCcw,
  ShoppingCart,
  History,
  Plus,
  X,
  Boxes,
  Check,
  AlertCircle,
  ArrowRightLeft,
  Sliders,
  Send,
} from 'lucide-react'
import { useInventory, type EnrichedInventoryItem } from '@/hooks/useInventory'
import { useBranches } from '@/hooks/useBranches'
import { useProducts } from '@/hooks/useProducts'
import { useTransfers } from '@/hooks/useTransfers'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useModalA11y } from '@/hooks/useModalA11y'
import { purchaseRepository } from '@/lib/repositories/purchaseRepository'
import { stockMovementRepository } from '@/lib/repositories/stockMovementRepository'
import { formatMoney, paiseToRupees, rupeesToPaise } from '@/utils/money'
import { cn } from '@/utils/cn'
import type {
  PurchaseEntity,
  StockMovementEntity,
  StockMovementType,
  StockTransferEntity,
} from '@/types/database'
import {
  PageHeader,
  Button,
  KpiStat,
  FilterBar,
  FilterField,
  StatusBadge,
  EmptyState,
  DialogHeader,
  DialogFooter,
  Badge,
} from '@/components/ui'

export function InventoryPage() {
  const { workspaceMode, activeBranchId, setActiveBranchId, refreshKey, notifyDataChanged } = useWorkspace()
  const { branches } = useBranches()
  const { products } = useProducts({ includeArchived: true })
  const { items, loading, quickRestock, adjustStock, updateReorderPoint } = useInventory(activeBranchId)
  const {
    transfers,
    loading: transfersLoading,
    createTransfer,
    dispatchTransfer,
    receiveTransfer,
    cancelTransfer,
  } = useTransfers({
    sourceBranchId: activeBranchId === 'all' ? undefined : activeBranchId,
  })

  const [activeTab, setActiveTab] = useState<'stock' | 'transfers' | 'purchases' | 'movements'>('stock')

  // Stock on Hand filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [sortBy, setSortBy] = useState<'quantity' | 'cost' | 'name'>('quantity')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [restockSuccessId, setRestockSuccessId] = useState<string | null>(null)

  // Configure Threshold Modal
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false)
  const [thresholdItem, setThresholdItem] = useState<EnrichedInventoryItem | null>(null)
  const [editReorderPoint, setEditReorderPoint] = useState('')
  const [editLocationBin, setEditLocationBin] = useState('')
  const [thresholdSubmitting, setThresholdSubmitting] = useState(false)

  // Product Detail Drawer
  const [detailProduct, setDetailProduct] = useState<{
    id: string
    name: string
    sku: string
    category: string
    barcode: string
    unit: string
    costPaise: number
    sellPaise: number
  } | null>(null)
  const [productMovements, setProductMovements] = useState<StockMovementEntity[]>([])
  const [productMovementsLoading, setProductMovementsLoading] = useState(false)

  // Stock Transfers Filters & State
  const [transferStatusFilter, setTransferStatusFilter] = useState<string>('all')
  const [transferSearchQuery, setTransferSearchQuery] = useState('')
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [transferSourceBranch, setTransferSourceBranch] = useState('')
  const [transferDestBranch, setTransferDestBranch] = useState('')
  const [transferProductId, setTransferProductId] = useState('')
  const [transferQuantity, setTransferQuantity] = useState('10')
  const [transferRefNumber, setTransferRefNumber] = useState('')
  const [transferNotes, setTransferNotes] = useState('')
  const [transferError, setTransferError] = useState('')
  const [transferSubmitting, setTransferSubmitting] = useState(false)
  const [transferSuccessMsg, setTransferSuccessMsg] = useState('')

  // Purchase Orders state
  const [purchases, setPurchases] = useState<PurchaseEntity[]>([])
  const [purchasesLoading, setPurchasesLoading] = useState(false)
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState<string>('all')
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState('')
  const [isPoModalOpen, setIsPoModalOpen] = useState(false)
  const [poSupplier, setPoSupplier] = useState('')
  const [poSupplierPhone, setPoSupplierPhone] = useState('')
  const [poSupplierEmail, setPoSupplierEmail] = useState('')
  const [poSupplierRef, setPoSupplierRef] = useState('')
  const [poBranchId, setPoBranchId] = useState(activeBranchId === 'all' && branches[0] ? branches[0].id : activeBranchId)
  const [poOrderNumber, setPoOrderNumber] = useState('')
  const [poItems, setPoItems] = useState<Array<{ productId: string; quantity: number; unitCostRupees: string }>>([])
  const [poAutoReceive, setPoAutoReceive] = useState(false)
  const [poError, setPoError] = useState('')
  const [poSubmitting, setPoSubmitting] = useState(false)
  const [poSuccessMsg, setPoSuccessMsg] = useState('')

  // Adjust Stock Modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [adjustItem, setAdjustItem] = useState<{
    id: string
    branchId: string
    productId: string
    productName: string
    sku: string
    currentQty: number
    avgCostPaise: number
  } | null>(null)
  const [adjustType, setAdjustType] = useState<StockMovementType>('adjustment')
  const [adjustDelta, setAdjustDelta] = useState('5')
  const [adjustUnitCostRupees, setAdjustUnitCostRupees] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [adjustError, setAdjustError] = useState('')
  const [adjustSubmitting, setAdjustSubmitting] = useState(false)

  // Movements state
  const [movements, setMovements] = useState<StockMovementEntity[]>([])
  const [movementsLoading, setMovementsLoading] = useState(false)

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    action: () => Promise<void>
    confirmText: string
    variant: 'danger' | 'primary'
  } | null>(null)

  // Modal Accessibility Hooks
  const adjustModalRef = useModalA11y(isAdjustModalOpen, () => setIsAdjustModalOpen(false))
  const thresholdModalRef = useModalA11y(isThresholdModalOpen, () => setIsThresholdModalOpen(false))
  const detailDrawerRef = useModalA11y(Boolean(detailProduct), () => setDetailProduct(null))
  const transferModalRef = useModalA11y(isTransferModalOpen, () => setIsTransferModalOpen(false))
  const poModalRef = useModalA11y(isPoModalOpen, () => setIsPoModalOpen(false))
  const confirmModalRef = useModalA11y(Boolean(confirmDialog?.open), () => setConfirmDialog(null))

  // Lookup Maps
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches])

  // Filter categories dynamically
  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category))
    return ['All', ...Array.from(set)]
  }, [items])

  // Filtered and sorted inventory items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (categoryFilter !== 'All' && item.category !== categoryFilter) {
          return false
        }
        if (statusFilter !== 'All' && item.status !== statusFilter) {
          return false
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          return (
            item.productName.toLowerCase().includes(q) ||
            item.sku.toLowerCase().includes(q) ||
            item.branchName.toLowerCase().includes(q) ||
            item.barcode.toLowerCase().includes(q)
          )
        }
        return true
      })
      .sort((a, b) => {
        let diff = 0
        if (sortBy === 'quantity') {
          diff = a.quantity - b.quantity
        } else if (sortBy === 'cost') {
          const costA = a.averageCostPaise ?? a.averageCostCents ?? 0
          const costB = b.averageCostPaise ?? b.averageCostCents ?? 0
          diff = costA * a.quantity - costB * b.quantity
        } else if (sortBy === 'name') {
          diff = a.productName.localeCompare(b.productName)
        }
        return sortOrder === 'asc' ? diff : -diff
      })
  }, [items, categoryFilter, statusFilter, searchQuery, sortBy, sortOrder])

  // Aggregate stats
  const totalStockValuationPaise = useMemo(() => {
    return filteredItems.reduce(
      (sum, item) => sum + (item.averageCostPaise ?? item.averageCostCents ?? 0) * item.quantity,
      0
    )
  }, [filteredItems])

  const lowStockCount = filteredItems.filter((i) => i.status === 'low_stock').length
  const outOfStockCount = filteredItems.filter((i) => i.status === 'out_of_stock').length
  const inStockCount = filteredItems.filter((i) => i.status === 'in_stock').length

  // Load Purchase Orders
  const loadPurchases = useCallback(async () => {
    try {
      setPurchasesLoading(true)
      const list = await purchaseRepository.getAll(workspaceMode, activeBranchId)
      setPurchases(list)
    } catch (err) {
      console.error('Failed to load purchases:', err)
    } finally {
      setPurchasesLoading(false)
    }
  }, [workspaceMode, activeBranchId])

  // Load Stock Movements
  const loadMovements = useCallback(async () => {
    try {
      setMovementsLoading(true)
      const list = await stockMovementRepository.getAll(workspaceMode, {
        branchId: activeBranchId,
        limit: 100,
      })
      setMovements(list)
    } catch (err) {
      console.error('Failed to load stock movements:', err)
    } finally {
      setMovementsLoading(false)
    }
  }, [workspaceMode, activeBranchId])

  useEffect(() => {
    if (activeTab === 'purchases') {
      loadPurchases()
    } else if (activeTab === 'movements') {
      loadMovements()
    }
  }, [activeTab, loadPurchases, loadMovements, refreshKey])

  // Load movements for selected product detail drawer
  useEffect(() => {
    if (!detailProduct) {
      setProductMovements([])
      return
    }
    let cancelled = false
    setProductMovementsLoading(true)
    stockMovementRepository
      .getAll(workspaceMode, { productId: detailProduct.id, limit: 10 })
      .then((data) => {
        if (!cancelled) {
          setProductMovements(data)
          setProductMovementsLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load movements for product:', err)
        if (!cancelled) setProductMovementsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [detailProduct, workspaceMode])

  // Quick Restock action
  const handleQuickRestock = async (id: string) => {
    try {
      await quickRestock(id, 15)
      setRestockSuccessId(id)
      setTimeout(() => {
        setRestockSuccessId(null)
      }, 2000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to restock item')
    }
  }

  // Open Adjust Modal
  const handleOpenAdjust = (item: typeof items[0]) => {
    setAdjustItem({
      id: item.id,
      branchId: item.branchId,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      currentQty: item.quantity,
      avgCostPaise: item.averageCostPaise ?? item.averageCostCents ?? 0,
    })
    setAdjustDelta('5')
    setAdjustUnitCostRupees(
      paiseToRupees(item.averageCostPaise ?? item.averageCostCents ?? 0).toFixed(2)
    )
    setAdjustType('adjustment')
    setAdjustNotes('Stock count audit reconciliation')
    setAdjustError('')
    setIsAdjustModalOpen(true)
  }

  // Commit Stock Adjustment
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustItem) return
    setAdjustError('')

    const delta = parseInt(adjustDelta, 10)
    if (isNaN(delta) || delta === 0) {
      setAdjustError('Please specify a non-zero quantity delta (+ to add, - to subtract).')
      return
    }

    if (!adjustNotes.trim()) {
      setAdjustError('A detailed reason is required for all manual stock adjustments.')
      return
    }

    if (adjustItem.currentQty + delta < 0) {
      setAdjustError(`Cannot reduce stock below zero. Current on hand: ${adjustItem.currentQty} units.`)
      return
    }

    const unitCostRupees = parseFloat(adjustUnitCostRupees)
    const unitCostPaise = !isNaN(unitCostRupees) && unitCostRupees >= 0 ? rupeesToPaise(unitCostRupees) : adjustItem.avgCostPaise

    try {
      setAdjustSubmitting(true)
      await adjustStock({
        branchId: adjustItem.branchId,
        productId: adjustItem.productId,
        quantityDelta: delta,
        movementType: adjustType,
        unitCostPaise: unitCostPaise,
        notes: adjustNotes.trim(),
      })
      setIsAdjustModalOpen(false)
      setAdjustItem(null)
    } catch (err) {
      setAdjustError(err instanceof Error ? err.message : 'Failed to adjust stock.')
    } finally {
      setAdjustSubmitting(false)
    }
  }

  // Open Threshold Modal
  const handleOpenThreshold = (item: EnrichedInventoryItem) => {
    setThresholdItem(item)
    setEditReorderPoint(String(item.reorderPoint || 10))
    setEditLocationBin(item.locationBin || '')
    setIsThresholdModalOpen(true)
  }

  // Save Threshold
  const handleSaveThreshold = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!thresholdItem) return
    const reorderVal = parseInt(editReorderPoint, 10)
    if (isNaN(reorderVal) || reorderVal < 0) {
      alert('Reorder threshold must be 0 or greater.')
      return
    }
    try {
      setThresholdSubmitting(true)
      await updateReorderPoint(thresholdItem.id, reorderVal, editLocationBin.trim() || 'Standard Storage')
      setIsThresholdModalOpen(false)
      setThresholdItem(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update threshold.')
    } finally {
      setThresholdSubmitting(false)
    }
  }

  // Receive Purchase Order
  const handleReceivePo = (purchase: PurchaseEntity) => {
    setConfirmDialog({
      open: true,
      title: 'Receive Purchase Order Goods',
      message: `Receive goods for PO "${purchase.orderNumber}" from supplier "${purchase.supplierName}"? This will allocate incoming stock to the destination branch and recalculate weighted-average cost atomically.`,
      confirmText: 'Receive Goods Now',
      variant: 'primary',
      action: async () => {
        await purchaseRepository.receivePurchaseOrder(purchase.id)
        notifyDataChanged()
        loadPurchases()
        setPoSuccessMsg(`Purchase order ${purchase.orderNumber} successfully received! Stock and weighted-average costs updated.`)
        setTimeout(() => setPoSuccessMsg(''), 4000)
      },
    })
  }

  // Open Create Purchase Order Modal
  const handleOpenCreatePo = () => {
    setPoSupplier('')
    setPoSupplierPhone('')
    setPoSupplierEmail('')
    setPoSupplierRef('')
    setPoBranchId(activeBranchId === 'all' && branches[0] ? branches[0].id : activeBranchId)
    setPoOrderNumber(`PO-${Date.now().toString().slice(-6)}`)
    setPoItems(
      products.length > 0
        ? [
            {
              productId: products[0].id,
              quantity: 20,
              unitCostRupees: paiseToRupees(products[0].costPricePaise ?? products[0].costPriceCents ?? 0).toFixed(2),
            },
          ]
        : []
    )
    setPoAutoReceive(false)
    setPoError('')
    setIsPoModalOpen(true)
  }

  // Save New Purchase Order
  const handleSavePurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setPoError('')

    if (!poSupplier.trim()) {
      setPoError('Supplier name is required.')
      return
    }

    if (poItems.length === 0) {
      setPoError('Please add at least one item to this purchase order.')
      return
    }

    const branchToUse = poBranchId === 'all' || !poBranchId ? (branches[0]?.id || '') : poBranchId
    if (!branchToUse) {
      setPoError('A store branch must be selected.')
      return
    }

    for (const item of poItems) {
      if (!item.productId) {
        setPoError('All line items must have a product selected.')
        return
      }
      if (item.quantity <= 0) {
        setPoError('All line items must have a quantity greater than zero.')
        return
      }
    }

    try {
      setPoSubmitting(true)
      await purchaseRepository.create({
        workspaceId: workspaceMode,
        branchId: branchToUse,
        orderNumber: poOrderNumber.trim(),
        supplierName: poSupplier.trim(),
        supplierPhone: poSupplierPhone.trim() || undefined,
        supplierEmail: poSupplierEmail.trim() || undefined,
        supplierRef: poSupplierRef.trim() || undefined,
        autoReceive: poAutoReceive,
        items: poItems.map((i) => ({
          productId: i.productId,
          quantityOrdered: i.quantity,
          unitCostPaise: rupeesToPaise(parseFloat(i.unitCostRupees) || 0),
          unitCostCents: rupeesToPaise(parseFloat(i.unitCostRupees) || 0),
        })),
        notes: `Created via StorePoint Purchasing Manager`,
      })

      notifyDataChanged()
      loadPurchases()
      setIsPoModalOpen(false)
      setPoSuccessMsg(
        poAutoReceive
          ? 'Purchase order created and goods received atomically!'
          : 'Purchase order created in ordered status. Ready to receive goods.'
      )
      setTimeout(() => setPoSuccessMsg(''), 4000)
    } catch (err) {
      setPoError(err instanceof Error ? err.message : 'Failed to create purchase order.')
    } finally {
      setPoSubmitting(false)
    }
  }

  // Open Transfer Modal
  const handleOpenTransferModal = () => {
    const defaultSrc = activeBranchId !== 'all' ? activeBranchId : branches[0]?.id || ''
    const defaultDst = branches.find((b) => b.id !== defaultSrc)?.id || ''
    setTransferSourceBranch(defaultSrc)
    setTransferDestBranch(defaultDst)
    setTransferProductId(products[0]?.id || '')
    setTransferQuantity('10')
    setTransferRefNumber(`TRF-${Date.now().toString().slice(-8)}`)
    setTransferNotes('')
    setTransferError('')
    setIsTransferModalOpen(true)
  }

  // Source stock available for the selected product in the transfer modal
  const sourceAvailableStock = useMemo(() => {
    if (!transferSourceBranch || !transferProductId) return 0
    const inv = items.find((i) => i.branchId === transferSourceBranch && i.productId === transferProductId)
    return inv ? inv.quantity : 0
  }, [items, transferSourceBranch, transferProductId])

  // Save Transfer (as Draft)
  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setTransferError('')

    if (!transferSourceBranch) {
      setTransferError('Please select a source dispatch branch.')
      return
    }
    if (!transferDestBranch) {
      setTransferError('Please select a destination receiving branch.')
      return
    }
    if (transferSourceBranch === transferDestBranch) {
      setTransferError('Source and destination branches must be different.')
      return
    }
    if (!transferProductId) {
      setTransferError('Please select a product to transfer.')
      return
    }
    const qty = parseInt(transferQuantity, 10)
    if (isNaN(qty) || qty <= 0) {
      setTransferError('Transfer quantity must be a positive integer.')
      return
    }
    if (qty > sourceAvailableStock) {
      setTransferError(`Source branch only has ${sourceAvailableStock} units available on hand.`)
      return
    }

    try {
      setTransferSubmitting(true)
      await createTransfer({
        sourceBranchId: transferSourceBranch,
        destinationBranchId: transferDestBranch,
        productId: transferProductId,
        quantity: qty,
        referenceNumber: transferRefNumber.trim() || undefined,
        notes: transferNotes.trim() || undefined,
      })

      setTransferSuccessMsg('Transfer draft created successfully!')
      setIsTransferModalOpen(false)
      setTimeout(() => setTransferSuccessMsg(''), 3500)
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'Failed to create transfer.')
    } finally {
      setTransferSubmitting(false)
    }
  }

  // Dispatch Transfer
  const handleDispatchTransfer = (transfer: StockTransferEntity) => {
    const srcBranchName = branchMap.get(transfer.sourceBranchId)?.name || 'Source Branch'
    const prodName = productMap.get(transfer.productId)?.name || 'Product'

    setConfirmDialog({
      open: true,
      title: 'Dispatch Stock Transfer',
      message: `Dispatch ${transfer.quantity} units of "${prodName}" from ${srcBranchName}? This will immediately deduct ${transfer.quantity} units from ${srcBranchName} and log a transfer_out ledger entry.`,
      confirmText: 'Dispatch Now',
      variant: 'primary',
      action: async () => {
        await dispatchTransfer(transfer.id)
        setTransferSuccessMsg(`Transfer ${transfer.referenceNumber} dispatched! Source stock deducted.`)
        setTimeout(() => setTransferSuccessMsg(''), 3500)
      },
    })
  }

  // Receive Transfer
  const handleReceiveTransfer = (transfer: StockTransferEntity) => {
    const dstBranchName = branchMap.get(transfer.destinationBranchId)?.name || 'Destination Branch'
    const prodName = productMap.get(transfer.productId)?.name || 'Product'

    setConfirmDialog({
      open: true,
      title: 'Receive Stock Transfer',
      message: `Receive ${transfer.quantity} units of "${prodName}" at ${dstBranchName}? This will add ${transfer.quantity} units to ${dstBranchName}, calculate the weighted-average cost, and complete the transfer workflow.`,
      confirmText: 'Receive Goods',
      variant: 'primary',
      action: async () => {
        await receiveTransfer(transfer.id)
        setTransferSuccessMsg(`Transfer ${transfer.referenceNumber} received! Destination stock updated.`)
        setTimeout(() => setTransferSuccessMsg(''), 3500)
      },
    })
  }

  // Cancel Transfer
  const handleCancelTransfer = (transfer: StockTransferEntity) => {
    setConfirmDialog({
      open: true,
      title: 'Cancel Transfer Draft',
      message: `Cancel transfer draft ${transfer.referenceNumber}? No stock will be altered.`,
      confirmText: 'Cancel Transfer',
      variant: 'danger',
      action: async () => {
        await cancelTransfer(transfer.id)
        setTransferSuccessMsg(`Transfer ${transfer.referenceNumber} cancelled.`)
        setTimeout(() => setTransferSuccessMsg(''), 3500)
      },
    })
  }

  // Filtered transfers
  const filteredTransfers = useMemo(() => {
    const q = transferSearchQuery.trim().toLowerCase()
    return transfers.filter((t) => {
      if (transferStatusFilter !== 'all' && t.status !== transferStatusFilter) {
        return false
      }
      if (q) {
        const prod = productMap.get(t.productId)
        const src = branchMap.get(t.sourceBranchId)
        const dst = branchMap.get(t.destinationBranchId)
        const refMatch = t.referenceNumber.toLowerCase().includes(q)
        const prodMatch = prod?.name.toLowerCase().includes(q) || prod?.sku.toLowerCase().includes(q)
        const branchMatch = src?.name.toLowerCase().includes(q) || dst?.name.toLowerCase().includes(q)
        if (!refMatch && !prodMatch && !branchMatch) return false
      }
      return true
    })
  }, [transfers, transferStatusFilter, transferSearchQuery, productMap, branchMap])

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    const q = purchaseSearchQuery.trim().toLowerCase()
    return purchases.filter((po) => {
      if (purchaseStatusFilter !== 'all' && po.status !== purchaseStatusFilter) {
        return false
      }
      if (q) {
        const supMatch = po.supplierName.toLowerCase().includes(q)
        const orderMatch = po.orderNumber.toLowerCase().includes(q)
        const refMatch = po.supplierRef ? po.supplierRef.toLowerCase().includes(q) : false
        if (!supMatch && !orderMatch && !refMatch) return false
      }
      return true
    })
  }, [purchases, purchaseStatusFilter, purchaseSearchQuery])

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'SKU,Name,Category,Branch,Quantity,ReorderPoint,UnitCost(INR),RetailPrice(INR),Status,LocationBin\n'
    const rows = filteredItems
      .map(
        (i) =>
          `"${i.sku}","${i.productName}","${i.category}","${i.branchName}",${i.quantity},${i.reorderPoint},${paiseToRupees(i.averageCostPaise ?? i.averageCostCents ?? 0)},${paiseToRupees(i.retailPricePaise ?? i.retailPriceCents ?? 0)},"${i.status}","${i.locationBin}"`
      )
      .join('\n')

    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + headers + rows)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `storepoint_inventory_${activeBranchId}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const activeBranchName =
    activeBranchId === 'all'
      ? 'All Branches (Consolidated)'
      : branches.find((b) => b.id === activeBranchId)?.name || 'Current Branch'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Package className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
            <span>Inventory</span>
            <span className="text-navy-300">/</span>
            <span className="text-navy-700 normal-case tracking-normal">{activeBranchName}</span>
          </>
        }
        title="Stock control"
        description="On-hand quantities, transfers, purchase orders, and stock adjustments."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenTransferModal}
              leftIcon={<ArrowRightLeft className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />}
            >
              Transfer
            </Button>
            <Button
              size="sm"
              onClick={handleOpenCreatePo}
              leftIcon={<ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Purchase order
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Export
            </Button>
          </>
        }
      />

      {/* Success Notices */}
      {poSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{poSuccessMsg}</span>
        </div>
      )}
      {transferSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{transferSuccessMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiStat
          label="Items tracked"
          value={filteredItems.length}
          hint={`${inStockCount} healthy stock lines`}
        />
        <KpiStat
          label="Stock valuation"
          value={formatMoney(totalStockValuationPaise)}
          tone="brand"
          hint="At weighted average cost"
        />
        <KpiStat
          label="Low stock"
          value={lowStockCount}
          tone="warning"
          hint="At or below reorder point"
          icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
        />
        <KpiStat
          label="Out of stock"
          value={outOfStockCount}
          tone="danger"
          hint="Zero units remaining"
          icon={<XCircle className="w-3.5 h-3.5 text-red-500" />}
        />
      </div>

      <div className="sp-tabs" role="tablist" aria-label="Inventory views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'stock'}
          onClick={() => setActiveTab('stock')}
          className={cn('sp-tab', activeTab === 'stock' && 'is-active')}
        >
          <Boxes className="w-4 h-4" aria-hidden="true" />
          Stock ({items.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'transfers'}
          onClick={() => setActiveTab('transfers')}
          className={cn('sp-tab', activeTab === 'transfers' && 'is-active')}
        >
          <ArrowRightLeft className="w-4 h-4" aria-hidden="true" />
          Transfers ({transfers.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'purchases'}
          onClick={() => setActiveTab('purchases')}
          className={cn('sp-tab', activeTab === 'purchases' && 'is-active')}
        >
          <ShoppingCart className="w-4 h-4" aria-hidden="true" />
          Purchase orders
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'movements'}
          onClick={() => setActiveTab('movements')}
          className={cn('sp-tab', activeTab === 'movements' && 'is-active')}
        >
          <History className="w-4 h-4" aria-hidden="true" />
          Movement log
        </button>
      </div>

      {/* TAB 1: Stock on Hand */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <FilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search product, SKU, branch, or barcode…"
            searchLabel="Search inventory"
            footer={
              <div className="flex items-center gap-2 pt-2 border-t border-navy-100 overflow-x-auto text-xs">
                <span className="text-navy-400 text-[11px] font-semibold uppercase tracking-wider shrink-0">
                  Health
                </span>
                {(
                  [
                    ['All', `All (${items.length})`],
                    ['in_stock', `In stock (${items.filter((i) => i.status === 'in_stock').length})`],
                    ['low_stock', `Low (${items.filter((i) => i.status === 'low_stock').length})`],
                    [
                      'out_of_stock',
                      `Out (${items.filter((i) => i.status === 'out_of_stock').length})`,
                    ],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={cn(
                      'px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
                      statusFilter === value
                        ? value === 'All'
                          ? 'bg-navy-900 text-white'
                          : value === 'in_stock'
                            ? 'bg-emerald-600 text-white'
                            : value === 'low_stock'
                              ? 'bg-amber-600 text-white'
                              : 'bg-red-600 text-white'
                        : 'bg-navy-100 text-navy-600 hover:bg-navy-200'
                    )}
                  >
                    {label}
                  </button>
                ))}
                {(searchQuery || categoryFilter !== 'All' || statusFilter !== 'All') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setCategoryFilter('All')
                      setStatusFilter('All')
                    }}
                    className="ml-auto text-xs text-brand-600 hover:text-brand-800 font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    Reset
                  </button>
                )}
              </div>
            }
          >
            <FilterField
              label="Branch"
              icon={<Filter className="w-3.5 h-3.5 text-navy-400" aria-hidden="true" />}
            >
              <select
                value={activeBranchId}
                onChange={(e) => setActiveBranchId(e.target.value)}
                className="sp-control"
                aria-label="Filter inventory by branch"
              >
                <option value="all">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
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
          </FilterBar>

          <div className="sp-table-wrap shadow-card">
            <div className="overflow-x-auto">
              <table className="sp-table text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Branch</th>
                    <th className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortBy === 'quantity') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortBy('quantity')
                            setSortOrder('asc')
                          }
                        }}
                        className="flex items-center gap-1 hover:text-slate-800 font-semibold uppercase tracking-wider cursor-pointer"
                      >
                        <span>Stock on Hand</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-center">Reorder Threshold</th>
                    <th className="py-3 px-4 text-right">Avg Unit Cost (₹)</th>
                    <th className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortBy === 'cost') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortBy('cost')
                            setSortOrder('desc')
                          }
                        }}
                        className="flex items-center gap-1 justify-end ml-auto hover:text-slate-800 font-semibold uppercase tracking-wider cursor-pointer"
                      >
                        <span>Total Valuation (₹)</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-10">
                        <div className="space-y-2 px-4" aria-busy="true" aria-label="Loading inventory">
                          <div className="h-8 sp-skeleton" />
                          <div className="h-8 sp-skeleton" />
                          <div className="h-8 sp-skeleton" />
                        </div>
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-4">
                        <EmptyState
                          icon={<Package className="w-5 h-5" aria-hidden="true" />}
                          title="No inventory matches"
                          description="Try adjusting search, category, or branch filters."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const costPaise = item.averageCostPaise ?? item.averageCostCents ?? 0
                      const itemValuation = costPaise * item.quantity
                      const isRestocked = restockSuccessId === item.id

                      return (
                        <tr
                          key={item.id}
                          className={cn(
                            'focus-within:bg-brand-50/40',
                            isRestocked && 'bg-emerald-50/60'
                          )}
                        >
                          <td>
                            <button
                              type="button"
                              onClick={() => {
                                setDetailProduct({
                                  id: item.productId,
                                  name: item.productName,
                                  sku: item.sku,
                                  category: item.category,
                                  barcode: item.barcode,
                                  unit: item.unit || 'pcs',
                                  costPaise: costPaise,
                                  sellPaise: item.retailPricePaise ?? item.retailPriceCents ?? 0,
                                })
                              }}
                              className="sp-product-cell text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded"
                            >
                              <span className="sp-product-name group-hover:text-brand-700 transition-colors">
                                {item.productName}
                              </span>
                              <span className="inline-flex items-center gap-2">
                                <span className="sp-product-sku text-brand-600">{item.sku}</span>
                                <span className="text-[11px] text-navy-400">{item.category}</span>
                              </span>
                            </button>
                          </td>

                          <td>
                            <div className="font-medium text-navy-800 text-xs sm:text-sm">{item.branchName}</div>
                            <div className="sp-num text-[11px] text-navy-400">
                              Bin: {item.locationBin || 'Standard'}
                            </div>
                          </td>

                          <td>
                            <span className="sp-num font-bold text-navy-900 text-sm">
                              {item.quantity} {item.unit || 'units'}
                            </span>
                            <div className="w-24 bg-navy-100 h-1.5 rounded-full overflow-hidden mt-1.5" aria-hidden="true">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  item.status === 'out_of_stock'
                                    ? 'bg-red-500 w-0'
                                    : item.status === 'low_stock'
                                      ? 'bg-amber-500 w-1/3'
                                      : 'bg-emerald-500 w-full'
                                )}
                              />
                            </div>
                          </td>

                          <td className="text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenThreshold(item)}
                              className="inline-flex items-center gap-1 sp-num text-xs font-semibold text-navy-700 hover:text-brand-700 bg-navy-50 hover:bg-brand-50 px-2 py-1 rounded-md border border-navy-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                              aria-label={`Edit reorder threshold for ${item.productName}`}
                            >
                              <span>{item.reorderPoint}</span>
                              <Sliders className="w-3 h-3 text-navy-400" aria-hidden="true" />
                            </button>
                          </td>

                          <td className="text-right sp-num text-navy-600">{formatMoney(costPaise)}</td>
                          <td className="text-right sp-num font-bold text-navy-900">
                            {formatMoney(itemValuation)}
                          </td>

                          <td className="text-center">
                            <StatusBadge status={item.status} />
                          </td>

                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenAdjust(item)}
                                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-navy-200 hover:border-navy-300 text-navy-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                              >
                                Adjust
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickRestock(item.id)}
                                disabled={isRestocked}
                                className={cn(
                                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
                                  isRestocked
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white border border-navy-200 hover:border-brand-400 hover:text-brand-700 text-navy-700'
                                )}
                                aria-label={`Quick restock ${item.productName} by 15 units`}
                              >
                                <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{isRestocked ? 'Done' : '+15'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Branch Transfers */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
          <FilterBar
            searchValue={transferSearchQuery}
            onSearchChange={setTransferSearchQuery}
            searchPlaceholder="Search by reference, product, or branch…"
            searchLabel="Search transfers"
            footer={
              <p className="text-[11px] text-navy-600 leading-relaxed pt-1 border-t border-navy-100">
                <strong className="text-navy-800">Workflow:</strong> Draft → Dispatched (source deducted once) →
                Received (destination credited). Cancel only on drafts.
              </p>
            }
          >
            <FilterField
              label="Status"
              icon={<Filter className="w-3.5 h-3.5 text-navy-400" aria-hidden="true" />}
            >
              <select
                value={transferStatusFilter}
                onChange={(e) => setTransferStatusFilter(e.target.value)}
                className="sp-control"
                aria-label="Filter transfers by status"
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="dispatched">Dispatched</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </FilterField>
            <Button
              size="sm"
              onClick={handleOpenTransferModal}
              leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Initiate transfer
            </Button>
          </FilterBar>

          <div className="sp-table-wrap shadow-card">
            <div className="overflow-x-auto">
              <table className="sp-table text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Source</th>
                    <th>Destination</th>
                    <th>Product</th>
                    <th className="text-right">Qty</th>
                    <th className="text-center">Status</th>
                    <th>Dates</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transfersLoading ? (
                    <tr>
                      <td colSpan={8} className="py-10">
                        <div className="space-y-2 px-4" aria-busy="true">
                          <div className="h-8 sp-skeleton" />
                          <div className="h-8 sp-skeleton" />
                        </div>
                      </td>
                    </tr>
                  ) : filteredTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-4">
                        <EmptyState
                          icon={<ArrowRightLeft className="w-5 h-5" aria-hidden="true" />}
                          title="No transfers found"
                          description="Initiate a transfer to move stock between branches."
                          action={
                            <Button
                              size="sm"
                              onClick={handleOpenTransferModal}
                              leftIcon={<Plus className="w-3.5 h-3.5" />}
                            >
                              Initiate transfer
                            </Button>
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredTransfers.map((tr) => {
                      const prod = productMap.get(tr.productId)
                      const srcBranch = branchMap.get(tr.sourceBranchId)
                      const dstBranch = branchMap.get(tr.destinationBranchId)

                      return (
                        <tr key={tr.id}>
                          <td className="sp-num font-bold text-brand-600">{tr.referenceNumber}</td>
                          <td className="font-medium text-navy-800">
                            {srcBranch ? srcBranch.name : 'Unknown'}
                          </td>
                          <td className="font-medium text-navy-800">
                            {dstBranch ? dstBranch.name : 'Unknown'}
                          </td>
                          <td>
                            <div className="sp-product-cell">
                              <span className="sp-product-name">
                                {prod ? prod.name : 'Unknown product'}
                              </span>
                              <span className="sp-product-sku">{prod?.sku}</span>
                            </div>
                          </td>
                          <td className="text-right sp-num font-bold text-navy-900">
                            {tr.quantity} {prod?.unit || 'units'}
                          </td>
                          <td className="text-center">
                            <StatusBadge status={tr.status} />
                          </td>
                          <td className="text-[11px] text-navy-500">
                            <div>Created {new Date(tr.createdAt).toLocaleDateString('en-IN')}</div>
                            {tr.dispatchedAt && (
                              <div className="text-brand-600">
                                Dispatched {new Date(tr.dispatchedAt).toLocaleDateString('en-IN')}
                              </div>
                            )}
                            {tr.receivedAt && (
                              <div className="text-emerald-600">
                                Received {new Date(tr.receivedAt).toLocaleDateString('en-IN')}
                              </div>
                            )}
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {tr.status === 'draft' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleDispatchTransfer(tr)}
                                    leftIcon={<Send className="w-3 h-3" aria-hidden="true" />}
                                  >
                                    Dispatch
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCancelTransfer(tr)}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              )}
                              {tr.status === 'dispatched' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleReceiveTransfer(tr)}
                                  leftIcon={<Check className="w-3 h-3" aria-hidden="true" />}
                                  className="!bg-emerald-600 hover:!bg-emerald-700"
                                >
                                  Receive
                                </Button>
                              )}
                              {tr.status === 'received' && (
                                <span className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                  Done
                                </span>
                              )}
                              {tr.status === 'cancelled' && (
                                <span className="text-xs text-navy-400 font-medium">Cancelled</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Purchase Orders */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <FilterBar
            searchValue={purchaseSearchQuery}
            onSearchChange={setPurchaseSearchQuery}
            searchPlaceholder="Search by supplier, order #, or reference…"
            searchLabel="Search purchase orders"
          >
            <FilterField
              label="Status"
              icon={<Filter className="w-3.5 h-3.5 text-navy-400" aria-hidden="true" />}
            >
              <select
                value={purchaseStatusFilter}
                onChange={(e) => setPurchaseStatusFilter(e.target.value)}
                className="sp-control"
                aria-label="Filter purchase orders by status"
              >
                <option value="all">All statuses</option>
                <option value="ordered">Ordered</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </FilterField>
            <Button
              size="sm"
              onClick={handleOpenCreatePo}
              leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Create PO
            </Button>
          </FilterBar>

          <div className="sp-table-wrap shadow-card">
            <div className="overflow-x-auto">
              <table className="sp-table text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th>PO number</th>
                    <th>Supplier</th>
                    <th>Branch</th>
                    <th>Ordered</th>
                    <th className="text-right">Total cost</th>
                    <th className="text-center">Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchasesLoading ? (
                    <tr>
                      <td colSpan={7} className="py-10">
                        <div className="space-y-2 px-4" aria-busy="true">
                          <div className="h-8 sp-skeleton" />
                          <div className="h-8 sp-skeleton" />
                        </div>
                      </td>
                    </tr>
                  ) : filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4">
                        <EmptyState
                          icon={<ShoppingCart className="w-5 h-5" aria-hidden="true" />}
                          title="No purchase orders"
                          description="Create a PO to procure inventory from suppliers."
                          action={
                            <Button
                              size="sm"
                              onClick={handleOpenCreatePo}
                              leftIcon={<Plus className="w-3.5 h-3.5" />}
                            >
                              Create PO
                            </Button>
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((po) => {
                      const branch = branchMap.get(po.branchId)
                      const totalCost = po.totalCostPaise ?? po.totalCostCents ?? 0

                      return (
                        <tr key={po.id}>
                          <td className="sp-num font-bold text-brand-600">{po.orderNumber}</td>
                          <td>
                            <div className="font-semibold text-navy-900">{po.supplierName}</div>
                            <div className="text-[11px] text-navy-500 flex flex-wrap gap-2 mt-0.5">
                              {po.supplierPhone && <span>{po.supplierPhone}</span>}
                              {po.supplierEmail && <span>{po.supplierEmail}</span>}
                              {po.supplierRef && <span>Ref {po.supplierRef}</span>}
                            </div>
                          </td>
                          <td className="text-navy-700">{branch ? branch.name : 'Unknown'}</td>
                          <td className="text-navy-500 text-xs">
                            {new Date(po.orderedAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="text-right sp-num font-bold text-navy-900">
                            {formatMoney(totalCost)}
                          </td>
                          <td className="text-center">
                            <StatusBadge status={po.status} />
                          </td>
                          <td className="text-right">
                            {po.status === 'ordered' && (
                              <Button
                                size="sm"
                                onClick={() => handleReceivePo(po)}
                                leftIcon={<Check className="w-3 h-3" aria-hidden="true" />}
                              >
                                Receive goods
                              </Button>
                            )}
                            {po.status === 'received' && (
                              <span className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1 justify-end">
                                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                In stock
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Stock Movement Audit Log */}
      {activeTab === 'movements' && (
        <div className="sp-table-wrap shadow-card overflow-hidden">
          <div className="p-4 border-b border-navy-200 bg-navy-50/60">
            <h2 className="font-semibold text-navy-900 text-sm">Stock movement log</h2>
            <p className="text-xs text-navy-500 mt-0.5">
              Sales, receipts, adjustments, write-offs, and transfers — append-only audit trail.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="sp-table text-xs sm:text-sm">
              <thead>
                <tr>
                  <th>Date & time</th>
                  <th>Product</th>
                  <th>Branch</th>
                  <th>Type</th>
                  <th className="text-right">Delta</th>
                  <th className="text-right">Balance</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {movementsLoading ? (
                  <tr>
                    <td colSpan={7} className="py-10">
                      <div className="space-y-2 px-4" aria-busy="true">
                        <div className="h-8 sp-skeleton" />
                        <div className="h-8 sp-skeleton" />
                      </div>
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4">
                      <EmptyState
                        icon={<History className="w-5 h-5" aria-hidden="true" />}
                        title="No movements yet"
                        description="Stock activity will appear here as you sell, receive, adjust, or transfer inventory."
                      />
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const prod = productMap.get(m.productId)
                    const branch = branchMap.get(m.branchId)
                    const typeLabel = m.type.replace(/_/g, ' ')

                    return (
                      <tr key={m.id}>
                        <td className="sp-num text-[11px] text-navy-500 whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString('en-IN')}
                        </td>
                        <td>
                          <div className="sp-product-cell">
                            <span className="sp-product-name">
                              {prod ? prod.name : 'Unknown product'}
                            </span>
                            <span className="sp-product-sku text-brand-600">{prod?.sku}</span>
                          </div>
                        </td>
                        <td className="text-navy-700">{branch ? branch.name : 'Unknown'}</td>
                        <td>
                          <Badge
                            tone={
                              m.type === 'sale' || m.type === 'write_off' || m.type === 'transfer_out'
                                ? 'danger'
                                : m.type === 'purchase_received' ||
                                    m.type === 'transfer_in' ||
                                    m.type === 'opening_stock'
                                  ? 'success'
                                  : m.type === 'adjustment'
                                    ? 'brand'
                                    : 'neutral'
                            }
                          >
                            {typeLabel}
                          </Badge>
                        </td>
                        <td className="text-right sp-num font-bold">
                          <span className={m.quantityDelta > 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                          </span>
                        </td>
                        <td className="text-right sp-num font-bold text-navy-900">
                          {m.resultingQuantity}
                        </td>
                        <td className="text-xs text-navy-500 max-w-[14rem] truncate">
                          {m.notes || m.referenceId || '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/55">
          <div
            ref={adjustModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="adjust-stock-title"
            className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-navy-200 overflow-hidden"
          >
            <DialogHeader
              titleId="adjust-stock-title"
              title="Adjust stock"
              description={`${adjustItem.productName} · ${adjustItem.sku}`}
              icon={<Sliders className="w-4 h-4" aria-hidden="true" />}
              onClose={() => setIsAdjustModalOpen(false)}
            />

            <form onSubmit={handleSaveAdjustment} className="p-5 space-y-4 text-xs sm:text-sm">
              {adjustError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{adjustError}</span>
                </div>
              )}

              {/* Current on Hand & Preview Result */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-sans font-semibold">Current Stock</span>
                  <span className="text-base font-bold text-slate-800">{adjustItem.currentQty}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-sans font-semibold">Adjustment Delta</span>
                  <span className={cn('text-base font-bold', parseInt(adjustDelta, 10) >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    {parseInt(adjustDelta, 10) >= 0 ? `+${adjustDelta}` : adjustDelta}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-sans font-semibold">Resulting Stock</span>
                  <span className={cn(
                    'text-base font-bold',
                    adjustItem.currentQty + (parseInt(adjustDelta, 10) || 0) < 0 ? 'text-rose-600' : 'text-blue-700'
                  )}>
                    {adjustItem.currentQty + (parseInt(adjustDelta, 10) || 0)}
                  </span>
                </div>
              </div>

              {/* Movement Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Movement Reason Type *
                </label>
                <select
                  value={adjustType}
                  onChange={(e) => {
                    const next = e.target.value as StockMovementType
                    setAdjustType(next)
                    if (next === 'write_off' && parseInt(adjustDelta, 10) > 0) {
                      setAdjustDelta(String(-Math.abs(parseInt(adjustDelta, 10) || 1)))
                    }
                  }}
                  className="sp-control w-full"
                >
                  <option value="adjustment">Cycle count / audit</option>
                  <option value="write_off">Write-off (damage / expiry / scrap)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">
                    Quantity delta *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(e.target.value)}
                    placeholder="e.g. +5 or -2"
                    className="sp-control w-full sp-num"
                  />
                  <span className="text-[10px] text-navy-400 mt-1 block">Positive adds; negative reduces.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">
                    Unit cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjustUnitCostRupees}
                    onChange={(e) => setAdjustUnitCostRupees(e.target.value)}
                    placeholder="0.00"
                    className="sp-control w-full sp-num"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">
                  Audit reason *
                </label>
                <textarea
                  rows={2}
                  required
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Required audit reason"
                  className="sp-control w-full min-h-[4.5rem]"
                />
              </div>

              <DialogFooter className="!px-0 !pb-0 -mx-5 -mb-5 mt-1">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsAdjustModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  disabled={adjustSubmitting || adjustItem.currentQty + (parseInt(adjustDelta, 10) || 0) < 0}
                >
                  {adjustSubmitting ? 'Recording…' : 'Apply adjustment'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      )}

      {/* Configure Threshold Modal */}
      {isThresholdModalOpen && thresholdItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/55">
          <div
            ref={thresholdModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="threshold-modal-title"
            className="bg-white rounded-2xl max-w-sm w-full shadow-xl border border-navy-200 overflow-hidden"
          >
            <DialogHeader
              titleId="threshold-modal-title"
              title="Reorder threshold"
              description={`${thresholdItem.productName} · ${thresholdItem.branchName}`}
              icon={<Sliders className="w-4 h-4" aria-hidden="true" />}
              onClose={() => setIsThresholdModalOpen(false)}
            />

            <form onSubmit={handleSaveThreshold} className="p-5 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1" htmlFor="reorder-level">
                  Reorder level (min units) *
                </label>
                <input
                  id="reorder-level"
                  type="number"
                  min="0"
                  required
                  value={editReorderPoint}
                  onChange={(e) => setEditReorderPoint(e.target.value)}
                  className="sp-control w-full sp-num"
                />
                <span className="text-[11px] text-navy-400 mt-1 block">
                  Low-stock alert when quantity is at or below this level.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1" htmlFor="storage-bin">
                  Storage bin / shelf
                </label>
                <input
                  id="storage-bin"
                  type="text"
                  value={editLocationBin}
                  onChange={(e) => setEditLocationBin(e.target.value)}
                  placeholder="e.g. Aisle 3 · Bin 14B"
                  className="sp-control w-full"
                />
              </div>

              <DialogFooter className="!px-0 !pb-0 -mx-5 -mb-5 mt-1">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsThresholdModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={thresholdSubmitting}>
                  {thresholdSubmitting ? 'Saving…' : 'Save threshold'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      )}

      {/* Product Detail Drawer */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/55">
          <div
            ref={detailDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-drawer-title"
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-navy-200 overflow-hidden z-10 max-h-[90vh] flex flex-col"
          >
            <DialogHeader
              titleId="detail-drawer-title"
              title="Stock & movements"
              description={detailProduct.name}
              icon={<Boxes className="w-4 h-4" aria-hidden="true" />}
              onClose={() => setDetailProduct(null)}
            />

            <div className="p-5 overflow-y-auto space-y-5 text-xs sm:text-sm">
              <div>
                <Badge tone="info" className="sp-num">{detailProduct.sku}</Badge>
                <h2 className="text-lg font-bold text-navy-900 mt-1">{detailProduct.name}</h2>
                <span className="text-navy-500 text-xs">
                  {detailProduct.category} · Barcode: {detailProduct.barcode || '—'}
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-navy-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
                  <span>Stock by branch</span>
                </h4>
                <div className="sp-table-wrap overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="sp-table text-xs">
                      <thead>
                        <tr>
                          <th>Branch</th>
                          <th>Bin</th>
                          <th className="text-right">Qty</th>
                          <th className="text-right">Avg cost</th>
                          <th className="text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.filter((i) => i.productId === detailProduct.id).map((branchItem) => (
                          <tr key={branchItem.id}>
                            <td className="font-medium text-navy-800">{branchItem.branchName}</td>
                            <td className="text-navy-500">{branchItem.locationBin || '—'}</td>
                            <td className="text-right sp-num font-bold">{branchItem.quantity}</td>
                            <td className="text-right sp-num">
                              {formatMoney(branchItem.averageCostPaise ?? branchItem.averageCostCents ?? 0)}
                            </td>
                            <td className="text-center">
                              <StatusBadge status={branchItem.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Recent Movements */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-blue-600" />
                  <span>Recent Stock Movements</span>
                </h4>
                {productMovementsLoading ? (
                  <div className="py-4 text-center text-slate-400 font-mono text-xs">Loading movements...</div>
                ) : productMovements.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-lg text-center text-slate-400 text-xs">No movements recorded.</div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {productMovements.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'font-bold text-[10px] px-1.5 py-0.5 rounded uppercase',
                              m.quantityDelta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            )}>
                              {m.type.replace('_', ' ')}
                            </span>
                            <span className="text-slate-600 font-medium">{m.notes || 'Routine movement'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{new Date(m.createdAt).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-right font-mono">
                          <span className={cn('font-bold', m.quantityDelta > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                            {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                          </span>
                          <span className="text-slate-400 text-[10px] block">Bal: {m.resultingQuantity}</span>
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

      {/* Initiate Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/55">
          <div
            ref={transferModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="transfer-modal-title"
            className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-navy-200 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <DialogHeader
              titleId="transfer-modal-title"
              title="Stock transfer"
              description="Draft a cross-branch move. Stock deducts only on dispatch."
              icon={<ArrowRightLeft className="w-4 h-4" aria-hidden="true" />}
              onClose={() => setIsTransferModalOpen(false)}
            />

            <form onSubmit={handleSaveTransfer} className="p-5 space-y-4 text-xs sm:text-sm">
              {transferError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{transferError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Source branch *</label>
                  <select
                    value={transferSourceBranch}
                    onChange={(e) => setTransferSourceBranch(e.target.value)}
                    className="sp-control w-full"
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Destination *</label>
                  <select
                    value={transferDestBranch}
                    onChange={(e) => setTransferDestBranch(e.target.value)}
                    className="sp-control w-full"
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Product *</label>
                <select
                  value={transferProductId}
                  onChange={(e) => setTransferProductId(e.target.value)}
                  className="sp-control w-full"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
                <div className="mt-1 flex items-center justify-between text-[11px] text-navy-500">
                  <span>On hand at source</span>
                  <strong className={cn('sp-num', sourceAvailableStock > 0 ? 'text-navy-800' : 'text-red-600')}>
                    {sourceAvailableStock} units
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    max={sourceAvailableStock || undefined}
                    required
                    value={transferQuantity}
                    onChange={(e) => setTransferQuantity(e.target.value)}
                    placeholder="10"
                    className="sp-control w-full sp-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Reference #</label>
                  <input
                    type="text"
                    value={transferRefNumber}
                    onChange={(e) => setTransferRefNumber(e.target.value)}
                    placeholder="Auto-generated"
                    className="sp-control w-full sp-num uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Inter-store balancing"
                  className="sp-control w-full"
                />
              </div>

              <p className="p-3 bg-brand-50 rounded-lg text-[11px] text-brand-900 leading-relaxed border border-brand-100">
                Saves as <strong>Draft</strong>. Stock is deducted only when you click Dispatch.
              </p>

              <DialogFooter className="!px-0 !pb-0 -mx-5 -mb-5 mt-1">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsTransferModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={transferSubmitting || sourceAvailableStock <= 0}>
                  {transferSubmitting ? 'Creating…' : 'Create draft'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      )}

      {/* Create Purchase Order Modal */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/55">
          <div
            ref={poModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="po-modal-title"
            className="bg-white rounded-2xl max-w-xl w-full shadow-xl border border-navy-200 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <DialogHeader
              titleId="po-modal-title"
              title="Purchase order"
              description="Order stock from a supplier into a receiving branch."
              icon={<ShoppingCart className="w-4 h-4" aria-hidden="true" />}
              onClose={() => setIsPoModalOpen(false)}
            />

            <form onSubmit={handleSavePurchaseOrder} className="p-5 space-y-4 text-xs sm:text-sm">
              {poError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{poError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">PO number *</label>
                  <input
                    type="text"
                    value={poOrderNumber}
                    onChange={(e) => setPoOrderNumber(e.target.value)}
                    className="sp-control w-full sp-num"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Supplier *</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Hardware"
                    value={poSupplier}
                    onChange={(e) => setPoSupplier(e.target.value)}
                    className="sp-control w-full"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 …"
                    value={poSupplierPhone}
                    onChange={(e) => setPoSupplierPhone(e.target.value)}
                    className="sp-control w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="orders@…"
                    value={poSupplierEmail}
                    onChange={(e) => setPoSupplierEmail(e.target.value)}
                    className="sp-control w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Invoice ref</label>
                  <input
                    type="text"
                    placeholder="INV-…"
                    value={poSupplierRef}
                    onChange={(e) => setPoSupplierRef(e.target.value)}
                    className="sp-control w-full sp-num"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Receiving branch *</label>
                <select
                  value={poBranchId}
                  onChange={(e) => setPoBranchId(e.target.value)}
                  className="sp-control w-full"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-navy-700">
                  <span>Line items</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (products[0]) {
                        setPoItems([
                          ...poItems,
                          {
                            productId: products[0].id,
                            quantity: 10,
                            unitCostRupees: paiseToRupees(products[0].costPricePaise ?? products[0].costPriceCents ?? 0).toFixed(2),
                          },
                        ])
                      }
                    }}
                    className="text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded"
                  >
                    <Plus className="w-3 h-3" aria-hidden="true" />
                    <span>Add product</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {poItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-navy-50/60 p-2 rounded-lg border border-navy-200"
                    >
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const newProd = productMap.get(e.target.value)
                          const updated = [...poItems]
                          updated[idx].productId = e.target.value
                          if (newProd) {
                            updated[idx].unitCostRupees = paiseToRupees(
                              newProd.costPricePaise ?? newProd.costPriceCents ?? 0
                            ).toFixed(2)
                          }
                          setPoItems(updated)
                        }}
                        className="sp-control flex-1 min-w-[8rem] !py-1.5"
                        aria-label={`Line ${idx + 1} product`}
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...poItems]
                          updated[idx].quantity = Math.max(1, parseInt(e.target.value, 10) || 1)
                          setPoItems(updated)
                        }}
                        className="sp-control w-16 !py-1.5 text-right sp-num"
                        aria-label={`Line ${idx + 1} quantity`}
                      />

                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-navy-400 text-xs">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Cost"
                          value={item.unitCostRupees}
                          onChange={(e) => {
                            const updated = [...poItems]
                            updated[idx].unitCostRupees = e.target.value
                            setPoItems(updated)
                          }}
                          className="sp-control w-full !py-1.5 pl-5 text-right sp-num"
                          aria-label={`Line ${idx + 1} unit cost`}
                        />
                      </div>

                      {poItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                          className="text-navy-400 hover:text-red-600 p-1 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                          aria-label={`Remove line ${idx + 1}`}
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-navy-100 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="po-auto-receive"
                  checked={poAutoReceive}
                  onChange={(e) => setPoAutoReceive(e.target.checked)}
                  className="rounded border-navy-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <label htmlFor="po-auto-receive" className="text-xs text-navy-700 cursor-pointer font-medium">
                  Auto-receive now (updates on-hand and weighted-average cost)
                </label>
              </div>

              <DialogFooter className="!px-0 !pb-0 -mx-5 -mb-5 mt-1">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsPoModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={poSubmitting}>
                  {poSubmitting
                    ? 'Creating…'
                    : poAutoReceive
                      ? 'Create & receive'
                      : 'Create purchase order'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/55">
          <div
            ref={confirmModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-navy-200 overflow-hidden z-10"
          >
            <DialogHeader
              titleId="confirm-modal-title"
              title={confirmDialog.title}
              icon={<AlertTriangle className="w-4 h-4" aria-hidden="true" />}
              onClose={() => setConfirmDialog(null)}
            />
            <div className="p-5 space-y-4">
              <p className="text-xs sm:text-sm text-navy-600 leading-relaxed">{confirmDialog.message}</p>
              <DialogFooter className="!px-0 !pb-0 -mx-5 -mb-5">
                <Button variant="outline" size="sm" type="button" onClick={() => setConfirmDialog(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant={confirmDialog.variant === 'danger' ? 'danger' : 'primary'}
                  onClick={async () => {
                    try {
                      await confirmDialog.action()
                      setConfirmDialog(null)
                    } catch (err) {
                      alert(err instanceof Error ? err.message : 'Action failed.')
                    }
                  }}
                >
                  {confirmDialog.confirmText}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
