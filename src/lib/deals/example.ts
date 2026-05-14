import type { DealInput } from '@/lib/validations/deal';
import type { SavedDeal } from '@/lib/supabase/deals';
import type { AnalysisResult } from '@/components/deals/ResultsScreen';
import { analyzeRentalDeal } from '@/lib/calculations/rental';
import { calculateProjections } from '@/lib/calculations/projections';

export const EXAMPLE_DEAL_ID = 'exemplo';
export const EXAMPLE_DEAL_TITLE = 'Apartamento em Pinheiros — exemplo';

const EXAMPLE_INPUTS: DealInput = {
  name: EXAMPLE_DEAL_TITLE,
  propertyType: 'residential',
  property: {
    bedrooms: 2,
    bathrooms: 2,
    squareFootage: 72,
    yearBuilt: 2016,
    parking: '1',
    address: {
      neighborhood: 'Pinheiros',
      city: 'São Paulo',
      region: 'SP',
    },
  },
  purchasePrice: 650_000,
  acquisitionCosts: {
    itbiPercent: 0.03,
    cartorio: 0,
    reforms: 18_000,
    escritura: 3_500,
    registro: 4_200,
    avaliacao: 3_100,
  },
  financing: {
    enabled: true,
    downPayment: 325_000,
    interestRateYear: 9.5,
    termMonths: 360,
    system: 'SAC',
    modality: 'SFH',
    fgtsAmount: 0,
    insurancePercentYear: 0.0033,
  },
  revenue: {
    monthlyRent: 6_200,
    vacancyRate: 0.05,
    rentIncludesCondoIptu: true,
    ipcaIndexed: false,
    annualIpcaRate: 0.04,
    rentIndex: 'IPCA',
    annualRentIndexRate: 0.04,
    dailyRate: 0,
    occupancyRate: 0.65,
    afterRepairValue: 0,
    holdingMonths: 6,
  },
  expenses: {
    condo: 800,
    iptu: 240,
    managementPercent: 0.08,
    maintenancePercent: 0.03,
    sellingCostPercent: 0.06,
  },
  taxation: {
    regime: 'PF',
    reinvestWithin180Days: false,
  },
  projections: {
    appreciationRate: 0.05,
    incomeGrowthRate: 0.04,
    expenseGrowthRate: 0.04,
    holdPeriodYears: 10,
    sellingCostPercent: 0.06,
    depreciationPeriodYears: 25,
  },
};

let cached: SavedDeal | null = null;

export function buildExampleDeal(): SavedDeal {
  if (cached) return cached;

  const analysis = analyzeRentalDeal(EXAMPLE_INPUTS);
  const projections = calculateProjections(EXAMPLE_INPUTS);
  const results: AnalysisResult = { ...analysis, projections };

  const now = new Date().toISOString();

  cached = {
    id: EXAMPLE_DEAL_ID,
    user_id: EXAMPLE_DEAL_ID,
    title: EXAMPLE_DEAL_TITLE,
    property_type: 'residential',
    type: 'apartment',
    listing_type: null,
    status: 'analyzing',
    price: EXAMPLE_INPUTS.purchasePrice,
    condo_fee: EXAMPLE_INPUTS.expenses.condo,
    iptu: EXAMPLE_INPUTS.expenses.iptu,
    price_per_sqm: Math.round(EXAMPLE_INPUTS.purchasePrice / (EXAMPLE_INPUTS.property?.squareFootage ?? 1)),
    market_value: EXAMPLE_INPUTS.purchasePrice,
    area: EXAMPLE_INPUTS.property?.squareFootage ?? null,
    bedrooms: EXAMPLE_INPUTS.property?.bedrooms ?? null,
    bathrooms: EXAMPLE_INPUTS.property?.bathrooms ?? null,
    suites: 1,
    parking_spots: 1,
    street: null,
    neighborhood: EXAMPLE_INPUTS.property?.address?.neighborhood ?? null,
    city: EXAMPLE_INPUTS.property?.address?.city ?? null,
    state: EXAMPLE_INPUTS.property?.address?.region ?? null,
    zip_code: null,
    photos: null,
    agent_name: null,
    source_url: null,
    description:
      'Apartamento de 2 dormitórios bem localizado em Pinheiros, próximo a transporte e comércio. Esta análise é apenas um exemplo para você visualizar o formato do relatório.',
    notes: null,
    inputs: EXAMPLE_INPUTS,
    results_cache: results,
    comps: null,
    created_at: now,
    updated_at: now,
  };

  return cached;
}
