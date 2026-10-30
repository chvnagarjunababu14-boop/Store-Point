import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  X,
  Store,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  LayoutDashboard,
} from 'lucide-react'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [storeName, setStoreName] = useState('Apex Retail Commerce')
  const [industry, setIndustry] = useState('Electronics & Hardware')
  const [topology, setTopology] = useState('multi')
  const [isInitializing, setIsInitializing] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isInitialized) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen, isInitialized])

  // Close on ESC key and basic focus trapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleInitialize = (e: React.FormEvent) => {
    e.preventDefault()
    setIsInitializing(true)
    setTimeout(() => {
      setIsInitializing(false)
      setIsInitialized(true)
    }, 600)
  }

  const handleResetAndClose = () => {
    setIsInitialized(false)
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Backdrop click dismiss */}
      <div
        className="fixed inset-0"
        aria-hidden="true"
        onClick={handleResetAndClose}
      />

      {/* Modal Dialog Body */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 z-10 space-y-6 text-left"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
                StorePoint Local Sandbox Setup
              </h3>
              <p className="text-xs text-slate-500">
                Configure your local store environment parameters.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phase Disclaimer Notice */}
        <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-start gap-2.5 text-xs text-blue-900">
          <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold">Local sandbox:</strong> Sample catalog and branches stay in this browser. Switch to a live workspace anytime from Settings.
          </div>
        </div>

        {!isInitialized ? (
          <form onSubmit={handleInitialize} className="space-y-4">
            {/* Store Name Input */}
            <div className="space-y-1.5">
              <label htmlFor="store-name-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Storefront or Business Name
              </label>
              <input
                ref={inputRef}
                id="store-name-input"
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent transition-all"
                placeholder="e.g., Summit Retailers — Flagship"
              />
            </div>

            {/* Industry Template */}
            <div className="space-y-1.5">
              <label htmlFor="industry-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Industry Inventory Template
              </label>
              <select
                id="industry-select"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all cursor-pointer"
              >
                <option value="Electronics & Hardware">Consumer Electronics & Hardware</option>
                <option value="Fashion & Apparel">Fashion, Apparel & Footwear</option>
                <option value="Specialty Groceries & Market">Specialty Groceries & Fresh Goods</option>
                <option value="General Retail">General Merchandise & Sundries</option>
              </select>
            </div>

            {/* Branch Topology */}
            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Branch Architecture
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTopology('single')}
                  aria-pressed={topology === 'single'}
                  className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    topology === 'single'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold">Single Location</div>
                  <div className="text-[11px] text-slate-500 font-normal">Independent boutique or shop</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTopology('multi')}
                  aria-pressed={topology === 'multi'}
                  className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    topology === 'multi'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold">Multi-Branch</div>
                  <div className="text-[11px] text-slate-500 font-normal">3+ outlets & warehouse</div>
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isInitializing}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-sm shadow-blue-600/25 transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                {isInitializing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Allocating Local Engine...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Initialize Local Sandbox</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation State */
          <div className="space-y-5 text-center py-2 animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900">
                Sandbox Environment Ready!
              </h4>
              <p className="text-xs text-slate-600">
                Local parameters for <strong className="text-slate-900 font-semibold">"{storeName}"</strong> have been successfully simulated.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-left space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Industry:</span>
                <span className="font-semibold text-slate-800">{industry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Topology:</span>
                <span className="font-semibold text-slate-800">
                  {topology === 'single' ? 'Single Outlet' : 'Multi-Branch (4 Outlets + Hub)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Storage Mode:</span>
                <span className="text-emerald-600 font-bold">100% Local (IndexedDB Ready)</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Link
                to="/app"
                onClick={handleResetAndClose}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Launch StorePoint Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <a
                href="#preview"
                onClick={handleResetAndClose}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                <span>Inspect Landing Page Preview</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
