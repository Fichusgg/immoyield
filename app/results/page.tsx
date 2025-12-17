'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/shared/Card';
import { MetricCard } from '@/components/shared/MetricCard';
import { Button } from '@/components/shared/Button';
import { PropertyAnalysis, AnalysisResults } from '@/types/property';
import { calculateAnalysis } from '@/lib/calculations';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Home,
  Calculator,
  BarChart3,
  ArrowLeft,
  Download,
} from 'lucide-react';

export default function ResultsPage() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<PropertyAnalysis | null>(null);
  const [results, setResults] = useState<AnalysisResults | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('propertyAnalysis');
    if (stored) {
      try {
        const data = JSON.parse(stored) as PropertyAnalysis;
        setAnalysis(data);
        setResults(calculateAnalysis(data));
      } catch (error) {
        console.error('Error parsing analysis data:', error);
        router.push('/analyze');
      }
    } else {
      router.push('/analyze');
    }
  }, [router]);

  if (!analysis || !results) {
    return (
      <Layout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-slate-700">Loading analysis...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push('/analyze')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Analysis
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                  Analysis Results
                </h1>
                <p className="text-slate-700">
                  {analysis.address || 'Property Analysis'}
                </p>
              </div>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Monthly Cash Flow"
              value={formatCurrency(results.monthlyCashFlow)}
              icon={<DollarSign className="w-6 h-6" />}
              trend={results.monthlyCashFlow >= 0 ? 'up' : 'down'}
              trendValue={results.monthlyCashFlow >= 0 ? 'Positive' : 'Negative'}
            />
            <MetricCard
              title="Annual Cash Flow"
              value={formatCurrency(results.annualCashFlow)}
              icon={<TrendingUp className="w-6 h-6" />}
              trend={results.annualCashFlow >= 0 ? 'up' : 'down'}
            />
            <MetricCard
              title="Cash-on-Cash Return"
              value={formatPercentage(results.cashOnCashReturn)}
              icon={<BarChart3 className="w-6 h-6" />}
              subtitle="Annual ROI"
            />
            <MetricCard
              title="Cap Rate"
              value={formatPercentage(results.capRate)}
              icon={<Calculator className="w-6 h-6" />}
              subtitle="Net operating income"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Breakdown */}
            <Card className="lg:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">
                Monthly Breakdown
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-slate-700">Monthly Income</span>
                  <span className="text-lg font-semibold text-slate-900">
                    {formatCurrency(results.monthlyIncome)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-slate-700">Rent (after vacancy)</span>
                  <span className="text-slate-900">
                    {formatCurrency((analysis.monthlyRent * (100 - analysis.vacancyRate)) / 100)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-slate-700">Other Income</span>
                  <span className="text-slate-900">
                    {formatCurrency(analysis.otherIncome || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-slate-700">Monthly Expenses</span>
                  <span className="text-lg font-semibold text-red-600">
                    -{formatCurrency(results.monthlyExpenses)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-slate-700">Mortgage Payment</span>
                  <span className="text-slate-900">
                    {formatCurrency(results.monthlyMortgagePayment)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-slate-700">Property Tax</span>
                  <span className="text-slate-900">
                    {formatCurrency(analysis.propertyTax || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-slate-700">Insurance</span>
                  <span className="text-slate-900">
                    {formatCurrency(analysis.insurance || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-slate-700">Maintenance</span>
                  <span className="text-slate-900">
                    {formatCurrency(analysis.maintenance || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-slate-700">Property Management</span>
                  <span className="text-slate-900">
                    {formatCurrency(analysis.propertyManagement || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-slate-700">Utilities</span>
                  <span className="text-slate-900">
                    {formatCurrency(analysis.utilities || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-4 pt-6 border-t-2 border-gray-300 dark:border-gray-600">
                  <span className="text-lg font-semibold text-slate-900">
                    Monthly Cash Flow
                  </span>
                  <span
                    className={`text-2xl font-bold ${
                      results.monthlyCashFlow >= 0
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatCurrency(results.monthlyCashFlow)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Investment Metrics */}
            <Card>
              <h2 className="text-xl font-semibold text-slate-900 mb-6">
                Investment Metrics
              </h2>
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-slate-700 mb-1">
                    Purchase Price
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatCurrency(analysis.purchasePrice)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-700 mb-1">
                    Total Investment
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatCurrency(
                      (analysis.downPayment || 0) + (analysis.closingCosts || 0)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-700 mb-1">
                    Gross Rent Multiplier
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {results.grossRentMultiplier.toFixed(2)}x
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-slate-700 mb-2">
                    Appreciation Projections
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-700">5 Years</span>
                      <span className="text-sm font-medium text-slate-900">
                        {formatCurrency(results.fiveYearAppreciation)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-700">10 Years</span>
                      <span className="text-sm font-medium text-slate-900">
                        {formatCurrency(results.tenYearAppreciation)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Annual Summary */}
          <Card className="mt-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">
              Annual Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p className="text-sm text-slate-700 mb-1">Annual Income</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(results.annualIncome)}
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-slate-700 mb-1">Annual Expenses</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(results.annualExpenses)}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-slate-700 mb-1">Annual Cash Flow</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(results.annualCashFlow)}
                </p>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" size="lg" onClick={() => router.push('/analyze')}>
              <Calculator className="w-5 h-5 mr-2" />
              Analyze Another Property
            </Button>
            <Button variant="outline" size="lg" onClick={() => router.push('/')}>
              <Home className="w-5 h-5 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
