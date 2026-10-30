import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Menu, X, ArrowRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'

interface NavbarProps {
  onOpenGetStarted: () => void
}

export function Navbar({ onOpenGetStarted }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { label: 'Capabilities', href: '#features' },
    { label: 'Product Preview', href: '#preview' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Air-Gapped Privacy', href: '#why-local' },
  ]

  const closeMobile = () => setMobileMenuOpen(false)

  return (
    <nav
      aria-label="Main navigation"
      className="sticky top-0 z-50 w-full border-b border-navy-200/80 bg-white/85 backdrop-blur-md shadow-2xs transition-all"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand Logo */}
          <a
            href="#"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-indigo-600 text-white shadow-xs shadow-brand-600/25 group-hover:scale-105 transition-transform">
              <Package className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-navy-950 leading-none">
                StorePoint
              </span>
              <span className="text-[10px] font-mono font-medium text-brand-600 leading-tight">
                POS &amp; Analytics
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-navy-600 hover:text-navy-950 hover:bg-navy-50 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 cursor-pointer"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Action Group */}
          <div className="hidden md:flex items-center gap-3">
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>0ms Latency · Private</span>
            </div>

            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-navy-700 hover:text-brand-700 hover:bg-brand-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              <Zap className="w-3.5 h-3.5 text-brand-600" />
              <span>Live App</span>
            </Link>

            <Button
              size="sm"
              onClick={onOpenGetStarted}
              className="shadow-xs shadow-brand-600/20"
              rightIcon={<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Open Free
            </Button>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-menu"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden p-2 rounded-lg text-navy-600 hover:text-navy-900 hover:bg-navy-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div
        id="mobile-navigation-menu"
        hidden={!mobileMenuOpen}
        className={cn(
          'md:hidden border-t border-navy-200 bg-white/95 backdrop-blur-md px-4 pt-3 pb-5 space-y-3 shadow-dropdown',
          !mobileMenuOpen && 'hidden'
        )}
      >
        <div className="flex flex-col gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={closeMobile}
              className="px-3 py-2.5 rounded-lg text-sm font-semibold text-navy-700 hover:bg-navy-50 hover:text-navy-950 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="pt-3 border-t border-navy-100 flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => {
              closeMobile()
              onOpenGetStarted()
            }}
            rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
          >
            Launch StorePoint
          </Button>
          <Link
            to="/app"
            onClick={closeMobile}
            className="w-full inline-flex items-center justify-center py-2.5 rounded-lg border border-navy-200 bg-white text-navy-700 text-xs font-semibold hover:bg-navy-50 transition-colors"
          >
            Go to Live Dashboard
          </Link>
        </div>
      </div>
    </nav>
  )
}
