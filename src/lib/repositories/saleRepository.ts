import { getDb } from '@/lib/db'
import type {
  SaleEntity,
  SaleLineItemEntity,
  SaleReturnEntity,
  StockMovementEntity,
  PaymentMethod,
  WorkspaceId,
} from '@/types/database'

function normalizeSale(s: SaleEntity): SaleEntity {
  const subtotal = s.subtotalPaise ?? s.subtotalCents ?? 0
  const discount = s.discountPaise ?? s.discountCents ?? 0
  const tax = s.taxPaise ?? s.taxCents ?? 0
  const total = s.totalPaise ?? s.totalCents ?? 0
  const totalCost = s.totalCostPaise ?? s.totalCostCents ?? 0
  const netProfit = s.netProfitPaise ?? s.netProfitCents ?? 0
  return {
    ...s,
    subtotalPaise: subtotal,
    subtotalCents: subtotal,
    discountPaise: discount,
    discountCents: discount,
    taxPaise: tax,
    taxCents: tax,
    totalPaise: total,
    totalCents: total,
    totalCostPaise: totalCost,
    totalCostCents: totalCost,
    netProfitPaise: netProfit,
    netProfitCents: netProfit,
  }
}

function normalizeSaleLineItem(item: SaleLineItemEntity): SaleLineItemEntity {
  const sellPrice = item.unitSellingPricePaise ?? item.unitSellingPriceCents ?? 0
  const costSnapshot = item.unitCostSnapshotPaise ?? item.unitCostSnapshotCents ?? 0
  const discount = item.discountPaise ?? item.discountCents ?? 0
  const total = item.totalPaise ?? item.totalCents ?? 0
  return {
    ...item,
    unitSellingPricePaise: sellPrice,
    unitSellingPriceCents: sellPrice,
    unitCostSnapshotPaise: costSnapshot,
    unitCostSnapshotCents: costSnapshot,
    discountPaise: discount,
    discountCents: discount,
    totalPaise: total,
    totalCents: total,
  }
}

function normalizeSaleReturn(r: SaleReturnEntity): SaleReturnEntity {
  const refund = r.refundAmountPaise ?? r.refundAmountCents ?? 0
  return {
    ...r,
    refundAmountPaise: refund,
    refundAmountCents: refund,
    totalRefundPaise: refund,
    totalRefundCents: refund,
  }
}

export interface CreateSaleInput {
  workspaceId: WorkspaceId
  branchId: string
  receiptNumber?: string
  items: Array<{
    productId: string
    quantity: number
    sellingPricePaise?: number
    sellingPriceCents?: number
    unitPricePaise?: number
    unitPriceCents?: number
    discountPaise?: number
    discountCents?: number
  }>
  paymentMethod: PaymentMethod
  discountPaise?: number
  discountCents?: number
  taxPaise?: number
  taxCents?: number
  notes?: string
}

export const saleRepository = {
  async getAll(workspaceId: WorkspaceId, branchId?: string): Promise<SaleEntity[]> {
    const db = await getDb()
    const all = await db.getAllFromIndex('sales', 'by-workspace', workspaceId)
    const filtered = branchId && branchId !== 'all' ? all.filter((s) => s.branchId === branchId) : all
    return filtered.map(normalizeSale).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async getById(id: string): Promise<SaleEntity | undefined> {
    const db = await getDb()
    const s = await db.get('sales', id)
    return s ? normalizeSale(s) : undefined
  },

  async getLineItems(saleId: string): Promise<SaleLineItemEntity[]> {
    const db = await getDb()
    const items = await db.getAllFromIndex('saleLineItems', 'by-sale', saleId)
    return items.map(normalizeSaleLineItem)
  },

  async getReturns(saleId: string): Promise<SaleReturnEntity[]> {
    const db = await getDb()
    const returns = await db.getAllFromIndex('saleReturns', 'by-sale', saleId)
    return returns.map(normalizeSaleReturn)
  },

  /**
   * Atomically commits a multi-item sale transaction:
   * 1. Pre-checks stock availability for ALL products in the branch
   * 2. Decrements inventory counts
   * 3. Records cost snapshots for accurate weighted-average historical accounting
   * 4. Logs auditable stock movement events
   * 5. Saves sale and line items
   */
  async createSale(input: CreateSaleInput): Promise<{ sale: SaleEntity; lineItems: SaleLineItemEntity[] }> {
    const db = await getDb()
    const now = new Date().toISOString()
    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    // Transaction across all affected object stores
    const tx = db.transaction(
      ['sales', 'saleLineItems', 'inventory', 'stockMovements', 'products'],
      'readwrite'
    )

    let subtotalPaise = 0
    let totalCostPaise = 0
    const preparedItems: Array<{
      lineItem: SaleLineItemEntity
      productId: string
      quantity: number
      unitCost: number
    }> = []

    if (!input.items || input.items.length === 0) {
      throw new Error('Sale transaction must contain at least one line item.')
    }

    // Phase 1: Validate stock & fetch cost snapshot
    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new Error(`Sale item quantity must be greater than zero.`)
      }

      const product = await tx.objectStore('products').get(item.productId)
      const productName = product ? product.name : 'Catalog Item'
      const productSku = product ? product.sku : 'SKU-UNKNOWN'

      const inv = await tx
        .objectStore('inventory')
        .index('by-branch-product')
        .get([input.branchId, item.productId])

      const availableStock = inv ? inv.quantityOnHand ?? inv.quantity ?? 0 : 0
      if (availableStock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${productName}" (${productSku}). Available: ${availableStock}, requested: ${item.quantity}.`
        )
      }

      const invCost = inv ? (inv.averageCostPaise ?? inv.averageCostCents ?? 0) : 0
      const prodCost = product ? (product.costPricePaise ?? product.costPriceCents ?? 0) : 0
      const unitCost = invCost > 0 ? invCost : prodCost

      const unitSellingPrice =
        item.sellingPricePaise ??
        item.sellingPriceCents ??
        item.unitPricePaise ??
        item.unitPriceCents ??
        (product ? (product.sellingPricePaise ?? product.sellingPriceCents ?? 0) : 0)

      if (unitSellingPrice < 0) {
        throw new Error(`Selling price cannot be negative for "${productName}".`)
      }

      const discount = item.discountPaise ?? item.discountCents ?? 0
      if (discount < 0) {
        throw new Error(`Line discount cannot be negative for "${productName}".`)
      }
      const grossLine = item.quantity * unitSellingPrice
      if (discount > grossLine) {
        throw new Error(
          `Line discount (₹${(discount / 100).toFixed(2)}) cannot exceed gross line total (₹${(grossLine / 100).toFixed(2)}) for "${productName}".`
        )
      }

      const lineTotal = grossLine - discount
      subtotalPaise += lineTotal
      totalCostPaise += item.quantity * unitCost

      preparedItems.push({
        lineItem: {
          id: `sli_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          workspaceId: input.workspaceId,
          saleId: saleId,
          productId: item.productId,
          productName: productName,
          sku: productSku,
          quantity: item.quantity,
          unitSellingPricePaise: unitSellingPrice,
          unitSellingPriceCents: unitSellingPrice,
          unitCostSnapshotPaise: unitCost,
          unitCostSnapshotCents: unitCost,
          discountPaise: discount,
          discountCents: discount,
          totalPaise: lineTotal,
          totalCents: lineTotal,
        },
        productId: item.productId,
        quantity: item.quantity,
        unitCost: unitCost,
      })
    }

    const orderDiscount = input.discountPaise ?? input.discountCents ?? 0
    if (orderDiscount < 0) {
      throw new Error('Order discount cannot be negative.')
    }
    if (orderDiscount > subtotalPaise) {
      throw new Error(
        `Order discount (₹${(orderDiscount / 100).toFixed(2)}) cannot exceed sale subtotal (₹${(subtotalPaise / 100).toFixed(2)}).`
      )
    }

    const tax = input.taxPaise ?? input.taxCents ?? 0
    if (tax < 0) {
      throw new Error('Tax amount cannot be negative.')
    }
    const finalTotal = subtotalPaise - orderDiscount + tax
    const netProfit = (subtotalPaise - orderDiscount) - totalCostPaise

    const generatedReceipt =
      input.receiptNumber || `REC-${Math.floor(100000 + Math.random() * 900000)}`

    const sale: SaleEntity = {
      id: saleId,
      workspaceId: input.workspaceId,
      branchId: input.branchId,
      receiptNumber: generatedReceipt.trim().toUpperCase(),
      subtotalPaise: subtotalPaise,
      subtotalCents: subtotalPaise,
      discountPaise: orderDiscount,
      discountCents: orderDiscount,
      taxPaise: tax,
      taxCents: tax,
      totalPaise: finalTotal,
      totalCents: finalTotal,
      totalCostPaise: totalCostPaise,
      totalCostCents: totalCostPaise,
      netProfitPaise: netProfit,
      netProfitCents: netProfit,
      paymentMethod: input.paymentMethod,
      status: 'completed',
      notes: input.notes,
      createdAt: now,
    }

    // Phase 2: Commit records and decrement inventory
    await tx.objectStore('sales').put(sale)

    const createdLineItems: SaleLineItemEntity[] = []

    for (const prepared of preparedItems) {
      await tx.objectStore('saleLineItems').put(prepared.lineItem)
      createdLineItems.push(prepared.lineItem)

      const inv = await tx
        .objectStore('inventory')
        .index('by-branch-product')
        .get([input.branchId, prepared.productId])

      if (inv) {
        const newQty = inv.quantity - prepared.quantity
        inv.quantity = newQty
        inv.quantityOnHand = newQty
        inv.status = newQty <= 0 ? 'out_of_stock' : newQty <= inv.reorderPoint ? 'low_stock' : 'in_stock'
        inv.updatedAt = now
        await tx.objectStore('inventory').put(inv)

        // Log auditable movement
        const movement: StockMovementEntity = {
          id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          workspaceId: input.workspaceId,
          branchId: input.branchId,
          productId: prepared.productId,
          inventoryId: inv.id,
          type: 'sale',
          quantityDelta: -prepared.quantity,
          resultingQuantity: newQty,
          unitCostPaise: prepared.unitCost,
          unitCostCents: prepared.unitCost,
          referenceType: 'sale',
          referenceId: sale.id,
          notes: `POS Sale Receipt: ${sale.receiptNumber}`,
          createdAt: now,
        }
        await tx.objectStore('stockMovements').put(movement)
      }
    }

    await tx.done
    return { sale: normalizeSale(sale), lineItems: createdLineItems.map(normalizeSaleLineItem) }
  },

  /**
   * Safe partial or full return workflow. Supports multiple partial returns.
   *
   * Guards enforced:
   * - Cumulative returned quantity per line cannot exceed the originally sold quantity.
   * - Cumulative refund amount cannot exceed the original sale total (after prior refunds).
   * - Sale status advances to 'partial_return' until every line is fully returned, then 'refunded'.
   * - A fully 'refunded' or 'cancelled' sale cannot be returned again.
   */
  async refundOrCancelSale(params: {
    saleId: string
    reason: string
    restockItems?: boolean
    items?: Array<{
      productId: string
      quantity: number
      refundAmountPaise?: number
      refundAmountCents?: number
    }>
    workspaceId?: WorkspaceId
    branchId?: string
  }): Promise<{ sale: SaleEntity; returnRecord: SaleReturnEntity }> {
    const db = await getDb()
    const saleRaw = await db.get('sales', params.saleId)
    if (!saleRaw) {
      throw new Error(`Sale transaction "${params.saleId}" not found.`)
    }
    const sale = normalizeSale(saleRaw)
    if (sale.status === 'refunded' || sale.status === 'cancelled') {
      throw new Error(`Sale ${sale.receiptNumber} is already marked as ${sale.status}. Cannot refund twice.`)
    }

    if (!params.reason || !params.reason.trim()) {
      throw new Error('Return reason is required.')
    }

    const lineItems = await this.getLineItems(params.saleId)
    const existingReturns = await this.getReturns(params.saleId)
    const now = new Date().toISOString()

    // --- Cumulative quantity already returned per product ---
    const returnedQtyByProduct: Record<string, number> = {}
    for (const ret of existingReturns) {
      if (ret.returnedItems) {
        for (const ri of ret.returnedItems) {
          returnedQtyByProduct[ri.productId] = (returnedQtyByProduct[ri.productId] ?? 0) + ri.quantity
        }
      }
    }

    // --- Cumulative amount already refunded ---
    const alreadyRefundedPaise = existingReturns.reduce(
      (s, r) => s + (r.refundAmountPaise ?? r.refundAmountCents ?? 0),
      0
    )
    const saleTotal = sale.totalPaise ?? sale.totalCents ?? 0

    const shouldRestock = params.restockItems !== false

    // --- Determine items to return and validate ---
    const isFullReturn = !params.items || params.items.length === 0

    const itemsToReturn: Array<{
      productId: string
      quantity: number
      refundAmountPaise: number
    }> = []

    if (isFullReturn) {
      // Full return: return all remaining quantities
      for (const li of lineItems) {
        const alreadyReturned = returnedQtyByProduct[li.productId] ?? 0
        const remaining = li.quantity - alreadyReturned
        if (remaining > 0) {
          const lineTotal = li.totalPaise ?? li.totalCents ?? 0
          const refundPerUnit = li.quantity > 0 ? Math.round(lineTotal / li.quantity) : 0
          itemsToReturn.push({
            productId: li.productId,
            quantity: remaining,
            refundAmountPaise: refundPerUnit * remaining,
          })
        }
      }
    } else {
      for (const returnItem of params.items!) {
        const li = lineItems.find((l) => l.productId === returnItem.productId)
        if (!li) {
          throw new Error(`Product "${returnItem.productId}" was not part of sale ${sale.receiptNumber}.`)
        }
        const alreadyReturned = returnedQtyByProduct[returnItem.productId] ?? 0
        const maxReturnable = li.quantity - alreadyReturned
        if (returnItem.quantity > maxReturnable) {
          throw new Error(
            `Cannot return ${returnItem.quantity} unit(s) of "${li.productName}" — only ${maxReturnable} unit(s) remain returnable (${alreadyReturned} already returned).`
          )
        }
        if (returnItem.quantity <= 0) {
          throw new Error(`Return quantity must be greater than zero for product "${li.productName}".`)
        }

        const lineTotal = li.totalPaise ?? li.totalCents ?? 0
        const proRataAmount = li.quantity > 0 ? Math.round((lineTotal / li.quantity) * returnItem.quantity) : 0
        const refundAmount =
          returnItem.refundAmountPaise !== undefined
            ? returnItem.refundAmountPaise
            : returnItem.refundAmountCents !== undefined
              ? returnItem.refundAmountCents
              : proRataAmount

        if (refundAmount < 0) {
          throw new Error(`Refund amount cannot be negative for product "${li.productName}".`)
        }

        itemsToReturn.push({
          productId: returnItem.productId,
          quantity: returnItem.quantity,
          refundAmountPaise: refundAmount,
        })
      }
    }

    if (itemsToReturn.length === 0) {
      throw new Error(`No returnable items remain for sale ${sale.receiptNumber}.`)
    }

    // --- Refund amount cap ---
    const thisRefundTotal = itemsToReturn.reduce((s, i) => s + i.refundAmountPaise, 0)
    const maxRefundable = saleTotal - alreadyRefundedPaise
    if (thisRefundTotal > maxRefundable) {
      throw new Error(
        `Refund of \u20b9${(thisRefundTotal / 100).toFixed(2)} exceeds the remaining refundable amount of \u20b9${(maxRefundable / 100).toFixed(2)}.`
      )
    }

    // --- Determine new sale status ---
    // Sale is fully refunded only when all line items have been fully returned after this return
    const afterReturnedQty: Record<string, number> = { ...returnedQtyByProduct }
    for (const i of itemsToReturn) {
      afterReturnedQty[i.productId] = (afterReturnedQty[i.productId] ?? 0) + i.quantity
    }
    const isFullyRefunded = lineItems.every(
      (li) => (afterReturnedQty[li.productId] ?? 0) >= li.quantity
    )

    const refundReceiptSuffix = existingReturns.length > 0 ? `-P${existingReturns.length + 1}` : ''
    const returnRecord: SaleReturnEntity = {
      id: `ret_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: sale.workspaceId,
      saleId: sale.id,
      branchId: sale.branchId,
      refundReceiptNumber: `REF-${sale.receiptNumber}${refundReceiptSuffix}`,
      reason: params.reason,
      returnedItems: itemsToReturn.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        refundAmountPaise: i.refundAmountPaise,
        refundAmountCents: i.refundAmountPaise,
      })),
      refundAmountPaise: thisRefundTotal,
      refundAmountCents: thisRefundTotal,
      totalRefundPaise: thisRefundTotal,
      totalRefundCents: thisRefundTotal,
      restockItems: shouldRestock,
      createdAt: now,
    }

    const tx = db.transaction(
      ['sales', 'saleReturns', 'inventory', 'stockMovements'],
      'readwrite'
    )

    sale.status = isFullyRefunded ? 'refunded' : 'partial_return'
    await tx.objectStore('sales').put(sale)
    await tx.objectStore('saleReturns').put(returnRecord)

    if (shouldRestock) {
      for (const returnItem of itemsToReturn) {
        const inv = await tx
          .objectStore('inventory')
          .index('by-branch-product')
          .get([sale.branchId, returnItem.productId])

        if (inv) {
          const newQty = inv.quantity + returnItem.quantity
          inv.quantity = newQty
          inv.quantityOnHand = newQty
          inv.status = newQty <= 0 ? 'out_of_stock' : newQty <= inv.reorderPoint ? 'low_stock' : 'in_stock'
          inv.updatedAt = now
          await tx.objectStore('inventory').put(inv)

          const lineItem = lineItems.find((l) => l.productId === returnItem.productId)
          const unitCost = lineItem
            ? (lineItem.unitCostSnapshotPaise ?? lineItem.unitCostSnapshotCents ?? 0)
            : (inv.averageCostPaise ?? inv.averageCostCents ?? 0)

          const movement: StockMovementEntity = {
            id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            workspaceId: sale.workspaceId,
            branchId: sale.branchId,
            productId: returnItem.productId,
            inventoryId: inv.id,
            type: 'sale_return',
            quantityDelta: returnItem.quantity,
            resultingQuantity: newQty,
            unitCostPaise: unitCost,
            unitCostCents: unitCost,
            referenceType: 'sale_return',
            referenceId: returnRecord.id,
            notes: `Restocked from Return: ${sale.receiptNumber}`,
            createdAt: now,
          }
          await tx.objectStore('stockMovements').put(movement)
        }
      }
    }

    await tx.done
    return { sale: normalizeSale(sale), returnRecord: normalizeSaleReturn(returnRecord) }
  },

  async processReturn(params: {
    saleId: string
    reason: string
    restockItems?: boolean
    items?: Array<{
      productId: string
      quantity: number
      refundAmountPaise?: number
      refundAmountCents?: number
    }>
    workspaceId?: WorkspaceId
    branchId?: string
  }): Promise<{ sale: SaleEntity; returnRecord: SaleReturnEntity }> {
    return this.refundOrCancelSale(params)
  },
}
