export type AmortizationSystem = 'SAC' | 'PRICE';

/**
 * Default expense ratios applied as form presets (decimal, not %).
 * Centralized so wizards, planilha, and calculation paths agree.
 *
 * Ranges align with typical Brazilian rental practice:
 *   - Administração: 6–10% of rent (8% is a conservative midpoint)
 *   - Manutenção:    2–4% of rent  (3% is a conservative midpoint)
 */
export const EXPENSE_PRESETS = {
  managementPercent: 0.08,
  maintenancePercent: 0.03,
  sellingCostPercent: 0.06,
} as const;

export type FinancingModality = 'SFH' | 'SFI' | 'MCMV' | 'consorcio' | 'outro';

export type TaxRegime = 'PF' | 'PJ' | 'isento';

export type RentIndex = 'IPCA' | 'IGPM' | 'IGPDI' | 'custom';

/** SFH rate cap and LTV rules, enforced/informational only. */
export const MODALITY_RULES: Record<
  FinancingModality,
  { label: string; maxLtv: number; maxRate: number | null; note: string }
> = {
  SFH: {
    label: 'SFH — Sistema Financeiro da Habitação',
    maxLtv: 0.8,
    maxRate: 12,
    note: 'Teto TR + 12% a.a. · imóvel até R$1,5M · FGTS aceito',
  },
  MCMV: {
    label: 'MCMV — Minha Casa Minha Vida',
    maxLtv: 0.8,
    maxRate: 10.5,
    note: 'Juros subsidiados por faixa de renda · FGTS aceito',
  },
  SFI: {
    label: 'SFI — Sistema de Financiamento Imobiliário',
    maxLtv: 0.9,
    maxRate: null,
    note: 'Sem teto de juros · sem limite de valor do imóvel',
  },
  consorcio: {
    label: 'Consórcio',
    maxLtv: 1,
    maxRate: null,
    note: 'Sem juros · taxa de administração ≈ 0,2% a.m.',
  },
  outro: { label: 'Outro / à vista', maxLtv: 1, maxRate: null, note: '' },
};

export interface DealInputs {
  purchasePrice: number;
  propertyType?: string;
  acquisitionCosts: {
    itbiPercent: number;
    /** Legacy catch-all (backwards compat). Preferred: escritura+registro+avaliacao. */
    cartorio: number;
    reforms: number;
    /** Escritura pública (cartório de notas). */
    escritura?: number;
    /** Registro de imóveis. */
    registro?: number;
    /** Avaliação/laudo exigido pelo banco no financiamento. */
    avaliacao?: number;
  };
  financing: {
    enabled: boolean;
    downPayment: number;
    interestRateYear: number;
    termMonths: number;
    system: AmortizationSystem;
    modality?: FinancingModality;
    /** Parcela da entrada oriunda do saldo do FGTS (valor, em R$). */
    fgtsAmount?: number;
    /**
     * Seguro habitacional (DFI + MIP) em % ao ano sobre saldo devedor.
     * Range típico: 0.30% a 0.60% a.a. (decimal: 0.003 a 0.006). Default: 0.005 (0.5% a.a.).
     */
    insurancePercentYear?: number;
  };
  revenue: {
    monthlyRent: number;
    vacancyRate: number;
    /** True (default): rent already includes condo+IPTU (landlord pays them).
     *  False: tenant pays condo+IPTU directly — exclude from landlord expenses. */
    rentIncludesCondoIptu?: boolean;
    /** @deprecated use `rentIndex` + `annualRentIndexRate`. Kept for backwards compat. */
    ipcaIndexed?: boolean;
    annualIpcaRate?: number;
    rentIndex?: RentIndex;
    /** Ajuste anual nominal usado para reajuste do aluguel. */
    annualRentIndexRate?: number;
    dailyRate?: number;
    occupancyRate?: number;
    afterRepairValue?: number;
    holdingMonths?: number;
  };
  expenses: {
    condo: number;
    iptu: number;
    managementPercent: number;
    maintenancePercent: number;
    sellingCostPercent?: number;
  };
  taxation?: {
    regime: TaxRegime;
    /** Reinvestir em imóvel residencial em 180 dias isenta ganho de capital. */
    reinvestWithin180Days?: boolean;
  };
  /**
   * Long-term projection knobs. `holdPeriodYears` doubles as the horizon for
   * the rental ROI metric exposed in the analysis surface.
   */
  projections?: {
    appreciationRate?: number;
    incomeGrowthRate?: number;
    expenseGrowthRate?: number;
    holdPeriodYears?: number;
    sellingCostPercent?: number;
    depreciationPeriodYears?: number;
  };
}

export interface AmortizationPeriod {
  month: number;
  installment: number;
  interest: number;
  amortization: number;
  remainingBalance: number;
}

// Effective monthly rent considering property type
export function effectiveMonthlyRevenue(inputs: DealInputs): number {
  const type = inputs.propertyType ?? 'aluguel';
  if (type === 'airbnb') {
    const daily = inputs.revenue.dailyRate ?? 0;
    const occ = inputs.revenue.occupancyRate ?? 0.65;
    return daily * 30 * occ;
  }
  // aluguel / comercial / reforma (holding rent)
  return inputs.revenue.monthlyRent * (1 - inputs.revenue.vacancyRate);
}
