'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/shared/Button';

const placeholders = [
  'Studio in São Paulo under R$400k with strong yield',
  'High cashflow rentals in Campinas',
  '2-bedroom near metro with low condo fee',
  'Beach rental opportunities in Florianópolis',
  'Undervalued properties with ImmoScore above 75',
];

export function HeroSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    // Rotate placeholder if motion is not reduced
    if (!mediaQuery.matches) {
      const interval = setInterval(() => {
        setCurrentPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
      }, 2000);

      return () => {
        clearInterval(interval);
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [isMounted]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/opportunities?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/opportunities');
    }
  };

  const currentPlaceholder = reducedMotion 
    ? placeholders[0] 
    : placeholders[currentPlaceholderIndex];

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-white/50 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
          <div className="absolute left-4 z-10">
            <Search className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={currentPlaceholder}
            className="w-full pl-12 pr-32 py-4 md:py-5 text-base md:text-lg text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none transition-all duration-200"
          />
          <div className="absolute right-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="rounded-full px-6 md:px-8"
            >
              Search
            </Button>
          </div>
        </div>
      </form>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-slate-600 mb-3">
          Soon: AI guidance that turns your goal into a personalized shortlist.
        </p>
        {/* TODO: AI guided search */}
        <a
          href="/opportunities"
          className="text-sm text-emerald-700 hover:text-emerald-800 font-medium underline underline-offset-2"
        >
          Browse opportunities
        </a>
      </div>

      {/* Trust row */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-6 md:gap-8 text-xs md:text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span>Instant ROI</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span>ImmoScore</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span>Taxes & costs</span>
        </div>
      </div>
    </div>
  );
}

