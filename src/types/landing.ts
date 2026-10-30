import type { StockStatus } from './index'

export interface BranchPerformance {
  id: string
  name: string
  locationType: 'Retail' | 'Flagship' | 'Outlet' | 'Warehouse'
  city: string
  revenue: number
  profit: number
  marginPercent: number
  activeSkus: number
  stockHealthPercent: number
}

export interface DemoInventoryProduct {
  sku: string
  name: string
  category: string
  branch: string
  stockQuantity: number
  reorderLevel: number
  costPrice: number
  retailPrice: number
  marginPercent: number
  status: StockStatus
  velocity: 'Fast' | 'Moderate' | 'Slow'
}

export interface DailySalesMetric {
  day: string
  revenue: number
  profit: number
  transactions: number
}
