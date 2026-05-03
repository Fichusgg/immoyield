'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, MapPin, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { SavedDeal } from '@/lib/supabase/deals';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/property/PageHeader';
import { SectionHeading } from '@/components/property/SectionHeading';
import { FormCard } from '@/components/property/FormCard';
import { FormRow } from '@/components/property/FormRow';
import { NumberInput } from '@/components/property/NumberInput';
import { patchDeal } from '@/components/property/save-deal';
import { normalizeState, normalizeType } from '@/components/property/format';

const TIPO_OPTIONS = [
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'multifamily', label: 'Multifamiliar' },
  { value: 'condo', label: 'Cobertura' },
  { value: 'townhouse', label: 'Sobrado' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'land', label: 'Terreno' },
  { value: 'other', label: 'Outro' },
];

const NUM_OPTIONS = ['0', '1', '2', '3', '4', '5', '6+'];

interface Props {
  deal: SavedDeal;
}

export default function DescricaoContent({ deal }: Props) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  // ── Form state — only edit-relevant fields ─────────────────────────────
  const [title, setTitle] = React.useState(deal.title);
  const [shortDescription, setShortDescription] = React.useState(
    deal.inputs?.property?.shortDescription ?? deal.description ?? ''
  );
  const [tagsAndLabels, setTagsAndLabels] = React.useState(
    deal.inputs?.property?.tagsAndLabels ?? ''
  );

  const [street, setStreet] = React.useState(deal.street ?? '');
  const [neighborhood, setNeighborhood] = React.useState(deal.neighborhood ?? '');
  const [city, setCity] = React.useState(deal.city ?? '');
  const [state, setState] = React.useState(deal.state ?? '');
  const [zip, setZip] = React.useState(deal.zip_code ?? '');

  const [tipo, setTipo] = React.useState(deal.type ?? 'apartment');
  const [bedrooms, setBedrooms] = React.useState<string>(
    deal.bedrooms != null ? String(deal.bedrooms) : '0'
  );
  const [bathrooms, setBathrooms] = React.useState<string>(
    deal.bathrooms != null ? String(deal.bathrooms) : '0'
  );
  const [sqft, setSqft] = React.useState<number | ''>(deal.area ?? '');
  const [yearBuilt, setYearBuilt] = React.useState<number | ''>(
    deal.inputs?.property?.yearBuilt ?? ''
  );
  const [parking, setParking] = React.useState(
    deal.parking_spots != null ? String(deal.parking_spots) : '0'
  );
  const [lotSize, setLotSize] = React.useState<number | ''>(
    deal.inputs?.property?.lotSizeSquareFeet ?? ''
  );
  const [zoning, setZoning] = React.useState(deal.inputs?.property?.zoning ?? '');
  const [mlsNumber, setMlsNumber] = React.useState(deal.inputs?.property?.mlsNumber ?? '');

  const [notes, setNotes] = React.useState(deal.notes ?? '');

  const copyAddress = () => {
    const a = [street, neighborhood, city, state, zip].filter(Boolean).join(', ');
    if (!a) {
      toast.info('Endereço vazio');
      return;
    }
    navigator.clipboard.writeText(a);
    toast.success('Endereço copiado');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // ── Defensive normalization ──────────────────────────────────────────
      // Postgres column `state` is `char(2)`; longer values will reject the
      // entire UPDATE. Coerce common Brazilian state full-names to UF here
      // so users typing "São Paulo" instead of "SP" don't lose the save.
      const normalizedState = normalizeState(state);
      // Postgres `type` has a CHECK constraint allowing only:
      //   apartment | house | commercial | land | other
      // The dropdown also exposes 'condo', 'townhouse', 'multifamily' for UI
      // labels; map those to the closest allowed value before write.
      const normalizedType = normalizeType(tipo);

      const nextInputs = deal.inputs
        ? {
            ...deal.inputs,
            name: title,
            property: {
              ...(deal.inputs.property ?? {}),
              shortDescription,
              tagsAndLabels,
              bedrooms: parseIntSafe(bedrooms),
              bathrooms: parseIntSafe(bathrooms),
              squareFootage: typeof sqft === 'number' ? sqft : undefined,
              yearBuilt: typeof yearBuilt === 'number' ? yearBuilt : undefined,
              parking,
              lotSizeSquareFeet: typeof lotSize === 'number' ? lotSize : undefined,
              zoning,
              mlsNumber,
              address: {
                streetAddress: street,
                neighborhood,
                city,
                region: state,
                postalCode: zip,
              },
            },
          }
        : deal.inputs;

      await patchDeal(deal.id, {
        title,
        type: normalizedType,
        street,
        neighborhood,
        city,
        state: normalizedState,
        zip_code: zip,
        bedrooms: parseIntSafe(bedrooms),
        bathrooms: parseIntSafe(bathrooms),
        area: typeof sqft === 'number' ? sqft : null,
        parking_spots: parseIntSafe(parking) ?? null,
        description: shortDescription,
        notes,
        inputs: nextInputs ?? null,
      });
      toast.success('Descrição salva');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Descrição"
        breadcrumb={[
          { label: 'Imóveis', href: '/propriedades' },
          { label: deal.title, href: `/imoveis/${deal.id}/analise` },
          { label: 'Descrição' },
        ]}
        actions={
          <>
            {deal.source_url && (
              <a
                href={deal.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#1C2B20] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
              >
                <FileText size={12} />
                Anúncio Original
              </a>
            )}
            <Link
              href={`/imoveis/${deal.id}/mapa`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#1C2B20] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
            >
              <MapPin size={12} />
              Ver no Mapa
            </Link>
          </>
        }
      />

      <div className="space-y-6">
        {/* ── Top card: name / description / tags ─────────────────────── */}
        <FormCard>
          <FormRow label="Nome do Imóvel">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormRow>
          <FormRow label="Descrição Curta" stacked>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              rows={2}
              className="w-full resize-y rounded-lg border border-[#E2E0DA] bg-transparent px-2.5 py-2 text-sm text-[#1C2B20] outline-none focus:border-[#4A7C59] focus:ring-3 focus:ring-[#4A7C59]/20"
              placeholder="Adicione uma descrição curta para exibir nos relatórios."
            />
          </FormRow>
          <FormRow label="Tags & Etiquetas">
            <Input
              value={tagsAndLabels}
              onChange={(e) => setTagsAndLabels(e.target.value)}
              placeholder="ex: Centro, Reforma, Pronto para alugar"
            />
          </FormRow>
        </FormCard>

        {/* ── Endereço ────────────────────────────────────────────────── */}
        <div>
          <SectionHeading
            label="Endereço"
            rightSlot={
              <button
                type="button"
                onClick={copyAddress}
                className="flex items-center gap-1 text-[11px] font-medium text-[#4A7C59] transition-colors hover:text-[#3D6B4F]"
              >
                <Copy size={11} />
                Copiar
              </button>
            }
          />
          <FormCard>
            <FormRow label="Logradouro">
              <Input value={street} onChange={(e) => setStreet(e.target.value)} />
            </FormRow>
            <FormRow label="Bairro">
              <Input
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="ex: Vila Madalena"
              />
            </FormRow>
            <FormRow label="Cidade">
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </FormRow>
            <FormRow label="Estado">
              <Input value={state} onChange={(e) => setState(e.target.value)} />
            </FormRow>
            <FormRow label="CEP">
              <Input value={zip} onChange={(e) => setZip(e.target.value)} />
            </FormRow>
          </FormCard>
        </div>

        {/* ── Características ────────────────────────────────────────── */}
        <div>
          <SectionHeading label="Características" />
          <FormCard>
            <FormRow label="Tipo de Imóvel">
              <Select
                value={tipo}
                onValueChange={(v) => {
                  if (typeof v === 'string') setTipo(v);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v) =>
                      TIPO_OPTIONS.find((o) => o.value === v)?.label ?? v
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIPO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Quartos">
              <Select
                value={bedrooms}
                onValueChange={(v) => {
                  if (typeof v === 'string') setBedrooms(v);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{(v) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {NUM_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Banheiros">
              <Select
                value={bathrooms}
                onValueChange={(v) => {
                  if (typeof v === 'string') setBathrooms(v);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{(v) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {NUM_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Área Construída">
              <NumberInput value={sqft} onChange={setSqft} suffix="m²" />
            </FormRow>
            <FormRow label="Ano de Construção">
              <NumberInput value={yearBuilt} onChange={setYearBuilt} />
            </FormRow>
            <FormRow label="Vagas de Garagem">
              <Input value={parking} onChange={(e) => setParking(e.target.value)} />
            </FormRow>
            <FormRow label="Tamanho do Terreno">
              <NumberInput value={lotSize} onChange={setLotSize} suffix="m²" />
            </FormRow>
            <FormRow label="Zoneamento">
              <Input value={zoning} onChange={(e) => setZoning(e.target.value)} />
            </FormRow>
            <FormRow label="Código do Anúncio (MLS)">
              <Input value={mlsNumber} onChange={(e) => setMlsNumber(e.target.value)} />
            </FormRow>
          </FormCard>
        </div>

        {/* ── Notas ──────────────────────────────────────────────────── */}
        <div>
          <SectionHeading label="Notas" />
          <FormCard>
            <FormRow label="Notas internas" stacked>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Adicione suas notas…"
                className="w-full resize-y rounded-lg border border-[#E2E0DA] bg-transparent px-2.5 py-2 text-sm text-[#1C2B20] outline-none focus:border-[#4A7C59] focus:ring-3 focus:ring-[#4A7C59]/20"
              />
            </FormRow>
          </FormCard>
        </div>

        {/* ── Save ───────────────────────────────────────────────────── */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[#4A7C59] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F] disabled:opacity-60"
          >
            {saving ? 'Salvando…' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </>
  );
}

function parseIntSafe(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseInt(v.replace('+', ''), 10);
  return Number.isNaN(n) ? undefined : n;
}
