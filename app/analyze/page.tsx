'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/shared/Card';
import { Input } from '@/components/shared/Input';
import { Select } from '@/components/shared/Select';
import { Button } from '@/components/shared/Button';
import { PropertyAnalysis } from '@/types/property';
import { Calculator, DollarSign, Home, TrendingUp, Link as LinkIcon } from 'lucide-react';

type AnalysisMode = 'manual' | 'link';

export default function AnalyzePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AnalysisMode>('manual');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkCity, setLinkCity] = useState('');
  const [formData, setFormData] = useState<Partial<PropertyAnalysis>>({
    propertyType: 'house',
    loanTerm: 30,
    vacancyRate: 5,
    appreciationRate: 3,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Prefill from query params
  useEffect(() => {
    const price = searchParams?.get('price');
    const estimatedRent = searchParams?.get('estimatedRent');
    const condoFee = searchParams?.get('condoFee');
    const iptuAnnual = searchParams?.get('iptuAnnual');
    const city = searchParams?.get('city');

    if (price || estimatedRent || condoFee || iptuAnnual || city) {
      setFormData((prev) => ({
        ...prev,
        purchasePrice: price ? parseFloat(price) : prev.purchasePrice,
        monthlyRent: estimatedRent ? parseFloat(estimatedRent) : prev.monthlyRent,
        propertyTax: iptuAnnual ? parseFloat(iptuAnnual) / 12 : prev.propertyTax,
        address: city ? city : prev.address,
      }));
    }
  }, [searchParams]);

  const handleChange = (field: keyof PropertyAnalysis, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.purchasePrice || formData.purchasePrice <= 0) {
      newErrors.purchasePrice = 'Purchase price must be greater than 0';
    }
    if (!formData.downPayment || formData.downPayment < 0) {
      newErrors.downPayment = 'Down payment is required';
    }
    if (!formData.monthlyRent || formData.monthlyRent <= 0) {
      newErrors.monthlyRent = 'Monthly rent is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Calculate loan amount if not provided
      const loanAmount = formData.loanAmount || 
        (formData.purchasePrice && formData.downPayment 
          ? formData.purchasePrice - formData.downPayment 
          : 0);
      
      const completeData = {
        ...formData,
        loanAmount,
        otherIncome: formData.otherIncome || 0,
        propertyTax: formData.propertyTax || 0,
        insurance: formData.insurance || 0,
        maintenance: formData.maintenance || 0,
        propertyManagement: formData.propertyManagement || 0,
        utilities: formData.utilities || 0,
        closingCosts: formData.closingCosts || 0,
      } as PropertyAnalysis;
      
      // Store in sessionStorage and navigate to results
      sessionStorage.setItem('propertyAnalysis', JSON.stringify(completeData));
      router.push('/results');
    }
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: URL parsing + scraping pipeline
    alert('Link parsing coming soon. For now, we\'ll analyze with manual inputs.');
    setMode('manual');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-600 text-white mb-4 shadow-lg shadow-emerald-200/60">
              <Calculator className="w-6 h-6" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Property Analysis
            </h1>
            <p className="text-slate-700">
              Enter your property details to get a comprehensive investment analysis
            </p>
          </div>

          {/* Mode Tabs */}
          <Card className="mb-6">
            <div className="flex border-b border-gray-200">
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
                Manual Entry
              </button>
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
                Paste Listing Link
              </button>
            </div>
          </Card>

          {/* Link Mode */}
          {mode === 'link' && (
            <Card className="mb-6">
              <form onSubmit={handleLinkSubmit}>
                <div className="space-y-4">
                  <Input
                    label="Listing URL"
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com/listing/123"
                    required
                  />
                  <Input
                    label="City (optional)"
                    type="text"
                    value={linkCity}
                    onChange={(e) => setLinkCity(e.target.value)}
                    placeholder="São Paulo"
                  />
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-amber-800">
                      Link parsing coming soon. For now, we&apos;ll analyze with manual inputs.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <Button type="submit" variant="primary">
                      Parse Link
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMode('manual')}
                    >
                      Switch to Manual Entry
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          )}

          {/* Manual Entry Form */}
          {mode === 'manual' && (
            <form onSubmit={handleSubmit}>
            {/* Property Details */}
            <Card className="mb-6">
              <div className="flex items-center mb-6">
                <Home className="w-5 h-5 mr-2 text-emerald-600" />
                <h2 className="text-xl font-semibold text-slate-900">
                  Property Details
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Input
                    label="Property Address"
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    error={errors.address}
                    placeholder="123 Main St, City, State"
                  />
                </div>
                <Select
                  label="Property Type"
                  value={formData.propertyType || 'house'}
                  onChange={(e) => handleChange('propertyType', e.target.value)}
                  options={[
                    { value: 'house', label: 'House' },
                    { value: 'apartment', label: 'Apartment' },
                    { value: 'commercial', label: 'Commercial' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
                <Input
                  label="Purchase Price"
                  type="number"
                  value={formData.purchasePrice || ''}
                  onChange={(e) => handleChange('purchasePrice', parseFloat(e.target.value) || 0)}
                  error={errors.purchasePrice}
                  placeholder="500000"
                  min="0"
                  step="1000"
                />
              </div>
            </Card>

            {/* Financial Details */}
            <Card className="mb-6">
              <div className="flex items-center mb-6">
                <DollarSign className="w-5 h-5 mr-2 text-emerald-600" />
                <h2 className="text-xl font-semibold text-slate-900">
                  Financial Details
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Down Payment"
                  type="number"
                  value={formData.downPayment || ''}
                  onChange={(e) => handleChange('downPayment', parseFloat(e.target.value) || 0)}
                  error={errors.downPayment}
                  placeholder="100000"
                  min="0"
                  step="1000"
                />
                <Input
                  label="Loan Amount (auto-calculated if empty)"
                  type="number"
                  value={formData.loanAmount || ''}
                  onChange={(e) => handleChange('loanAmount', parseFloat(e.target.value) || 0)}
                  placeholder="Auto-calculated"
                  min="0"
                  step="1000"
                />
                <Input
                  label="Interest Rate (%)"
                  type="number"
                  value={formData.interestRate || ''}
                  onChange={(e) => handleChange('interestRate', parseFloat(e.target.value) || 0)}
                  placeholder="6.5"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <Input
                  label="Loan Term (years)"
                  type="number"
                  value={formData.loanTerm || ''}
                  onChange={(e) => handleChange('loanTerm', parseInt(e.target.value) || 30)}
                  placeholder="30"
                  min="1"
                  max="50"
                />
                <Input
                  label="Closing Costs"
                  type="number"
                  value={formData.closingCosts || ''}
                  onChange={(e) => handleChange('closingCosts', parseFloat(e.target.value) || 0)}
                  placeholder="10000"
                  min="0"
                  step="100"
                />
              </div>
            </Card>

            {/* Income */}
            <Card className="mb-6">
              <div className="flex items-center mb-6">
                <TrendingUp className="w-5 h-5 mr-2 text-emerald-600" />
                <h2 className="text-xl font-semibold text-slate-900">
                  Income
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Monthly Rent"
                  type="number"
                  value={formData.monthlyRent || ''}
                  onChange={(e) => handleChange('monthlyRent', parseFloat(e.target.value) || 0)}
                  error={errors.monthlyRent}
                  placeholder="2500"
                  min="0"
                  step="100"
                />
                <Input
                  label="Other Monthly Income"
                  type="number"
                  value={formData.otherIncome || ''}
                  onChange={(e) => handleChange('otherIncome', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                  step="10"
                  helperText="Parking, storage, etc."
                />
              </div>
            </Card>

            {/* Expenses */}
            <Card className="mb-6">
              <div className="flex items-center mb-6">
                <DollarSign className="w-5 h-5 mr-2 text-emerald-600" />
                <h2 className="text-xl font-semibold text-slate-900">
                  Monthly Expenses
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Property Tax"
                  type="number"
                  value={formData.propertyTax || ''}
                  onChange={(e) => handleChange('propertyTax', parseFloat(e.target.value) || 0)}
                  placeholder="500"
                  min="0"
                  step="10"
                />
                <Input
                  label="Insurance"
                  type="number"
                  value={formData.insurance || ''}
                  onChange={(e) => handleChange('insurance', parseFloat(e.target.value) || 0)}
                  placeholder="150"
                  min="0"
                  step="10"
                />
                <Input
                  label="Maintenance"
                  type="number"
                  value={formData.maintenance || ''}
                  onChange={(e) => handleChange('maintenance', parseFloat(e.target.value) || 0)}
                  placeholder="200"
                  min="0"
                  step="10"
                />
                <Input
                  label="Property Management"
                  type="number"
                  value={formData.propertyManagement || ''}
                  onChange={(e) => handleChange('propertyManagement', parseFloat(e.target.value) || 0)}
                  placeholder="250"
                  min="0"
                  step="10"
                  helperText="Usually 8-10% of rent"
                />
                <Input
                  label="Utilities"
                  type="number"
                  value={formData.utilities || ''}
                  onChange={(e) => handleChange('utilities', parseFloat(e.target.value) || 0)}
                  placeholder="100"
                  min="0"
                  step="10"
                />
                <Input
                  label="Vacancy Rate (%)"
                  type="number"
                  value={formData.vacancyRate || ''}
                  onChange={(e) => handleChange('vacancyRate', parseFloat(e.target.value) || 0)}
                  placeholder="5"
                  min="0"
                  max="100"
                  step="0.5"
                  helperText="Expected vacancy percentage"
                />
              </div>
            </Card>

            {/* Additional Settings */}
            <Card className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">
                Additional Settings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Annual Appreciation Rate (%)"
                  type="number"
                  value={formData.appreciationRate || ''}
                  onChange={(e) => handleChange('appreciationRate', parseFloat(e.target.value) || 0)}
                  placeholder="3"
                  min="0"
                  max="20"
                  step="0.1"
                  helperText="Expected annual property value increase"
                />
              </div>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/')}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="lg">
                <Calculator className="w-5 h-5 mr-2" />
                Analyze Property
              </Button>
            </div>
          </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
