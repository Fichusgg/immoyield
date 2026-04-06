import { z } from 'zod';

export const PROPERTY_TYPES = ['residential', 'airbnb', 'flip', 'multifamily', 'commercial'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  residential: 'Aluguel',
  airbnb: 'Airbnb / Temporada',
  flip: 'Reforma e Venda',
  multifamily: 'Multifamiliar',
  commercial: 'Comercial',
};

export const dealSchema = z.object({
  name: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  propertyType: z.enum(PROPERTY_TYPES).default('residential'),

  property: z
    .object({
      shortDescription: z.string().max(1000).optional(),
      tagsAndLabels: z.string().max(500).optional(),

      bedrooms: z.number().int().min(0).max(20).optional(),
      bathrooms: z.number().int().min(0).max(20).optional(),
      squareFootage: z.number().int().min(0).optional(),
      yearBuilt: z.number().int().min(0).max(2100).optional(),
      parking: z.string().max(50).optional(),
      lotSizeSquareFeet: z.number().int().min(0).optional(),
      zoning: z.string().max(100).optional(),
      mlsNumber: z.string().max(100).optional(),

      address: z
        .object({
          streetAddress: z.string().max(200).optional(),
          city: z.string().max(100).optional(),
          region: z.string().max(100).optional(),
          postalCode: z.string().max(30).optional(),
        })
        .optional(),
    })
    .optional(),

  purchasePrice: z.number().positive('Preço de compra deve ser positivo'),

  acquisitionCosts: z.object({
    itbiPercent: z.number().min(0).max(0.1),
    cartorio: z.number().min(0),
    reforms: z.number().min(0),
  }),

  financing: z.object({
    enabled: z.boolean(),
    downPayment: z.number().min(0),
    interestRateYear: z.number().min(0),
    termMonths: z.number().int().positive(),
    system: z.enum(['SAC', 'PRICE']),
  }),

  revenue: z.object({
    // Aluguel / Comercial
    monthlyRent: z.number().min(0),
    vacancyRate: z.number().min(0).max(1),
    // IPCA indexation
    ipcaIndexed: z.boolean().default(false),
    annualIpcaRate: z.number().min(0).max(0.5).default(0.05),
    // Airbnb
    dailyRate: z.number().min(0).default(0),
    occupancyRate: z.number().min(0).max(1).default(0.65),
    // Reforma e venda (ARV)
    afterRepairValue: z.number().min(0).default(0),
    holdingMonths: z.number().int().min(1).default(6),
  }),

  expenses: z.object({
    condo: z.number().min(0),
    iptu: z.number().min(0),
    managementPercent: z.number().min(0).max(1),
    maintenancePercent: z.number().min(0).max(1),
    sellingCostPercent: z.number().min(0).max(0.2).default(0.06),
  }),

  // Long-term projections (DealCheck step 4)
  projections: z
    .object({
      appreciationRate: z.number().min(0).max(0.5).default(0.05),
      incomeGrowthRate: z.number().min(0).max(0.5).default(0.05),
      expenseGrowthRate: z.number().min(0).max(0.5).default(0.05),
      holdPeriodYears: z.number().int().min(1).max(30).default(10),
      sellingCostPercent: z.number().min(0).max(0.2).default(0.08),
      depreciationPeriodYears: z.number().min(1).max(50).default(25),
    })
    .optional(),
});

export type DealInput = z.infer<typeof dealSchema>;
