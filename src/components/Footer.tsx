import { Link } from 'react-router-dom'
import { Package, ArrowUp } from 'lucide-react'

const CURRENT_YEAR = 2026

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="bg-[#090d16] text-navy-300 border-t border-navy-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand & Mission Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-xs">
                <Package className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">StorePoint</span>
            </div>

            <p className="text-sm text-navy-400 max-w-sm leading-relaxed">
              Local-first inventory, barcode POS, and multi-branch intelligence. Engineered for modern merchants who require sub-millisecond execution and bank-grade data sovereignty.
            </p>

            <div className="flex items-center gap-2 text-xs text-emerald-400 pt-1 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Local Engine Status: 100% Operational · 0ms Network Latency</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Navigation</h4>
            <ul className="space-y-2 text-sm text-navy-400">
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Capabilities &amp; Bento Grid
                </a>
              </li>
              <li>
                <a href="#preview" className="hover:text-white transition-colors">
                  Interactive Product Preview
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  3-Step Merchant Workflow
                </a>
              </li>
              <li>
                <Link to="/app" className="hover:text-brand-400 transition-colors font-medium">
                  Launch Live Dashboard →
                </Link>
              </li>
            </ul>
          </div>

          {/* Operational Superpowers */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Capabilities</h4>
            <ul className="space-y-2 text-sm text-navy-400">
              <li>Multi-Branch Sync &amp; Transfers</li>
              <li>Sub-ms Barcode POS &amp; Returns</li>
              <li>Automated COGS &amp; Real-Time P&amp;L</li>
              <li>Encrypted JSON &amp; CSV Exports</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-navy-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-navy-400 gap-4">
          <div className="flex items-center gap-2">
            <span>© {CURRENT_YEAR} StorePoint. Local-first retail software.</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline text-navy-500 font-mono">Press Ctrl+K in dashboard for quick search</span>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 text-navy-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded px-2 py-1"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  )
}
