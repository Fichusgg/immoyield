'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/shared/Card';
import { Input } from '@/components/shared/Input';
import { Select } from '@/components/shared/Select';
import { Button } from '@/components/shared/Button';
import { PropertyAnalysis } from '@/types/property';
import { Calculator, DollarSign, Home, TrendingUp } from 'lucide-react';

export default function AnalyzePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<PropertyAnalysis>>({
    propertyType: 'house',
    loanTerm: 30,
    vacancyRate: 5,
    appreciationRate: 3,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-600 text-white mb-4">
              <Calculator className="w-6 h-6" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Property Analysis
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Enter your property details to get a comprehensive investment analysis
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Property Details */}
            <Card className="mb-6">
              <div className="flex items-center mb-6">
                <Home className="w-5 h-5 mr-2 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
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
                <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
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
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
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
                <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
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
        </div>
      </div>
    </Layout>
  );
}
