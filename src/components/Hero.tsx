import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
  Store,
  Clock,
  ChevronRight,
  Play,
} from 'lucide-react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'

interface HeroProps {
  onOpenGetStarted: () => void
}

const PREVIEW_BRANCHES = [
  { id: 'all', name: 'All Outlets (Consolidated)', rev: '₹1,84,920', profit: '₹58,410', margin: '31.6%', skus: '3,420', alerts: 3 },
  { id: 'flagship', name: 'Downtown Flagship', rev: '₹94,200', profit: '₹31,800', margin: '33.7%', skus: '1,890', alerts: 1 },
  { id: 'westside', name: 'Westside Superstore', rev: '₹56,420', profit: '₹17,250', margin: '30.5%', skus: '1,120', alerts: 1 },
  { id: 'airport', name: 'Airport Express Kiosk', rev: '₹34,300', profit: '₹9,360', margin: '27.2%', skus: '410', alerts: 1 },
]

export function Hero({ onOpenGetStarted }: HeroProps) {
  const shouldReduceMotion = useReducedMotion()
  const [selectedBranchIdx, setSelectedBranchIdx] = useState(0)
  const currentBranch = PREVIEW_BRANCHES[selectedBranchIdx]

  const fade = (delay = 0) =>
    shouldReduceMotion
      ? { initial: false as const, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] as const },
        }

  return (
    <section className="relative overflow-hidden border-b border-navy-200/80 sp-hero-glow">
      {/* Decorative ambient grid overlay */}
      <div className="absolute inset-0 sp-grid-pattern opacity-60 pointer-events-none" aria-hidden="true" />

      {/* Radiant ambient glow orbs */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-blue-400/20 via-indigo-500/10 to-transparent blur-3xl rounded-full pointer-events-none -z-10 animate-sp-pulse-glow"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-32">
        {/* Brand-first hero composition */}
        <div className="max-w-4xl mx-auto text-center space-y-7">
          <motion.div {...fade(0)} className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-brand-200/90 text-brand-700 text-xs font-semibold shadow-xs backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-600" />
              </span>
              <span>Next-Gen Multi-Branch Retail &amp; POS Intelligence</span>
              <Sparkles className="w-3.5 h-3.5 text-brand-500 ml-0.5" aria-hidden="true" />
            </div>
          </motion.div>

          <motion.h1
            {...fade(0.08)}
            className="text-[2.6rem] sm:text-5xl lg:text-[4rem] font-extrabold text-navy-950 tracking-tight leading-[1.06]"
          >
            Your entire store.
            <span className="block mt-1 sp-gradient-text">In high-precision control.</span>
          </motion.h1>

          <motion.p
            {...fade(0.14)}
            className="text-base sm:text-lg lg:text-xl text-navy-600 max-w-2xl mx-auto leading-relaxed font-normal"
          >
            Sub-millisecond barcode POS, automated real-time P&amp;L, multi-branch inventory tracking, and deep margin intelligence — completely private, running directly on your hardware.
          </motion.p>

          {/* CTA Action Group */}
          <motion.div
            {...fade(0.2)}
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2"
          >
            <Button
              size="lg"
              onClick={onOpenGetStarted}
              className="w-full sm:w-auto shadow-md shadow-brand-600/25 hover:shadow-lg hover:shadow-brand-600/35 hover:-translate-y-0.5 transition-all duration-200"
              rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
            >
              Open StorePoint Free
            </Button>
            <Link
              to="/app"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-navy-50 text-navy-800 font-semibold text-base border border-navy-200/90 shadow-xs hover:border-navy-300 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2 cursor-pointer"
            >
              <Play className="w-4 h-4 text-brand-600 fill-brand-600" aria-hidden="true" />
              <span>Explore Live Sandbox</span>
            </Link>
          </motion.div>

          {/* Value signals pill row */}
          <motion.div
            {...fade(0.24)}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-navy-600 pt-2"
          >
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Zap className="w-4 h-4 text-brand-600" aria-hidden="true" />
              Sub-millisecond local speed
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-brand-600" aria-hidden="true" />
              Air-gapped data privacy
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Store className="w-4 h-4 text-brand-600" aria-hidden="true" />
              Multi-branch synchronization
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <TrendingUp className="w-4 h-4 text-brand-600" aria-hidden="true" />
              Automated real-time P&amp;L
            </span>
          </motion.div>
        </div>

        {/* High-fidelity interactive product mockup */}
        <motion.div
          {...fade(0.3)}
          className="relative mt-12 sm:mt-16 max-w-5xl mx-auto"
          aria-label="Interactive StorePoint dashboard preview"
        >
          {/* Floating Micro-Badges (Desktop Only) */}
          <div className="hidden lg:block absolute -top-6 -left-8 z-20 animate-sp-float">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/95 backdrop-blur-md border border-navy-200/90 shadow-lg text-xs">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-navy-900">Sale Processed · 0ms</div>
                <div className="text-[11px] font-mono text-emerald-600 font-medium">+₹9,990 · 42% Net Margin</div>
              </div>
            </div>
          </div>

          <div className="hidden lg:block absolute -bottom-5 -right-6 z-20 animate-sp-float-slow">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/95 backdrop-blur-md border border-navy-200/90 shadow-lg text-xs">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-navy-900">Smart Reorder Warning</div>
                <div className="text-[11px] font-mono text-amber-700 font-medium">Anker Charger · 12 units left</div>
              </div>
            </div>
          </div>

          {/* Main Simulated Browser/App Container */}
          <div className="rounded-2xl border border-navy-200/90 bg-white shadow-[0_25px_60px_-15px_rgba(15,23,42,0.14)] overflow-hidden transition-all duration-300 hover:shadow-[0_30px_70px_-12px_rgba(15,23,42,0.18)]">
            {/* Window Chrome Header */}
            <div className="bg-navy-900 px-4 py-3 flex items-center justify-between gap-3 border-b border-navy-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-navy-800/80 border border-navy-700/80 text-[11px] font-mono text-navy-200 truncate">
                  <Package className="w-3.5 h-3.5 text-brand-400 shrink-0" aria-hidden="true" />
                  <span>storepoint.local / overview / {currentBranch.id}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 text-emerald-300 font-semibold border border-emerald-800/60 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                  Local Engine Active · 0ms latency
                </span>
              </div>
            </div>

            {/* Interactive Preview Body */}
            <div className="p-4 sm:p-6 bg-slate-50/60 space-y-5">
              {/* Branch quick-switch tabs inside mockup */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-navy-200/60">
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {PREVIEW_BRANCHES.map((b, idx) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBranchIdx(idx)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap',
                        selectedBranchIdx === idx
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-white text-navy-600 border border-navy-200 hover:bg-navy-50'
                      )}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] font-mono text-navy-500 hidden sm:inline-block">
                  Click tabs to inspect live branch KPIs
                </span>
              </div>

              {/* 4 Interactive KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <PreviewKpi
                  label="Gross Revenue"
                  value={currentBranch.rev}
                  hint="+18.4% vs last period"
                  hintTone="good"
                />
                <PreviewKpi
                  label="Net Operating Profit"
                  value={currentBranch.profit}
                  hint={`${currentBranch.margin} Net Margin`}
                  hintTone="brand"
                />
                <PreviewKpi
                  label="Stock Alerts"
                  value={`${currentBranch.alerts} SKUs`}
                  hint="Reorder recommended"
                  hintTone="warn"
                  icon={<AlertCircle className="w-3.5 h-3.5" />}
                />
                <PreviewKpi
                  label="Active SKUs"
                  value={currentBranch.skus}
                  hint="All synced locally"
                  hintTone="good"
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                />
              </div>

              {/* Content Grid: Live Transactions + Inventory Health */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 bg-white rounded-xl border border-navy-200/90 p-4 sm:p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-navy-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-brand-600" aria-hidden="true" />
                      <span className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                        Recent Sub-Millisecond Sales
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                      Real-time feed
                    </span>
                  </div>
                  <PreviewSaleRow
                    name="Logitech MX Master 3S Wireless"
                    meta="SKU-8921-X · Downtown"
                    amount="+₹9,990"
                    margin="+₹4,200 profit (42%)"
                  />
                  <PreviewSaleRow
                    name="Keychron Q1 Pro Mechanical Keyboard"
                    meta="SKU-1092-K · Westside"
                    amount="+₹21,900"
                    margin="+₹8,400 profit (38%)"
                  />
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/80">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-navy-800 truncate">
                          Anker Prime 100W GaN Fast Charger
                        </div>
                        <div className="font-mono text-[10px] text-amber-800 font-semibold">
                          Low Stock Alert · 12 units remaining (Reorder point: 15)
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-amber-200/80 text-amber-900 font-bold text-[10px] shrink-0 font-mono">
                      Restock Trigger
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-xl border border-navy-200/90 p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                        Inventory Velocity
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-50 text-brand-700 font-semibold">
                        Health: 98.2%
                      </span>
                    </div>
                    <p className="text-xs text-navy-600 leading-relaxed">
                      Instant stock turnover metrics, dead stock flagging, and margin protection — updated on every barcode scan.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-navy-100 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-navy-600">In-Stock Availability</span>
                      <span className="sp-num font-bold text-navy-900">98.2%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-navy-600">Dead-Stock Exposure</span>
                      <span className="sp-num font-bold text-emerald-600">&lt; 1.4%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-navy-600">Average Basket Profit</span>
                      <span className="sp-num font-bold text-navy-900">₹3,410</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-navy-600">Local Query Latency</span>
                      <span className="sp-num font-bold text-brand-600">&lt; 0.8 ms</span>
                    </div>
                  </div>

                  <Link
                    to="/app"
                    className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rounded-lg bg-brand-50 text-brand-700 text-xs font-bold hover:bg-brand-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Launch Full Interactive App</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Bottom Status Ticker */}
            <div className="bg-navy-50/80 border-t border-navy-200 px-4 py-2.5 flex items-center justify-between text-[11px] text-navy-500">
              <span className="flex items-center gap-1.5 font-mono">
                <Clock className="w-3 h-3 text-brand-600" />
                Zero network lag · Instant IndexedDB storage
              </span>
              <span className="font-medium text-navy-600 hidden sm:inline-block">
                StorePoint v1.0 Production Engine
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function PreviewKpi({
  label,
  value,
  hint,
  hintTone,
  icon,
}: {
  label: string
  value: string
  hint: string
  hintTone: 'good' | 'brand' | 'warn'
  icon?: ReactNode
}) {
  const tone =
    hintTone === 'good'
      ? 'text-emerald-600'
      : hintTone === 'warn'
        ? 'text-amber-700'
        : 'text-brand-600'

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-navy-200/90 shadow-xs space-y-1 hover:border-navy-300 transition-colors">
      <div className="text-[10px] font-semibold text-navy-500 uppercase tracking-wider truncate">{label}</div>
      <div className="sp-num text-lg sm:text-2xl font-extrabold text-navy-950 tracking-tight">{value}</div>
      <div className={`flex items-center gap-1 text-[11px] font-semibold ${tone}`}>
        {icon}
        <span className="truncate">{hint}</span>
      </div>
    </div>
  )
}

function PreviewSaleRow({
  name,
  meta,
  amount,
  margin,
}: {
  name: string
  meta: string
  amount: string
  margin: string
}) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-navy-50/60 border border-navy-100 hover:bg-navy-50 transition-colors gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-navy-900 truncate">{name}</div>
          <div className="font-mono text-[10px] text-navy-500 truncate">{meta}</div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="sp-num text-xs font-bold text-navy-900">{amount}</div>
        <div className="text-[10px] font-medium text-emerald-600">{margin}</div>
      </div>
    </div>
  )
}
