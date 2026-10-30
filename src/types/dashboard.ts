import type { StockStatus } from './index'

export interface DashboardKPIs {
  revenue: number
  revenueChange: number
  grossProfit: number
  grossProfitMargin: number
  netProfit: number
  netProfitMargin: number
  expenses: number
  expensesChange: number
  inventoryValue: number
  totalSkus: number
  orderCount: number
}

export interface RevenueDataPoint {
  date: string
  revenue: number
  cogs: number
  expenses: number
  netProfit: number
  marginPercent: number
}

export interface BranchMetric {
  id: string
  name: string
  code: string
  locationType: 'Flagship' | 'Retail' | 'Outlet' | 'Warehouse'
  city: string
  address: string
  manager: string
  revenue: number
  grossProfit: number
  netProfit: number
  marginPercent: number
  orderCount: number
  activeSkus: number
  stockHealthPercent: number
}

export interface BestSellingProduct {
  sku: string
  name: string
  category: string
  unitsSold: number
  revenue: number
  profit: number
  marginPercent: number
  velocity: 'High' | 'Moderate' | 'Slow'
}

export interface InventoryAlertItem {
  id: string
  sku: string
  name: string
  category: string
  branch: string
  currentStock: number
  reorderLevel: number
  costPrice: number
  retailPrice: number
  status: StockStatus
  daysRemaining: number
}

export interface SalesOrder {
  id: string
  receiptNumber: string
  branch: string
  timestamp: string
  itemCount: number
  subtotal: number
  tax: number
  total: number
  netProfit: number
  paymentMethod: 'Card' | 'Cash' | 'UPI' | 'NFC / Apple Pay' | 'Store Credit'
  status: 'Completed' | 'Refunded' | 'Pending Sync'
}

export interface CategoryBreakdown {
  name: string
  value: number
  color: string
  itemCount: number
}

export interface FullInventoryItem {
  id: string
  sku: string
  name: string
  category: string
  branchId: string
  branchName: string
  quantity: number
  reorderPoint: number
  unitPrice: number
  costPrice: number
  status: StockStatus
  lastRestocked: string
  locationBin: string
}

export interface CatalogProduct {
  id: string
  sku: string
  name: string
  category: string
  costPrice: number
  retailPrice: number
  marginPercent: number
  totalStockAcrossBranches: number
  activeBranchesCount: number
  velocity: 'High' | 'Moderate' | 'Slow'
  barcode: string
}
