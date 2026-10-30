import { Store, ShoppingCart, TrendingUp, ArrowRight, CheckCircle2, Zap } from 'lucide-react'

interface HowItWorksProps {
  onOpenGetStarted: () => void
}

export function HowItWorks({ onOpenGetStarted }: HowItWorksProps) {
  const steps = [
    {
      stepNumber: '01',
      title: 'Initialize Outlets & Master Catalog',
      subtitle: 'Configure stores and import your SKU ledger in seconds.',
      description:
        'Set up retail locations, pop-up kiosks, or regional distribution depots. Bulk import products via CSV or create SKUs with unit cost prices, selling MSRPs, and min/max safety reorder thresholds.',
      icon: Store,
      points: [
        'Multi-outlet architecture configured in 60s',
        'Automatic barcode & SKU instant indexing',
        'Immutable cost basis & target safety margins',
      ],
      tag: 'Step 1: Setup',
      badgeColor: 'bg-brand-50 text-brand-700 border-brand-200/80',
    },
    {
      stepNumber: '02',
      title: 'Process Sales & Stock Movements',
      subtitle: 'Sub-millisecond barcode checkout with zero cloud buffering.',
      description:
        'Ring up sales, record incoming supplier deliveries, and transfer inventory between branches directly on your device. Every operation is immediately committed to high-speed IndexedDB storage.',
      icon: ShoppingCart,
      points: [
        'Zero-lag checkout entry & barcode scanning',
        'Rock-solid continuity during total internet outages',
        'Instant multi-outlet stock level deduction',
      ],
      tag: 'Step 2: Operations',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    },
    {
      stepNumber: '03',
      title: 'Analyze Margins & Replenish Smartly',
      subtitle: 'Surface profit drivers and prevent stockouts automatically.',
      description:
        'Watch gross margin and net profit telemetry update with every sale. Receive proactive reorder warnings before popular items run dry and identify stagnant stock holding down working capital.',
      icon: TrendingUp,
      points: [
        'Real-time COGS and net operating margin roll-ups',
        'Automated low-stock threshold alerts',
        'Dead-inventory clearance recommendations',
      ],
      tag: 'Step 3: Intelligence',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    },
  ]

  return (
    <section id="how-it-works" className="py-16 lg:py-24 bg-slate-50/70 border-b border-navy-200/80 scroll-mt-16 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200/90 text-brand-700 text-xs font-semibold shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-brand-600" />
            <span>Intuitive Commerce Workflow</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-navy-950 tracking-tight leading-tight">
            From setup to insight in <span className="sp-gradient-text">three simple steps</span>
          </h2>

          <p className="text-base sm:text-lg text-navy-600 leading-relaxed font-normal">
            Configure branches, sell and route inventory with zero lag, and make informed capital decisions — entirely from a local browser workspace.
          </p>
        </div>

        {/* 3 Step Card Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative">
          {steps.map((step) => {
            const Icon = step.icon

            return (
              <div
                key={step.stepNumber}
                className="bg-white rounded-2xl border border-navy-200/90 p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6 relative hover:shadow-md hover:border-brand-300 hover:-translate-y-1 transition-all duration-200 group"
              >
                <div className="space-y-4">
                  {/* Step Header */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-extrabold px-3 py-1 rounded-lg bg-brand-600 text-white shadow-2xs">
                      {step.stepNumber}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${step.badgeColor} uppercase tracking-wider`}>
                      {step.tag}
                    </span>
                  </div>

                  <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-navy-950 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-xs font-semibold text-brand-600 mt-1">
                      {step.subtitle}
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm text-navy-600 leading-relaxed font-normal">
                    {step.description}
                  </p>

                  <div className="pt-3 border-t border-navy-100 space-y-2">
                    {step.points.map((pt) => (
                      <div key={pt} className="flex items-start gap-2 text-xs text-navy-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="w-full py-2 px-3 rounded-xl bg-navy-50/70 border border-navy-100 text-center font-mono text-[11px] font-semibold text-navy-600">
                    Air-Gapped &amp; Instant Execution
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom Banner within How It Works */}
        <div className="max-w-4xl mx-auto rounded-2xl bg-white border border-navy-200/90 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-base sm:text-lg font-bold text-navy-950">
              Ready to experience the StorePoint workflow?
            </h4>
            <p className="text-xs sm:text-sm text-navy-600">
              Launch our interactive sandbox to try adding branches, simulating barcode checkouts, and testing stock alerts.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenGetStarted}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-xs sm:text-sm shadow-sm shadow-brand-600/25 hover:shadow-md hover:shadow-brand-600/35 transition-all duration-150 cursor-pointer shrink-0"
          >
            <span>Launch Local Demo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
