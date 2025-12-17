'use client';

import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { MetricCard } from '@/components/shared/MetricCard';
import { MapPin, TrendingUp, DollarSign, Home, Calculator, ExternalLink, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';

// TODO: replace mock with server fetch from Supabase
type Opportunity = {
  id: string;
  title: string;
  city: string;
  neighborhood?: string | null;
  price: number;
  areaM2?: number | null;
  estimatedRent: number;
  condoFee?: number | null;
  iptuAnnual?: number | null;
  yieldPercent: number;
  cashflowMonthly: number;
  paybackYears: number;
  immoScore: number;
  sourceUrl?: string | null;
  createdAt: string;
};

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Great', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  if (score >= 70) return { label: 'Good', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (score >= 60) return { label: 'Okay', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Risky', color: 'bg-red-50 text-red-700 border-red-200' };
}

export default function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  // TODO: fetch from Supabase
  const opportunity = mockOpportunities.find((o) => o.id === id);

  if (!opportunity) {
    return (
      <Layout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="text-center py-12">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Opportunity not found</h1>
            <p className="text-slate-600 mb-6">The opportunity you're looking for doesn't exist.</p>
            <Link href="/opportunities">
              <Button variant="primary">Back to Opportunities</Button>
            </Link>
          </Card>
        </div>
      </Layout>
    );
  }

  const scoreInfo = getScoreLabel(opportunity.immoScore);
  const analyzeUrl = `/analyze?price=${opportunity.price}&estimatedRent=${opportunity.estimatedRent}&condoFee=${opportunity.condoFee || 0}&iptuAnnual=${opportunity.iptuAnnual || 0}&city=${encodeURIComponent(opportunity.city)}`;

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Link href="/opportunities">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Opportunities
            </Button>
          </Link>

          {/* Image Header */}
          <div className="relative w-full h-96 mb-8 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-100 to-emerald-200">
            <Image
              src="/property-placeholder.svg"
              alt={opportunity.title}
              fill
              className="object-cover"
            />
            <div className="absolute top-6 right-6">
              <div className={`px-4 py-2 rounded-lg border text-sm font-semibold bg-white/90 backdrop-blur-sm ${scoreInfo.color}`}>
                {scoreInfo.label} • Score: {opportunity.immoScore}/100
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              {opportunity.title}
            </h1>
            <div className="flex items-center text-slate-600 mb-4">
              <MapPin className="w-5 h-5 mr-2" />
              <span className="text-lg">
                {opportunity.neighborhood ? `${opportunity.neighborhood}, ` : ''}
                {opportunity.city}
              </span>
            </div>
            <div className="flex gap-4">
              <Link href={analyzeUrl}>
                <Button variant="primary" size="lg">
                  <Calculator className="w-5 h-5 mr-2" />
                  Run Analysis
                </Button>
              </Link>
              {opportunity.sourceUrl && (
                <a href={opportunity.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="lg">
                    <ExternalLink className="w-5 h-5 mr-2" />
                    View Original Listing
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Price"
              value={formatCurrency(opportunity.price)}
              icon={<DollarSign className="w-6 h-6" />}
            />
            <MetricCard
              title="Monthly Rent"
              value={formatCurrency(opportunity.estimatedRent)}
              icon={<Home className="w-6 h-6" />}
            />
            <MetricCard
              title="Net Yield"
              value={`${opportunity.yieldPercent.toFixed(1)}%`}
              icon={<TrendingUp className="w-6 h-6" />}
            />
            <MetricCard
              title="Monthly Cashflow"
              value={formatCurrency(opportunity.cashflowMonthly)}
              subtitle={`Payback: ${opportunity.paybackYears.toFixed(1)} years`}
              trend={opportunity.cashflowMonthly >= 0 ? 'up' : 'down'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Full Metrics */}
            <Card className="lg:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Full Metrics</h2>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-slate-600">Purchase Price</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(opportunity.price)}</span>
                </div>
                {opportunity.areaM2 && (
                  <div className="flex justify-between py-3 border-b border-gray-200">
                    <span className="text-slate-600">Area</span>
                    <span className="text-slate-900">{opportunity.areaM2} m²</span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-slate-600">Estimated Monthly Rent</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(opportunity.estimatedRent)}</span>
                </div>
                {opportunity.condoFee && (
                  <div className="flex justify-between py-3 border-b border-gray-200">
                    <span className="text-slate-600">Monthly Condo Fee</span>
                    <span className="text-slate-900">{formatCurrency(opportunity.condoFee)}</span>
                  </div>
                )}
                {opportunity.iptuAnnual && (
                  <div className="flex justify-between py-3 border-b border-gray-200">
                    <span className="text-slate-600">Annual IPTU</span>
                    <span className="text-slate-900">{formatCurrency(opportunity.iptuAnnual)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-slate-600">Net Yield</span>
                  <span className="font-semibold text-emerald-700">{opportunity.yieldPercent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-slate-600">Monthly Cashflow</span>
                  <span className={`font-semibold ${opportunity.cashflowMonthly >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCurrency(opportunity.cashflowMonthly)}
                  </span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-slate-600">Payback Period</span>
                  <span className="font-semibold text-slate-900">{opportunity.paybackYears.toFixed(1)} years</span>
                </div>
              </div>
            </Card>

            {/* Why It's Interesting & Risks */}
            <div className="space-y-6">
              <Card>
                <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-emerald-700" />
                  Why it&apos;s interesting
                </h2>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-start">
                    <span className="text-emerald-700 mr-2">•</span>
                    Strong yield above market average
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-700 mr-2">•</span>
                    Positive cash flow from day one
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-700 mr-2">•</span>
                    Prime location with high rental demand
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-700 mr-2">•</span>
                    Good appreciation potential
                  </li>
                </ul>
                {/* TODO: Generate with AI based on property data */}
              </Card>

              <Card>
                <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />
                  Risks
                </h2>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-start">
                    <span className="text-amber-600 mr-2">•</span>
                    Market volatility in the area
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-600 mr-2">•</span>
                    Potential vacancy periods
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-600 mr-2">•</span>
                    Maintenance costs may vary
                  </li>
                </ul>
                {/* TODO: Generate with AI based on property data */}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

