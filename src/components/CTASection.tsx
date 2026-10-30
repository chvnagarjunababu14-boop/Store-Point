import { ArrowRight, ShieldCheck, Sparkles, CheckCircle2, Terminal, Zap } from 'lucide-react'

interface CTASectionProps {
  onOpenGetStarted: () => void
}

export function CTASection({ onOpenGetStarted }: CTASectionProps) {
  return (
    <section id="cta" className="py-16 lg:py-24 bg-white border-b border-navy-200/80 scroll-mt-16 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-brand-200/90 bg-gradient-to-b from-white via-slate-50 to-brand-50/40 p-8 sm:p-12 lg:p-16 shadow-lg text-center space-y-8">
          {/* Subtle top radiant aura */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-64 bg-gradient-to-b from-brand-500/15 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-sp-pulse-glow"
            aria-hidden="true"
          />

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Instant Zero-Setup Retail Platform</span>
          </div>

          <div className="max-w-2xl mx-auto space-y-3.5">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-950 tracking-tight leading-[1.12]">
              Ready when your <span className="sp-gradient-text">store is</span>
            </h2>
            <p className="text-base sm:text-lg text-navy-600 leading-relaxed font-normal">
              Open StorePoint in this browser. Explore with rich demo data, or start a clean live workspace — your private business data never leaves your machine.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              type="button"
              onClick={onOpenGetStarted}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-base shadow-md shadow-brand-600/30 hover:shadow-lg hover:shadow-brand-600/40 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer"
            >
              <span>Launch StorePoint Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#preview"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-navy-50 text-navy-800 font-semibold text-base border border-navy-200/90 shadow-2xs hover:border-navy-300 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-brand-600" />
              <span>Inspect Live Metrics</span>
            </a>
          </div>

          {/* Reassurance Grid */}
          <div className="pt-8 border-t border-navy-200/80 flex flex-wrap items-center justify-center gap-y-3 gap-x-8 text-xs text-navy-600">
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100% Free Sandbox</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
              <span>Total Air-Gapped Privacy</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Terminal className="w-4 h-4 text-navy-600 shrink-0" />
              <span>Runs In-Browser via IndexedDB</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
