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

// TODO: replace mock with server fetch from Supabase
const mockOpportunities: Opportunity[] = [
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
    title: '3BR House in Barra da Tijuca',
    city: 'Rio de Janeiro',
    neighborhood: 'Barra da Tijuca',
    price: 1200000,
    yieldPercent: 6.2,
    immoScore: 75,
  },
  {
    id: '5',
    title: 'Studio in Centro',
    city: 'São Paulo',
    neighborhood: 'Centro',
    price: 280000,
    yieldPercent: 7.8,
    immoScore: 72,
  },
  {
    id: '6',
    title: '2BR Apartment in Ipanema',
    city: 'Rio de Janeiro',
    neighborhood: 'Ipanema',
    price: 950000,
    yieldPercent: 6.5,
    immoScore: 79,
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

export function OpportunitiesPreview() {
  const previewOpportunities = mockOpportunities.slice(0, 6);

  return (
    <section className="py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Today&apos;s opportunities</h2>
          <p className="text-slate-700">Curated selection of high-yield investment properties</p>
        </div>
        <Link href="/opportunities">
          <Button variant="outline">View all opportunities</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {previewOpportunities.map((opportunity) => {
          const scoreInfo = getScoreLabel(opportunity.immoScore);
          return (
            <Link key={opportunity.id} href={`/opportunities/${opportunity.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-100 to-emerald-200">
                  <Image
                    src="/property-placeholder.svg"
                    alt={opportunity.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <div className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${scoreInfo.color}`}>
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
                    <p className="text-sm font-semibold text-emerald-700">
                      {opportunity.yieldPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

