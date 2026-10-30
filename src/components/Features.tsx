import {
  PackageSearch,
  Store,
  DollarSign,
  Flame,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
  Zap,
  Barcode,
  Lock,
} from 'lucide-react'

interface FeaturesProps {
  onOpenGetStarted: () => void
}

export function Features({ onOpenGetStarted }: FeaturesProps) {
  return (
    <section id="features" className="py-16 lg:py-24 bg-white border-b border-navy-200/80 scroll-mt-16 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200/90 text-brand-700 text-xs font-semibold shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            <span>High-Precision Commerce Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-navy-950 tracking-tight leading-tight">
            Engineered for the reality of <span className="sp-gradient-text">running a retail business</span>
          </h2>

          <p className="text-base sm:text-lg text-navy-600 leading-relaxed font-normal">
            Multi-branch synchronization, sub-millisecond barcode checkout, automated COGS, replenishment triggers, and real-time margin protection — without cloud lock-in.
          </p>
        </div>

        {/* Modern Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Bento Card 1: Multi-Branch Inventory (Spans 2 columns on lg) */}
          <div className="lg:col-span-2 rounded-2xl border border-navy-200/90 bg-gradient-to-br from-slate-50/80 via-white to-blue-50/20 p-7 sm:p-8 flex flex-col justify-between space-y-6 shadow-xs hover:shadow-md hover:border-brand-300 transition-all duration-200 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <PackageSearch className="w-5 h-5" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-brand-50 text-brand-700 border border-brand-200/60 uppercase tracking-wider">
                  Multi-Branch Sync
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-navy-950 tracking-tight">
                  Multi-Branch Inventory &amp; Stock Transfers
                </h3>
                <p className="text-xs font-semibold text-brand-600 mt-1">
                  Precision stock routing across flagship stores, express kiosks, and regional depots.
                </p>
              </div>

              <p className="text-xs sm:text-sm text-navy-600 leading-relaxed">
                Centralize your master product catalog across all retail outlets. Barcode lookups, incoming supplier POs, and inter-branch transfers execute instantaneously on your machine with zero cloud roundtrip latency.
              </p>

              {/* Visual Branch Nodes Pill Display */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                <div className="p-3 rounded-xl bg-white border border-navy-200/80 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-navy-900">
                    <Store className="w-3.5 h-3.5 text-brand-600" />
                    Downtown Flagship
                  </div>
                  <div className="font-mono text-[11px] text-emerald-600 font-semibold">1,890 SKUs · 98.4% Healthy</div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-navy-200/80 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-navy-900">
                    <Store className="w-3.5 h-3.5 text-brand-600" />
                    Westside Mall
                  </div>
                  <div className="font-mono text-[11px] text-emerald-600 font-semibold">1,120 SKUs · 97.1% Healthy</div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-navy-200/80 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-navy-900">
                    <Store className="w-3.5 h-3.5 text-brand-600" />
                    Airport Kiosk
                  </div>
                  <div className="font-mono text-[11px] text-amber-600 font-semibold">410 SKUs · 1 Restock Alert</div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-navy-100 text-xs">
              <span className="font-mono text-navy-500">Fast Inter-Branch Transfer Protocol</span>
              <button
                type="button"
                onClick={onOpenGetStarted}
                className="inline-flex items-center gap-1.5 font-bold text-brand-600 hover:text-brand-800 transition-colors cursor-pointer group/btn"
              >
                <span>Try in Sandbox</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* Bento Card 2: Sub-Millisecond Barcode POS */}
          <div className="rounded-2xl border border-navy-200/90 bg-slate-50/60 p-7 flex flex-col justify-between space-y-6 shadow-xs hover:bg-white hover:shadow-md hover:border-brand-300 transition-all duration-200 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase tracking-wider">
                  0ms Latency
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-navy-950 tracking-tight">
                  Instant Barcode &amp; POS Checkout
                </h3>
                <p className="text-xs font-semibold text-indigo-600 mt-1">
                  Immediate scanning without buffering spinners.
                </p>
              </div>

              <p className="text-xs sm:text-sm text-navy-600 leading-relaxed">
                Scan UPC, EAN, or custom SKU barcodes directly. Each line item deducts stock in real-time, snapshots historical purchase costs, and generates clean printable receipts in under a second.
              </p>

              <div className="p-3.5 rounded-xl bg-white border border-navy-200/80 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-navy-800 flex items-center gap-1.5">
                    <Barcode className="w-3.5 h-3.5 text-indigo-600" />
                    SKU-9921-X Barcode Scan
                  </span>
                  <span className="font-mono text-emerald-600 font-bold">&lt; 0.4 ms</span>
                </div>
                <div className="w-full bg-navy-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-full rounded-full" />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-navy-100 flex items-center justify-between text-xs">
              <span className="text-navy-500 font-mono">Full Offline POS</span>
              <button
                type="button"
                onClick={onOpenGetStarted}
                className="font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Demo Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bento Card 3: Real-Time Profit & Loss (COGS) */}
          <div className="rounded-2xl border border-navy-200/90 bg-slate-50/60 p-7 flex flex-col justify-between space-y-6 shadow-xs hover:bg-white hover:shadow-md hover:border-emerald-300 transition-all duration-200 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase tracking-wider">
                  Margin Engine
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-navy-950 tracking-tight">
                  Real-Time P&amp;L &amp; COGS Calculation
                </h3>
                <p className="text-xs font-semibold text-emerald-600 mt-1">
                  Automated cost-of-goods deduction on every transaction.
                </p>
              </div>

              <p className="text-xs sm:text-sm text-navy-600 leading-relaxed">
                Never wait for month-end accounting again. StorePoint continuously tracks your Cost of Goods Sold (COGS), operating expenses, and exact net profit percentages dynamically with every item rung up.
              </p>

              <ul className="space-y-2 pt-2 border-t border-navy-100">
                <li className="flex items-center gap-2 text-xs text-navy-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Real-time COGS deduction per checkout</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-navy-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Instant gross &amp; net operating profit telemetry</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 border-t border-navy-100">
              <span className="font-mono text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                Weighted Average &amp; Exact Cent Accuracy
              </span>
            </div>
          </div>

          {/* Bento Card 4: Best Sellers & Margin Velocity */}
          <div className="rounded-2xl border border-navy-200/90 bg-slate-50/60 p-7 flex flex-col justify-between space-y-6 shadow-xs hover:bg-white hover:shadow-md hover:border-orange-300 transition-all duration-200 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Flame className="w-5 h-5" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200/60 uppercase tracking-wider">
                  Revenue Drivers
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-navy-950 tracking-tight">
                  Best-Sellers &amp; Margin Velocity
                </h3>
                <p className="text-xs font-semibold text-orange-600 mt-1">
                  Identify the high-margin products funding your business.
                </p>
              </div>

              <p className="text-xs sm:text-sm text-navy-600 leading-relaxed">
                Automated velocity algorithms rank products by revenue, unit turnover, and gross profit contribution. Projected runout dates ensure popular products are restocked well before customer demand peaks.
              </p>

              <div className="p-3 rounded-xl bg-white border border-navy-200/80 shadow-2xs space-y-1 text-xs">
                <div className="font-semibold text-navy-900 flex justify-between">
                  <span>Logitech MX Master 3S</span>
                  <span className="font-mono text-emerald-600 font-bold">+₹4,200 profit</span>
                </div>
                <div className="text-[11px] text-navy-500 font-mono">Velocity: 28 units/wk · Runout: 14 days</div>
              </div>
            </div>

            <div className="pt-2 border-t border-navy-100 flex items-center justify-between text-xs">
              <span className="text-navy-500 font-mono">Stockout Forecasting</span>
              <button
                type="button"
                onClick={onOpenGetStarted}
                className="font-bold text-orange-600 hover:text-orange-800 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View Drivers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bento Card 5: Dead Stock & Capital Defense */}
          <div className="rounded-2xl border border-navy-200/90 bg-slate-50/60 p-7 flex flex-col justify-between space-y-6 shadow-xs hover:bg-white hover:shadow-md hover:border-amber-300 transition-all duration-200 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60 uppercase tracking-wider">
                  Capital Defense
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-navy-950 tracking-tight">
                  Dead-Stock &amp; Aging Inventory
                </h3>
                <p className="text-xs font-semibold text-amber-700 mt-1">
                  Unlock trapped working capital before items depreciate.
                </p>
              </div>

              <p className="text-xs sm:text-sm text-navy-600 leading-relaxed">
                Sitting inventory is frozen cash. StorePoint calculates Days of Inventory on Hand (DOH) and surfaces dormant items that have exceeded velocity thresholds, recommending bundles or targeted markdowns.
              </p>

              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs space-y-1">
                <div className="font-semibold text-amber-900 flex justify-between">
                  <span>Slow-Moving Flag Triggered</span>
                  <span className="font-mono text-amber-800 font-bold">DOH &gt; 90 Days</span>
                </div>
                <div className="text-[11px] text-amber-700 font-mono">₹48,200 dormant capital flagged for clearance</div>
              </div>
            </div>

            <div className="pt-2 border-t border-navy-100 flex items-center justify-between text-xs">
              <span className="text-navy-500 font-mono">Automated Liquidation Alerts</span>
              <button
                type="button"
                onClick={onOpenGetStarted}
                className="font-bold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Inspect Alerts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Technical Guarantee Banner (Air-Gapped Privacy) */}
        <div
          id="why-local"
          className="scroll-mt-24 rounded-3xl border border-navy-800 bg-[#090d16] text-white p-8 sm:p-10 lg:p-12 shadow-xl relative overflow-hidden"
        >
          {/* Subtle radiant background aura */}
          <div
            className="absolute top-0 right-0 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none -z-10"
            aria-hidden="true"
          />

          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-emerald-300 text-xs font-semibold backdrop-blur-md">
              <Lock className="w-3.5 h-3.5" />
              <span>100% Local-First &amp; Air-Gapped Privacy</span>
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Zero cloud latency. Your ledger never leaves your hardware.
            </h3>

            <p className="text-sm sm:text-base text-navy-300 leading-relaxed font-normal">
              Cloud SaaS tools lock up when the internet hiccups, leak customer lists, and hike subscription prices. StorePoint runs directly in this browser using persistent IndexedDB. Export your complete data ledger anytime as encrypted JSON or standardized CSV.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white/[0.05] border border-white/10 space-y-1">
                <div className="text-xs font-bold text-white">Full Offline Resiliency</div>
                <div className="text-[11px] text-navy-400">Rings up sales during storms, basement operations, and outages.</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.05] border border-white/10 space-y-1">
                <div className="text-xs font-bold text-white">Instant Sub-ms Access</div>
                <div className="text-[11px] text-navy-400">Zero roundtrip delay across catalog lookups and calculations.</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.05] border border-white/10 space-y-1">
                <div className="text-xs font-bold text-white">No Subscription Extortion</div>
                <div className="text-[11px] text-navy-400">100% free sandbox and self-hosted lifetime workflow.</div>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={onOpenGetStarted}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-md shadow-brand-600/30 transition-all cursor-pointer"
              >
                Launch Sandbox Workspace
              </button>
              <span className="text-xs text-navy-400">No account or credit card required.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
