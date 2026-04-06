import { create } from 'zustand';
import { DealInput } from '@/lib/validations/deal';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

interface DealState {
  activeTab: number; // 0=Dados, 1=Compra, 2=Receitas, 3=Projeções, 4=Revisão
  formData: DeepPartial<DealInput>;
  setActiveTab: (tab: number) => void;
  updateFormData: (data: DeepPartial<DealInput>) => void;
  reset: () => void;
  // legacy compat
  step: number;
  setStep: (step: number) => void;
}

const defaultFormData: DeepPartial<DealInput> = {
  propertyType: 'residential',
  financing: {
    enabled: true,
    system: 'SAC',
    downPayment: 0,
    interestRateYear: 10.5,
    termMonths: 360,
  },
  acquisitionCosts: { itbiPercent: 0.03, cartorio: 0, reforms: 0 },
  revenue: {
    monthlyRent: 0,
    vacancyRate: 0.05,
    ipcaIndexed: false,
    annualIpcaRate: 0.05,
    dailyRate: 0,
    occupancyRate: 0.65,
    afterRepairValue: 0,
    holdingMonths: 6,
  },
  expenses: {
    condo: 0,
    iptu: 0,
    managementPercent: 0.1,
    maintenancePercent: 0.05,
    sellingCostPercent: 0.06,
  },
  projections: {
    appreciationRate: 0.05,
    incomeGrowthRate: 0.05,
    expenseGrowthRate: 0.05,
    holdPeriodYears: 10,
    sellingCostPercent: 0.08,
    depreciationPeriodYears: 25,
  },
};

export const useDealStore = create<DealState>((set) => ({
  activeTab: 0,
  step: 1, // legacy
  formData: { ...defaultFormData },

  setActiveTab: (tab) => set({ activeTab: tab, step: tab + 1 }),
  setStep: (step) => set({ step, activeTab: step - 1 }),

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
        projections: data.projections
          ? { ...state.formData.projections, ...data.projections }
          : state.formData.projections,
      },
    })),

  reset: () => set({ activeTab: 0, step: 1, formData: { ...defaultFormData } }),
}));
