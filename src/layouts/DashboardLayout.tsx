import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Package,
  LayoutDashboard,
  Store,
  Boxes,
  ShoppingCart,
  BarChart3,
  FileText,
  Settings,
  Menu,
  X,
  Bell,
  Search,
  Plus,
  ExternalLink,
  ChevronDown,
  AlertTriangle,
  Sparkles,
  Database,
  RotateCcw,
  Zap,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/utils/cn'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useBranches } from '@/hooks/useBranches'
import { useInventory } from '@/hooks/useInventory'
import { FirstRunModal } from '@/components/workspace/FirstRunModal'
import { Button } from '@/components/ui'

export interface DashboardContextType {
  activeBranchId: string
  setActiveBranchId: (id: string) => void
}

type NavItem = {
  label: string
  href: string
  icon: typeof LayoutDashboard
  exact?: boolean
  badge?: string
}

export function DashboardLayout() {
  const {
    workspaceMode,
    setWorkspaceMode,
    activeBranchId,
    setActiveBranchId,
    resetDemoWorkspace,
  } = useWorkspace()

  const { branches } = useBranches()
  const { items: inventoryItems } = useInventory()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [alertsDropdownOpen, setAlertsDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const mobileNavId = useId()
  const drawerRef = useRef<HTMLDivElement>(null)
  const alertsRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const lowStockAlerts = inventoryItems.filter(
    (i) => i.status === 'low_stock' || i.status === 'out_of_stock'
  )

  const navGroups: { label: string; items: NavItem[] }[] = [
    {
      label: 'Operations',
      items: [
        { label: 'Overview', href: '/app', icon: LayoutDashboard, exact: true },
        { label: 'Branches', href: '/app/branches', icon: Store },
        {
          label: 'Inventory',
          href: '/app/inventory',
          icon: Package,
          badge: lowStockAlerts.length > 0 ? String(lowStockAlerts.length) : undefined,
        },
        { label: 'Products', href: '/app/products', icon: Boxes },
        { label: 'Sales & POS', href: '/app/sales', icon: ShoppingCart },
      ],
    },
    {
      label: 'Insights & Analytics',
      items: [
        { label: 'Analytics', href: '/app/analytics', icon: BarChart3 },
        { label: 'Intelligence', href: '/app/intelligence', icon: Sparkles },
        { label: 'Reports', href: '/app/reports', icon: FileText },
      ],
    },
    {
      label: 'Configuration',
      items: [{ label: 'Settings', href: '/app/settings', icon: Settings }],
    },
  ]

  const currentBranch =
    activeBranchId === 'all'
      ? { name: 'All Branches (Consolidated)', code: 'ALL' }
      : branches.find((b) => b.id === activeBranchId) || { name: 'All Branches', code: 'ALL' }

  // Derive current section name for breadcrumb
  const currentSectionName = (() => {
    const path = location.pathname
    if (path === '/app') return 'Overview'
    if (path.includes('branches')) return 'Branches'
    if (path.includes('inventory')) return 'Inventory'
    if (path.includes('products')) return 'Products'
    if (path.includes('sales')) return 'Sales & POS'
    if (path.includes('analytics')) return 'Analytics'
    if (path.includes('intelligence')) return 'Product Intelligence'
    if (path.includes('reports')) return 'Reports'
    if (path.includes('settings')) return 'Settings'
    return 'Dashboard'
  })()

  const closeMobile = () => setMobileSidebarOpen(false)

  // Hotkey listener for Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    setMobileSidebarOpen(false)
    setAlertsDropdownOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileSidebarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    drawerRef.current?.querySelector<HTMLElement>('a,button')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [mobileSidebarOpen])

  useEffect(() => {
    if (!alertsDropdownOpen) return
    const onPointer = (e: MouseEvent) => {
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setAlertsDropdownOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAlertsDropdownOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [alertsDropdownOpen])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    navigate(`/app/products?q=${encodeURIComponent(q)}`)
  }

  const renderNav = (onNavigate?: () => void) =>
    navGroups.map((group) => (
      <div key={group.label} className="space-y-1">
        <div className="px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-navy-400">
          {group.label}
        </div>
        {group.items.map((item) => {
          const Icon = item.icon
          const isActive = item.exact
            ? location.pathname === item.href
            : location.pathname.startsWith(item.href)

          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.exact}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group relative flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950',
                isActive
                  ? 'bg-brand-600 text-white shadow-sm font-semibold'
                  : 'text-navy-300 hover:text-white hover:bg-white/[0.07]'
              )}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isActive ? 'text-white' : 'text-navy-400 group-hover:text-navy-200'
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full font-mono tabular-nums',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </div>
    ))

  return (
    <div className="min-h-screen bg-navy-50/70 text-navy-900 font-sans flex flex-col lg:flex-row">
      <FirstRunModal />

      {/* Modern Desktop Sidebar with Obsidian Aesthetic */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-[#090d16] text-navy-300 border-r border-navy-800/80 shrink-0 select-none">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-4 border-b border-navy-800/80 bg-[#090d16]/90 backdrop-blur-md">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Package className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-[15px] text-white tracking-tight block leading-tight">
                StorePoint
              </span>
              <span className="text-[10px] font-medium text-navy-400 block">Local-first retail</span>
            </div>
          </Link>
        </div>

        {/* Workspace Mode & Branch Context Widget */}
        <div className="px-3.5 py-3 border-b border-navy-800/80 space-y-2.5 bg-white/[0.02]">
          <div
            className={cn(
              'flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider',
              workspaceMode === 'demo'
                ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                : 'bg-emerald-950/30 text-emerald-300 border-emerald-800/50'
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {workspaceMode === 'demo' ? (
                <Sparkles className="w-3 h-3 text-amber-400" aria-hidden="true" />
              ) : (
                <Database className="w-3 h-3 text-emerald-400" aria-hidden="true" />
              )}
              {workspaceMode === 'demo' ? 'Demo Sandbox' : 'Live Workspace'}
            </span>
            <span className="font-mono normal-case tracking-normal opacity-75 text-[10px]">IndexedDB</span>
          </div>

          <div className="px-1 space-y-1">
            <div className="text-[10px] font-bold text-navy-400 uppercase tracking-wider">
              Active Location
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-navy-100 truncate">{currentBranch.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-900/60 text-brand-300 border border-brand-700/50 shrink-0">
                {currentBranch.code}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-2 space-y-3 overflow-y-auto" aria-label="Dashboard">
          {renderNav()}
        </nav>

        {/* Sidebar Footer Link */}
        <div className="p-3 border-t border-navy-800/80 bg-white/[0.01]">
          <Link
            to="/"
            className="flex items-center justify-between text-xs text-navy-400 hover:text-white transition-colors px-2 py-2 rounded-lg hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-brand-400" aria-hidden="true" />
              StorePoint Landing
            </span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-navy-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation"
              aria-controls={mobileNavId}
              aria-expanded={mobileSidebarOpen}
              className="lg:hidden p-2 rounded-lg text-navy-600 hover:bg-navy-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 cursor-pointer"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Breadcrumb Indicator */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-navy-500">
              <span className="text-navy-400">StorePoint</span>
              <span className="text-navy-300">/</span>
              <span className="font-bold text-navy-900">{currentSectionName}</span>
            </div>

            {/* Global Search Input with Ctrl+K Pill */}
            <form onSubmit={handleSearchSubmit} className="relative hidden md:block w-64 lg:w-80 ml-2">
              <Search
                className="w-4 h-4 text-navy-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Search catalog or SKUs…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search products"
                className="w-full pl-9 pr-14 py-2 rounded-lg border border-navy-200 bg-navy-50/70 text-xs text-navy-800 placeholder:text-navy-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:bg-white transition-all shadow-2xs"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-navy-400 bg-white border border-navy-200 rounded shadow-2xs pointer-events-none">
                Ctrl K
              </kbd>
            </form>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Branch Switcher Select */}
            <div className="relative">
              <select
                value={activeBranchId}
                onChange={(e) => setActiveBranchId(e.target.value)}
                aria-label="Filter by branch"
                className="max-w-[10rem] sm:max-w-none px-3 py-2 rounded-lg border border-navy-200/90 bg-white text-xs font-semibold text-navy-800 hover:border-navy-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 cursor-pointer pr-8 appearance-none shadow-2xs transition-colors"
              >
                <option value="all">All Outlets ({branches.length})</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="w-3.5 h-3.5 text-navy-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
            </div>

            {/* Notifications / Alerts Drawer */}
            <div className="relative" ref={alertsRef}>
              <button
                type="button"
                onClick={() => setAlertsDropdownOpen((o) => !o)}
                aria-label={`Inventory alerts${lowStockAlerts.length ? `, ${lowStockAlerts.length}` : ''}`}
                aria-expanded={alertsDropdownOpen}
                className="relative p-2 rounded-lg text-navy-600 hover:text-navy-900 hover:bg-navy-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 cursor-pointer transition-colors"
              >
                <Bell className="w-4 h-4" aria-hidden="true" />
                {lowStockAlerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                )}
              </button>

              <AnimatePresence>
                {alertsDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    role="menu"
                    className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white border border-navy-200/90 shadow-xl p-4 z-50 text-xs space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-navy-100 pb-2.5">
                      <span className="font-bold text-navy-900 inline-flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden="true" />
                        <span>Inventory Alerts ({lowStockAlerts.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setAlertsDropdownOpen(false)}
                        aria-label="Close alerts"
                        className="p-1 rounded text-navy-400 hover:text-navy-700 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {lowStockAlerts.length === 0 ? (
                        <p className="text-navy-500 text-center py-4">No low-stock alerts right now. All inventories healthy!</p>
                      ) : (
                        lowStockAlerts.map((alert) => (
                          <div
                            key={alert.id}
                            className={cn(
                              'p-2.5 rounded-lg border text-left space-y-1',
                              alert.status === 'out_of_stock'
                                ? 'bg-red-50/70 border-red-200 text-red-900'
                                : 'bg-amber-50/70 border-amber-200 text-amber-900'
                            )}
                          >
                            <div className="font-semibold text-xs flex justify-between gap-2">
                              <span className="truncate">{alert.productName}</span>
                              <span className="font-mono font-bold shrink-0">
                                {alert.quantity} / min {alert.reorderPoint}
                              </span>
                            </div>
                            <div className="text-[10px] text-navy-500 flex justify-between gap-2">
                              <span className="truncate">{alert.branchName}</span>
                              <span className="font-mono">{alert.sku}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pt-2 border-t border-navy-100 text-center">
                      <NavLink
                        to="/app/inventory"
                        onClick={() => setAlertsDropdownOpen(false)}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-800"
                      >
                        Manage Stock in Inventory →
                      </NavLink>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick POS Checkout Action */}
            <Button
              size="sm"
              className="!py-2 shadow-xs shadow-brand-600/25"
              onClick={() => navigate('/app/sales')}
              leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              <span className="hidden sm:inline">New Checkout</span>
              <span className="sm:hidden">Sale</span>
            </Button>
          </div>
        </header>

        {/* Workspace Mode Sub-Header Bar */}
        {workspaceMode === 'demo' ? (
          <div className="bg-amber-50/80 border-b border-amber-200/80 px-4 sm:px-6 py-2 flex items-center justify-between gap-2 text-xs text-amber-950">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
              <span className="truncate">
                <strong>Demo Sandbox</strong> — exploring sample retail records. Changes here do not affect live business data.
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={resetDemoWorkspace}
                className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100/90 px-2 py-1 rounded-md border border-amber-300 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" aria-hidden="true" />
                Reset Data
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceMode('live')}
                className="font-mono text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/90 px-2.5 py-1 rounded-md border border-emerald-300 cursor-pointer"
              >
                Switch to Live
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/80 border-b border-emerald-200/80 px-4 sm:px-6 py-2 flex items-center justify-between gap-2 text-xs text-emerald-950">
            <div className="flex items-center gap-2 min-w-0">
              <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
              <span className="truncate">
                <strong>Live Workspace</strong> — private IndexedDB encrypted on this browser.
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <NavLink
                to="/app/settings"
                className="font-mono text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300"
              >
                Backup Database
              </NavLink>
              <button
                type="button"
                onClick={() => setWorkspaceMode('demo')}
                className="font-mono text-[11px] font-semibold text-navy-600 hover:text-navy-900 px-2 py-1 cursor-pointer"
              >
                Demo Sandbox
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto w-full mx-auto max-w-[90rem]">
          <Outlet context={{ activeBranchId, setActiveBranchId }} />
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex" role="presentation">
          <button
            type="button"
            className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs cursor-default"
            aria-label="Close navigation overlay"
            onClick={closeMobile}
          />

          <div
            id={mobileNavId}
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="relative w-72 max-w-[85%] bg-[#090d16] text-navy-200 p-4 flex flex-col z-10 shadow-2xl h-full border-r border-navy-800"
          >
            <div className="flex items-center justify-between border-b border-navy-800 pb-4 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center">
                  <Package className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <span className="font-bold text-white text-base block">StorePoint</span>
                  <span className="text-[10px] text-brand-400 block font-medium">
                    {workspaceMode === 'demo' ? 'Demo mode' : 'Live mode'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeMobile}
                aria-label="Close navigation"
                className="p-2 rounded-lg text-navy-400 hover:text-white hover:bg-navy-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto space-y-2" aria-label="Mobile dashboard">
              {renderNav(closeMobile)}
            </nav>

            <div className="pt-3 border-t border-navy-800">
              <Link
                to="/"
                onClick={closeMobile}
                className="flex items-center justify-between text-xs text-navy-400 hover:text-white px-2 py-2"
              >
                <span>Back to landing</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
