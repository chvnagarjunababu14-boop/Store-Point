import { useState } from 'react'
import {
  Package,
  Sparkles,
  Database,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
} from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'

export function FirstRunModal() {
  const { isFirstRun, chooseInitialWorkspace } = useWorkspace()
  const [selectedMode, setSelectedMode] = useState<'demo' | 'live'>('demo')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isFirstRun) return null

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await chooseInitialWorkspace(selectedMode)
    } catch (err) {
      console.error('Failed to initialize chosen workspace:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-run-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 id="first-run-title" className="text-lg font-bold text-slate-900 tracking-tight">
              Welcome to StorePoint Enterprise
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your local initial workspace configuration to begin.
            </p>
          </div>
        </div>

        {/* Workspace Choices */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            StorePoint runs completely on your device with <strong>browser IndexedDB persistence</strong>. To ensure complete integrity, fictional test data is strictly isolated from real business accounting.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Option 1: Demo Workspace */}
            <button
              type="button"
              onClick={() => setSelectedMode('demo')}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                selectedMode === 'demo'
                  ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  {selectedMode === 'demo' && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  Fictional Demo Workspace
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  Pre-loads 4 multi-location retail branches, 9 hardware SKUs, seeded sales transactions, and profit metrics.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-blue-200/50 text-[11px] font-semibold text-blue-700">
                Recommended for touring features
              </div>
            </button>

            {/* Option 2: Clean Real Workspace */}
            <button
              type="button"
              onClick={() => setSelectedMode('live')}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                selectedMode === 'live'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </span>
                  {selectedMode === 'live' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  Clean Live Workspace
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  Start with a pristine blank database. Zero dummy items or simulated orders. Ready for your genuine commercial inventory.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-emerald-200/50 text-[11px] font-semibold text-emerald-700">
                Ready for actual store operations
              </div>
            </button>
          </div>

          {/* Privacy & Storage Notice */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <HardDrive className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800">100% Client-Side Local Storage:</span>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Data is stored in this browser profile and device. You can switch between Demo and Live workspaces or export JSON backups at any time.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero cloud analytics or data leaks</span>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Initializing Local Store...</span>
              </>
            ) : (
              <>
                <span>Enter StorePoint</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
