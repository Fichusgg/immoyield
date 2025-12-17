'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { MapPin, TrendingUp } from 'lucide-react';

type Opportunity = {
  id: string;
  title: string;
  city: string;
  neighborhood?: string | null;
  price: number;
  yieldPercent: number;
  immoScore: number;
};

// TODO: replace with Supabase fetch
const mockHotOpportunities: Opportunity[] = [
  {
    id: '1',
    title: 'Studio Apartment in Pinheiros',
    city: 'São Paulo',
    neighborhood: 'Pinheiros',
    price: 350000,
    yieldPercent: 7.2,
    immoScore: 85,
  },
  {
    id: '2',
    title: '2BR Apartment in Vila Madalena',
    city: 'São Paulo',
    neighborhood: 'Vila Madalena',
    price: 580000,
    yieldPercent: 6.8,
    immoScore: 82,
  },
  {
    id: '3',
    title: '1BR in Copacabana',
    city: 'Rio de Janeiro',
    neighborhood: 'Copacabana',
    price: 420000,
    yieldPercent: 7.5,
    immoScore: 88,
  },
  {
    id: '4',
    title: 'Studio in Centro',
    city: 'São Paulo',
    neighborhood: 'Centro',
    price: 280000,
    yieldPercent: 7.8,
    immoScore: 72,
  },
  {
    id: '5',
    title: '2BR Apartment in Ipanema',
    city: 'Rio de Janeiro',
    neighborhood: 'Ipanema',
    price: 950000,
    yieldPercent: 6.5,
    immoScore: 79,
  },
  {
    id: '6',
    title: '3BR House in Barra da Tijuca',
    city: 'Rio de Janeiro',
    neighborhood: 'Barra da Tijuca',
    price: 1200000,
    yieldPercent: 6.2,
    immoScore: 75,
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

export function HotOpportunitiesPreview() {
  const hotOpportunities = mockHotOpportunities.slice(0, 6);

  return (
    <section className="py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
          Hot opportunities right now
        </h2>
        <p className="text-lg text-slate-700 max-w-2xl mx-auto">
          Curated selection of high-score deals with strong yield potential and positive cash flow
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {hotOpportunities.map((opportunity) => {
          const scoreInfo = getScoreLabel(opportunity.immoScore);
          return (
            <Link key={opportunity.id} href={`/opportunities/${opportunity.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-100 to-emerald-200">
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
                <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-1">
                  {opportunity.title}
                </h3>
                <div className="flex items-center text-sm text-slate-600 mb-3">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>
                    {opportunity.neighborhood ? `${opportunity.neighborhood}, ` : ''}
                    {opportunity.city}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-slate-500">Price</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(opportunity.price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Yield</p>
                    <p className="text-sm font-semibold text-emerald-700 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {opportunity.yieldPercent.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Score</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {opportunity.immoScore}/100
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="text-center">
        <Link href="/opportunities">
          <Button variant="primary" size="lg">
            View all opportunities
          </Button>
        </Link>
      </div>
    </section>
  );
}

