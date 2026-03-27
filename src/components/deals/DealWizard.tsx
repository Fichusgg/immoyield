'use client';

import { useState } from 'react';
import { useDealStore } from '@/store/useDealStore';
import { PropertyBasics } from './steps/PropertyBasics';
import { FinancingDetails } from './steps/FinancingDetails';
import { RevenueExpenses } from './steps/RevenueExpenses';

// Define the shape of the API response to satisfy TypeScript
interface CalculationResult {
  metrics: {
    capRate: number;
    cashOnCash: number;
    totalInvestment: number;
    monthlyNOI: number;
    monthlyCashFlow: number;
  };
}

export default function DealWizard() {
  const { step, formData } = useDealStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);

  const calculateDeal = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/deals/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const json = await response.json();
      
      if (response.ok && json.success) {
        setResult(json.data);
      } else {
        console.error('Calculation failed:', json.error);
      }
    } catch (error) {
      console.error('Network error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-sm border text-black">
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s} 
              className={`h-2 w-full mx-1 rounded-full ${step >= s ? 'bg-blue-600' : 'bg-gray-200'}`} 
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 uppercase font-bold text-center">Step {step} of 4</p>
      </div>

      {step === 1 && <PropertyBasics />}
      {step === 2 && <FinancingDetails />}
      {step === 3 && <RevenueExpenses />}
      
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Review Inputs</h2>
          <div className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-40 border">
            <pre>{JSON.stringify(formData, null, 2)}</pre>
          </div>
          <button 
            onClick={calculateDeal}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-md font-bold transition-colors"
          >
            {loading ? 'Calculating...' : 'Run Analysis'}
          </button>
        </div>
      )}

      {result && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-in fade-in slide-in-from-bottom-2">
          <h3 className="font-bold text-blue-900 mb-2">ROI Results</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>Cap Rate:</p> <p className="font-semibold">{result.metrics.capRate.toFixed(2)}%</p>
            <p>Cash on Cash:</p> <p className="font-semibold">{result.metrics.cashOnCash.toFixed(2)}%</p>
            <p>Monthly Cash Flow:</p> <p className="font-semibold text-green-700">R$ {result.metrics.monthlyCashFlow.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
}