import { Package } from 'lucide-react'

export function LoadingSpinner({ message = 'Loading workspace...' }: { message?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4"
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center border border-brand-200">
          <Package className="w-6 h-6 text-brand-600" aria-hidden="true" />
        </div>
        <div
          className="absolute -inset-1 rounded-2xl border-2 border-brand-600/20 border-t-brand-600 motion-safe:animate-spin"
          aria-hidden="true"
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-navy-900">{message}</p>
        <p className="text-[11px] font-mono text-navy-400 mt-0.5">StorePoint</p>
      </div>
    </div>
  )
}
