import { Layout } from '@/components/layout/Layout';
import { OpportunityHeroAnimation } from '@/components/hero/OpportunityHeroAnimation';
import { HeroSearch } from '@/components/home/HeroSearch';
import { HotOpportunitiesPreview } from '@/components/home/HotOpportunitiesPreview';
import { BenefitsGrid } from '@/components/home/BenefitsGrid';
import { AnalysisQuickEntry } from '@/components/home/AnalysisQuickEntry';
import { FinalCTA } from '@/components/home/FinalCTA';

export default function Home() {
  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* 1) Hero Section - Search First */}
        <section className="relative min-h-screen flex items-center justify-center text-center overflow-hidden">
          <OpportunityHeroAnimation />
          <div className="relative max-w-4xl mx-auto z-10 px-4 w-full">
            {/* Brand */}
            <div className="mb-4">
              <span className="text-sm md:text-base font-semibold text-emerald-700 tracking-wide">
                ImmoYield
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-4">
              Find your next investment
            </h1>

            {/* Subtext */}
            <p className="text-lg md:text-xl text-slate-700 mb-8 max-w-2xl mx-auto">
              Describe what you want — we&apos;ll surface the best opportunities.
            </p>

            {/* Large Search Bar - Primary Element */}
            <div className="mb-12">
              <HeroSearch />
            </div>
            {/* TODO: AI-guided investment search */}
          </div>
        </section>

        {/* 2) Hot Opportunities Section */}
        <HotOpportunitiesPreview />

        {/* 3) Benefits Section */}
        <BenefitsGrid />

        {/* 4) Auto Entry for Analysis */}
        <AnalysisQuickEntry />

        {/* 5) CTA Section */}
        <FinalCTA />
      </div>
    </Layout>
  );
}
