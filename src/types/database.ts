/**
 * StorePoint Database Schema & Entity Types
 * All financial values are strictly represented in integer minor currency units (cents/paise)
 * to eliminate floating-point IEEE-754 precision issues.
 */

export type WorkspaceId = 'demo' | 'live'

export type BranchLocationType = 'Flagship' | 'Retail' | 'Outlet' | 'Warehouse'
export type BranchStatus = 'active' | 'archived'

export interface BranchEntity {
  id: string
  workspaceId: WorkspaceId
  code: string
  name: string
  locationType: BranchLocationType
  city: string
  address: string
  manager: string
  phone?: string
  status: BranchStatus
  isActive?: boolean
  createdAt: string
  updatedAt: string
}

export type ProductStatus = 'active' | 'archived'

export interface ProductEntity {
  id: string
  workspaceId: WorkspaceId
  sku: string
  barcode: string
  name: string
  category: string
  unit?: string // e.g. 'pcs', 'kg', 'box', 'litre'
  description?: string
  costPricePaise?: number
  costPriceCents?: number // Legacy alias
  sellingPricePaise?: number
  sellingPriceCents?: number // Legacy alias
  reorderPoint: number
  isActive?: boolean // Legacy alias for status === 'active'
  status: ProductStatus
  createdAt: string
  updatedAt: string
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'reordered'

export interface BranchInventoryEntity {
  id: string
  workspaceId: WorkspaceId
  branchId: string
  productId: string
  quantity: number
  quantityOnHand?: number
  reorderPoint: number
  locationBin: string
  averageCostPaise?: number
  averageCostCents?: number // Legacy alias
  lastRestockedAt?: string
  status: StockStatus
  updatedAt: string
}

export type StockMovementType =
  | 'opening_stock'
  | 'purchase_received'
  | 'sale'
  | 'sale_return'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment'
  | 'write_off'

export interface StockMovementEntity {
  id: string
  workspaceId: WorkspaceId
  branchId: string
  productId: string
  inventoryId: string
  type: StockMovementType
  quantityDelta: number
  resultingQuantity: number
  unitCostPaise?: number
  unitCostCents?: number // Legacy alias
  referenceType?: 'purchase' | 'sale' | 'sale_return' | 'manual'
  referenceId?: string
  notes?: string
  createdAt: string
}

export type PurchaseStatus = 'draft' | 'ordered' | 'received' | 'cancelled'

export interface PurchaseEntity {
  id: string
  workspaceId: WorkspaceId
  branchId: string
  orderNumber: string
  supplierName: string
  /** Optional supplier contact details — phase 6 additions, backward compatible */
  supplierPhone?: string
  supplierEmail?: string
  supplierRef?: string // Supplier's own order/invoice reference
  status: PurchaseStatus
  totalCostPaise?: number
  totalCostCents?: number // Legacy alias
  notes?: string
  orderedAt: string
  receivedAt?: string
  createdAt: string
  updatedAt: string
}

export interface PurchaseLineItemEntity {
  id: string
  workspaceId: WorkspaceId
  purchaseId: string
  productId: string
  quantityOrdered: number
  quantityReceived: number
  unitCostPaise?: number
  unitCostCents?: number // Legacy alias
  totalCostPaise?: number
  totalCostCents?: number // Legacy alias
}

export type SaleStatus = 'completed' | 'partial_return' | 'refunded' | 'cancelled'
export type PaymentMethod = 'Card' | 'Cash' | 'UPI' | 'NFC / Apple Pay' | 'Store Credit' | 'card' | 'cash' | 'upi'

export interface SaleEntity {
  id: string
  workspaceId: WorkspaceId
  branchId: string
  receiptNumber: string
  subtotalPaise?: number
  subtotalCents?: number // Legacy alias
  discountPaise?: number
  discountCents?: number // Legacy alias
  taxPaise?: number
  taxCents?: number // Legacy alias
  totalPaise?: number
  totalCents?: number // Legacy alias
  totalCostPaise?: number
  totalCostCents?: number // Legacy alias
  netProfitPaise?: number
  netProfitCents?: number // Legacy alias
  paymentMethod: PaymentMethod
  status: SaleStatus
  notes?: string
  createdAt: string
}

export interface SaleLineItemEntity {
  id: string
  workspaceId: WorkspaceId
  saleId: string
  productId: string
  productName: string
  sku: string
  quantity: number
  unitSellingPricePaise?: number
  unitSellingPriceCents?: number // Legacy alias
  unitCostSnapshotPaise?: number
  unitCostSnapshotCents?: number // Legacy alias
  discountPaise?: number
  discountCents?: number // Legacy alias
  totalPaise?: number
  totalCents?: number // Legacy alias
}

export interface SaleReturnLineItem {
  productId: string
  quantity: number
  refundAmountPaise: number
  refundAmountCents: number // Legacy alias
}

export interface SaleReturnEntity {
  id: string
  workspaceId: WorkspaceId
  saleId: string
  branchId: string
  refundReceiptNumber: string
  reason: string
  /** Per-line items returned in this return record */
  returnedItems?: SaleReturnLineItem[]
  refundAmountPaise?: number
  refundAmountCents?: number // Legacy alias
  totalRefundPaise?: number
  totalRefundCents?: number // Legacy alias
  restockItems: boolean
  createdAt: string
}

export type ExpenseCategory =
  | 'Rent & Facilities'
  | 'Payroll & Staff'
  | 'Utilities & Internet'
  | 'Logistics & Packaging'
  | 'Marketing & Ads'
  | 'Insurance & Legal'
  | 'Maintenance'
  | 'Other'
  | 'rent'
  | 'payroll'
  | 'utilities'
  | 'marketing'
  | 'maintenance'
  | 'supplies'
  | 'other'

export interface OperatingExpenseEntity {
  id: string
  workspaceId: WorkspaceId
  branchId: string
  category: ExpenseCategory
  description: string
  amountPaise?: number
  amountCents?: number // Legacy alias
  date: string
  paymentMethod?: string
  receiptRef?: string
  createdAt: string
}

export interface AppSettingEntity {
  key: string
  value: unknown
  updatedAt: string
}

// ─── Phase 6: Stock Transfers ─────────────────────────────────────────────────

export type StockTransferStatus = 'draft' | 'dispatched' | 'received' | 'cancelled'

export interface StockTransferEntity {
  id: string
  workspaceId: WorkspaceId
  referenceNumber: string
  sourceBranchId: string
  destinationBranchId: string
  productId: string
  quantity: number
  status: StockTransferStatus
  /** Cost used for stock movement valuation (averageCostPaise of source at time of dispatch) */
  unitCostPaise?: number
  unitCostCents?: number // Legacy alias
  notes?: string
  /** ISO timestamp when status changed to dispatched (stock deducted from source) */
  dispatchedAt?: string
  /** ISO timestamp when status changed to received (stock added to destination) */
  receivedAt?: string
  createdAt: string
  updatedAt: string
}

export interface StorePointBackupFile {
  format?: string
  schemaVersion?: number
  version: number
  exportedAt: string
  appVersion: string
  workspaceId: WorkspaceId
  counts?: {
    branches: number
    products: number
    inventory: number
    sales: number
    purchases: number
    expenses: number
  }
  metadata: {
    branchesCount: number
    productsCount: number
    inventoryCount: number
    salesCount: number
    purchasesCount: number
    expensesCount: number
    transfersCount?: number
  }
  data: {
    branches: BranchEntity[]
    products: ProductEntity[]
    inventory: BranchInventoryEntity[]
    purchases: PurchaseEntity[]
    purchaseLineItems: PurchaseLineItemEntity[]
    sales: SaleEntity[]
    saleLineItems: SaleLineItemEntity[]
    saleReturns: SaleReturnEntity[]
    operatingExpenses: OperatingExpenseEntity[]
    stockMovements: StockMovementEntity[]
    stockTransfers?: StockTransferEntity[]
    settings: AppSettingEntity[]
  }
}
