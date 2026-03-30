import { create } from 'zustand';
import { DealInput } from '@/lib/validations/deal';

interface DealState {
  step: number;
  formData: Partial<DealInput>;
  setStep: (step: number) => void;
  updateFormData: (data: Partial<DealInput>) => void;
  reset: () => void;
}

export const useDealStore = create<DealState>((set) => ({
  step: 1,
  formData: {
    financing: {
      enabled: true,
      system: 'SAC',
      downPayment: 0,
      interestRateYear: 10,
      termMonths: 360,
    },
    acquisitionCosts: { itbiPercent: 0.03, cartorio: 0, reforms: 0 },
    revenue: { monthlyRent: 0, vacancyRate: 0.05 },
    expenses: { condo: 0, iptu: 0, managementPercent: 0.1, maintenancePercent: 0.05 },
  },
  setStep: (step) => set({ step }),
  updateFormData: (data) =>
    set((state) => ({
      formData: {
        ...state.formData,
        ...data,
        acquisitionCosts: data.acquisitionCosts
          ? { ...state.formData.acquisitionCosts, ...data.acquisitionCosts }
          : state.formData.acquisitionCosts,
        financing: data.financing
          ? { ...state.formData.financing, ...data.financing }
          : state.formData.financing,
        revenue: data.revenue
          ? { ...state.formData.revenue, ...data.revenue }
          : state.formData.revenue,
        expenses: data.expenses
          ? { ...state.formData.expenses, ...data.expenses }
          : state.formData.expenses,
      },
    })),
  reset: () => set({ step: 1, formData: {} }),
}));
