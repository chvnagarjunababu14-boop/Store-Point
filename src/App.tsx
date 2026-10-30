import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WorkspaceProvider } from '@/context/WorkspaceContext'
import { LoadingSpinner } from '@/components/LoadingSpinner'

// Route-level code splitting: separates heavy charts, tables, and algorithms from initial bundle
const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })))
const DashboardLayout = lazy(() => import('@/layouts/DashboardLayout').then((m) => ({ default: m.DashboardLayout })))
const OverviewPage = lazy(() => import('@/pages/dashboard/OverviewPage').then((m) => ({ default: m.OverviewPage })))
const BranchesPage = lazy(() => import('@/pages/dashboard/BranchesPage').then((m) => ({ default: m.BranchesPage })))
const InventoryPage = lazy(() => import('@/pages/dashboard/InventoryPage').then((m) => ({ default: m.InventoryPage })))
const ProductsPage = lazy(() => import('@/pages/dashboard/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const SalesPage = lazy(() => import('@/pages/dashboard/SalesPage').then((m) => ({ default: m.SalesPage })))
const AnalyticsPage = lazy(() => import('@/pages/dashboard/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const ProductIntelligencePage = lazy(() =>
  import('@/pages/dashboard/ProductIntelligencePage').then((m) => ({ default: m.ProductIntelligencePage }))
)
const ReportsPage = lazy(() => import('@/pages/dashboard/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage').then((m) => ({ default: m.SettingsPage })))

export default function App() {
  return (
    <WorkspaceProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner message="Loading StorePoint..." />}>
          <Routes>
            {/* Landing Page Route */}
            <Route path="/" element={<LandingPage />} />

            {/* Dashboard Application Shell and Nested Views */}
            <Route path="/app" element={<DashboardLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="branches" element={<BranchesPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="sales" element={<SalesPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="intelligence" element={<ProductIntelligencePage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all redirect to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </WorkspaceProvider>
  )
}

