import { useState, useMemo, useRef } from 'react'
import {
  Store,
  Plus,
  CheckCircle2,
  Building,
  MapPin,
  Archive,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useBranches } from '@/hooks/useBranches'
import { useFinancialSummary } from '@/hooks/useFinancialSummary'
import { useWorkspace } from '@/context/WorkspaceContext'
import { formatMoney } from '@/utils/money'
import type { BranchLocationType } from '@/types/database'
import { useModalA11y } from '@/hooks/useModalA11y'
import {
  PageHeader,
  Button,
  FilterBar,
  EmptyState,
  IconButton,
  Badge,
  DialogHeader,
  DialogFooter,
} from '@/components/ui'

export function BranchesPage() {
  const { workspaceMode } = useWorkspace()
  const { branches, loading, addBranch, archiveBranch } = useBranches()
  const { branchPerformance } = useFinancialSummary()

  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const addModalRef = useRef<HTMLDivElement>(null)

  useModalA11y({
    isOpen: isAddModalOpen,
    onClose: () => setIsAddModalOpen(false),
    containerRef: addModalRef,
  })

  const [newBranchCode, setNewBranchCode] = useState('')
  const [newBranchName, setNewBranchName] = useState('')
  const [newBranchCity, setNewBranchCity] = useState('')
  const [newBranchAddress, setNewBranchAddress] = useState('')
  const [newBranchManager, setNewBranchManager] = useState('')
  const [newBranchType, setNewBranchType] = useState<BranchLocationType>('Retail')
  const [modalError, setModalError] = useState('')
  const [modalSuccess, setModalSuccess] = useState('')

  // Map performance by branch id
  const perfMap = useMemo(() => {
    return new Map(branchPerformance.map((p) => [p.branchId, p]))
  }, [branchPerformance])

  const filteredBranches = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    setModalSuccess('')

    if (!newBranchName.trim()) {
      setModalError('Store name is required.')
      return
    }

    const code = newBranchCode.trim().toUpperCase() || `BR-0${branches.length + 1}`

    try {
      await addBranch({
        code,
        name: newBranchName.trim(),
        locationType: newBranchType,
        city: newBranchCity.trim() || 'Metro District',
        address: newBranchAddress.trim() || 'Commercial Suite 100',
        manager: newBranchManager.trim() || 'Store Manager',
      })

      setModalSuccess(`Branch "${newBranchName}" successfully created in persistent storage!`)
      setTimeout(() => {
        setIsAddModalOpen(false)
        setNewBranchCode('')
        setNewBranchName('')
        setNewBranchCity('')
        setNewBranchAddress('')
        setNewBranchManager('')
        setModalSuccess('')
      }, 1200)
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to create branch.')
    }
  }

  const handleArchive = async (id: string, name: string) => {
    if (confirm(`Archive branch "${name}"? It will no longer receive new inventory or sales.`)) {
      try {
        await archiveBranch(id)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to archive branch')
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Store className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
            <span>Branches</span>
            <span className="text-navy-300">/</span>
            <span className="text-navy-700 normal-case tracking-normal">
              {workspaceMode === 'demo' ? 'Demo locations' : 'Live network'}
            </span>
          </>
        }
        title="Store locations"
        description="Manage branches, compare performance, and set the context for inventory and sales."
        actions={
          <Button size="sm" onClick={() => setIsAddModalOpen(true)} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>
            Add location
          </Button>
        }
      />

      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name, city, or code…"
        searchLabel="Search branches"
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-500">
          <Building className="w-4 h-4 text-navy-400" aria-hidden="true" />
          {branches.length} active {branches.length === 1 ? 'location' : 'locations'}
        </span>
      </FilterBar>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {loading ? (
          <div className="col-span-full space-y-3" aria-busy="true">
            <div className="h-36 sp-skeleton rounded-xl" />
            <div className="h-36 sp-skeleton rounded-xl" />
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<Store className="w-5 h-5" aria-hidden="true" />}
              title={branches.length === 0 ? 'No branches yet' : 'No matching branches'}
              description={
                branches.length === 0
                  ? 'Add your first store location to start tracking inventory and sales.'
                  : 'Try a different search query.'
              }
              action={
                branches.length === 0 ? (
                  <Button size="sm" onClick={() => setIsAddModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                    Create first branch
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          filteredBranches.map((branch) => {
            const perf = perfMap.get(branch.id)
            const grossSales = perf ? perf.grossSalesCents : 0
            const netProfit = perf ? perf.netProfitCents : 0
            const margin = perf ? perf.netMarginPercent : 0
            const orders = perf ? perf.orderCount : 0
            const skus = perf ? perf.activeSkus : 0
            const stockHealth = perf ? perf.stockHealthPercent : 100

            return (
              <div
                key={branch.id}
                className="bg-white rounded-xl border border-navy-200/80 p-4 sm:p-5 shadow-card hover:border-brand-200 transition-colors flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="sp-num text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
                        {branch.code}
                      </span>
                      <span className="text-[11px] font-semibold text-navy-500 uppercase tracking-wider">
                        {branch.locationType}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge
                        tone={stockHealth >= 90 ? 'success' : stockHealth >= 70 ? 'warning' : 'danger'}
                        icon={<CheckCircle2 className="w-2.5 h-2.5" aria-hidden="true" />}
                      >
                        {stockHealth}% in stock
                      </Badge>
                      <IconButton
                        label={`Archive ${branch.name}`}
                        tone="danger"
                        onClick={() => handleArchive(branch.id, branch.name)}
                      >
                        <Archive className="w-3.5 h-3.5" aria-hidden="true" />
                      </IconButton>
                    </div>
                  </div>

                  <h3 className="font-bold text-navy-900 text-base mb-1">{branch.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-navy-500 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-navy-400 shrink-0" aria-hidden="true" />
                    <span>
                      {branch.address}, {branch.city}
                    </span>
                  </div>

                  {/* Financial & Inventory Benchmarks */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/70 p-3 rounded-lg border border-slate-100 text-xs mb-3 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">
                        Gross Sales
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatMoney(grossSales)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">
                        Net Profit
                      </span>
                      <span className="font-bold text-emerald-600">
                        {formatMoney(netProfit)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">
                        Net Margin
                      </span>
                      <span className="font-bold text-blue-600">{margin}%</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Manager: <strong className="text-slate-700">{branch.manager}</strong></span>
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span>{orders} orders</span>
                    <span>{skus} SKUs</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Branch Modal */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-branch-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="fixed inset-0 bg-navy-950/55"
            onClick={() => setIsAddModalOpen(false)}
            aria-hidden="true"
          />

          <div
            ref={addModalRef}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-navy-200 overflow-hidden z-10"
          >
            <DialogHeader
              titleId="add-branch-modal-title"
              title="Add store location"
              description="Create a branch for inventory and sales context"
              icon={<Store className="w-4 h-4" aria-hidden="true" />}
              onClose={() => setIsAddModalOpen(false)}
            />

            <form onSubmit={handleAddBranch} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. Uptown Plaza Outlet"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch Code
                  </label>
                  <input
                    type="text"
                    value={newBranchCode}
                    onChange={(e) => setNewBranchCode(e.target.value)}
                    placeholder="e.g. BR-05"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Facility Type
                  </label>
                  <select
                    value={newBranchType}
                    onChange={(e) => setNewBranchType(e.target.value as BranchLocationType)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Retail">Retail Store</option>
                    <option value="Flagship">Flagship Store</option>
                    <option value="Outlet">Outlet / Kiosk</option>
                    <option value="Warehouse">Warehouse Depot</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City / Area
                  </label>
                  <input
                    type="text"
                    value={newBranchCity}
                    onChange={(e) => setNewBranchCity(e.target.value)}
                    placeholder="e.g. Downtown Metro"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    General Manager
                  </label>
                  <input
                    type="text"
                    value={newBranchManager}
                    onChange={(e) => setNewBranchManager(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  placeholder="e.g. 520 Commerce Boulevard, Suite 10"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <DialogFooter className="!px-0 !pb-0 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 mt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Save branch
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      )}

      {/* Storage Mode Notice */}
      <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
        <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800">
            {workspaceMode === 'demo' ? 'Demo Sandbox Mode' : 'Live IndexedDB Database'}:
          </strong>{' '}
          All store branch records are saved locally with relational integrity.
        </div>
      </div>
    </div>
  )
}
