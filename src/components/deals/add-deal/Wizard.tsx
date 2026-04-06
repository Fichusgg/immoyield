'use client';

import { useEffect, useMemo, useState } from 'react';
import { Controller, FormProvider, useForm, type FieldPath } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { createClient } from '@/lib/supabase/client';
import { AddDealStepper, type WizardStep } from '@/components/deals/add-deal/Stepper';
import type { DealType } from '@/components/deals/add-deal/Sidebar';
import { PropertyDescriptionStep } from '@/components/deals/add-deal/steps/PropertyDescriptionStep';
import { CurrencyInput } from '@/components/ui/currency-input';

const dealTypeEnum = ['rentals', 'brrrrs', 'flips', 'wholesale'] as const;
const cadenceEnum = ['per_month'] as const;

const dealInputsSchema = z.object({
  property: z.object({
    type: z.enum(dealTypeEnum),
    name: z.string().min(1, 'Nome do imóvel é obrigatório'),
    description: z.string().max(2000).optional(),
    tags: z.string().max(500).optional(),
  }),
  purchase: z.object({
    purchasePrice: z.number().min(0, 'Deve ser 0 ou mais'),
    afterRepairValue: z.number().min(0, 'Deve ser 0 ou mais'),
    financing: z.object({
      enabled: z.boolean(),
      interestRate: z.number().min(0).max(100),
      downPayment: z.number().min(0),
      termMonths: z.number().int().min(1),
    }),
  }),
  income: z.object({
    grossRent: z.number().min(0),
    vacancyRate: z.number().min(0).max(100),
    otherIncome: z.number().min(0),
    cadence: z.enum(cadenceEnum),
  }),
  expenses: z.object({
    placeholder: z.number().min(0),
  }),
  projections: z.object({
    appreciation: z.number().min(0).max(100),
    incomeIncrease: z.number().min(0).max(100),
    expenseIncrease: z.number().min(0).max(100),
  }),
});

export type DealInputs = z.infer<typeof dealInputsSchema>;

const STEPS: WizardStep[] = [
  {
    id: 'property',
    title: 'Descrição',
    subtitle: 'Nome, tags, notas',
  },
  {
    id: 'purchase',
    title: 'Compra & Reforma',
    subtitle: 'Preço, ARV, financiamento',
  },
  {
    id: 'income',
    title: 'Receitas & Despesas',
    subtitle: 'Receita + custos operacionais',
  },
  {
    id: 'projections',
    title: 'Projeções',
    subtitle: 'Hipóteses de crescimento',
  },
];

function defaultValuesFor(type: DealType): DealInputs {
  return {
    property: { type, name: '', description: '', tags: '' },
    purchase: {
      purchasePrice: 0,
      afterRepairValue: 0,
      financing: { enabled: false, interestRate: 6.5, downPayment: 0, termMonths: 360 },
    },
    income: { grossRent: 0, vacancyRate: 5, otherIncome: 0, cadence: 'per_month' },
    expenses: { placeholder: 0 },
    projections: { appreciation: 3, incomeIncrease: 2, expenseIncrease: 2 },
  };
}

export function AddDealWizard({
  dealType,
  pageTitle,
  breadcrumb,
}: {
  dealType: DealType;
  pageTitle: string;
  breadcrumb: string;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const form = useForm<DealInputs>({
    resolver: zodResolver(dealInputsSchema),
    mode: 'onTouched',
    defaultValues: defaultValuesFor(dealType),
    shouldUnregister: false,
  });

  useEffect(() => {
    form.setValue('property.type', dealType, { shouldDirty: true, shouldTouch: false });
  }, [dealType, form]);

  const headerMeta = useMemo(() => {
    return {
      breadcrumb,
      title: pageTitle,
    };
  }, [breadcrumb, pageTitle]);

  const startOver = () => {
    setSaveError(null);
    setSaveSuccess(null);
    setActiveStep(0);
    form.reset(defaultValuesFor(dealType));
  };

  const validateStep = async (stepIndex: number) => {
    setSaveError(null);
    setSaveSuccess(null);

    if (stepIndex === 0) {
      return await form.trigger(['property.name'], { shouldFocus: true });
    }

    if (stepIndex === 1) {
      const financingEnabled = form.getValues('purchase.financing.enabled');
      const fields: FieldPath<DealInputs>[] = [
        'purchase.purchasePrice',
        'purchase.afterRepairValue',
        'purchase.financing.enabled',
      ];
      if (financingEnabled) {
        fields.push(
          'purchase.financing.interestRate',
          'purchase.financing.downPayment',
          'purchase.financing.termMonths'
        );
      }
      return await form.trigger(fields, { shouldFocus: true });
    }

    if (stepIndex === 2) {
      return await form.trigger(['income.grossRent', 'income.vacancyRate', 'income.otherIncome'], {
        shouldFocus: true,
      });
    }

    if (stepIndex === 3) {
      return await form.trigger(
        ['projections.appreciation', 'projections.incomeIncrease', 'projections.expenseIncrease'],
        { shouldFocus: true }
      );
    }

    return true;
  };

  const next = async () => {
    const ok = await validateStep(activeStep);
    if (!ok) return;
    setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => setActiveStep((s) => Math.max(s - 1, 0));

  const onSave = form.handleSubmit(async (data) => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) {
        setSaveError('Você precisa estar logado para salvar.');
        return;
      }

      const insertPayload = {
        user_id: user.id,
        name: data.property?.name || 'Imóvel sem nome',
        property_type: data.property?.type,
        inputs: data,
      };

      const { error: insertError } = await supabase.from('deals').insert(insertPayload);
      if (insertError) throw insertError;

      setSaveSuccess('Salvo.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  });

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#737373]">{headerMeta.breadcrumb}</p>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-[#1a1a1a]">
              {headerMeta.title}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={startOver}
              className="h-10 rounded-xl border border-[#d4d4d2] bg-white px-4 text-sm font-semibold text-[#1a1a1a] shadow-sm transition-colors hover:bg-[#f5f5f3]"
            >
              Recomeçar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="h-10 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>

        {(saveError || saveSuccess) && (
          <div
            className={[
              'rounded-2xl border px-4 py-3 text-sm',
              saveError
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900',
            ].join(' ')}
          >
            {saveError ?? saveSuccess}
          </div>
        )}

        {/* Stepper */}
        <AddDealStepper
          steps={STEPS}
          activeIndex={activeStep}
          onStepClick={(idx) => {
            if (idx <= activeStep) setActiveStep(idx);
          }}
        />

        {/* Step content */}
        <div className="rounded-2xl border border-[#e5e5e3] bg-white p-8 shadow-sm">
          {activeStep === 0 && <PropertyDescriptionStep />}

          {activeStep === 1 && (
            <div className="space-y-10">
              <section>
                <p className="text-[11px] font-bold tracking-widest text-blue-700 uppercase">
                  COMPRA
                </p>
                <div className="mt-5 grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-[#1a1a1a]">Preço de Compra</label>
                    <Controller
                      control={form.control}
                      name="purchase.purchasePrice"
                      render={({ field }) => (
                        <CurrencyInput
                          className="mt-2 h-11 w-full rounded-xl border border-[#e5e5e3] bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          placeholder="0"
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#1a1a1a]">
                      Valor Após Reforma (ARV)
                    </label>
                    <Controller
                      control={form.control}
                      name="purchase.afterRepairValue"
                      render={({ field }) => (
                        <CurrencyInput
                          className="mt-2 h-11 w-full rounded-xl border border-[#e5e5e3] bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          placeholder="0"
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[11px] font-bold tracking-widest text-blue-700 uppercase">
                    FINANCIAMENTO
                  </p>
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#1a1a1a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#d4d4d2] text-blue-600"
                      {...form.register('purchase.financing.enabled')}
                    />
                    Habilitar financiamento
                  </label>
                </div>

                {form.watch('purchase.financing.enabled') && (
                  <div className="mt-5 grid grid-cols-3 gap-6 rounded-2xl border border-[#e5e5e3] bg-[#f5f5f3] p-6">
                    <div>
                      <label className="text-sm font-semibold text-[#1a1a1a]">
                        Taxa de Juros (%)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        className="mt-2 h-11 w-full rounded-xl border border-[#e5e5e3] bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        {...form.register('purchase.financing.interestRate', { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-[#1a1a1a]">Entrada</label>
                      <Controller
                        control={form.control}
                        name="purchase.financing.downPayment"
                        render={({ field }) => (
                          <CurrencyInput
                            className="mt-2 h-11 w-full rounded-xl border border-[#e5e5e3] bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            placeholder="0"
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-[#1a1a1a]">Prazo (meses)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="mt-2 h-11 w-full rounded-xl border border-[#e5e5e3] bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        {...form.register('purchase.financing.termMonths', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-10">
              <section>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[11px] font-bold tracking-widest text-blue-700 uppercase">
                    RECEITA DE ALUGUEL
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      className="h-10 rounded-xl border border-[#e5e5e3] bg-white px-3 text-sm font-semibold text-[#1a1a1a] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      {...form.register('income.cadence')}
                    >
                      <option value="per_month">Por mês</option>
                    </select>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-[#1a1a1a]">Aluguel Bruto</label>
                    <Controller
                      control={form.control}
                      name="income.grossRent"
                      render={({ field }) => (
                        <CurrencyInput
                          className="mt-2 h-11 w-full rounded-xl border border-[#e5e5e3] bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          placeholder="0"
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      )}
                    />
                    <button type="button" className="mt-2 text-xs font-semibold text-blue-700">
                      + Add Year-Specific Value
                    </button>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#1a1a1a]">Taxa de Vacância (%)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      className="mt-2 h-11 w-full rounded-xl border border-[#e5e5e3] bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      {...form.register('income.vacancyRate', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#1a1a1a]">Outras Receitas</label>
                    <Controller
                      control={form.control}
                      name="income.otherIncome"
                      render={({ field }) => (
                        <CurrencyInput
                          className="mt-2 h-11 w-full rounded-xl border border-[#e5e5e3] bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          placeholder="0"
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-10">
              <section>
                <p className="text-[11px] font-bold tracking-widest text-blue-700 uppercase">
                  PREMISSAS
                </p>
                <div className="mt-5 space-y-6">
                  {(
                    [
                      { key: 'appreciation', label: 'Valorização' },
                      { key: 'incomeIncrease', label: 'Crescimento da Receita' },
                      { key: 'expenseIncrease', label: 'Crescimento das Despesas' },
                    ] as const
                  ).map((row) => (
                    <div
                      key={row.key}
                      className="grid grid-cols-[220px_1fr] items-center gap-8"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#1a1a1a]">{row.label}</p>
                        <p className="mt-1 text-xs text-[#737373]">Defina sua taxa de crescimento anual.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative w-full max-w-[320px]">
                          <input
                            type="number"
                            inputMode="decimal"
                            className="h-11 w-full rounded-xl border border-[#e5e5e3] bg-white px-3 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            {...form.register(`projections.${row.key}`, { valueAsNumber: true })}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#737373]">
                            %
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-[#737373]">Ao ano</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            disabled={activeStep === 0}
            className="h-10 rounded-xl border border-[#d4d4d2] bg-white px-4 text-sm font-semibold text-[#1a1a1a] shadow-sm transition-colors hover:bg-[#f5f5f3] disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={next}
            disabled={activeStep === STEPS.length - 1}
            className="h-10 rounded-xl bg-[#1a1a1a] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-black disabled:opacity-50"
          >
            Próximo
          </button>
        </div>
      </div>
    </FormProvider>
  );
}
