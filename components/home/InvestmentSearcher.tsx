'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { Search } from 'lucide-react';

const placeholders = [
  'Studio in São Paulo under R$400k',
  'High yield in Campinas',
  '2-bedroom near metro',
  'Beach rental in Florianópolis',
  'Low condo fee apartments',
];

export function InvestmentSearcher() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/opportunities?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/opportunities');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 text-center">
        Find your next investment
      </h2>
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholders[currentPlaceholderIndex]}
              className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-900"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
          <Button type="submit" variant="primary" size="lg">
            Search
          </Button>
        </div>
      </form>
      <p className="text-sm text-slate-600 mt-3 text-center">
        Soon: AI guidance that turns your goal into the best opportunities.
      </p>
      {/* TODO: AI-guided search */}
    </div>
  );
}

