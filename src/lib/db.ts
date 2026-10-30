import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  BranchEntity,
  ProductEntity,
  BranchInventoryEntity,
  StockMovementEntity,
  PurchaseEntity,
  PurchaseLineItemEntity,
  SaleEntity,
  SaleLineItemEntity,
  SaleReturnEntity,
  OperatingExpenseEntity,
  AppSettingEntity,
  StockTransferEntity,
} from '@/types/database'

export const DB_NAME = 'storepoint_local_db'
export const DB_VERSION = 2

export interface StorePointDBSchema extends DBSchema {
  branches: {
    key: string
    value: BranchEntity
    indexes: {
      'by-workspace': string
      'by-code': [string, string]
      'by-status': string
    }
  }
  products: {
    key: string
    value: ProductEntity
    indexes: {
      'by-workspace': string
      'by-sku': [string, string]
      'by-barcode': string
      'by-category': string
    }
  }
  inventory: {
    key: string
    value: BranchInventoryEntity
    indexes: {
      'by-workspace': string
      'by-branch': string
      'by-product': string
      'by-branch-product': [string, string]
      'by-status': string
    }
  }
  stockMovements: {
    key: string
    value: StockMovementEntity
    indexes: {
      'by-workspace': string
      'by-inventory': string
      'by-branch': string
      'by-product': string
      'by-type': string
      'by-created': string
    }
  }
  purchases: {
    key: string
    value: PurchaseEntity
    indexes: {
      'by-workspace': string
      'by-branch': string
      'by-status': string
      'by-orderNumber': [string, string]
      'by-created': string
    }
  }
  purchaseLineItems: {
    key: string
    value: PurchaseLineItemEntity
    indexes: {
      'by-workspace': string
      'by-purchase': string
      'by-product': string
    }
  }
  sales: {
    key: string
    value: SaleEntity
    indexes: {
      'by-workspace': string
      'by-branch': string
      'by-receipt': [string, string]
      'by-status': string
      'by-created': string
    }
  }
  saleLineItems: {
    key: string
    value: SaleLineItemEntity
    indexes: {
      'by-workspace': string
      'by-sale': string
      'by-product': string
    }
  }
  saleReturns: {
    key: string
    value: SaleReturnEntity
    indexes: {
      'by-workspace': string
      'by-sale': string
      'by-branch': string
      'by-created': string
    }
  }
  operatingExpenses: {
    key: string
    value: OperatingExpenseEntity
    indexes: {
      'by-workspace': string
      'by-branch': string
      'by-category': string
      'by-date': string
    }
  }
  stockTransfers: {
    key: string
    value: StockTransferEntity
    indexes: {
      'by-workspace': string
      'by-source-branch': string
      'by-destination-branch': string
      'by-product': string
      'by-status': string
      'by-created': string
    }
  }
  settings: {
    key: string
    value: AppSettingEntity
  }
}

let dbPromise: Promise<IDBPDatabase<StorePointDBSchema>> | null = null

/**
 * Get or initialize the persistent IndexedDB database
 */
export async function getDb(): Promise<IDBPDatabase<StorePointDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<StorePointDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion) {
        // Version 1: Initial schema
        if (oldVersion < 1) {
          // Branches
          const branchStore = db.createObjectStore('branches', { keyPath: 'id' })
          branchStore.createIndex('by-workspace', 'workspaceId')
          branchStore.createIndex('by-code', ['workspaceId', 'code'])
          branchStore.createIndex('by-status', 'status')

          // Products
          const productStore = db.createObjectStore('products', { keyPath: 'id' })
          productStore.createIndex('by-workspace', 'workspaceId')
          productStore.createIndex('by-sku', ['workspaceId', 'sku'])
          productStore.createIndex('by-barcode', 'barcode')
          productStore.createIndex('by-category', 'category')

          // Branch Inventory
          const invStore = db.createObjectStore('inventory', { keyPath: 'id' })
          invStore.createIndex('by-workspace', 'workspaceId')
          invStore.createIndex('by-branch', 'branchId')
          invStore.createIndex('by-product', 'productId')
          invStore.createIndex('by-branch-product', ['branchId', 'productId'])
          invStore.createIndex('by-status', 'status')

          // Stock Movements (Audit Trail)
          const movementStore = db.createObjectStore('stockMovements', { keyPath: 'id' })
          movementStore.createIndex('by-workspace', 'workspaceId')
          movementStore.createIndex('by-inventory', 'inventoryId')
          movementStore.createIndex('by-branch', 'branchId')
          movementStore.createIndex('by-product', 'productId')
          movementStore.createIndex('by-type', 'type')
          movementStore.createIndex('by-created', 'createdAt')

          // Purchases
          const purchaseStore = db.createObjectStore('purchases', { keyPath: 'id' })
          purchaseStore.createIndex('by-workspace', 'workspaceId')
          purchaseStore.createIndex('by-branch', 'branchId')
          purchaseStore.createIndex('by-status', 'status')
          purchaseStore.createIndex('by-orderNumber', ['workspaceId', 'orderNumber'])
          purchaseStore.createIndex('by-created', 'createdAt')

          // Purchase Line Items
          const pItemStore = db.createObjectStore('purchaseLineItems', { keyPath: 'id' })
          pItemStore.createIndex('by-workspace', 'workspaceId')
          pItemStore.createIndex('by-purchase', 'purchaseId')
          pItemStore.createIndex('by-product', 'productId')

          // Sales
          const saleStore = db.createObjectStore('sales', { keyPath: 'id' })
          saleStore.createIndex('by-workspace', 'workspaceId')
          saleStore.createIndex('by-branch', 'branchId')
          saleStore.createIndex('by-receipt', ['workspaceId', 'receiptNumber'])
          saleStore.createIndex('by-status', 'status')
          saleStore.createIndex('by-created', 'createdAt')

          // Sale Line Items
          const sItemStore = db.createObjectStore('saleLineItems', { keyPath: 'id' })
          sItemStore.createIndex('by-workspace', 'workspaceId')
          sItemStore.createIndex('by-sale', 'saleId')
          sItemStore.createIndex('by-product', 'productId')

          // Sale Returns
          const returnStore = db.createObjectStore('saleReturns', { keyPath: 'id' })
          returnStore.createIndex('by-workspace', 'workspaceId')
          returnStore.createIndex('by-sale', 'saleId')
          returnStore.createIndex('by-branch', 'branchId')
          returnStore.createIndex('by-created', 'createdAt')

          // Operating Expenses
          const expenseStore = db.createObjectStore('operatingExpenses', { keyPath: 'id' })
          expenseStore.createIndex('by-workspace', 'workspaceId')
          expenseStore.createIndex('by-branch', 'branchId')
          expenseStore.createIndex('by-category', 'category')
          expenseStore.createIndex('by-date', 'date')

          // Settings
          db.createObjectStore('settings', { keyPath: 'key' })
        }

        // Version 2: Stock Transfers
        if (oldVersion < 2) {
          const transferStore = db.createObjectStore('stockTransfers', { keyPath: 'id' })
          transferStore.createIndex('by-workspace', 'workspaceId')
          transferStore.createIndex('by-source-branch', 'sourceBranchId')
          transferStore.createIndex('by-destination-branch', 'destinationBranchId')
          transferStore.createIndex('by-product', 'productId')
          transferStore.createIndex('by-status', 'status')
          transferStore.createIndex('by-created', 'createdAt')
        }
      },
      blocked() {
        console.warn('StorePoint database open is blocked by another tab.')
      },
      blocking() {
        console.warn('StorePoint database is blocking a newer version in another tab.')
      },
      terminated() {
        console.error('StorePoint database connection abruptly terminated.')
        dbPromise = null
      },
    })
  }
  return dbPromise
}

export const getDB = getDb

/**
 * Close the current database connection (useful for tests or teardown)
 */
export async function closeDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise
    db.close()
    dbPromise = null
  }
}

export const closeDB = closeDb

/**
 * Delete the entire local database (used in testing or factory reset)
 */
export async function deleteDatabase(): Promise<void> {
  await closeDb()
  if (typeof indexedDB !== 'undefined') {
    return new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
      req.onblocked = () => resolve()
    })
  }
}

