import { useState, useRef } from 'react'
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Database,
  Sparkles,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Laptop,
  Lock,
  FileSpreadsheet,
  AlertOctagon,
} from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { backupService, type BackupValidationResult } from '@/lib/services/backupService'
import type { WorkspaceId } from '@/types/database'
import { cn } from '@/utils/cn'
import { formatINR } from '@/utils/money'
import { useModalA11y } from '@/hooks/useModalA11y'
import { PageHeader } from '@/components/ui'

export function SettingsPage() {
  const {
    workspaceMode,
    setWorkspaceMode,
    resetDemoWorkspace,
    notifyDataChanged,
  } = useWorkspace()

  // Export State
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccessMsg, setExportSuccessMsg] = useState('')

  // Import & Validation State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const restoreModalRef = useRef<HTMLDivElement>(null)
  const resetModalRef = useRef<HTMLDivElement>(null)
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null)
  const [targetRestoreWorkspace, setTargetRestoreWorkspace] = useState<WorkspaceId>(workspaceMode)
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState('')
  const [restoreErrorMsg, setRestoreErrorMsg] = useState('')

  // Demo Reset State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetSuccessMsg, setResetSuccessMsg] = useState('')

  // Modal A11y
  useModalA11y({
    isOpen: isRestoreConfirmOpen,
    onClose: () => setIsRestoreConfirmOpen(false),
    containerRef: restoreModalRef,
  })

  useModalA11y({
    isOpen: isResetConfirmOpen,
    onClose: () => setIsResetConfirmOpen(false),
    containerRef: resetModalRef,
  })

  // Handle Export
  const handleExportBackup = async () => {
    setIsExporting(true)
    try {
      const backup = await backupService.createBackup(workspaceMode)
      backupService.downloadBackupFile(backup)
      setExportSuccessMsg(
        `Backup JSON successfully generated with ${backup.metadata.productsCount} products and ${backup.metadata.salesCount} transactions!`
      )
      setTimeout(() => setExportSuccessMsg(''), 4500)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  // Handle File Upload for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setRestoreSuccessMsg('')
    setRestoreErrorMsg('')

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const res = backupService.validateBackup(text)
      setValidationResult(res)
      if (!res.valid) {
        setRestoreErrorMsg(res.error || 'Failed to validate backup file.')
      }
    }
    reader.readAsText(file)
  }

  // Trigger Confirmation Modal
  const handleOpenRestoreConfirm = () => {
    if (!validationResult?.valid || !validationResult.backup) return
    setIsRestoreConfirmOpen(true)
  }

  // Commit Restore after Confirmation
  const handleConfirmRestore = async () => {
    if (!validationResult?.backup) return

    setIsRestoring(true)
    setRestoreErrorMsg('')
    try {
      await backupService.restoreBackup(validationResult.backup, targetRestoreWorkspace)
      setRestoreSuccessMsg(
        `Successfully restored backup into "${targetRestoreWorkspace === 'demo' ? 'Fictional Demo' : 'Clean Live'}" workspace!`
      )
      setValidationResult(null)
      setIsRestoreConfirmOpen(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      notifyDataChanged()
      setTimeout(() => setRestoreSuccessMsg(''), 5000)
    } catch (err) {
      console.error('Restore error:', err)
      setRestoreErrorMsg(err instanceof Error ? err.message : 'Failed to restore backup.')
    } finally {
      setIsRestoring(false)
    }
  }

  // Handle Demo Reset
  const handleConfirmResetDemo = async () => {
    setIsResetting(true)
    try {
      await resetDemoWorkspace()
      setResetSuccessMsg('Demo workspace has been cleanly restored to initial benchmark state!')
      setIsResetConfirmOpen(false)
      setTimeout(() => setResetSuccessMsg(''), 4000)
    } catch (err) {
      console.error('Reset demo failed:', err)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Settings className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
            <span>Settings</span>
          </>
        }
        title="Settings & backups"
        description="Workspace mode, JSON backup/restore, and local data management."
        actions={
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold font-mono border',
              workspaceMode === 'demo'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            )}
          >
            {workspaceMode === 'demo' ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                Demo workspace
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                Live workspace
              </>
            )}
          </span>
        }
      />

      <div className="bg-white rounded-xl border border-navy-200/80 p-5 sm:p-6 shadow-card space-y-4">
        <div>
          <h2 className="text-base font-semibold text-navy-900">Workspace mode</h2>
          <p className="text-xs text-navy-500 mt-0.5 leading-relaxed">
            Demo uses sample data. Live stores real records in this browser only — they never mix.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Demo Choice */}
          <div
            className={cn(
              'p-4 rounded-xl border flex flex-col justify-between transition-all',
              workspaceMode === 'demo'
                ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/10'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Fictional Demo Workspace</span>
                </span>
                {workspaceMode === 'demo' && (
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-mono">
                    CURRENT
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-normal">
                Includes sample branches, catalog SKUs, POS receipts, and operating expenses for demonstration.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWorkspaceMode('demo')}
                disabled={workspaceMode === 'demo'}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Switch to Demo
              </button>

              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Demo Records</span>
              </button>
            </div>
          </div>

          {/* Live Choice */}
          <div
            className={cn(
              'p-4 rounded-xl border flex flex-col justify-between transition-all',
              workspaceMode === 'live'
                ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/10'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>Production Live Workspace</span>
                </span>
                {workspaceMode === 'live' && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-mono">
                    CURRENT
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-normal">
                Strict commercial database with 0 dummy records. Guaranteed separate from fictional metrics.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWorkspaceMode('live')}
                disabled={workspaceMode === 'live'}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 cursor-pointer shadow-xs"
              >
                Switch to Live Workspace
              </button>
              <span className="text-[11px] text-slate-400 font-mono">100% Isolated</span>
            </div>
          </div>
        </div>

        {resetSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{resetSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Backup & Restore Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Backup Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Export Local JSON Backup</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Generate a complete restorable snapshot of all branches, catalog SKUs, stock levels, purchases, sales, transfers, and expenses currently stored in your active (
              <strong>{workspaceMode.toUpperCase()}</strong>) workspace.
            </p>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                <span>StorePoint v2 JSON Archive Specification</span>
              </div>
              <div>• Normalized integer-paise financial snapshots</div>
              <div>• Complete stock movements & inter-branch transfer audit trail</div>
              <div>• 100% offline-compatible snapshot for archival & disaster recovery</div>
            </div>

            {exportSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{exportSuccessMsg}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={isExporting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Packaging JSON...' : `Download ${workspaceMode.toUpperCase()} Backup JSON`}</span>
            </button>
          </div>
        </div>

        {/* Restore Backup Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Restore from JSON Backup</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload a previously exported StorePoint JSON backup file. The backup is strictly validated before any local tables are touched.
            </p>

            {/* File Picker */}
            <div>
              <label
                htmlFor="backup-file-upload"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Select Backup File (.json)
              </label>
              <input
                id="backup-file-upload"
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={handleFileChange}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
              />
            </div>

            {restoreErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{restoreErrorMsg}</span>
              </div>
            )}

            {restoreSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{restoreSuccessMsg}</span>
              </div>
            )}

            {/* Enhanced Validation Preview */}
            {validationResult?.valid && validationResult.preview && (
              <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs space-y-3">
                <div className="font-bold text-blue-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>Backup Validated Successfully</span>
                  </span>
                  <span className="font-mono text-[10px] text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 font-semibold">
                    Schema v{validationResult.preview.schemaVersion}
                  </span>
                </div>

                {/* Metric Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700 font-mono text-[11px] bg-white/70 p-2.5 rounded border border-blue-100">
                  <div>Branches: <strong className="text-slate-900">{validationResult.preview.branchesCount}</strong></div>
                  <div>Products: <strong className="text-slate-900">{validationResult.preview.productsCount}</strong></div>
                  <div>Inventory Items: <strong className="text-slate-900">{validationResult.preview.inventoryCount}</strong></div>
                  <div>Sales Orders: <strong className="text-slate-900">{validationResult.preview.salesCount}</strong></div>
                  <div>Purchases: <strong className="text-slate-900">{validationResult.preview.purchasesCount}</strong></div>
                  <div>Expenses: <strong className="text-slate-900">{validationResult.preview.expensesCount}</strong></div>
                  <div>Stock Transfers: <strong className="text-slate-900">{validationResult.preview.transfersCount}</strong></div>
                  <div>Customer Returns: <strong className="text-slate-900">{validationResult.preview.returnsCount}</strong></div>
                  <div>Movements: <strong className="text-slate-900">{validationResult.preview.movementsCount}</strong></div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-white/80 p-2 rounded border border-blue-100">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Inventory Valuation</span>
                    <span className="text-slate-900 font-bold font-mono">
                      {formatINR(validationResult.preview.totalInventoryValuePaise)}
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-blue-100">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Sales Recorded</span>
                    <span className="text-slate-900 font-bold font-mono">
                      {formatINR(validationResult.preview.totalSalesValuePaise)}
                    </span>
                  </div>
                </div>

                {/* Validation Warnings (if any) */}
                {validationResult.warnings && validationResult.warnings.length > 0 && (
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                    <div className="font-semibold flex items-center gap-1 text-amber-800">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>{validationResult.warnings.length} Warning(s) Detected:</span>
                    </div>
                    {validationResult.warnings.slice(0, 3).map((w, idx) => (
                      <div key={idx} className="font-mono text-[10px]">• {w}</div>
                    ))}
                    {validationResult.warnings.length > 3 && (
                      <div className="font-mono text-[10px] text-amber-700">
                        + {validationResult.warnings.length - 3} additional non-fatal warnings
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-blue-200/60">
                  <label htmlFor="restore-target-workspace" className="block text-[11px] font-semibold text-blue-950 mb-1">
                    Select Destination Workspace:
                  </label>
                  <select
                    id="restore-target-workspace"
                    value={targetRestoreWorkspace}
                    onChange={(e) => setTargetRestoreWorkspace(e.target.value as WorkspaceId)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-blue-300 bg-white text-xs font-medium text-slate-800 focus:outline-none"
                  >
                    <option value="live">Clean Live Workspace (Production)</option>
                    <option value="demo">Fictional Demo Workspace</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleOpenRestoreConfirm}
              disabled={!validationResult?.valid || isRestoring}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>Review & Restore to {targetRestoreWorkspace === 'live' ? 'Live Workspace' : 'Demo Workspace'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Data Management & Privacy Information Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Data Management & Privacy Guarantees</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            StorePoint is built local-first. Understanding how your records are stored ensures commercial resilience and privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Local-First IndexedDB Architecture */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span>100% On-Device IndexedDB Storage</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              All commercial entities, product SKUs, POS receipts, and inventory records are stored directly inside your browser’s IndexedDB database engine. Zero operational data is ever uploaded to cloud servers, remote databases, or external analytics endpoints.
            </p>
          </div>

          {/* Card 2: Browser Site Data Clearing Alert */}
          <div className="bg-white rounded-xl border border-amber-200/80 bg-amber-50/20 p-4 space-y-2 shadow-xs">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <AlertOctagon className="w-4 h-4 text-amber-600" />
              <span>Browser Cache & Site Data Policy</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Clearing your browser's site storage, cookies, or history will permanently purge local IndexedDB databases. Incognito or private browsing modes also delete all data once the window is closed. <strong>Download regular JSON backups to secure your data.</strong>
            </p>
          </div>

          {/* Card 3: Multi-Device Isolation */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Laptop className="w-4 h-4 text-indigo-600" />
              <span>Device & Profile Isolation</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Because StorePoint does not use a cloud backend, records saved on this computer do not automatically synchronize to other devices or browsers. To migrate your workspace to a new POS terminal or laptop, export a JSON backup and restore it on the target machine.
            </p>
          </div>

          {/* Card 4: Backup File Security */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Backup File Confidentiality & Security</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Exported StorePoint backup files contain complete plain-text business records including profit margins, expense categories, and sales figures. Keep exported files stored on encrypted storage media or secure offline backups.
            </p>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {isRestoreConfirmOpen && validationResult?.preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div ref={restoreModalRef} className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 id="restore-modal-title" className="text-base font-bold text-slate-900">
                Confirm Database Restore & Overwrite?
              </h3>
            </div>

            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Destructive Overwrite Warning</span>
              </div>
              <p className="leading-relaxed">
                Restoring will permanently replace all existing records in your{' '}
                <strong className="underline uppercase">{targetRestoreWorkspace} workspace</strong>. Any sales, inventory changes, or expenses in that workspace not included in this backup will be permanently erased.
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Summary of Incoming Records:
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-slate-700">
                <div>• Branches: {validationResult.preview.branchesCount}</div>
                <div>• Products: {validationResult.preview.productsCount}</div>
                <div>• Inventory: {validationResult.preview.inventoryCount}</div>
                <div>• Sales Orders: {validationResult.preview.salesCount}</div>
                <div>• Purchases: {validationResult.preview.purchasesCount}</div>
                <div>• Expenses: {validationResult.preview.expensesCount}</div>
                <div>• Transfers: {validationResult.preview.transfersCount}</div>
                <div>• Returns: {validationResult.preview.returnsCount}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRestoreConfirmOpen(false)}
                disabled={isRestoring}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isRestoring ? 'Restoring Workspace...' : 'Yes, Overwrite & Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Demo Confirmation Modal */}
      {isResetConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div ref={resetModalRef} className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 id="reset-modal-title" className="text-base font-bold text-slate-900">Reset Demo Workspace?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This action will reset all fictional demo branches, products, inventory, and sales back to the original standard benchmark dataset. Your <strong>Clean Live Workspace</strong> will remain completely untouched.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetDemo}
                disabled={isResetting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isResetting ? 'Resetting...' : 'Yes, Reset Demo Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

