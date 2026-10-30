/**
 * Core type definitions for StorePoint
 */

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'reordered'

export interface InventoryItem {
  id: string
  sku: string
  name: string
  category: string
  quantity: number
  reorderPoint: number
  unitPrice: number
  costPrice: number
  status: StockStatus
  updatedAt: string
}

export interface MetricCardData {
  title: string
  value: string | number
  changePercent?: number
  isPositive?: boolean
  description?: string
  status?: StockStatus
}

export interface NavItem {
  label: string
  href: string
  icon?: string
  badge?: string | number
}
