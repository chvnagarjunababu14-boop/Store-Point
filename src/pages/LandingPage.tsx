import { useState } from 'react'
import { Navbar } from '@/components/Navbar'
import { Hero } from '@/components/Hero'
import { ProductPreview } from '@/components/ProductPreview'
import { Features } from '@/components/Features'
import { HowItWorks } from '@/components/HowItWorks'
import { CTASection } from '@/components/CTASection'
import { Footer } from '@/components/Footer'
import { OnboardingModal } from '@/components/OnboardingModal'

export function LandingPage() {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)

  const handleOpenOnboarding = () => setIsOnboardingOpen(true)
  const handleCloseOnboarding = () => setIsOnboardingOpen(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      {/* 1. Global Navigation */}
      <Navbar onOpenGetStarted={handleOpenOnboarding} />

      {/* Main Page Flow */}
      <main className="flex-1">
        {/* 2. Hero Section with Headline, CTAs, and Mockup Dashboard */}
        <Hero onOpenGetStarted={handleOpenOnboarding} />

        {/* 3. Product Preview with Interactive Branch Filter and KPI Cards */}
        <ProductPreview />

        {/* 4. Core Features (Inventory, Branch Analytics, P&L, Best Sellers, Dead Stock) */}
        <Features onOpenGetStarted={handleOpenOnboarding} />

        {/* 5. How It Works (3 Clear Steps) */}
        <HowItWorks onOpenGetStarted={handleOpenOnboarding} />

        {/* 6. High-Conversion Call To Action */}
        <CTASection onOpenGetStarted={handleOpenOnboarding} />
      </main>

      {/* 7. Comprehensive Footer */}
      <Footer />

      {/* Interactive Onboarding / Demo Sandbox Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={handleCloseOnboarding}
      />
    </div>
  )
}
