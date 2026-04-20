import Link from 'next/link';

// ── Primitives ────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[#E2E0DA] py-10">
      <h2 className="mb-6 font-mono text-[11px] font-semibold tracking-[0.14em] text-[#9CA3AF] uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Swatch({ bg, label, value }: { bg: string; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-10 w-full border border-[#E2E0DA]" style={{ backgroundColor: bg }} />
      <p className="text-xs font-semibold text-[#1C2B20]">{label}</p>
      <p className="font-mono text-[10px] text-[#9CA3AF]">{value}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InternalDesignPage() {
  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#E2E0DA] bg-[#FAFAF8]">
        <div className="mx-auto flex h-12 max-w-[72rem] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center bg-[#4A7C59] font-mono text-xs font-black text-white">
              I
            </div>
            <span className="text-sm font-bold text-[#1C2B20]">ImóYield</span>
            <span className="font-mono text-[11px] text-[#D0CEC8]">/</span>
            <span className="font-mono text-[11px] text-[#9CA3AF]">Sistema de Design · Interno</span>
          </div>
          <Link href="/" className="font-mono text-[11px] text-[#9CA3AF] transition-colors hover:text-[#6B7280]">
            ← Voltar ao site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[72rem] px-6 pb-20">
        {/* Intro */}
        <div className="border-b border-[#E2E0DA] py-10">
          <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-[#9CA3AF] uppercase">
            Documentação interna
          </p>
          <h1 className="text-3xl font-bold text-[#1C2B20]">Sistema de Design</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#6B7280]">
            Tokens, tipografia, componentes e regras visuais do ImóYield. Referência central para
            qualquer nova página ou componente — use este guia antes de abrir um novo arquivo.
          </p>
          <p className="mt-3 font-mono text-[10px] text-[#9CA3AF]">
            Versão 2.0 · Abril 2026 · Atualizado com Volume II
          </p>
        </div>

        {/* ── 1. Cores ── */}
        <Section title="1 · Paleta de cores">
          <div className="mb-8">
            <p className="mb-4 text-xs font-semibold text-[#6B7280]">Base</p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <Swatch bg="#F8F7F4" label="Background" value="#F8F7F4" />
              <Swatch bg="#FAFAF8" label="Surface" value="#FAFAF8" />
              <Swatch bg="#F0EFEB" label="Muted" value="#F0EFEB" />
              <Swatch bg="#E2E0DA" label="Border" value="#E2E0DA" />
              <Swatch bg="#D0CEC8" label="Border-strong" value="#D0CEC8" />
              <Swatch bg="#1C2B20" label="Foreground" value="#1C2B20" />
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-4 text-xs font-semibold text-[#6B7280]">Marca</p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              <Swatch bg="#4A7C59" label="Brand" value="#4A7C59 · --brand" />
              <Swatch bg="#3D6B4F" label="Brand hover" value="#3D6B4F" />
              <Swatch bg="#EBF3EE" label="Brand soft" value="#EBF3EE" />
              <Swatch bg="#2f855a" label="Positive strong" value="--positive-strong" />
              <Swatch bg="#ebf3ee" label="Positive soft" value="--positive-soft" />
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-4 text-xs font-semibold text-[#6B7280]">Semânticas</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Swatch bg="#4a7c59" label="Positive" value="--positive" />
              <Swatch bg="#d97706" label="Warning" value="--warning" />
              <Swatch bg="#dc2626" label="Negative" value="--negative" />
              <Swatch bg="#3b82f6" label="Info" value="--info" />
            </div>
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold text-[#6B7280]">Gráficos (Recharts)</p>
            <div className="grid grid-cols-5 gap-3">
              <Swatch bg="#4A7C59" label="chart-1" value="Linha principal" />
              <Swatch bg="#3D6B4F" label="chart-2" value="Série secundária" />
              <Swatch bg="#6B7280" label="chart-3" value="Neutro" />
              <Swatch bg="#9CA3AF" label="chart-4" value="Referência" />
              <Swatch bg="#D0CEC8" label="chart-5" value="Fundo/área" />
            </div>
          </div>

          <div className="mt-6 border border-[#E2E0DA] bg-[#FAFAF8] p-4">
            <p className="mb-2 font-mono text-[10px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
              Regra crítica
            </p>
            <p className="text-xs text-[#6B7280]">
              Nenhum hex deve aparecer em componentes novos. Todos os valores acima estão em{' '}
              <code className="font-mono text-xs text-[#1C2B20]">globals.css</code> como custom
              properties. Use sempre os tokens.
            </p>
          </div>
        </Section>

        {/* ── 2. Tipografia ── */}
        <Section title="2 · Tipografia">
          <div className="space-y-6">
            <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-6">
              <p className="mb-1 font-mono text-[10px] text-[#9CA3AF]">DM Sans · var(--font-dm-sans) · Todo o corpo de texto</p>
              <p className="text-4xl font-bold text-[#1C2B20]">Análise de Investimento</p>
              <p className="mt-2 text-base font-medium text-[#6B7280]">
                Pesos: 300 Light · 400 Regular · 500 Medium · 600 SemiBold · 700 Bold
              </p>
            </div>

            <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-6">
              <p className="mb-1 font-mono text-[10px] text-[#9CA3AF]">
                Display serif · Removido · Fontes de script/display não são mais usadas
              </p>
              <p className="text-4xl font-bold text-[#9CA3AF] line-through">em minutos, não planilhas.</p>
              <p className="mt-2 text-sm text-[#9CA3AF]">Acentos editoriais agora usam sans bold.</p>
            </div>

            <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-6">
              <p className="mb-1 font-mono text-[10px] text-[#9CA3AF]">
                JetBrains Mono · var(--font-jetbrains-mono) · Todos os números e métricas
              </p>
              <div className="flex gap-8">
                <div>
                  <p className="font-mono text-3xl font-bold text-[#1C2B20]">R$ 3.800</p>
                  <p className="font-mono text-sm text-[#9CA3AF]">Aluguel mensal</p>
                </div>
                <div>
                  <p className="font-mono text-3xl font-bold text-[#4A7C59]">6,7%</p>
                  <p className="font-mono text-sm text-[#9CA3AF]">Yield bruto</p>
                </div>
                <div>
                  <p className="font-mono text-3xl font-bold text-[#1C2B20]">12,4 anos</p>
                  <p className="font-mono text-sm text-[#9CA3AF]">Payback</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 border border-[#E2E0DA] bg-[#FAFAF8] p-4">
            <p className="mb-2 font-mono text-[10px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
              Regras
            </p>
            <ul className="space-y-1 text-xs text-[#6B7280]">
              <li>· Todo valor monetário, percentual e data → JetBrains Mono</li>
              <li>· Eyebrows → <code className="font-mono">text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9CA3AF]</code></li>
              <li>· Serif decorativo → máximo uma ocorrência por tela, sempre itálico</li>
              <li>· Nenhum texto de corpo em serifa</li>
            </ul>
          </div>
        </Section>

        {/* ── 3. Geometria ── */}
        <Section title="3 · Geometria e bordas">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="h-16 border border-[#E2E0DA] bg-[#FAFAF8]" style={{ borderRadius: 0 }} />
              <p className="mt-2 font-mono text-[10px] text-[#9CA3AF]">Cards: 0px (padrão)</p>
            </div>
            <div>
              <div className="h-16 border border-[#E2E0DA] bg-[#FAFAF8]" style={{ borderRadius: 4 }} />
              <p className="mt-2 font-mono text-[10px] text-[#9CA3AF]">4px (máximo permitido)</p>
            </div>
            <div>
              <div className="h-16 border-2 border-[#4A7C59] bg-[#FAFAF8]" style={{ borderRadius: 0 }} />
              <p className="mt-2 font-mono text-[10px] text-[#9CA3AF]">Borda 2px: destaque/foco</p>
            </div>
            <div>
              <div className="h-16 border border-[#E2E0DA] bg-[#FAFAF8] shadow-[0_10px_30px_rgba(28,43,32,0.08)]" />
              <p className="mt-2 font-mono text-[10px] text-[#9CA3AF]">Sombra: só popovers/modais</p>
            </div>
          </div>
          <div className="mt-4 border border-[#E2E0DA] bg-[#FAFAF8] p-4">
            <p className="text-xs text-[#6B7280]">
              Cards usam <strong>borda, nunca sombra</strong>. Raio máximo: 4px. Foco: ring 2px brand
              com offset 2px. Imagens de imóvel: retangulares, raio 4px, nunca circular.
            </p>
          </div>
        </Section>

        {/* ── 4. Componentes ── */}
        <Section title="4 · Componentes principais">
          <div className="space-y-6">
            {/* Buttons */}
            <div>
              <p className="mb-3 text-xs font-semibold text-[#6B7280]">Botões</p>
              <div className="flex flex-wrap gap-3">
                <button className="bg-[#4A7C59] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F]">
                  Primary
                </button>
                <button className="border border-[#D0CEC8] px-5 py-2.5 text-sm font-medium text-[#6B7280] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]">
                  Secondary
                </button>
                <button className="border border-[#E2E0DA] bg-[#F0EFEB] px-5 py-2.5 text-sm font-medium text-[#6B7280]">
                  Ghost
                </button>
                <button className="bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C]">
                  Destructive
                </button>
              </div>
              <p className="mt-2 font-mono text-[10px] text-[#9CA3AF]">
                Sem border-radius · Padding: py-2.5 px-5 (md), py-3 px-8 (lg CTA)
              </p>
            </div>

            {/* Inputs */}
            <div>
              <p className="mb-3 text-xs font-semibold text-[#6B7280]">Inputs</p>
              <div className="max-w-xs space-y-3">
                <div className="flex items-center border border-[#E2E0DA] bg-[#F0EFEB] focus-within:border-[#4A7C59]">
                  <span className="px-3 font-mono text-sm text-[#9CA3AF]">R$</span>
                  <input
                    readOnly
                    value="680.000"
                    className="flex-1 bg-transparent py-2.5 pr-3 font-mono text-sm text-[#1C2B20] outline-none"
                  />
                </div>
                <div className="flex items-center border-2 border-[#4A7C59] bg-[#F0EFEB]">
                  <span className="px-3 font-mono text-sm text-[#9CA3AF]">%</span>
                  <input
                    readOnly
                    value="6,7"
                    className="flex-1 bg-transparent py-2.5 pr-3 font-mono text-sm text-[#1C2B20] outline-none"
                  />
                </div>
                <div className="flex items-center border border-[#DC2626] bg-[#FEE2E2]">
                  <span className="px-3 font-mono text-sm text-[#9CA3AF]">R$</span>
                  <input
                    readOnly
                    value=""
                    placeholder="Campo obrigatório"
                    className="flex-1 bg-transparent py-2.5 pr-3 font-mono text-sm outline-none placeholder:text-[#DC2626]"
                  />
                </div>
              </div>
              <p className="mt-2 font-mono text-[10px] text-[#9CA3AF]">
                bg-[#F0EFEB] idle · borda brand no focus · borda vermelha no erro
              </p>
            </div>

            {/* KPI Card */}
            <div>
              <p className="mb-3 text-xs font-semibold text-[#6B7280]">KPI Card</p>
              <div className="grid grid-cols-2 gap-px border border-[#E2E0DA] bg-[#E2E0DA] sm:max-w-md">
                {[
                  { label: 'Yield Bruto', value: '6,7%', bar: 56 },
                  { label: 'Cap Rate', value: '5,7%', bar: 57 },
                  { label: 'Fluxo Mensal', value: 'R$ 620', bar: 0 },
                  { label: 'Payback', value: '15 anos', bar: 50 },
                ].map((k) => (
                  <div key={k.label} className="bg-[#FAFAF8] p-4">
                    <p className="mb-1 font-mono text-[10px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
                      {k.label}
                    </p>
                    <p className="font-mono text-xl font-bold text-[#1C2B20]">{k.value}</p>
                    {k.bar > 0 && (
                      <div className="mt-2 h-1 w-full bg-[#E2E0DA]">
                        <div className="h-1 bg-[#4A7C59]" style={{ width: `${k.bar}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 font-mono text-[10px] text-[#9CA3AF]">
                grid gap-px bg-[#E2E0DA] — cria divisórias de 1px entre células sem borda adicional
              </p>
            </div>
          </div>
        </Section>

        {/* ── 5. Gráficos ── */}
        <Section title="5 · Regras de gráficos (Recharts)">
          <div className="space-y-4">
            <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-5">
              <p className="mb-3 font-mono text-[10px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
                axisProps padrão
              </p>
              <pre className="overflow-x-auto font-mono text-xs text-[#1C2B20]">{`const axisProps = {
  tick: {
    fontFamily: 'var(--font-jetbrains-mono)',
    fontSize: 10,
    fill: '#9CA3AF',
  },
  tickLine: false,
  axisLine: false,
};`}</pre>
            </div>

            <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-5">
              <p className="mb-3 font-mono text-[10px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
                DSTooltip padrão
              </p>
              <pre className="overflow-x-auto font-mono text-xs text-[#1C2B20]">{`<Tooltip
  contentStyle={{
    background: '#FAFAF8',
    border: '1px solid #E2E0DA',
    borderRadius: 0,
    fontFamily: 'var(--font-jetbrains-mono)',
    fontSize: 11,
  }}
  cursor={{ stroke: '#E2E0DA', strokeWidth: 1 }}
/>`}</pre>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { color: '#4A7C59', use: 'Série primária · chart-1' },
                { color: '#3D6B4F', use: 'Série secundária · chart-2' },
                { color: '#9CA3AF', use: 'Linha de referência · chart-4' },
                { color: '#DC2626', use: 'Valor negativo' },
              ].map((c) => (
                <div key={c.color} className="flex items-center gap-2 border border-[#E2E0DA] bg-[#FAFAF8] p-3">
                  <div className="h-3 w-3 shrink-0" style={{ backgroundColor: c.color }} />
                  <div>
                    <p className="font-mono text-[10px] font-bold text-[#1C2B20]">{c.color}</p>
                    <p className="font-mono text-[9px] text-[#9CA3AF]">{c.use}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-4">
              <p className="text-xs text-[#6B7280]">
                Gráficos usam <strong>exclusivamente chart-1 a chart-5</strong>. Zebra striping em
                tabelas: <code className="font-mono">#FAFAF8</code> /{' '}
                <code className="font-mono">#F8F7F4</code> — nunca cinzas saturados.
              </p>
            </div>
          </div>
        </Section>

        {/* ── 6. Microcopy ── */}
        <Section title="6 · Copy e voz">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { do: 'R$ 4.250,00', dont: 'R$4250', label: 'Formatação monetária' },
              { do: '8,4%', dont: '8.4%', label: 'Percentuais' },
              { do: 'abr/26', dont: '04/2026', label: 'Datas curtas' },
              { do: 'ANÁLISE', dont: 'Análise', label: 'Eyebrows (máx. 3 palavras)' },
              { do: 'Tente novamente', dont: 'Houve um erro', label: 'Mensagens de erro' },
              { do: 'Cálculos para fins informativos', dont: 'Invista agora', label: 'Tom: análise, não recomendação' },
            ].map((r) => (
              <div key={r.label} className="border border-[#E2E0DA] bg-[#FAFAF8] p-4">
                <p className="mb-2 font-mono text-[10px] text-[#9CA3AF]">{r.label}</p>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-[#4A7C59]">✓ {r.do}</span>
                  <span className="font-mono text-[10px] text-[#D0CEC8]">vs</span>
                  <span className="font-mono text-xs text-[#DC2626] line-through">{r.dont}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 7. Checklist ── */}
        <Section title="7 · Checklist de nova página">
          <div className="space-y-2">
            {[
              'Todos os números em JetBrains Mono (font-mono)',
              'Nenhum hex hardcoded — só tokens de globals.css',
              'Cards com border, nunca box-shadow',
              'Raio de borda ≤ 4px (0px por padrão)',
              'Skip-link "Pular para o conteúdo" em páginas públicas',
              'Contraste mínimo 4.5:1 em texto de corpo',
              'Disclaimer CVM no rodapé de páginas públicas',
              'Serif decorativo no máximo 1× por tela, sempre itálico',
              'Gráficos: axisProps padrão + DSTooltip padrão',
              'prefers-reduced-motion respeitado em todas as animações',
              'Eyebrows em UPPERCASE, máximo 3 palavras, tracking-[0.12em]',
            ].map((item, i) => (
              <label key={i} className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" className="mt-0.5 accent-[#4A7C59]" />
                <span className="text-sm text-[#6B7280]">{item}</span>
              </label>
            ))}
          </div>
        </Section>

        {/* ── 8. Arquitetura de ficheiros ── */}
        <Section title="8 · Arquitetura de arquivos relevante">
          <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-5">
            <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-[#1C2B20]">{`src/
├── app/
│   ├── globals.css           ← todos os tokens CSS aqui
│   ├── layout.tsx            ← fontes, Toaster
│   └── internal/design/      ← esta página
├── components/
│   ├── landing/
│   │   ├── FadeInSection.tsx ← fade-in-up com framer-motion
│   │   ├── TrackableLink.tsx ← Link + analytics event
│   │   └── InteractiveDemo.tsx
│   └── layout/
│       ├── PageContainer.tsx ← max-w variant (marketing/app)
│       ├── SectionHeader.tsx ← eyebrow + título + descrição
│       └── EmptyState.tsx    ← estado vazio editorial
└── lib/
    └── analytics.ts          ← track() para GA4 / GTM`}</pre>
          </div>
        </Section>

        {/* Footer */}
        <div className="pt-6">
          <p className="font-mono text-[10px] text-[#9CA3AF]">
            ImóYield · Sistema de Design v2.0 · Uso interno · Não indexado
          </p>
        </div>
      </main>
    </div>
  );
}
