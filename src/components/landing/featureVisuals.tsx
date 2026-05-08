import { Card } from './FeatureSection';

const ROW =
  'flex items-center justify-between border-b border-[#E2E0DA] py-2.5 text-[13px] last:border-0';
const LABEL = 'text-[#6B7280]';
const VALUE = 'font-semibold text-[#1C2B20] tabular-nums';

/** 1. Property Data — image on top, stacked data rows below. */
export function PropertyDataCard() {
  return (
    <Card>
      <div
        className="h-44 w-full"
        style={{
          background:
            'linear-gradient(135deg, #EBF3EE 0%, #F0EFEB 55%, #FAFAF8 100%)',
          boxShadow: 'inset 0 0 0 1px #E2E0DA',
        }}
      >
        <div className="grid h-full place-items-center">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
            <path d="M10 21v-6h4v6" />
          </svg>
        </div>
      </div>
      <div className="mt-5">
        <div className={ROW}>
          <span className={LABEL}>Endereço</span>
          <span className={VALUE}>Rua Oscar Freire, 1200</span>
        </div>
        <div className={ROW}>
          <span className={LABEL}>Tipo</span>
          <span className={VALUE}>Apartamento · 2 dorm.</span>
        </div>
        <div className={ROW}>
          <span className={LABEL}>Área</span>
          <span className={VALUE}>78 m²</span>
        </div>
        <div className={ROW}>
          <span className={LABEL}>Preço anunciado</span>
          <span className={VALUE}>R$ 1.250.000</span>
        </div>
      </div>
    </Card>
  );
}

/** 2. Inputs — form-style stacked labeled inputs. */
export function InputsCard() {
  return (
    <Card>
      <div className="space-y-4">
        {[
          { label: 'Preço de compra', value: 'R$ 1.250.000' },
          { label: 'Entrada', value: '20% · R$ 250.000' },
          { label: 'Prazo do financiamento', value: '30 anos' },
          { label: 'Aluguel mensal', value: 'R$ 6.800' },
        ].map((f) => (
          <div key={f.label}>
            <label className="mb-1.5 block text-[10px] font-semibold tracking-[0.12em] text-[#6B7480] uppercase">
              {f.label}
            </label>
            <div className="flex h-11 items-center border border-[#E2E0DA] bg-[#F8F7F4] px-3.5 text-sm font-semibold text-[#1C2B20] tabular-nums">
              {f.value}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** 3. Analytics — pie chart and financial breakdown in sage palette. */
export function AnalyticsCard() {
  return (
    <Card>
      <div className="flex items-center gap-8">
        <div className="relative h-36 w-36 shrink-0">
          <div
            className="h-full w-full rounded-full"
            style={{
              background:
                'conic-gradient(#4A7C59 0 52%, #3D6B4F 52% 78%, #EBF3EE 78% 92%, #E2E0DA 92% 100%)',
            }}
          />
          <div className="absolute inset-[20%] flex items-center justify-center rounded-full bg-[#FAFAF8]">
            <div className="text-center">
              <p className="text-[8px] font-semibold tracking-[0.12em] text-[#6B7480] uppercase">
                Yield líquido
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-[#1C2B20]">8,4%</p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {[
            { color: '#4A7C59', label: 'Prestação', value: 'R$ 4.120' },
            { color: '#3D6B4F', label: 'Caixa líquido', value: 'R$ 2.060' },
            { color: '#EBF3EE', label: 'Impostos & taxas', value: 'R$ 1.110' },
            { color: '#E2E0DA', label: 'Reserva de vacância', value: 'R$ 340' },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2 text-[#6B7280]">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: r.color }} />
                {r.label}
              </span>
              <span className={VALUE}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/** 4. Map — warm neutrals with sage markers + small comp table. */
export function MapCard() {
  return (
    <Card>
      <div
        className="relative h-52 w-full overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #F0EFEB 0%, #EBF3EE 60%, #F0EFEB 100%)',
          boxShadow: 'inset 0 0 0 1px #E2E0DA',
        }}
      >
        <div className="absolute inset-0">
          <div className="absolute left-0 right-0 top-[30%] h-px bg-[#E2E0DA]" />
          <div className="absolute left-0 right-0 top-[65%] h-px bg-[#E2E0DA]" />
          <div className="absolute bottom-0 top-0 left-[25%] w-px bg-[#E2E0DA]" />
          <div className="absolute bottom-0 top-0 left-[70%] w-px bg-[#E2E0DA]" />
        </div>
        {[
          { top: '20%', left: '22%', strong: true },
          { top: '55%', left: '60%', strong: false },
          { top: '35%', left: '78%', strong: false },
          { top: '70%', left: '18%', strong: false },
        ].map((m, i) => (
          <span
            key={i}
            className="absolute h-3 w-3 rounded-full ring-2 ring-[#FAFAF8]"
            style={{
              top: m.top,
              left: m.left,
              backgroundColor: m.strong ? '#4A7C59' : '#3D6B4F',
            }}
          />
        ))}
      </div>
      <div className="mt-5">
        {[
          { addr: 'Oscar Freire, 1200', price: 'R$ 1,25M', yield: '8,4%' },
          { addr: 'Haddock Lobo, 340', price: 'R$ 1,10M', yield: '7,1%' },
          { addr: 'Augusta, 89', price: 'R$ 980k', yield: '6,5%' },
        ].map((r) => (
          <div key={r.addr} className={ROW}>
            <span className={LABEL}>{r.addr}</span>
            <span className="flex gap-5">
              <span className="tabular-nums text-[#6B7280]">{r.price}</span>
              <span className="tabular-nums font-semibold text-[#4A7C59]">{r.yield}</span>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** 5. Offer Calculator — price tiers + toggles. */
export function OfferCalculatorCard() {
  return (
    <Card>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pedido', value: 'R$ 1.250.000', highlight: false },
          { label: 'Justo', value: 'R$ 1.180.000', highlight: true },
          { label: 'Alvo', value: 'R$ 1.090.000', highlight: false },
        ].map((p) => (
          <div
            key={p.label}
            className={`border p-4 text-center ${
              p.highlight
                ? 'border-[#4A7C59] bg-[#EBF3EE]'
                : 'border-[#E2E0DA] bg-[#F8F7F4]'
            }`}
          >
            <p className="text-[10px] font-semibold tracking-[0.12em] text-[#6B7480] uppercase">
              {p.label}
            </p>
            <p className="mt-2 text-sm font-bold text-[#1C2B20] tabular-nums">{p.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {[
          { label: 'Financiamento', on: true },
          { label: 'Vistoria', on: true },
          { label: 'Vendedor paga ITBI', on: false },
        ].map((t) => (
          <div key={t.label} className="flex items-center justify-between text-[13px]">
            <span className="text-[#6B7280]">{t.label}</span>
            <span
              className={`flex h-5 w-10 items-center p-0.5 transition-colors ${
                t.on ? 'justify-end bg-[#4A7C59]' : 'justify-start bg-[#E2E0DA]'
              }`}
              style={{ borderRadius: 999 }}
            >
              <span className="h-4 w-4 rounded-full bg-white" />
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** 6. Reports — header image + stats. */
export function ReportsCard() {
  return (
    <Card>
      <div
        className="h-36 w-full"
        style={{
          background:
            'linear-gradient(135deg, #1C2B20 0%, #2F4A3A 55%, #4A7C59 100%)',
        }}
      >
        <div className="flex h-full flex-col justify-end p-4">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-white/70 uppercase">
            Relatório executivo · PDF
          </p>
          <p className="mt-1 text-base font-semibold text-white">Oscar Freire · Análise de aluguel</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-4 border-t border-[#E2E0DA] pt-5">
        {[
          { label: 'Cap rate', value: '6,5%' },
          { label: 'Cash-on-cash', value: '11,2%' },
          { label: 'TIR (10a)', value: '14,8%' },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-[10px] font-semibold tracking-[0.12em] text-[#6B7480] uppercase">
              {s.label}
            </p>
            <p className="mt-1 text-base font-bold text-[#1C2B20] tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
