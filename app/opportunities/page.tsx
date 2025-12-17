'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/shared/Card';
import { Input } from '@/components/shared/Input';
import { Select } from '@/components/shared/Select';
import { Button } from '@/components/shared/Button';
import { Search, TrendingUp, DollarSign, MapPin, Calendar, ExternalLink } from 'lucide-react';

// TODO: replace mock with server fetch from Supabase
type Opportunity = {
  id: string;
  title: string;
  city: string;
  neighborhood?: string | null;
  price: number;               // BRL
  areaM2?: number | null;      // m²
  estimatedRent: number;       // BRL / month
  condoFee?: number | null;    // BRL / month
  iptuAnnual?: number | null;  // BRL / year
  yieldPercent: number;        // % net yield (after condo/iptu assumptions)
  cashflowMonthly: number;     // BRL / month
  paybackYears: number;        // years
  immoScore: number;           // 0-100
  sourceUrl?: string | null;
  createdAt: string;           // ISO string
};

// Mock data
const mockOpportunities: Opportunity[] = [
  {
    id: '1',
    title: 'Studio Apartment in Pinheiros',
    city: 'São Paulo',
    neighborhood: 'Pinheiros',
    price: 350000,
    areaM2: 35,
    estimatedRent: 2800,
    condoFee: 450,
    iptuAnnual: 2400,
    yieldPercent: 7.2,
    cashflowMonthly: 1200,
    paybackYears: 12.5,
    immoScore: 85,
    sourceUrl: 'https://example.com/listing/1',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    title: '2BR Apartment in Vila Madalena',
    city: 'São Paulo',
    neighborhood: 'Vila Madalena',
    price: 580000,
    areaM2: 65,
    estimatedRent: 4200,
    condoFee: 680,
    iptuAnnual: 4200,
    yieldPercent: 6.8,
    cashflowMonthly: 1800,
    paybackYears: 13.2,
    immoScore: 82,
    sourceUrl: 'https://example.com/listing/2',
    createdAt: '2024-01-14T14:30:00Z',
  },
  {
    id: '3',
    title: '1BR in Copacabana',
    city: 'Rio de Janeiro',
    neighborhood: 'Copacabana',
    price: 420000,
    areaM2: 42,
    estimatedRent: 3200,
    condoFee: 520,
    iptuAnnual: 3000,
    yieldPercent: 7.5,
    cashflowMonthly: 1400,
    paybackYears: 11.8,
    immoScore: 88,
    sourceUrl: null,
    createdAt: '2024-01-13T09:15:00Z',
  },
  {
    id: '4',
    title: '3BR House in Barra da Tijuca',
    city: 'Rio de Janeiro',
    neighborhood: 'Barra da Tijuca',
    price: 1200000,
    areaM2: 180,
    estimatedRent: 8500,
    condoFee: 1200,
    iptuAnnual: 12000,
    yieldPercent: 6.2,
    cashflowMonthly: 3500,
    paybackYears: 14.5,
    immoScore: 75,
    sourceUrl: 'https://example.com/listing/4',
    createdAt: '2024-01-12T16:45:00Z',
  },
  {
    id: '5',
    title: 'Studio in Centro',
    city: 'São Paulo',
    neighborhood: 'Centro',
    price: 280000,
    areaM2: 28,
    estimatedRent: 2200,
    condoFee: 380,
    iptuAnnual: 1800,
    yieldPercent: 7.8,
    cashflowMonthly: 950,
    paybackYears: 11.2,
    immoScore: 72,
    sourceUrl: null,
    createdAt: '2024-01-11T11:20:00Z',
  },
  {
    id: '6',
    title: '2BR Apartment in Ipanema',
    city: 'Rio de Janeiro',
    neighborhood: 'Ipanema',
    price: 950000,
    areaM2: 85,
    estimatedRent: 6800,
    condoFee: 950,
    iptuAnnual: 9000,
    yieldPercent: 6.5,
    cashflowMonthly: 2800,
    paybackYears: 13.8,
    immoScore: 79,
    sourceUrl: 'https://example.com/listing/6',
    createdAt: '2024-01-10T08:00:00Z',
  },
];

type SortOption = 'score' | 'yield' | 'price' | 'newest';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString));
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Great', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  if (score >= 70) return { label: 'Good', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (score >= 60) return { label: 'Okay', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Risky', color: 'bg-red-50 text-red-700 border-red-200' };
}

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const scoreInfo = getScoreLabel(opportunity.immoScore);
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <Link href={`/opportunities/${opportunity.id}`}>
        <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-100 to-emerald-200 cursor-pointer">
          <Image
            src="/property-placeholder.svg"
            alt={opportunity.title}
            fill
            className="object-cover"
          />
          <div className="absolute top-3 right-3">
            <div className={`px-2.5 py-1 rounded-md border text-xs font-semibold bg-white/90 backdrop-blur-sm ${scoreInfo.color}`}>
              {scoreInfo.label}
            </div>
          </div>
        </div>
      </Link>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Link href={`/opportunities/${opportunity.id}`}>
            <h3 className="text-lg font-semibold text-slate-900 mb-1 hover:text-emerald-700 transition-colors">
              {opportunity.title}
            </h3>
          </Link>
          <div className="flex items-center text-sm text-slate-600">
            <MapPin className="w-4 h-4 mr-1" />
            <span>
              {opportunity.neighborhood ? `${opportunity.neighborhood}, ` : ''}
              {opportunity.city}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Price</span>
          <span className="font-semibold text-slate-900">{formatCurrency(opportunity.price)}</span>
        </div>
        {opportunity.areaM2 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Area</span>
            <span className="text-slate-700">{opportunity.areaM2} m²</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Est. Rent</span>
          <span className="font-semibold text-slate-900">{formatCurrency(opportunity.estimatedRent)}/mo</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Yield</span>
          <span className="font-semibold text-emerald-700">{opportunity.yieldPercent.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Cashflow</span>
          <span className={`font-semibold ${opportunity.cashflowMonthly >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatCurrency(opportunity.cashflowMonthly)}/mo
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Payback</span>
          <span className="text-slate-700">{opportunity.paybackYears.toFixed(1)} years</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">ImmoScore</span>
          <span className="font-semibold text-slate-900">{opportunity.immoScore}/100</span>
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <Link
          href={`/analyze?price=${opportunity.price}&estimatedRent=${opportunity.estimatedRent}&condoFee=${opportunity.condoFee || 0}&iptuAnnual=${opportunity.iptuAnnual || 0}&city=${encodeURIComponent(opportunity.city)}`}
          className="flex-1"
        >
          <Button variant="primary" size="sm" className="w-full">
            Analyze
          </Button>
        </Link>
        <Link href={`/opportunities/${opportunity.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            View
          </Button>
        </Link>
        {opportunity.sourceUrl && (
          <a
            href={opportunity.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink className="w-4 h-4 mr-1" />
              Listing
            </Button>
          </a>
        )}
      </div>
    </Card>
  );
}

export default function OpportunitiesPage() {
  const searchParams = useSearchParams();
  const qParam = searchParams?.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(qParam);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minYield, setMinYield] = useState<number>(0);
  const [minScore, setMinScore] = useState<number>(0);
  const [positiveCashflowOnly, setPositiveCashflowOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('score');

  useEffect(() => {
    if (qParam) {
      setSearchQuery(qParam);
    }
  }, [qParam]);

  const cities = useMemo(() => {
    const uniqueCities = Array.from(new Set(mockOpportunities.map((o) => o.city)));
    return uniqueCities.sort();
  }, []);

  const filteredAndSorted = useMemo(() => {
    let filtered = [...mockOpportunities];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.title.toLowerCase().includes(query) ||
          o.neighborhood?.toLowerCase().includes(query) ||
          o.city.toLowerCase().includes(query)
      );
    }

    // City filter
    if (selectedCity !== 'all') {
      filtered = filtered.filter((o) => o.city === selectedCity);
    }

    // Max price filter
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        filtered = filtered.filter((o) => o.price <= max);
      }
    }

    // Min yield filter
    filtered = filtered.filter((o) => o.yieldPercent >= minYield);

    // Min score filter
    filtered = filtered.filter((o) => o.immoScore >= minScore);

    // Positive cashflow filter
    if (positiveCashflowOnly) {
      filtered = filtered.filter((o) => o.cashflowMonthly > 0);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.immoScore - a.immoScore;
        case 'yield':
          return b.yieldPercent - a.yieldPercent;
        case 'price':
          return a.price - b.price;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchQuery, selectedCity, maxPrice, minYield, minScore, positiveCashflowOnly, sortBy]);

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Investment Opportunities
            </h1>
            <p className="text-lg text-slate-700">
              Curated selection of high-quality real estate investments with strong yield potential and positive cash flow.
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="md:col-span-2 lg:col-span-1">
                <div className="relative">
                  <Input
                    label="Search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, neighborhood, or city..."
                  />
                  <Search className="absolute right-3 top-9 w-4 h-4 text-slate-400" />
                </div>
              </div>
              <Select
                label="City"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                options={[
                  { value: 'all', label: 'All Cities' },
                  ...cities.map((city) => ({ value: city, label: city })),
                ]}
              />
              <Input
                label="Max Price (BRL)"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="No limit"
                min="0"
                step="10000"
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Min Yield: {minYield.toFixed(1)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.1"
                  value={minYield}
                  onChange={(e) => setMinYield(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Min ImmoScore: {minScore}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={minScore}
                  onChange={(e) => setMinScore(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>
              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  id="positiveCashflow"
                  checked={positiveCashflowOnly}
                  onChange={(e) => setPositiveCashflowOnly(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="positiveCashflow" className="ml-2 text-sm text-slate-700">
                  Show only positive cashflow
                </label>
              </div>
            </div>
          </Card>

          {/* Sort */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-slate-600">
              {filteredAndSorted.length} {filteredAndSorted.length === 1 ? 'opportunity' : 'opportunities'} found
            </p>
              <div className="w-48">
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  options={[
                    { value: 'score', label: 'Best Score' },
                    { value: 'yield', label: 'Highest Yield' },
                    { value: 'price', label: 'Lowest Price' },
                    { value: 'newest', label: 'Newest' },
                  ]}
                />
              </div>
          </div>

          {/* Results */}
          {filteredAndSorted.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-lg text-slate-600 mb-2">No opportunities match these filters.</p>
              <p className="text-sm text-slate-500">Try adjusting your search criteria.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSorted.map((opportunity) => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

