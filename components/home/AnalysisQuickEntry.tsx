'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/shared/Card';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { Calculator, Link as LinkIcon } from 'lucide-react';

type EntryMode = 'link' | 'manual';

export function AnalysisQuickEntry() {
  const router = useRouter();
  const [mode, setMode] = useState<EntryMode>('link');
  const [linkUrl, setLinkUrl] = useState('');
  const [price, setPrice] = useState('');
  const [rent, setRent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'link') {
      // TODO: listing parsing + scraping
      alert('Link parsing coming soon. For now, use manual entry.');
      setMode('manual');
      return;
    }

    // Manual entry - route to analyze with prefilled data
    const params = new URLSearchParams();
    if (price) params.set('price', price);
    if (rent) params.set('estimatedRent', rent);
    
    router.push(`/analyze?${params.toString()}`);
  };

  return (
    <section className="py-16">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
          Analyze a property in seconds
        </h2>
        <p className="text-lg text-slate-700 max-w-2xl mx-auto">
          Get instant investment analysis with just a few details
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          {/* Mode Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              onClick={() => setMode('link')}
              className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
                mode === 'link'
                  ? 'text-emerald-700 border-b-2 border-emerald-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LinkIcon className="w-5 h-5 mx-auto mb-1" />
              Paste listing link
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
                mode === 'manual'
                  ? 'text-emerald-700 border-b-2 border-emerald-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-5 h-5 mx-auto mb-1" />
              Manual entry
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'link' ? (
              <div className="space-y-4">
                <Input
                  label="Listing URL"
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com/listing/123"
                  required
                />
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    Link parsing coming soon. For now, use manual entry to get started.
                  </p>
                </div>
                {/* TODO: listing parsing + scraping */}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Purchase Price (BRL)"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="500000"
                  min="0"
                  step="1000"
                />
                <Input
                  label="Monthly Rent (BRL)"
                  type="number"
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                  placeholder="3500"
                  min="0"
                  step="100"
                />
              </div>
            )}

            <div className="mt-6">
              <Button type="submit" variant="primary" size="lg" className="w-full">
                <Calculator className="w-5 h-5 mr-2" />
                Analyze Property
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </section>
  );
}

