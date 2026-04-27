'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FormRow } from '../FormRow';
import { NumberInput } from '../NumberInput';
import { newCompId, type CompCommon, type CompMode } from './helpers';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CompMode;
  /** When provided, the dialog edits this comp; otherwise creates a new one. */
  initial?: CompCommon | null;
  onSave: (comp: CompCommon) => void;
}

export function AddCompDialog({ open, onOpenChange, mode, initial, onSave }: Props) {
  const [address, setAddress] = React.useState(initial?.address ?? '');
  const [primaryValue, setPrimaryValue] = React.useState<number | ''>(
    initial?.primaryValue ?? ''
  );
  const [squareMeters, setSquareMeters] = React.useState<number | ''>(
    initial?.squareMeters ?? ''
  );
  const [bedrooms, setBedrooms] = React.useState<number | ''>(initial?.bedrooms ?? '');
  const [bathrooms, setBathrooms] = React.useState<number | ''>(initial?.bathrooms ?? '');
  const [date, setDate] = React.useState(initial?.date ?? '');
  const [sourceUrl, setSourceUrl] = React.useState(initial?.sourceUrl ?? '');
  const [notes, setNotes] = React.useState(initial?.notes ?? '');

  // Reset state when dialog re-opens with different initial
  React.useEffect(() => {
    if (!open) return;
    setAddress(initial?.address ?? '');
    setPrimaryValue(initial?.primaryValue ?? '');
    setSquareMeters(initial?.squareMeters ?? '');
    setBedrooms(initial?.bedrooms ?? '');
    setBathrooms(initial?.bathrooms ?? '');
    setDate(initial?.date ?? '');
    setSourceUrl(initial?.sourceUrl ?? '');
    setNotes(initial?.notes ?? '');
  }, [open, initial]);

  const isValid =
    typeof primaryValue === 'number' &&
    primaryValue > 0 &&
    typeof squareMeters === 'number' &&
    squareMeters > 0;

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      id: initial?.id ?? newCompId(),
      address: address.trim() || undefined,
      primaryValue: typeof primaryValue === 'number' ? primaryValue : 0,
      squareMeters: typeof squareMeters === 'number' ? squareMeters : 0,
      bedrooms: typeof bedrooms === 'number' ? bedrooms : undefined,
      bathrooms: typeof bathrooms === 'number' ? bathrooms : undefined,
      date: date || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  const valueLabel = mode === 'sales' ? 'Preço de Venda' : 'Aluguel Mensal';
  const dateLabel = mode === 'sales' ? 'Data da Venda' : 'Data do Anúncio';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{initial ? 'Editar Comparável' : 'Adicionar Comparável'}</DialogTitle>
        <DialogDescription>
          {mode === 'sales'
            ? 'Insira um imóvel similar vendido recentemente para validar o ARV.'
            : 'Insira um imóvel similar alugado recentemente para precificar o aluguel.'}
        </DialogDescription>

        <div className="-mx-4 divide-y divide-[#F0EFEB] border-y border-[#E2E0DA]">
          <FormRow label="Endereço">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, bairro"
            />
          </FormRow>
          <FormRow label={valueLabel}>
            <NumberInput
              prefix="R$"
              value={primaryValue}
              onChange={setPrimaryValue}
            />
          </FormRow>
          <FormRow label="Área">
            <NumberInput
              suffix="m²"
              value={squareMeters}
              onChange={setSquareMeters}
            />
          </FormRow>
          <FormRow label="Quartos / Banheiros">
            <div className="flex gap-2">
              <NumberInput value={bedrooms} onChange={setBedrooms} suffix="qtos" />
              <NumberInput value={bathrooms} onChange={setBathrooms} suffix="ban" />
            </div>
          </FormRow>
          <FormRow label={dateLabel}>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormRow>
          <FormRow label="Link do Anúncio">
            <Input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://"
            />
          </FormRow>
          <FormRow label="Notas" stacked>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Diferenças relevantes (reformado, andar alto, vista…)"
              className="w-full resize-y rounded-lg border border-[#E2E0DA] bg-transparent px-2.5 py-2 text-sm text-[#1C2B20] outline-none focus:border-[#4A7C59] focus:ring-3 focus:ring-[#4A7C59]/20"
            />
          </FormRow>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-4 py-2 text-xs font-medium text-[#6B7280] transition-colors hover:text-[#1C2B20]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid}
            className="rounded-full bg-[#4A7C59] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {initial ? 'Salvar Alterações' : 'Adicionar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
