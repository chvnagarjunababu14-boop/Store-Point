import { getDb } from '@/lib/db'
import type {
  StorePointBackupFile,
  WorkspaceId,
} from '@/types/database'

export interface BackupValidationResult {
  valid: boolean
  error?: string
  warnings?: string[]
  backup?: StorePointBackupFile
  preview?: {
    appVersion: string
    schemaVersion: number
    exportedAt: string
    workspaceId: WorkspaceId
    branchesCount: number
    productsCount: number
    inventoryCount: number
    salesCount: number
    purchasesCount: number
    expensesCount: number
    transfersCount: number
    returnsCount: number
    movementsCount: number
    totalInventoryValuePaise: number
    totalSalesValuePaise: number
  }
}

const MAX_BACKUP_SIZE_BYTES = 50 * 1024 * 1024 // 50MB limit

function isFiniteNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val)
}

export const backupService = {
  /**
   * Export all records belonging to a workspace as a formatted, versioned JSON backup file
   */
  async createBackup(workspaceId: WorkspaceId): Promise<StorePointBackupFile> {
    const db = await getDb()

    const branches = await db.getAllFromIndex('branches', 'by-workspace', workspaceId)
    const products = await db.getAllFromIndex('products', 'by-workspace', workspaceId)
    const inventory = await db.getAllFromIndex('inventory', 'by-workspace', workspaceId)
    const purchases = await db.getAllFromIndex('purchases', 'by-workspace', workspaceId)
    const purchaseLineItems = await db.getAllFromIndex('purchaseLineItems', 'by-workspace', workspaceId)
    const sales = await db.getAllFromIndex('sales', 'by-workspace', workspaceId)
    const saleLineItems = await db.getAllFromIndex('saleLineItems', 'by-workspace', workspaceId)
    const saleReturns = await db.getAllFromIndex('saleReturns', 'by-workspace', workspaceId)
    const operatingExpenses = await db.getAllFromIndex('operatingExpenses', 'by-workspace', workspaceId)
    const stockMovements = await db.getAllFromIndex('stockMovements', 'by-workspace', workspaceId)
    const stockTransfers = await db.getAllFromIndex('stockTransfers', 'by-workspace', workspaceId)

    const backup: StorePointBackupFile = {
      format: 'storepoint-backup',
      version: 1,
      schemaVersion: 1,
      appVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      workspaceId,
      counts: {
        branches: branches.length,
        products: products.length,
        inventory: inventory.length,
        sales: sales.length,
        purchases: purchases.length,
        expenses: operatingExpenses.length,
      },
      metadata: {
        branchesCount: branches.length,
        productsCount: products.length,
        inventoryCount: inventory.length,
        salesCount: sales.length,
        purchasesCount: purchases.length,
        expensesCount: operatingExpenses.length,
        transfersCount: stockTransfers.length,
      },
      data: {
        branches,
        products,
        inventory,
        purchases,
        purchaseLineItems,
        sales,
        saleLineItems,
        saleReturns,
        operatingExpenses,
        stockMovements,
        stockTransfers,
        settings: [],
      },
    }

    return backup
  },

  /**
   * Export workspace backup directly to formatted JSON string
   */
  async exportBackup(workspaceId: WorkspaceId): Promise<string> {
    const backup = await this.createBackup(workspaceId)
    return JSON.stringify(backup, null, 2)
  },

  /**
   * Trigger browser file download of the backup JSON
   */
  downloadBackupFile(backup: StorePointBackupFile): void {
    const jsonString = JSON.stringify(backup, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateStr = backup.exportedAt.replace(/[:.]/g, '-').slice(0, 19)
    a.href = url
    a.download = `storepoint_backup_${backup.workspaceId}_${dateStr}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  /**
   * Validate uploaded backup JSON string prior to touching any storage.
   * Performs deep schema validation, relationship checks, and money field safety.
   */
  validateBackup(jsonString: string): BackupValidationResult & {
    isValid: boolean
    errorMessage?: string
    metadata?: {
      branchCount: number
      productCount: number
      inventoryCount: number
      salesCount: number
    }
  } {
    // 1. File Size Protection
    if (jsonString.length > MAX_BACKUP_SIZE_BYTES) {
      return {
        valid: false,
        isValid: false,
        error: 'Backup file exceeds maximum allowed size of 50MB.',
        errorMessage: 'Backup file exceeds maximum allowed size of 50MB.',
      }
    }

    // 2. Syntax Validation
    let parsed: any
    try {
      parsed = JSON.parse(jsonString)
    } catch {
      return {
        valid: false,
        isValid: false,
        error: 'Malformed JSON syntax. Could not parse backup file.',
        errorMessage: 'Malformed JSON syntax. Could not parse backup file.',
      }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        valid: false,
        isValid: false,
        error: 'Backup root must be a valid JSON object.',
        errorMessage: 'Backup root must be a valid JSON object.',
      }
    }

    // 3. Format & Schema Version Checking
    if (parsed.format && parsed.format !== 'storepoint-backup') {
      return {
        valid: false,
        isValid: false,
        error: 'Not a recognized StorePoint backup file (invalid format identifier).',
        errorMessage: 'Not a recognized StorePoint backup file (invalid format identifier).',
      }
    }

    const version = parsed.schemaVersion ?? parsed.version
    if (typeof version !== 'number' || version < 1) {
      return {
        valid: false,
        isValid: false,
        error: 'Missing or incompatible backup schema version.',
        errorMessage: 'Missing or incompatible backup schema version.',
      }
    }

    if (version > 2) {
      return {
        valid: false,
        isValid: false,
        error: `Unsupported schema version (${version}). Please update StorePoint application.`,
        errorMessage: `Unsupported schema version (${version}). Please update StorePoint application.`,
      }
    }

    // 4. Data Payload Validation
    if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
      return {
        valid: false,
        isValid: false,
        error: 'Backup is missing the core "data" payload object.',
        errorMessage: 'Backup is missing the core "data" payload object.',
      }
    }

    const data = parsed.data
    const warnings: string[] = []

    // Ensure array structures
    const branches = Array.isArray(data.branches) ? data.branches : []
    const products = Array.isArray(data.products) ? data.products : []
    const inventory = Array.isArray(data.inventory) ? data.inventory : []
    const sales = Array.isArray(data.sales) ? data.sales : []
    const saleLineItems = Array.isArray(data.saleLineItems) ? data.saleLineItems : []
    const saleReturns = Array.isArray(data.saleReturns) ? data.saleReturns : []
    const purchases = Array.isArray(data.purchases) ? data.purchases : []
    const purchaseLineItems = Array.isArray(data.purchaseLineItems) ? data.purchaseLineItems : []
    const operatingExpenses = Array.isArray(data.operatingExpenses) ? data.operatingExpenses : []
    const stockMovements = Array.isArray(data.stockMovements) ? data.stockMovements : []
    const stockTransfers = Array.isArray(data.stockTransfers) ? data.stockTransfers : []

    // 5. Deep Entity Field & Numeric Money Integrity Checks
    const branchIds = new Set<string>()
    for (const b of branches) {
      if (!b.id || typeof b.id !== 'string') {
        return { valid: false, isValid: false, error: 'Branch record is missing a valid "id".', errorMessage: 'Branch record is missing a valid "id".' }
      }
      if (!b.name || typeof b.name !== 'string') {
        return { valid: false, isValid: false, error: `Branch ${b.id} is missing a valid "name".`, errorMessage: `Branch ${b.id} is missing a valid "name".` }
      }
      branchIds.add(b.id)
    }

    const productIds = new Set<string>()
    for (const p of products) {
      if (!p.id || typeof p.id !== 'string') {
        return { valid: false, isValid: false, error: 'Product record is missing a valid "id".', errorMessage: 'Product record is missing a valid "id".' }
      }
      if (!p.sku || typeof p.sku !== 'string') {
        return { valid: false, isValid: false, error: `Product "${p.name || p.id}" is missing a valid SKU.`, errorMessage: `Product "${p.name || p.id}" is missing a valid SKU.` }
      }
      // Numeric money checks
      const cost = p.costPricePaise ?? p.costPriceCents
      if (cost !== undefined && !isFiniteNumber(cost)) {
        return { valid: false, isValid: false, error: `Product ${p.sku} has an invalid numeric cost value.`, errorMessage: `Product ${p.sku} has an invalid numeric cost value.` }
      }
      const sell = p.sellingPricePaise ?? p.sellingPriceCents
      if (sell !== undefined && !isFiniteNumber(sell)) {
        return { valid: false, isValid: false, error: `Product ${p.sku} has an invalid numeric selling price.`, errorMessage: `Product ${p.sku} has an invalid numeric selling price.` }
      }
      productIds.add(p.id)
    }

    let totalInventoryValuePaise = 0
    for (const inv of inventory) {
      if (!inv.id || !inv.branchId || !inv.productId) {
        return { valid: false, isValid: false, error: 'Inventory record has missing required foreign keys.', errorMessage: 'Inventory record has missing required foreign keys.' }
      }
      const qty = inv.quantityOnHand !== undefined ? inv.quantityOnHand : inv.quantity
      if (!isFiniteNumber(qty)) {
        return { valid: false, isValid: false, error: `Inventory item ${inv.id} has invalid non-numeric quantity.`, errorMessage: `Inventory item ${inv.id} has invalid non-numeric quantity.` }
      }
      const cost = inv.averageCostPaise ?? inv.averageCostCents ?? 0
      if (!isFiniteNumber(cost)) {
        return { valid: false, isValid: false, error: `Inventory item ${inv.id} has invalid non-numeric cost.`, errorMessage: `Inventory item ${inv.id} has invalid non-numeric cost.` }
      }
      totalInventoryValuePaise += Math.max(0, qty * cost)

      // Relationship checks
      if (branches.length > 0 && !branchIds.has(inv.branchId)) {
        warnings.push(`Inventory item ${inv.id} references branch ID "${inv.branchId}" which is not in this backup.`)
      }
      if (products.length > 0 && !productIds.has(inv.productId)) {
        warnings.push(`Inventory item ${inv.id} references product ID "${inv.productId}" which is not in this backup.`)
      }
    }

    let totalSalesValuePaise = 0
    for (const s of sales) {
      if (!s.id || !s.branchId || !s.receiptNumber) {
        return { valid: false, isValid: false, error: 'Sale record has missing required fields (id, branchId, receiptNumber).', errorMessage: 'Sale record has missing required fields.' }
      }
      const total = s.totalPaise ?? s.totalCents ?? 0
      if (!isFiniteNumber(total)) {
        return { valid: false, isValid: false, error: `Sale ${s.receiptNumber} has invalid non-numeric total amount.`, errorMessage: `Sale ${s.receiptNumber} has invalid non-numeric total.` }
      }
      totalSalesValuePaise += total
    }

    for (const exp of operatingExpenses) {
      if (!exp.id || !exp.category) {
        return { valid: false, isValid: false, error: 'Operating expense record missing required fields.', errorMessage: 'Operating expense record missing required fields.' }
      }
      const amt = exp.amountPaise ?? exp.amountCents ?? 0
      if (!isFiniteNumber(amt)) {
        return { valid: false, isValid: false, error: `Expense ${exp.id} has invalid non-numeric amount.`, errorMessage: `Expense ${exp.id} has invalid non-numeric amount.` }
      }
    }

    for (const tr of stockTransfers) {
      if (!tr.id || !tr.sourceBranchId || !tr.destinationBranchId || !tr.productId) {
        return { valid: false, isValid: false, error: 'Stock transfer record missing required branch or product keys.', errorMessage: 'Stock transfer record missing required keys.' }
      }
      if (!isFiniteNumber(tr.quantity)) {
        return { valid: false, isValid: false, error: `Stock transfer ${tr.id} has invalid non-numeric quantity.`, errorMessage: `Stock transfer ${tr.id} has invalid non-numeric quantity.` }
      }
    }

    const validBackup: StorePointBackupFile = {
      format: 'storepoint-backup',
      version: version,
      schemaVersion: version,
      appVersion: parsed.appVersion || '1.0.0',
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      workspaceId: parsed.workspaceId || 'live',
      counts: {
        branches: branches.length,
        products: products.length,
        inventory: inventory.length,
        sales: sales.length,
        purchases: purchases.length,
        expenses: operatingExpenses.length,
      },
      metadata: {
        branchesCount: branches.length,
        productsCount: products.length,
        inventoryCount: inventory.length,
        salesCount: sales.length,
        purchasesCount: purchases.length,
        expensesCount: operatingExpenses.length,
        transfersCount: stockTransfers.length,
      },
      data: {
        branches,
        products,
        inventory,
        purchases,
        purchaseLineItems,
        sales,
        saleLineItems,
        saleReturns,
        operatingExpenses,
        stockMovements,
        stockTransfers,
        settings: Array.isArray(data.settings) ? data.settings : [],
      },
    }

    return {
      valid: true,
      isValid: true,
      backup: validBackup,
      warnings,
      metadata: {
        branchCount: branches.length,
        productCount: products.length,
        inventoryCount: inventory.length,
        salesCount: sales.length,
      },
      preview: {
        appVersion: validBackup.appVersion || '1.0.0',
        schemaVersion: version,
        exportedAt: validBackup.exportedAt || new Date().toISOString(),
        workspaceId: validBackup.workspaceId || 'live',
        branchesCount: branches.length,
        productsCount: products.length,
        inventoryCount: inventory.length,
        salesCount: sales.length,
        purchasesCount: purchases.length,
        expensesCount: operatingExpenses.length,
        transfersCount: stockTransfers.length,
        returnsCount: saleReturns.length,
        movementsCount: stockMovements.length,
        totalInventoryValuePaise,
        totalSalesValuePaise,
      },
    }
  },

  /**
   * Safely restore a validated backup into the target workspace with atomic transaction rollback.
   * Cleans only target workspace data and writes normalized records.
   */
  async restoreBackup(
    backupInput: StorePointBackupFile | string,
    targetWorkspace: WorkspaceId
  ): Promise<void> {
    let backup: StorePointBackupFile
    if (typeof backupInput === 'string') {
      const res = this.validateBackup(backupInput)
      if (!res.valid || !res.backup) {
        throw new Error(res.error || 'Invalid backup payload')
      }
      backup = res.backup
    } else {
      // Re-validate object structure for safety
      const validation = this.validateBackup(JSON.stringify(backupInput))
      if (!validation.valid || !validation.backup) {
        throw new Error(validation.error || 'Invalid backup payload')
      }
      backup = validation.backup
    }

    const db = await getDb()

    const stores = [
      'branches',
      'products',
      'inventory',
      'stockMovements',
      'purchases',
      'purchaseLineItems',
      'sales',
      'saleLineItems',
      'saleReturns',
      'operatingExpenses',
      'stockTransfers',
    ] as const

    // Open atomic transaction across all stores
    const tx = db.transaction(stores, 'readwrite')

    try {
      // 1. Clear target workspace records
      for (const storeName of stores) {
        const store = tx.objectStore(storeName)
        if ('by-workspace' in store.indexNames) {
          const records = await store.index('by-workspace').getAll(targetWorkspace)
          for (const record of records) {
            const r = record as { id: string }
            if (r.id) {
              await store.delete(r.id)
            }
          }
        }
      }

      // 2. Normalization & Insertion (Preserves all fields & converts legacy Cents to canonical Paise)
      const { data } = backup

      for (const b of data.branches || []) {
        await tx.objectStore('branches').put({ ...b, workspaceId: targetWorkspace })
      }

      for (const p of data.products || []) {
        const cost = p.costPricePaise ?? p.costPriceCents ?? 0
        const sell = p.sellingPricePaise ?? p.sellingPriceCents ?? 0
        await tx.objectStore('products').put({
          ...p,
          workspaceId: targetWorkspace,
          costPricePaise: cost,
          costPriceCents: cost,
          sellingPricePaise: sell,
          sellingPriceCents: sell,
        })
      }

      for (const i of data.inventory || []) {
        const cost = i.averageCostPaise ?? i.averageCostCents ?? 0
        await tx.objectStore('inventory').put({
          ...i,
          workspaceId: targetWorkspace,
          averageCostPaise: cost,
          averageCostCents: cost,
          quantityOnHand: i.quantityOnHand !== undefined ? i.quantityOnHand : i.quantity,
        })
      }

      for (const po of data.purchases || []) {
        const cost = po.totalCostPaise ?? po.totalCostCents ?? 0
        await tx.objectStore('purchases').put({
          ...po,
          workspaceId: targetWorkspace,
          totalCostPaise: cost,
          totalCostCents: cost,
        })
      }

      for (const poi of data.purchaseLineItems || []) {
        const unit = poi.unitCostPaise ?? poi.unitCostCents ?? 0
        const total = poi.totalCostPaise ?? poi.totalCostCents ?? 0
        await tx.objectStore('purchaseLineItems').put({
          ...poi,
          workspaceId: targetWorkspace,
          unitCostPaise: unit,
          unitCostCents: unit,
          totalCostPaise: total,
          totalCostCents: total,
        })
      }

      for (const s of data.sales || []) {
        const subtotal = s.subtotalPaise ?? s.subtotalCents ?? 0
        const discount = s.discountPaise ?? s.discountCents ?? 0
        const tax = s.taxPaise ?? s.taxCents ?? 0
        const total = s.totalPaise ?? s.totalCents ?? 0
        const totalCost = s.totalCostPaise ?? s.totalCostCents ?? 0
        const netProfit = s.netProfitPaise ?? s.netProfitCents ?? 0
        await tx.objectStore('sales').put({
          ...s,
          workspaceId: targetWorkspace,
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
        })
      }

      for (const sli of data.saleLineItems || []) {
        const sellPrice = sli.unitSellingPricePaise ?? sli.unitSellingPriceCents ?? 0
        const costSnap = sli.unitCostSnapshotPaise ?? sli.unitCostSnapshotCents ?? 0
        const discount = sli.discountPaise ?? sli.discountCents ?? 0
        const total = sli.totalPaise ?? sli.totalCents ?? 0
        await tx.objectStore('saleLineItems').put({
          ...sli,
          workspaceId: targetWorkspace,
          unitSellingPricePaise: sellPrice,
          unitSellingPriceCents: sellPrice,
          unitCostSnapshotPaise: costSnap,
          unitCostSnapshotCents: costSnap,
          discountPaise: discount,
          discountCents: discount,
          totalPaise: total,
          totalCents: total,
        })
      }

      for (const ret of data.saleReturns || []) {
        const refund = ret.refundAmountPaise ?? ret.refundAmountCents ?? 0
        await tx.objectStore('saleReturns').put({
          ...ret,
          workspaceId: targetWorkspace,
          refundAmountPaise: refund,
          refundAmountCents: refund,
          totalRefundPaise: refund,
          totalRefundCents: refund,
        })
      }

      for (const exp of data.operatingExpenses || []) {
        const amt = exp.amountPaise ?? exp.amountCents ?? 0
        await tx.objectStore('operatingExpenses').put({
          ...exp,
          workspaceId: targetWorkspace,
          amountPaise: amt,
          amountCents: amt,
        })
      }

      for (const m of data.stockMovements || []) {
        const cost = m.unitCostPaise ?? m.unitCostCents ?? 0
        await tx.objectStore('stockMovements').put({
          ...m,
          workspaceId: targetWorkspace,
          unitCostPaise: cost,
          unitCostCents: cost,
        })
      }

      for (const tr of data.stockTransfers || []) {
        const cost = tr.unitCostPaise ?? tr.unitCostCents ?? 0
        await tx.objectStore('stockTransfers').put({
          ...tr,
          workspaceId: targetWorkspace,
          unitCostPaise: cost,
          unitCostCents: cost,
        })
      }

      await tx.done
    } catch (err) {
      // IndexedDB auto-aborts the transaction on thrown error
      throw new Error(`Restore failed during transaction execution: ${err instanceof Error ? err.message : String(err)}`)
    }
  },
}
