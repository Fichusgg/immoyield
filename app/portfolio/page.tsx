'use client';

import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/shared/Card';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { MetricCard } from '@/components/shared/MetricCard';
import { Plus, Edit2, Trash2, TrendingUp, DollarSign, Home, X } from 'lucide-react';

// TODO: replace mock with server fetch from Supabase
type PortfolioProperty = {
  id: string;
  name: string;               // user label: "Studio in Pinheiros"
  city: string;
  neighborhood?: string | null;
  purchasePrice: number;      // BRL
  purchaseDate: string;       // ISO
  currentValueEstimate: number; // BRL (user-entered for now)
  rentMonthly: number;        // BRL
  condoFeeMonthly?: number | null; // BRL
  iptuAnnual?: number | null; // BRL
  vacancyRate?: number | null; // % (0-100) optional
  notes?: string | null;
};

// Mock data
const mockProperties: PortfolioProperty[] = [
  {
    id: '1',
    name: 'Studio in Pinheiros',
    city: 'São Paulo',
    neighborhood: 'Pinheiros',
    purchasePrice: 320000,
    purchaseDate: '2022-06-15',
    currentValueEstimate: 350000,
    rentMonthly: 2800,
    condoFeeMonthly: 450,
    iptuAnnual: 2400,
    vacancyRate: 5,
    notes: 'Great location, easy to rent',
  },
  {
    id: '2',
    name: '2BR Vila Madalena',
    city: 'São Paulo',
    neighborhood: 'Vila Madalena',
    purchasePrice: 520000,
    purchaseDate: '2023-03-20',
    currentValueEstimate: 580000,
    rentMonthly: 4200,
    condoFeeMonthly: 680,
    iptuAnnual: 4200,
    vacancyRate: 3,
    notes: null,
  },
];

type PropertyCalculations = {
  netAnnualIncome: number;
  netYield: number;
  paybackYears: number;
  appreciation: number;
  appreciationPercent: number;
};

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

function calculatePropertyMetrics(property: PortfolioProperty): PropertyCalculations {
  const rentAnnual = property.rentMonthly * 12;
  const condoAnnual = (property.condoFeeMonthly || 0) * 12;
  const vacancyLoss = property.vacancyRate
    ? (rentAnnual * property.vacancyRate) / 100
    : 0;
  
  const netAnnualIncome = rentAnnual - condoAnnual - (property.iptuAnnual || 0) - vacancyLoss;
  const netYield = property.currentValueEstimate > 0
    ? (netAnnualIncome / property.currentValueEstimate) * 100
    : 0;
  const paybackYears = netAnnualIncome > 0
    ? property.currentValueEstimate / netAnnualIncome
    : Infinity;
  
  const appreciation = property.currentValueEstimate - property.purchasePrice;
  const appreciationPercent = property.purchasePrice > 0
    ? (appreciation / property.purchasePrice) * 100
    : 0;

  return {
    netAnnualIncome,
    netYield,
    paybackYears,
    appreciation,
    appreciationPercent,
  };
}

function Modal({
  isOpen,
  onClose,
  property,
  onSave,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  property: PortfolioProperty | null;
  onSave: (property: PortfolioProperty) => void;
  onDelete?: (id: string) => void;
}) {
  const [formData, setFormData] = useState<Partial<PortfolioProperty>>({
    name: '',
    city: '',
    neighborhood: '',
    purchasePrice: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    currentValueEstimate: 0,
    rentMonthly: 0,
    condoFeeMonthly: null,
    iptuAnnual: null,
    vacancyRate: null,
    notes: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (property) {
      setFormData({
        ...property,
        purchaseDate: property.purchaseDate.split('T')[0],
      });
    } else {
      setFormData({
        name: '',
        city: '',
        neighborhood: '',
        purchasePrice: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        currentValueEstimate: 0,
        rentMonthly: 0,
        condoFeeMonthly: null,
        iptuAnnual: null,
        vacancyRate: null,
        notes: null,
      });
    }
    setErrors({});
  }, [property, isOpen]);

  const handleChange = (field: keyof PortfolioProperty, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = 'Name is required';
    if (!formData.city?.trim()) newErrors.city = 'City is required';
    if (!formData.purchasePrice || formData.purchasePrice <= 0) {
      newErrors.purchasePrice = 'Purchase price must be greater than 0';
    }
    if (!formData.currentValueEstimate || formData.currentValueEstimate <= 0) {
      newErrors.currentValueEstimate = 'Current value must be greater than 0';
    }
    if (!formData.rentMonthly || formData.rentMonthly <= 0) {
      newErrors.rentMonthly = 'Monthly rent must be greater than 0';
    }
    if (!formData.purchaseDate) newErrors.purchaseDate = 'Purchase date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const propertyToSave: PortfolioProperty = {
        id: property?.id || `prop-${Date.now()}`,
        name: formData.name!,
        city: formData.city!,
        neighborhood: formData.neighborhood || null,
        purchasePrice: formData.purchasePrice!,
        purchaseDate: new Date(formData.purchaseDate!).toISOString(),
        currentValueEstimate: formData.currentValueEstimate!,
        rentMonthly: formData.rentMonthly!,
        condoFeeMonthly: formData.condoFeeMonthly || null,
        iptuAnnual: formData.iptuAnnual || null,
        vacancyRate: formData.vacancyRate || null,
        notes: formData.notes || null,
      };
      onSave(propertyToSave);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            {property ? 'Edit Property' : 'Add Property'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Property Name"
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              error={errors.name}
              placeholder="e.g., Studio in Pinheiros"
            />
            <Input
              label="City"
              type="text"
              value={formData.city || ''}
              onChange={(e) => handleChange('city', e.target.value)}
              error={errors.city}
              placeholder="São Paulo"
            />
            <Input
              label="Neighborhood (optional)"
              type="text"
              value={formData.neighborhood || ''}
              onChange={(e) => handleChange('neighborhood', e.target.value || null)}
              placeholder="Pinheiros"
            />
            <Input
              label="Purchase Date"
              type="date"
              value={formData.purchaseDate || ''}
              onChange={(e) => handleChange('purchaseDate', e.target.value)}
              error={errors.purchaseDate}
            />
            <Input
              label="Purchase Price (BRL)"
              type="number"
              value={formData.purchasePrice || ''}
              onChange={(e) => handleChange('purchasePrice', parseFloat(e.target.value) || 0)}
              error={errors.purchasePrice}
              min="0"
              step="1000"
            />
            <Input
              label="Current Value Estimate (BRL)"
              type="number"
              value={formData.currentValueEstimate || ''}
              onChange={(e) => handleChange('currentValueEstimate', parseFloat(e.target.value) || 0)}
              error={errors.currentValueEstimate}
              min="0"
              step="1000"
            />
            <Input
              label="Monthly Rent (BRL)"
              type="number"
              value={formData.rentMonthly || ''}
              onChange={(e) => handleChange('rentMonthly', parseFloat(e.target.value) || 0)}
              error={errors.rentMonthly}
              min="0"
              step="100"
            />
            <Input
              label="Monthly Condo Fee (BRL, optional)"
              type="number"
              value={formData.condoFeeMonthly || ''}
              onChange={(e) => handleChange('condoFeeMonthly', e.target.value ? parseFloat(e.target.value) : null)}
              min="0"
              step="10"
            />
            <Input
              label="Annual IPTU (BRL, optional)"
              type="number"
              value={formData.iptuAnnual || ''}
              onChange={(e) => handleChange('iptuAnnual', e.target.value ? parseFloat(e.target.value) : null)}
              min="0"
              step="100"
            />
            <Input
              label="Vacancy Rate (%) (optional)"
              type="number"
              value={formData.vacancyRate || ''}
              onChange={(e) => handleChange('vacancyRate', e.target.value ? parseFloat(e.target.value) : null)}
              min="0"
              max="100"
              step="0.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value || null)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" variant="primary" className="flex-1">
              {property ? 'Save Changes' : 'Add Property'}
            </Button>
            {property && onDelete && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (confirm('Are you sure you want to remove this property?')) {
                    onDelete(property.id);
                    onClose();
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function PortfolioPage() {
  const [properties, setProperties] = useState<PortfolioProperty[]>(mockProperties);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PortfolioProperty | null>(null);

  const portfolioMetrics = useMemo(() => {
    const totals = properties.reduce(
      (acc, prop) => {
        const metrics = calculatePropertyMetrics(prop);
        return {
          totalValue: acc.totalValue + prop.currentValueEstimate,
          totalRent: acc.totalRent + prop.rentMonthly,
          totalNetIncome: acc.totalNetIncome + metrics.netAnnualIncome,
          totalAppreciation: acc.totalAppreciation + metrics.appreciation,
          totalPurchasePrice: acc.totalPurchasePrice + prop.purchasePrice,
        };
      },
      {
        totalValue: 0,
        totalRent: 0,
        totalNetIncome: 0,
        totalAppreciation: 0,
        totalPurchasePrice: 0,
      }
    );

    const weightedYield =
      totals.totalValue > 0 ? (totals.totalNetIncome / totals.totalValue) * 100 : 0;
    const appreciationPercent =
      totals.totalPurchasePrice > 0
        ? (totals.totalAppreciation / totals.totalPurchasePrice) * 100
        : 0;

    return {
      ...totals,
      weightedYield,
      appreciationPercent,
    };
  }, [properties]);

  const handleSave = (property: PortfolioProperty) => {
    if (editingProperty) {
      setProperties((prev) =>
        prev.map((p) => (p.id === property.id ? property : p))
      );
    } else {
      setProperties((prev) => [...prev, property]);
    }
    setEditingProperty(null);
  };

  const handleDelete = (id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  const handleEdit = (property: PortfolioProperty) => {
    setEditingProperty(property);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProperty(null);
    setIsModalOpen(true);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                Portfolio
              </h1>
              <p className="text-lg text-slate-700">
                Track and manage your real estate investments
              </p>
            </div>
            <Button variant="primary" onClick={handleAdd}>
              <Plus className="w-5 h-5 mr-2" />
              Add Property
            </Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <MetricCard
              title="Total Value"
              value={formatCurrency(portfolioMetrics.totalValue)}
              icon={<Home className="w-6 h-6" />}
            />
            <MetricCard
              title="Total Monthly Rent"
              value={formatCurrency(portfolioMetrics.totalRent)}
              icon={<DollarSign className="w-6 h-6" />}
            />
            <MetricCard
              title="Net Annual Income"
              value={formatCurrency(portfolioMetrics.totalNetIncome)}
              icon={<TrendingUp className="w-6 h-6" />}
            />
            <MetricCard
              title="Weighted Avg Yield"
              value={`${portfolioMetrics.weightedYield.toFixed(2)}%`}
              subtitle="Portfolio average"
            />
            <MetricCard
              title="Total Appreciation"
              value={formatCurrency(portfolioMetrics.totalAppreciation)}
              subtitle={`${portfolioMetrics.appreciationPercent.toFixed(1)}% gain`}
              trend={portfolioMetrics.totalAppreciation >= 0 ? 'up' : 'down'}
            />
          </div>

          {/* Properties List */}
          {properties.length === 0 ? (
            <Card className="text-center py-12">
              <Home className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No properties yet
              </h3>
              <p className="text-slate-600 mb-6">
                Add your first property to start tracking your portfolio
              </p>
              <Button variant="primary" onClick={handleAdd}>
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Property
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {properties.map((property) => {
                const metrics = calculatePropertyMetrics(property);
                return (
                  <Card key={property.id}>
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-1">
                              {property.name}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {property.neighborhood ? `${property.neighborhood}, ` : ''}
                              {property.city}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Purchase Price</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatCurrency(property.purchasePrice)}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {formatDate(property.purchaseDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Current Value</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatCurrency(property.currentValueEstimate)}
                            </p>
                            <p className="text-xs text-emerald-700 mt-1">
                              {metrics.appreciationPercent >= 0 ? '+' : ''}
                              {metrics.appreciationPercent.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Monthly Rent</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatCurrency(property.rentMonthly)}
                            </p>
                            {property.condoFeeMonthly && (
                              <p className="text-xs text-slate-500 mt-1">
                                Condo: {formatCurrency(property.condoFeeMonthly)}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Net Yield</p>
                            <p className="text-sm font-semibold text-emerald-700">
                              {metrics.netYield.toFixed(2)}%
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Payback: {metrics.paybackYears === Infinity ? 'N/A' : `${metrics.paybackYears.toFixed(1)}y`}
                            </p>
                          </div>
                        </div>

                        {property.notes && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-slate-600">{property.notes}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 md:flex-col">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(property)}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to remove this property?')) {
                              handleDelete(property.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingProperty(null);
            }}
            property={editingProperty}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </Layout>
  );
}

