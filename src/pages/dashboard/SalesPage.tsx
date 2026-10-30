import { useState, useMemo, useRef } from 'react'
import {
  ShoppingCart,
  Plus,
  CreditCard,
  Download,
  CheckCircle2,
  Receipt,
  X,
  Layers,
  Sparkles,
  AlertTriangle,
  Trash2,
  RotateCcw,
  Info,
  Eye,
  Barcode,
  Calendar,
} from 'lucide-react'
import { useSales, type EnrichedSale } from '@/hooks/useSales'
import { useBranches } from '@/hooks/useBranches'
import { useProducts } from '@/hooks/useProducts'
import { useInventory } from '@/hooks/useInventory'
import { useWorkspace } from '@/context/WorkspaceContext'
import { formatMoney, rupeesToPaise, paiseToRupees } from '@/utils/money'
import type { PaymentMethod, SaleLineItemEntity, SaleReturnEntity } from '@/types/database'
import { cn } from '@/utils/cn'
import { useModalA11y } from '@/hooks/useModalA11y'
import {
  PageHeader,
  Button,
  KpiStat,
  FilterBar,
  FilterField,
  StatusBadge,
  EmptyState,
} from '@/components/ui'

interface CartItem {
  productId: string
  productName: string
  sku: string
  barcode?: string
  quantity: number
  unitPricePaise: number
  lineDiscountPaise: number
  availableStock: number
}

interface ReturnLineItemState {
  productId: string
  productName: string
  sku: string
  purchasedQty: number
  alreadyReturnedQty: number
  remainingReturnableQty: number
  effectiveUnitPricePaise: number
  returnQty: number
  selected: boolean
}

export function SalesPage() {
  const { workspaceMode, activeBranchId, setActiveBranchId } = useWorkspace()
  const { branches } = useBranches()
  const { products } = useProducts()
  const { items: inventoryItems } = useInventory(activeBranchId)
  const { sales, loading, createSale, refundSale, getLineItems, getReturns } = useSales(activeBranchId)

  // Ledger Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')

  // Transaction Details Modal State
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<EnrichedSale | null>(null)
  const detailsModalRef = useRef<HTMLDivElement>(null)
  const [detailsLineItems, setDetailsLineItems] = useState<SaleLineItemEntity[]>([])
  const [detailsReturns, setDetailsReturns] = useState<SaleReturnEntity[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  // POS Modal State for New Sale
  const [isModalOpen, setIsModalOpen] = useState(false)
  const posModalRef = useRef<HTMLDivElement>(null)
  const [modalBranchId, setModalBranchId] = useState(branches[0]?.id || '')
  const [productSearchInput, setProductSearchInput] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantityInput, setQuantityInput] = useState('1')
  const [customPriceInput, setCustomPriceInput] = useState('')
  const [lineDiscountRupeesInput, setLineDiscountRupeesInput] = useState('0')
  const [orderDiscountRupeesInput, setOrderDiscountRupeesInput] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI')
  const [taxRateInput, setTaxRateInput] = useState('0')
  const [orderNotes, setOrderNotes] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [modalSuccessMsg, setModalSuccessMsg] = useState('')
  const [modalErrorMsg, setModalErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Refund Modal State
  const [refundSaleId, setRefundSaleId] = useState<string | null>(null)
  const refundModalRef = useRef<HTMLDivElement>(null)
  const [activeSaleForRefund, setActiveSaleForRefund] = useState<EnrichedSale | null>(null)
  const [refundReason, setRefundReason] = useState('Customer Return')
  const [refundRestock, setRefundRestock] = useState(true)
  const [refundLines, setRefundLines] = useState<ReturnLineItemState[]>([])
  const [alreadyRefundedTotalPaise, setAlreadyRefundedTotalPaise] = useState(0)
  const [loadingLines, setLoadingLines] = useState(false)
  const [refundError, setRefundError] = useState('')
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false)

  // Accessible Modal Keyboard & Focus Handlers
  useModalA11y({
    isOpen: isModalOpen,
    onClose: () => setIsModalOpen(false),
    containerRef: posModalRef,
  })

  useModalA11y({
    isOpen: selectedSaleForDetails !== null,
    onClose: () => setSelectedSaleForDetails(null),
    containerRef: detailsModalRef,
  })

  useModalA11y({
    isOpen: refundSaleId !== null,
    onClose: () => {
      setRefundSaleId(null)
      setActiveSaleForRefund(null)
      setRefundError('')
    },
    containerRef: refundModalRef,
  })

  // Filtered orders
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      if (paymentFilter !== 'All' && sale.paymentMethod !== paymentFilter) {
        return false
      }
      if (statusFilter !== 'All' && sale.status !== statusFilter) {
        return false
      }
      if (startDateFilter) {
        const saleDate = sale.createdAt.slice(0, 10)
        if (saleDate < startDateFilter) return false
      }
      if (endDateFilter) {
        const saleDate = sale.createdAt.slice(0, 10)
        if (saleDate > endDateFilter) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          sale.receiptNumber.toLowerCase().includes(q) ||
          sale.branchName.toLowerCase().includes(q) ||
          (sale.notes && sale.notes.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [sales, paymentFilter, statusFilter, startDateFilter, endDateFilter, searchQuery])

  // Financial aggregates (using canonical paise)
  const totalGrossPaise = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      if (s.status !== 'cancelled') {
        return acc + (s.subtotalPaise ?? s.subtotalCents ?? 0)
      }
      return acc
    }, 0)
  }, [filteredSales])

  const totalDiscountsPaise = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      if (s.status !== 'cancelled') {
        return acc + (s.discountPaise ?? s.discountCents ?? 0)
      }
      return acc
    }, 0)
  }, [filteredSales])

  const totalNetSalesPaise = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      if (s.status === 'completed' || s.status === 'partial_return' || s.status === 'refunded') {
        return acc + (s.totalPaise ?? s.totalCents ?? 0)
      }
      return acc
    }, 0)
  }, [filteredSales])

  const totalNetProfitPaise = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      if (s.status === 'completed' || s.status === 'partial_return') {
        return acc + (s.netProfitPaise ?? s.netProfitCents ?? 0)
      }
      return acc
    }, 0)
  }, [filteredSales])

  const averageOrderPaise = useMemo(() => {
    const validCount = filteredSales.filter((s) => s.status === 'completed' || s.status === 'partial_return').length
    return validCount > 0 ? Math.round(totalNetSalesPaise / validCount) : 0
  }, [filteredSales, totalNetSalesPaise])

  // Product search results for POS
  const filteredProductsForPOS = useMemo(() => {
    if (!productSearchInput.trim()) return products.slice(0, 15)
    const q = productSearchInput.toLowerCase().trim()
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      )
      .slice(0, 20)
  }, [products, productSearchInput])

  // Current selected product for POS
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || filteredProductsForPOS[0] || null
  }, [products, selectedProductId, filteredProductsForPOS])

  // Check branch inventory stock for currently selected product
  const availableStockForSelected = useMemo((): number => {
    if (!selectedProduct || !modalBranchId) return 0
    const inv = inventoryItems.find(
      (i) => i.productId === selectedProduct.id && (i.branchId === modalBranchId || activeBranchId === 'all')
    )
    return inv ? (inv.quantityOnHand ?? inv.quantity ?? 0) : 0
  }, [inventoryItems, selectedProduct, modalBranchId, activeBranchId])

  // Cart calculations
  const cartGrossSubtotalPaise = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity * item.unitPricePaise, 0)
  }, [cartItems])

  const cartLineDiscountsPaise = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.lineDiscountPaise, 0)
  }, [cartItems])

  const cartNetSubtotalPaise = useMemo(() => {
    return Math.max(0, cartGrossSubtotalPaise - cartLineDiscountsPaise)
  }, [cartGrossSubtotalPaise, cartLineDiscountsPaise])

  const orderDiscountPaise = useMemo(() => {
    const val = parseFloat(orderDiscountRupeesInput) || 0
    return Math.min(cartNetSubtotalPaise, rupeesToPaise(val))
  }, [orderDiscountRupeesInput, cartNetSubtotalPaise])

  const taxPaise = useMemo(() => {
    const rate = parseFloat(taxRateInput) || 0
    const taxableAmount = Math.max(0, cartNetSubtotalPaise - orderDiscountPaise)
    return Math.round(taxableAmount * (rate / 100))
  }, [taxRateInput, cartNetSubtotalPaise, orderDiscountPaise])

  const cartTotalPayablePaise = useMemo(() => {
    return Math.max(0, cartNetSubtotalPaise - orderDiscountPaise) + taxPaise
  }, [cartNetSubtotalPaise, orderDiscountPaise, taxPaise])

  // Add Item to Cart
  const handleAddToCart = (productToAdd = selectedProduct) => {
    setModalErrorMsg('')
    if (!productToAdd) {
      setModalErrorMsg('Please select a valid product from the catalog.')
      return
    }

    const qty = parseInt(quantityInput, 10)
    if (isNaN(qty) || qty <= 0) {
      setModalErrorMsg('Please enter a valid quantity greater than 0.')
      return
    }

    const catalogPrice = productToAdd.sellingPricePaise ?? productToAdd.sellingPriceCents ?? 0
    const unitPricePaise = customPriceInput ? rupeesToPaise(parseFloat(customPriceInput) || 0) : catalogPrice

    if (unitPricePaise < 0) {
      setModalErrorMsg('Unit selling price cannot be negative.')
      return
    }

    const parsedLineDiscountRupees = parseFloat(lineDiscountRupeesInput) || 0
    const lineDiscountPaise = rupeesToPaise(parsedLineDiscountRupees)
    const grossLineTotal = qty * unitPricePaise
    if (lineDiscountPaise < 0) {
      setModalErrorMsg('Line discount cannot be negative.')
      return
    }
    if (lineDiscountPaise > grossLineTotal) {
      setModalErrorMsg(
        `Line discount (₹${parsedLineDiscountRupees.toFixed(2)}) cannot exceed line total (₹${(grossLineTotal / 100).toFixed(2)}).`
      )
      return
    }

    // Check branch inventory stock
    const inv = inventoryItems.find(
      (i) => i.productId === productToAdd.id && (i.branchId === modalBranchId || activeBranchId === 'all')
    )
    const stockAvailable = inv ? (inv.quantityOnHand ?? inv.quantity ?? 0) : 0

    const existingIndex = cartItems.findIndex((i) => i.productId === productToAdd.id)
    const currentCartQty = existingIndex >= 0 ? cartItems[existingIndex].quantity : 0
    const totalDesiredQty = currentCartQty + qty

    if (totalDesiredQty > stockAvailable) {
      setModalErrorMsg(
        `Insufficient stock for "${productToAdd.name}". Available on hand: ${stockAvailable} units (Cart already has ${currentCartQty}).`
      )
      return
    }

    if (existingIndex >= 0) {
      setCartItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex
            ? {
                ...item,
                quantity: totalDesiredQty,
                unitPricePaise,
                lineDiscountPaise: item.lineDiscountPaise + lineDiscountPaise,
              }
            : item
        )
      )
    } else {
      setCartItems((prev) => [
        ...prev,
        {
          productId: productToAdd.id,
          productName: productToAdd.name,
          sku: productToAdd.sku,
          barcode: productToAdd.barcode,
          quantity: qty,
          unitPricePaise,
          lineDiscountPaise,
          availableStock: stockAvailable,
        },
      ])
    }

    // Reset line input controls
    setQuantityInput('1')
    setCustomPriceInput('')
    setLineDiscountRupeesInput('0')
    setProductSearchInput('')
  }

  // Update item quantity inline in cart
  const handleUpdateCartQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveFromCart(productId)
      return
    }
    const item = cartItems.find((i) => i.productId === productId)
    if (!item) return

    if (newQty > item.availableStock) {
      setModalErrorMsg(`Cannot increase quantity above on-hand stock (${item.availableStock} units).`)
      return
    }

    setCartItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: newQty } : i))
    )
  }

  // Update line discount inline in cart
  const handleUpdateCartLineDiscount = (productId: string, discountRupees: number) => {
    setCartItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i
        const discountPaise = rupeesToPaise(Math.max(0, discountRupees))
        const gross = i.quantity * i.unitPricePaise
        return {
          ...i,
          lineDiscountPaise: Math.min(gross, discountPaise),
        }
      })
    )
  }

  // Remove Item from Cart
  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  // Submit New Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setModalErrorMsg('')
    setModalSuccessMsg('')

    const branch = modalBranchId || branches[0]?.id
    if (!branch) {
      setModalErrorMsg('Please select a valid store branch.')
      return
    }

    if (cartItems.length === 0) {
      setModalErrorMsg('Please add at least one line item to the cart before committing the sale.')
      return
    }

    // Pre-validate stock for all items
    for (const item of cartItems) {
      if (item.quantity > item.availableStock) {
        setModalErrorMsg(
          `Cannot checkout: stock for "${item.productName}" is only ${item.availableStock} units, but cart has ${item.quantity}.`
        )
        return
      }
    }

    setIsSubmitting(true)
    try {
      const receiptNum = `REC-2026-${Date.now().toString().slice(-6)}`
      const res = await createSale({
        branchId: branch,
        receiptNumber: receiptNum,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          sellingPricePaise: item.unitPricePaise,
          sellingPriceCents: item.unitPricePaise,
          discountPaise: item.lineDiscountPaise,
          discountCents: item.lineDiscountPaise,
        })),
        paymentMethod,
        taxPaise,
        taxCents: taxPaise,
        discountPaise: orderDiscountPaise,
        discountCents: orderDiscountPaise,
        notes: orderNotes.trim() || 'StorePoint POS Terminal Transaction',
      })

      setModalSuccessMsg(`Receipt ${res.sale.receiptNumber} successfully authorized and committed to ledger!`)
      setTimeout(() => {
        setModalSuccessMsg('')
        setIsModalOpen(false)
        setCartItems([])
        setOrderNotes('')
        setOrderDiscountRupeesInput('0')
        setIsSubmitting(false)
      }, 1000)
    } catch (err) {
      setModalErrorMsg(err instanceof Error ? err.message : 'Transaction failed.')
      setIsSubmitting(false)
    }
  }

  // Open Refund Modal and fetch existing line items and prior return audit trail
  const handleOpenRefundModal = async (saleId: string) => {
    const sale = sales.find((s) => s.id === saleId)
    setActiveSaleForRefund(sale || null)
    setRefundSaleId(saleId)
    setRefundReason('Customer Return')
    setRefundRestock(true)
    setRefundError('')
    setLoadingLines(true)

    try {
      const [items, existingReturns] = await Promise.all([
        getLineItems(saleId),
        getReturns(saleId),
      ])

      // Cumulative returned quantity per product
      const returnedQtyMap = new Map<string, number>()
      let refundedSoFar = 0
      for (const ret of existingReturns) {
        refundedSoFar += ret.refundAmountPaise ?? ret.refundAmountCents ?? 0
        if (ret.returnedItems) {
          for (const ri of ret.returnedItems) {
            returnedQtyMap.set(ri.productId, (returnedQtyMap.get(ri.productId) || 0) + ri.quantity)
          }
        }
      }
      setAlreadyRefundedTotalPaise(refundedSoFar)

      const mapped: ReturnLineItemState[] = items.map((line) => {
        const alreadyReturned = returnedQtyMap.get(line.productId) || 0
        const remaining = Math.max(0, line.quantity - alreadyReturned)
        // Unit effective price paid factoring in line discounts
        const lineTotal = line.totalPaise ?? line.totalCents ?? 0
        const effectiveUnitPaid = line.quantity > 0 ? Math.round(lineTotal / line.quantity) : 0

        return {
          productId: line.productId,
          productName: line.productName || 'Catalog Item',
          sku: line.sku || 'SKU-UNKNOWN',
          purchasedQty: line.quantity,
          alreadyReturnedQty: alreadyReturned,
          remainingReturnableQty: remaining,
          effectiveUnitPricePaise: effectiveUnitPaid,
          returnQty: remaining > 0 ? 1 : 0,
          selected: remaining > 0,
        }
      })

      setRefundLines(mapped)
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : 'Could not fetch order line items.')
    } finally {
      setLoadingLines(false)
    }
  }

  // Calculated refund total in paise
  const calculatedRefundPaise = useMemo(() => {
    return refundLines
      .filter((l) => l.selected && l.returnQty > 0)
      .reduce((acc, l) => acc + l.returnQty * l.effectiveUnitPricePaise, 0)
  }, [refundLines])

  // Max refundable balance left on original sale
  const maxRefundablePaise = useMemo(() => {
    if (!activeSaleForRefund) return 0
    const saleTotal = activeSaleForRefund.totalPaise ?? activeSaleForRefund.totalCents ?? 0
    return Math.max(0, saleTotal - alreadyRefundedTotalPaise)
  }, [activeSaleForRefund, alreadyRefundedTotalPaise])

  // Handle Refund Commit
  const handleCommitRefund = async () => {
    if (!refundSaleId || isSubmittingRefund) return
    setRefundError('')

    if (!refundReason.trim()) {
      setRefundError('Please specify a valid reason for the return/refund.')
      return
    }

    const selectedToReturn = refundLines.filter((l) => l.selected && l.returnQty > 0)
    if (selectedToReturn.length === 0) {
      setRefundError('Please select at least one item and quantity to return.')
      return
    }

    if (calculatedRefundPaise > maxRefundablePaise) {
      setRefundError(
        `Refund amount (${formatMoney(calculatedRefundPaise)}) exceeds the maximum remaining refundable limit of ${formatMoney(maxRefundablePaise)}.`
      )
      return
    }

    setIsSubmittingRefund(true)
    try {
      await refundSale({
        saleId: refundSaleId,
        reason: refundReason.trim(),
        restockItems: refundRestock,
        items: selectedToReturn.map((item) => ({
          productId: item.productId,
          quantity: item.returnQty,
          refundAmountPaise: item.returnQty * item.effectiveUnitPricePaise,
        })),
      })
      setRefundSaleId(null)
      setActiveSaleForRefund(null)
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : 'Failed to process return')
    } finally {
      setIsSubmittingRefund(false)
    }
  }

  // Open Transaction Details View
  const handleOpenDetails = async (sale: EnrichedSale) => {
    setSelectedSaleForDetails(sale)
    setLoadingDetails(true)
    try {
      const [lines, rets] = await Promise.all([
        getLineItems(sale.id),
        getReturns(sale.id),
      ])
      setDetailsLineItems(lines)
      setDetailsReturns(rets)
    } catch (err) {
      console.error('Failed to load transaction details:', err)
    } finally {
      setLoadingDetails(false)
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    const headers =
      'ReceiptNumber,Branch,Timestamp,Subtotal (INR),Discount (INR),Tax (INR),Total (INR),NetProfit (INR),PaymentMethod,Status,Notes\n'
    const rows = filteredSales
      .map((o) => {
        const sub = paiseToRupees(o.subtotalPaise ?? o.subtotalCents ?? 0).toFixed(2)
        const disc = paiseToRupees(o.discountPaise ?? o.discountCents ?? 0).toFixed(2)
        const tax = paiseToRupees(o.taxPaise ?? o.taxCents ?? 0).toFixed(2)
        const tot = paiseToRupees(o.totalPaise ?? o.totalCents ?? 0).toFixed(2)
        const net = paiseToRupees(o.netProfitPaise ?? o.netProfitCents ?? 0).toFixed(2)
        const safeNotes = (o.notes || '').replace(/"/g, '""')
        return `"${o.receiptNumber}","${o.branchName}","${o.createdAt}",${sub},${disc},${tax},${tot},${net},"${o.paymentMethod}","${o.status}","${safeNotes}"`
      })
      .join('\n')

    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + headers + rows)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `storepoint_sales_ledger_${activeBranchId}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const activeBranchName =
    activeBranchId === 'all'
      ? 'All Branches (Consolidated)'
      : branches.find((b) => b.id === activeBranchId)?.name || 'Current Branch'

  const openPosModal = () => {
    if (branches.length > 0) {
      setModalBranchId(activeBranchId !== 'all' ? activeBranchId : branches[0].id)
    }
    setSelectedProductId(products[0]?.id || '')
    setProductSearchInput('')
    setCartItems([])
    setModalErrorMsg('')
    setModalSuccessMsg('')
    setOrderDiscountRupeesInput('0')
    setTaxRateInput('0')
    setOrderNotes('')
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <ShoppingCart className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
            <span>Sales</span>
            <span className="text-navy-300">/</span>
            <span className="text-navy-700 normal-case tracking-normal">{activeBranchName}</span>
          </>
        }
        title="Sales & point of sale"
        description="Record checkouts, review the ledger, and process partial returns — with stock-safe cart validation."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Export CSV
            </Button>
            <Button size="sm" onClick={openPosModal} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>
              New sale
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiStat
          label="Gross merchandise"
          value={formatMoney(totalGrossPaise)}
          hint={
            totalDiscountsPaise > 0
              ? `Discounts −${formatMoney(totalDiscountsPaise)}`
              : 'Before discounts'
          }
        />
        <KpiStat
          label="Net revenue"
          value={formatMoney(totalNetSalesPaise)}
          tone="brand"
          hint="After discounts & refunds"
        />
        <KpiStat
          label="Net profit"
          value={formatMoney(totalNetProfitPaise)}
          tone="success"
          hint="After weighted-average COGS"
        />
        <KpiStat
          label="Avg order"
          value={formatMoney(averageOrderPaise)}
          hint={`Across ${filteredSales.length} orders`}
        />
      </div>

      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search receipt, notes, or store…"
        searchLabel="Search sales"
        footer={
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-navy-100 text-xs text-navy-600">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Calendar className="w-3.5 h-3.5 text-navy-400" aria-hidden="true" />
              <span className="font-semibold">Dates</span>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="sp-control !py-1 sp-num"
                aria-label="Start date"
              />
              <span className="text-navy-400">to</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="sp-control !py-1 sp-num"
                aria-label="End date"
              />
              {(startDateFilter || endDateFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDateFilter('')
                    setEndDateFilter('')
                  }}
                  className="text-brand-600 hover:text-brand-800 text-xs font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <span className="text-navy-400 ml-auto sp-num text-[11px]">
              {filteredSales.length} of {sales.length} orders
            </span>
          </div>
        }
      >
        <FilterField label="Branch">
          <select
            id="sales-branch-select"
            value={activeBranchId}
            onChange={(e) => setActiveBranchId(e.target.value)}
            className="sp-control"
            aria-label="Filter sales by branch"
          >
            <option value="all">All branches ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Payment">
          <select
            id="sales-pay-filter"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="sp-control"
            aria-label="Filter by payment method"
          >
            <option value="All">All methods</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Cash">Cash</option>
            <option value="NFC / Apple Pay">NFC / Contactless</option>
            <option value="Store Credit">Store Credit</option>
          </select>
        </FilterField>
        <FilterField label="Status">
          <select
            id="sales-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="sp-control"
            aria-label="Filter by order status"
          >
            <option value="All">All statuses</option>
            <option value="completed">Completed</option>
            <option value="partial_return">Partial return</option>
            <option value="refunded">Refunded</option>
          </select>
        </FilterField>
      </FilterBar>

      <div className="sp-table-wrap shadow-card">
        <div className="overflow-x-auto">
          <table className="sp-table text-xs sm:text-sm">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Branch</th>
                <th>Payment</th>
                <th className="text-right">Subtotal</th>
                <th className="text-right">Discount</th>
                <th className="text-right">Tax</th>
                <th className="text-right">Total</th>
                <th className="text-right">Profit</th>
                <th className="text-center">Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-10">
                    <div className="space-y-2 px-4" aria-busy="true">
                      <div className="h-8 sp-skeleton" />
                      <div className="h-8 sp-skeleton" />
                    </div>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-4">
                    <EmptyState
                      icon={<Receipt className="w-5 h-5" aria-hidden="true" />}
                      title={sales.length === 0 ? 'No sales yet' : 'No matching orders'}
                      description={
                        sales.length === 0
                          ? 'Open POS to record your first checkout.'
                          : 'Adjust filters or date range.'
                      }
                      action={
                        sales.length === 0 ? (
                          <Button size="sm" onClick={openPosModal} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                            New sale
                          </Button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredSales.map((order) => (
                  <tr
                    key={order.id}
                    className="group cursor-pointer focus-within:bg-brand-50/40"
                    onClick={() => handleOpenDetails(order)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleOpenDetails(order)
                      }
                    }}
                    tabIndex={0}
                  >
                    <td>
                      <div className="sp-num font-bold text-brand-600 text-xs flex items-center gap-1.5">
                        <span>{order.receiptNumber}</span>
                        <Eye
                          className="w-3 h-3 text-navy-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="text-[11px] text-navy-400 mt-0.5">
                        {order.createdAt.slice(0, 10)} {order.createdAt.slice(11, 16)}
                      </div>
                    </td>
                    <td className="font-medium text-navy-800">{order.branchName}</td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-xs text-navy-700 font-medium">
                        <CreditCard className="w-3.5 h-3.5 text-navy-400" aria-hidden="true" />
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td className="text-right sp-num text-navy-600">
                      {formatMoney(order.subtotalPaise ?? order.subtotalCents ?? 0)}
                    </td>
                    <td className="text-right sp-num text-amber-600">
                      {(order.discountPaise ?? order.discountCents ?? 0) > 0
                        ? `−${formatMoney(order.discountPaise ?? order.discountCents ?? 0)}`
                        : '₹0.00'}
                    </td>
                    <td className="text-right sp-num text-navy-400">
                      {formatMoney(order.taxPaise ?? order.taxCents ?? 0)}
                    </td>
                    <td className="text-right sp-num font-bold text-navy-900">
                      {formatMoney(order.totalPaise ?? order.totalCents ?? 0)}
                    </td>
                    <td className="text-right sp-num font-bold text-emerald-600">
                      +{formatMoney(order.netProfitPaise ?? order.netProfitCents ?? 0)}
                    </td>
                    <td className="text-center">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(order)}
                          className="p-1.5 rounded-lg text-navy-400 hover:text-brand-700 hover:bg-brand-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                          aria-label={`View details for ${order.receiptNumber}`}
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        {(order.status === 'completed' || order.status === 'partial_return') && (
                          <button
                            type="button"
                            onClick={() => handleOpenRefundModal(order.id)}
                            className="inline-flex items-center gap-1 text-xs text-navy-500 hover:text-red-700 font-semibold cursor-pointer px-2 py-1 rounded-md hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                            aria-label={`Return items from ${order.receiptNumber}`}
                          >
                            <RotateCcw className="w-3 h-3" aria-hidden="true" />
                            Return
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POS Checkout Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pos-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
            aria-hidden="true"
          />

          <div
            ref={posModalRef}
            className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col"
          >
            <div className="px-5 sm:px-6 py-4 border-b border-navy-200 flex items-center justify-between bg-navy-50 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Receipt className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 id="pos-modal-title" className="font-bold text-navy-900 text-sm">
                    Point of sale
                  </h3>
                  <p className="text-[11px] text-navy-500 truncate">
                    Search products, edit cart quantities, then checkout
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close point of sale"
                className="p-2 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              {modalErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalErrorMsg}</span>
                </div>
              )}

              {modalSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{modalSuccessMsg}</span>
                </div>
              )}

              {/* Selling Branch */}
              <div className="flex items-center justify-between gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs font-semibold text-slate-700 shrink-0">
                    Store Terminal:
                  </label>
                  <select
                    value={modalBranchId}
                    onChange={(e) => {
                      setModalBranchId(e.target.value)
                      setCartItems([]) // Reset cart when branch changes to re-validate branch stock
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Currency: <strong className="text-slate-800">INR (₹)</strong>
                </div>
              </div>

              {/* Product Lookup and Add Section */}
              <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Barcode className="w-3.5 h-3.5 text-blue-600" />
                    <span>Product Quick Lookup</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    On-hand in store:{' '}
                    <strong className={availableStockForSelected > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                      {availableStockForSelected} units
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Search Name / SKU / Barcode
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={productSearchInput}
                        onChange={(e) => setProductSearchInput(e.target.value)}
                        placeholder="Scan barcode or type name..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {/* Catalog Dropdown select */}
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value)
                        setCustomPriceInput('')
                      }}
                      className="w-full mt-1 px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
                    >
                      {filteredProductsForPOS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — {formatMoney(p.sellingPricePaise ?? p.sellingPriceCents ?? 0)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, availableStockForSelected)}
                      value={quantityInput}
                      onChange={(e) => setQuantityInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Unit Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={
                        selectedProduct
                          ? `${paiseToRupees(selectedProduct.sellingPricePaise ?? selectedProduct.sellingPriceCents ?? 0).toFixed(2)}`
                          : '0.00'
                      }
                      value={customPriceInput}
                      onChange={(e) => setCustomPriceInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Line Disc (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="0.00"
                      value={lineDiscountRupeesInput}
                      onChange={(e) => setLineDiscountRupeesInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    />
                  </div>

                  <div className="sm:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => handleAddToCart()}
                      disabled={availableStockForSelected <= 0}
                      className="w-full py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Cart Table */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Order Cart Items ({cartItems.length})
                  </label>
                  {cartItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCartItems([])}
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear Cart
                    </button>
                  )}
                </div>

                {cartItems.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-navy-200 rounded-xl text-xs text-navy-400 bg-navy-50/40">
                    Cart is empty. Search a product and add it to continue.
                  </div>
                ) : (
                  <div className="sp-table-wrap">
                    <table className="sp-table text-xs">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th className="text-center">Qty</th>
                          <th className="text-right">Unit</th>
                          <th className="text-right">Discount</th>
                          <th className="text-right">Line total</th>
                          <th className="text-center"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cartItems.map((item) => (
                          <tr key={item.productId}>
                            <td>
                              <div className="sp-product-cell">
                                <span className="sp-product-name">{item.productName}</span>
                                <span className="sp-product-sku">
                                  {item.sku}
                                  {item.barcode ? ` · ${item.barcode}` : ''}
                                  {` · max ${item.availableStock}`}
                                </span>
                              </div>
                            </td>
                            <td className="text-center">
                              <div className="inline-flex items-center border border-navy-200 rounded-md overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQuantity(item.productId, item.quantity - 1)}
                                  className="px-2.5 py-1 text-navy-700 hover:bg-navy-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
                                  aria-label={`Decrease quantity of ${item.productName}`}
                                >
                                  −
                                </button>
                                <span className="px-2.5 py-1 sp-num font-semibold text-navy-900 min-w-[2rem] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQuantity(item.productId, item.quantity + 1)}
                                  disabled={item.quantity >= item.availableStock}
                                  className="px-2.5 py-1 text-navy-700 hover:bg-navy-100 disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
                                  aria-label={`Increase quantity of ${item.productName}`}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="text-right sp-num text-navy-600">
                              {formatMoney(item.unitPricePaise)}
                            </td>
                            <td className="text-right">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={paiseToRupees(item.lineDiscountPaise)}
                                onChange={(e) =>
                                  handleUpdateCartLineDiscount(item.productId, parseFloat(e.target.value) || 0)
                                }
                                aria-label={`Line discount for ${item.productName}`}
                                className="w-[4.5rem] px-1.5 py-1 text-right border border-navy-200 rounded-md sp-num text-xs text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                              />
                            </td>
                            <td className="text-right sp-num font-bold text-navy-900">
                              {formatMoney(item.quantity * item.unitPricePaise - item.lineDiscountPaise)}
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(item.productId)}
                                className="text-navy-400 hover:text-red-600 p-1.5 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                                aria-label={`Remove ${item.productName} from cart`}
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-navy-100">
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1" htmlFor="pos-payment">
                    Payment method *
                  </label>
                  <select
                    id="pos-payment"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="sp-control w-full"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                    <option value="NFC / Apple Pay">NFC / Contactless</option>
                    <option value="Store Credit">Store Credit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1" htmlFor="pos-order-discount">
                    Order discount (₹)
                  </label>
                  <input
                    id="pos-order-discount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={orderDiscountRupeesInput}
                    onChange={(e) => setOrderDiscountRupeesInput(e.target.value)}
                    className="sp-control w-full sp-num"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Tax Rate Configuration */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Recorded Tax Treatment (% operational estimate)
                  </label>
                  <div className="flex items-center gap-1">
                    {['0', '5', '12', '18', '28'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTaxRateInput(preset)}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer',
                          taxRateInput === preset
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={taxRateInput}
                  onChange={(e) => setTaxRateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>
                    Tax is tracked for internal accounting estimates and does not substitute statutory GST filings.
                  </span>
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Receipt Memo / Cashier Notes
                </label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Counter checkout terminal 1, Customer ref #..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Financial Summary Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Item Total:</span>
                  <span>{formatMoney(cartGrossSubtotalPaise)}</span>
                </div>
                {cartLineDiscountsPaise > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Line Discounts:</span>
                    <span>-{formatMoney(cartLineDiscountsPaise)}</span>
                  </div>
                )}
                {orderDiscountPaise > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Order Discount:</span>
                    <span>-{formatMoney(orderDiscountPaise)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Recorded Tax ({taxRateInput}%):</span>
                  <span>+{formatMoney(taxPaise)}</span>
                </div>
                <div className="pt-2 border-t border-navy-200 flex justify-between font-bold text-base text-navy-900">
                  <span>Total payable</span>
                  <span className="sp-num text-brand-700">{formatMoney(cartTotalPayablePaise)}</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-navy-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-navy-200 text-navy-700 text-sm font-semibold hover:bg-navy-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cartItems.length === 0 || isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-navy-300 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                >
                  {isSubmitting ? (
                    <span>Processing…</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      <span>Complete checkout</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedSaleForDetails && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="details-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            ref={detailsModalRef}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 id="details-modal-title" className="text-base font-bold text-slate-900">
                      Receipt {selectedSaleForDetails.receiptNumber}
                    </h3>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono uppercase',
                        selectedSaleForDetails.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedSaleForDetails.status === 'partial_return'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                      )}
                    >
                      {selectedSaleForDetails.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedSaleForDetails.branchName} • {new Date(selectedSaleForDetails.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSaleForDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Line items table */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Purchased Items</h4>
                {loadingDetails ? (
                  <div className="py-6 text-center text-slate-400 font-mono text-xs">
                    Loading transaction details...
                  </div>
                ) : detailsLineItems.length === 0 ? (
                  <div className="py-4 text-center text-slate-400">No line items stored.</div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Item</th>
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Unit Price</th>
                          <th className="py-2 px-3 text-right">Line Disc</th>
                          <th className="py-2 px-3 text-right">Line Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailsLineItems.map((li) => (
                          <tr key={li.id}>
                            <td className="py-2 px-3 font-medium text-slate-800">
                              <div>{li.productName}</div>
                              <span className="text-[10px] text-slate-400 font-mono">{li.sku}</span>
                            </td>
                            <td className="py-2 px-3 text-center font-mono">{li.quantity}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {formatMoney(li.unitSellingPricePaise ?? li.unitSellingPriceCents ?? 0)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-amber-600">
                              {(li.discountPaise ?? li.discountCents ?? 0) > 0
                                ? `-${formatMoney(li.discountPaise ?? li.discountCents ?? 0)}`
                                : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {formatMoney(li.totalPaise ?? li.totalCents ?? 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Financial Breakdown & Cost Snapshot */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>{formatMoney(selectedSaleForDetails.subtotalPaise ?? selectedSaleForDetails.subtotalCents ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600">
                    <span>Order Discount:</span>
                    <span>-{formatMoney(selectedSaleForDetails.discountPaise ?? selectedSaleForDetails.discountCents ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Recorded Tax:</span>
                    <span>+{formatMoney(selectedSaleForDetails.taxPaise ?? selectedSaleForDetails.taxCents ?? 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Total Paid:</span>
                    <span className="text-blue-600">{formatMoney(selectedSaleForDetails.totalPaise ?? selectedSaleForDetails.totalCents ?? 0)}</span>
                  </div>
                </div>

                <div className="space-y-1 border-l border-slate-200 pl-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Cost Basis (COGS):</span>
                    <span>{formatMoney(selectedSaleForDetails.totalCostPaise ?? selectedSaleForDetails.totalCostCents ?? 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-600">
                    <span>Net Profit Captured:</span>
                    <span>+{formatMoney(selectedSaleForDetails.netProfitPaise ?? selectedSaleForDetails.netProfitCents ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200">
                    <span>Payment Tender:</span>
                    <span className="font-semibold text-slate-700">{selectedSaleForDetails.paymentMethod}</span>
                  </div>
                  {selectedSaleForDetails.notes && (
                    <div className="text-[11px] text-slate-500 truncate" title={selectedSaleForDetails.notes}>
                      Memo: {selectedSaleForDetails.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Return / Refund Audit Trail */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Returns & Refunds Audit Trail</h4>
                {detailsReturns.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 text-xs">
                    No returns have been issued for this transaction.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailsReturns.map((ret) => (
                      <div
                        key={ret.id}
                        className="p-3 bg-rose-50/50 rounded-xl border border-rose-200/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-900 font-mono text-xs">
                            {ret.refundReceiptNumber}
                          </span>
                          <span className="font-mono font-bold text-rose-700">
                            -{formatMoney(ret.refundAmountPaise ?? ret.refundAmountCents ?? 0)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center justify-between">
                          <span>Reason: {ret.reason}</span>
                          <span>{new Date(ret.createdAt).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Restocked: {ret.restockItems ? 'Yes (inventory restored)' : 'No (written off)'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
              {(selectedSaleForDetails.status === 'completed' || selectedSaleForDetails.status === 'partial_return') && (
                <button
                  type="button"
                  onClick={() => {
                    const saleId = selectedSaleForDetails.id
                    setSelectedSaleForDetails(null)
                    handleOpenRefundModal(saleId)
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Issue Return / Refund</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedSaleForDetails(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund & Itemized Return Modal */}
      {refundSaleId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="refund-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            ref={refundModalRef}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <div>
                  <h3 id="refund-modal-title" className="text-base font-bold text-slate-900">
                    Process Sale Return / Refund
                  </h3>
                  {activeSaleForRefund && (
                    <p className="text-[11px] text-slate-500 font-mono">
                      Receipt: {activeSaleForRefund.receiptNumber} • Refundable Balance: {formatMoney(maxRefundablePaise)}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefundSaleId(null)}
                aria-label="Close modal"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {refundError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{refundError}</span>
              </div>
            )}

            <div className="space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Return *
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Defective unit, customer change of mind, sizing issue"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Items to return */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Line Items & Return Quantities
                </label>
                {loadingLines ? (
                  <div className="py-6 text-center text-slate-400 font-mono text-xs">
                    Loading order lines...
                  </div>
                ) : refundLines.length === 0 ? (
                  <div className="py-4 text-center text-slate-500 text-xs">
                    No items available to return for this receipt.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {refundLines.map((line, idx) => {
                      const isFullyReturned = line.remainingReturnableQty <= 0
                      return (
                        <div
                          key={line.productId}
                          className={cn(
                            'p-3 flex items-center justify-between gap-3',
                            isFullyReturned ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'
                          )}
                        >
                          <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={line.selected && !isFullyReturned}
                              disabled={isFullyReturned}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setRefundLines((prev) =>
                                  prev.map((l, i) => (i === idx ? { ...l, selected: checked } : l))
                                )
                              }}
                              className="rounded text-rose-600 focus:ring-rose-500"
                            />
                            <div>
                              <span className="font-semibold text-slate-800 block">{line.productName}</span>
                              <span className="text-[11px] text-slate-400">
                                Sold: {line.purchasedQty} ({line.alreadyReturnedQty} returned) • Net Paid/unit: {formatMoney(line.effectiveUnitPricePaise)}
                              </span>
                            </div>
                          </label>

                          {isFullyReturned ? (
                            <span className="text-[11px] font-mono font-semibold text-slate-400 bg-slate-200 px-2 py-0.5 rounded">
                              Fully Returned
                            </span>
                          ) : line.selected ? (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-[11px]">Return Qty:</span>
                              <input
                                type="number"
                                min={1}
                                max={line.remainingReturnableQty}
                                value={line.returnQty}
                                onChange={(e) => {
                                  const val = Math.max(
                                    1,
                                    Math.min(line.remainingReturnableQty, parseInt(e.target.value) || 1)
                                  )
                                  setRefundLines((prev) =>
                                    prev.map((l, i) => (i === idx ? { ...l, returnQty: val } : l))
                                  )
                                }}
                                className="w-16 px-2 py-1 border border-slate-300 rounded font-mono text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Restock option */}
              <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  checked={refundRestock}
                  onChange={(e) => setRefundRestock(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Automatically restock returned items into store inventory</span>
              </label>

              {/* Refund calculation */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-rose-900 block">Total Refund Payable:</span>
                  <span className="text-[11px] text-rose-600">
                    Max allowed: {formatMoney(maxRefundablePaise)}
                  </span>
                </div>
                <span className="font-mono font-bold text-base text-rose-700">
                  {formatMoney(calculatedRefundPaise)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setRefundSaleId(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommitRefund}
                disabled={calculatedRefundPaise <= 0 || calculatedRefundPaise > maxRefundablePaise || isSubmittingRefund}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isSubmittingRefund ? (
                  <span>Processing Refund...</span>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Authorize Refund</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notice */}
      <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
        <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800">
            {workspaceMode === 'demo' ? 'Demo Sandbox Mode' : 'Live Persistent Ledger'}:
          </strong>{' '}
          Sales decrement inventory atomically with historical snapshot costing. Partial and repeated returns update sale statuses, enforce cumulative ceilings, and restore stock when restock is enabled.
        </div>
      </div>
    </div>
  )
}
