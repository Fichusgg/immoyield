import { z } from 'zod';

export const dealSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  purchasePrice: z.number().positive('Purchase price must be positive'),
  acquisitionCosts: z.object({
    itbiPercent: z.number().min(0).max(0.1), // Max 10%
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
    monthlyRent: z.number().positive(),
    vacancyRate: z.number().min(0).max(1),
  }),
  expenses: z.object({
    condo: z.number().min(0),
    iptu: z.number().min(0),
    managementPercent: z.number().min(0).max(1),
    maintenancePercent: z.number().min(0).max(1),
  }),
});

// Infer the type from the schema for use in the frontend
export type DealInput = z.infer<typeof dealSchema>;
