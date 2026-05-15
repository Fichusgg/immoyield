/**
 * immoyield — Deal Report PDF Template
 * Built with @react-pdf/renderer
 *
 * Visual language matches the app design system (warm sage / cream palette,
 * sharp corners, JetBrains Mono for numbers, DM Sans-style for labels).
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { AnalysisResult } from '@/components/deals/ResultsScreen';
import type { DealInput } from '@/lib/validations/deal';

// ─── Brand palette (mirrors src/styles/tokens.css) ───────────────────────────
const C = {
  bg: '#F8F7F4',           // page background
  surface: '#FAFAF8',      // cards
  elevated: '#F0EFEB',     // table headers, alt rows
  border: '#E2E0DA',
  borderSoft: '#EDEBE5',

  text: '#1C2B20',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  accent: '#4A7C59',
  accentDim: '#3D6B4F',
  accentGhost: '#EBF3EE',

  red: '#DC2626',
  redGhost: '#FEE2E2',
  amber: '#B45309',
  blue: '#1D4ED8',
  white: '#FFFFFF',
};

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);

const fmtK = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
  return fmt(v);
};

const fmtPct = (v: number) => `${v.toFixed(2)}%`;
const fmtDate = () =>
  new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: C.bg,
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 44,
    color: C.text,
  },

  // ── Cover ──────────────────────────────────────────────────────────────────
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  logoMark: {
    width: 18,
    height: 18,
    backgroundColor: C.accent,
    color: C.white,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    paddingTop: 3,
  },
  brandName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
    letterSpacing: 0.2,
  },
  brandRule: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
    marginLeft: 8,
  },
  brandStamp: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.textMuted,
    letterSpacing: 1.4,
  },

  eyebrow: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.textMuted,
    letterSpacing: 1.6,
    marginBottom: 12,
  },
  coverTitle: {
    fontSize: 30,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
    marginBottom: 8,
    lineHeight: 1.1,
  },
  coverMeta: {
    fontSize: 10,
    color: C.textSecondary,
    marginBottom: 28,
  },

  headlineRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  headlineCard: {
    flex: 1,
    padding: 18,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  headlineCardAccent: {
    flex: 1,
    padding: 18,
    backgroundColor: C.accent,
  },
  headlineLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.textMuted,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  headlineLabelOnAccent: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.accentGhost,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  headlineValue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
  },
  headlineValueOnAccent: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },
  headlineValuePositive: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: C.accentDim,
  },
  headlineValueNegative: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: C.red,
  },
  headlineSub: {
    fontSize: 8,
    color: C.textSecondary,
    marginTop: 4,
  },
  headlineSubOnAccent: {
    fontSize: 8,
    color: C.accentGhost,
    marginTop: 4,
  },

  // ── KPI strip (smaller, used after the headline pair) ──────────────────────
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
  kpiLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.textMuted,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
  },
  kpiSub: {
    fontSize: 7,
    color: C.textMuted,
    marginTop: 2,
  },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.textMuted,
    letterSpacing: 1.6,
    marginBottom: 10,
    marginTop: 10,
  },

  // ── Cards / tables ─────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 18,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.elevated,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  thText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.textSecondary,
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tableRowLast: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tdLabel: {
    flex: 2,
    fontSize: 9,
    color: C.textSecondary,
  },
  tdValue: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
    textAlign: 'right',
  },
  tdValuePositive: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.accentDim,
    textAlign: 'right',
  },
  tdValueNegative: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.red,
    textAlign: 'right',
  },

  // ── Waterfall ──────────────────────────────────────────────────────────────
  waterfallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSoft,
    gap: 10,
  },
  waterfallLabel: {
    flex: 2,
    fontSize: 9,
    color: C.textSecondary,
  },

  // ── Benchmarks ─────────────────────────────────────────────────────────────
  benchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSoft,
    gap: 12,
  },
  benchName: {
    width: 100,
    fontSize: 9,
    color: C.text,
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: C.textMuted,
  },
  footerBrand: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
  },

  // ── Disclaimer ─────────────────────────────────────────────────────────────
  disclaimer: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 7,
    color: C.textMuted,
    lineHeight: 1.5,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Footer = ({ page, dealName }: { page: number; dealName: string }) => (
  <View style={s.footer} fixed>
    <Text style={s.footerText}>
      {dealName} · {fmtDate()}
    </Text>
    <Text style={s.footerText}>Página {page}</Text>
    <Text style={s.footerBrand}>immoyield</Text>
  </View>
);

const BrandHeader = () => (
  <View style={s.brandRow}>
    <Text style={s.logoMark}>I</Text>
    <Text style={s.brandName}>immoyield</Text>
    <View style={s.brandRule} />
    <Text style={s.brandStamp}>RELATÓRIO DE INVESTIMENTO</Text>
  </View>
);

const HeadlineCard = ({
  label,
  value,
  sub,
  variant = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  variant?: 'default' | 'accent' | 'positive' | 'negative';
}) => {
  const onAccent = variant === 'accent';
  const cardStyle = onAccent ? s.headlineCardAccent : s.headlineCard;
  const labelStyle = onAccent ? s.headlineLabelOnAccent : s.headlineLabel;
  const valueStyle = onAccent
    ? s.headlineValueOnAccent
    : variant === 'positive'
      ? s.headlineValuePositive
      : variant === 'negative'
        ? s.headlineValueNegative
        : s.headlineValue;
  const subStyle = onAccent ? s.headlineSubOnAccent : s.headlineSub;

  return (
    <View style={cardStyle}>
      <Text style={labelStyle}>{label.toUpperCase()}</Text>
      <Text style={valueStyle}>{value}</Text>
      {sub && <Text style={subStyle}>{sub}</Text>}
    </View>
  );
};

const KPI = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <View style={s.kpiCard}>
    <Text style={s.kpiLabel}>{label.toUpperCase()}</Text>
    <Text style={s.kpiValue}>{value}</Text>
    {sub && <Text style={s.kpiSub}>{sub}</Text>}
  </View>
);

const clampPercent = (pct: number) => (Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0);

const InlineBar = ({ ratio, color }: { ratio: number; color: string }) => (
  <View
    style={{
      flex: 3,
      height: 6,
      backgroundColor: C.elevated,
      overflow: 'hidden',
    }}
  >
    <View
      style={{
        height: 6,
        width: `${clampPercent(ratio * 100)}%`,
        backgroundColor: color,
      }}
    />
  </View>
);

// Render a list of rows inside a card and remove the bottom border on the last
// row for a clean visual edge.
const TableRows = ({ rows }: { rows: Array<[string, string]> }) =>
  rows.map(([label, value], i) => (
    <View key={i} style={i === rows.length - 1 ? s.tableRowLast : s.tableRow}>
      <Text style={s.tdLabel}>{label}</Text>
      <Text style={s.tdValue}>{value}</Text>
    </View>
  ));

// ─── Main Document ────────────────────────────────────────────────────────────
export interface DealReportPDFProps {
  result: AnalysisResult;
  inputs: DealInput;
  dealName?: string;
  benchmarks?: { cdi: number; fii: number; updatedAt: string | null };
}

export function DealReportPDF({
  result,
  inputs,
  dealName = 'Análise de Deal',
  benchmarks,
}: DealReportPDFProps) {
  const { metrics, schedule, projections } = result;
  const cashFlowPositive = metrics.monthlyCashFlow >= 0;

  // ── Derived values ─────────────────────────────────────────────────────────
  const grossRent = inputs.revenue.monthlyRent;
  const vacancyLoss = grossRent * inputs.revenue.vacancyRate;
  const effRent = grossRent - vacancyLoss;
  const landlordPaysCondoIptu = inputs.revenue.rentIncludesCondoIptu ?? true;
  const condoCost = landlordPaysCondoIptu ? inputs.expenses.condo : 0;
  const iptuCost = landlordPaysCondoIptu ? inputs.expenses.iptu : 0;
  const mgmtCost = effRent * inputs.expenses.managementPercent;
  const maintCost = effRent * inputs.expenses.maintenancePercent;
  const noi = metrics.monthlyNOI;
  const firstInstallment = schedule[0]?.installment ?? 0;
  const ltv = metrics.loanAmount > 0 ? (metrics.loanAmount / metrics.totalInvestment) * 100 : 0;

  const CDI = benchmarks?.cdi ?? 13.65;
  const FII = benchmarks?.fii ?? 8.0;
  const maxBench = Math.max(metrics.capRate, metrics.cashOnCash, CDI, FII, 0.01);

  const amortYearly = schedule.filter((_, i) => (i + 1) % 12 === 0);
  const cfMonthly = schedule.slice(0, 24).map((p) => ({
    ...p,
    cashFlow: noi - p.installment,
  }));

  const financingLabel = inputs.financing.enabled
    ? `Financiado · ${inputs.financing.system} · ${inputs.financing.interestRateYear}% a.a. · ${inputs.financing.termMonths} meses`
    : 'Compra à vista';

  return (
    <Document
      title={`immoyield — ${dealName}`}
      author="immoyield"
      subject="Análise de Investimento Imobiliário"
    >
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ PAGE 1 — COVER */}
      <Page size="A4" style={s.page}>
        <BrandHeader />

        <Text style={s.eyebrow}>ANÁLISE DE INVESTIMENTO IMOBILIÁRIO</Text>
        <Text style={s.coverTitle}>{dealName}</Text>
        <Text style={s.coverMeta}>
          Gerado em {fmtDate()}  ·  {financingLabel}
        </Text>

        {/* Two flagship metrics — one accent, one tonal */}
        <View style={s.headlineRow}>
          <HeadlineCard
            label="Cap Rate"
            value={fmtPct(metrics.capRate)}
            sub="retorno bruto a.a."
            variant="accent"
          />
          <HeadlineCard
            label="Fluxo de Caixa"
            value={`${fmt(metrics.monthlyCashFlow)} /mês`}
            sub={cashFlowPositive ? 'fluxo positivo' : 'fluxo negativo'}
            variant={cashFlowPositive ? 'positive' : 'negative'}
          />
        </View>

        {/* Supporting KPI strip */}
        <View style={s.kpiRow}>
          <KPI
            label="Cash-on-Cash"
            value={fmtPct(metrics.cashOnCash)}
            sub="sobre capital próprio"
          />
          <KPI label="NOI Mensal" value={fmt(noi)} sub="resultado operacional" />
          <KPI
            label="Investimento"
            value={fmt(metrics.totalInvestment)}
            sub="preço + aquisição"
          />
          <KPI label="Capital Próprio" value={fmt(metrics.cashOutlay)} sub="entrada efetiva" />
        </View>

        <Text style={s.sectionTitle}>RESUMO DO DEAL</Text>
        <View style={s.card}>
          <TableRows
            rows={[
              ['Imóvel', dealName],
              ['Preço de compra', fmt(inputs.purchasePrice)],
              ['ITBI', fmtPct(inputs.acquisitionCosts.itbiPercent * 100)],
              ['Cartório', fmt(inputs.acquisitionCosts.cartorio)],
              ['Reformas', fmt(inputs.acquisitionCosts.reforms)],
              ['Aluguel bruto', `${fmt(grossRent)} /mês`],
              ['Vacância estimada', fmtPct(inputs.revenue.vacancyRate * 100)],
              [
                'Condomínio',
                landlordPaysCondoIptu
                  ? `${fmt(inputs.expenses.condo)} /mês`
                  : '— (pago pelo inquilino)',
              ],
              [
                'IPTU',
                landlordPaysCondoIptu
                  ? `${fmt(inputs.expenses.iptu)} /mês`
                  : '— (pago pelo inquilino)',
              ],
              ['Gestão', fmtPct(inputs.expenses.managementPercent * 100)],
              ['Manutenção', fmtPct(inputs.expenses.maintenancePercent * 100)],
            ]}
          />
        </View>

        <Footer page={1} dealName={dealName} />
      </Page>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ PAGE 2 — CAPITAL + NOI + BENCHMARKS */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>ESTRUTURA DE CAPITAL</Text>
        <View style={s.card}>
          <View style={s.tableHeader}>
            <Text style={[s.thText, { flex: 2 }]}>Item</Text>
            <Text style={[s.thText, { flex: 1, textAlign: 'right' }]}>Valor</Text>
          </View>
          <TableRows
            rows={[
              ['Investimento total', fmt(metrics.totalInvestment)],
              ['Capital próprio (entrada)', fmt(metrics.cashOutlay)],
              ...((metrics.loanAmount > 0
                ? [
                    ['Financiamento', fmt(metrics.loanAmount)],
                    ['LTV (Loan-to-Value)', fmtPct(ltv)],
                    ['Sistema de amortização', inputs.financing.system],
                    ['Taxa de juros', `${fmtPct(inputs.financing.interestRateYear)} a.a.`],
                    ['Prazo', `${inputs.financing.termMonths} meses`],
                    ['Parcela inicial (mês 1)', fmt(firstInstallment)],
                  ]
                : []) as Array<[string, string]>),
            ]}
          />
        </View>

        <Text style={s.sectionTitle}>CASCATA DE NOI — MENSAL</Text>
        <View style={s.card}>
          {[
            { label: 'Aluguel bruto', value: grossRent, ratio: 1, color: C.accent },
            {
              label: '− Vacância',
              value: -vacancyLoss,
              ratio: grossRent > 0 ? vacancyLoss / grossRent : 0,
              color: C.red,
            },
            {
              label: '= Aluguel efetivo',
              value: effRent,
              ratio: grossRent > 0 ? effRent / grossRent : 0,
              color: C.text,
            },
            {
              label: '− Condomínio',
              value: -condoCost,
              ratio: grossRent > 0 ? condoCost / grossRent : 0,
              color: C.amber,
            },
            {
              label: '− IPTU',
              value: -iptuCost,
              ratio: grossRent > 0 ? iptuCost / grossRent : 0,
              color: C.amber,
            },
            {
              label: '− Gestão',
              value: -mgmtCost,
              ratio: grossRent > 0 ? mgmtCost / grossRent : 0,
              color: C.amber,
            },
            {
              label: '− Manutenção',
              value: -maintCost,
              ratio: grossRent > 0 ? maintCost / grossRent : 0,
              color: C.amber,
            },
            {
              label: '= NOI',
              value: noi,
              ratio: grossRent > 0 ? noi / grossRent : 0,
              color: C.accent,
            },
          ].map((row, i) => (
            <View key={i} style={s.waterfallRow}>
              <Text style={s.waterfallLabel}>{row.label}</Text>
              <InlineBar ratio={row.ratio} color={row.color} />
              <Text
                style={{
                  width: 64,
                  fontSize: 9,
                  fontFamily: 'Helvetica-Bold',
                  textAlign: 'right',
                  color: row.value >= 0 ? C.text : C.red,
                }}
              >
                {fmt(row.value)}
              </Text>
            </View>
          ))}
          {firstInstallment > 0 && (
            <View style={s.waterfallRow}>
              <Text style={s.waterfallLabel}>− Parcela (mês 1)</Text>
              <InlineBar ratio={firstInstallment / grossRent} color={C.red} />
              <Text
                style={{
                  width: 64,
                  fontSize: 9,
                  fontFamily: 'Helvetica-Bold',
                  textAlign: 'right',
                  color: C.red,
                }}
              >
                {fmt(-firstInstallment)}
              </Text>
            </View>
          )}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 9,
              gap: 10,
              backgroundColor: cashFlowPositive ? C.accentGhost : C.redGhost,
            }}
          >
            <Text style={[s.waterfallLabel, { fontFamily: 'Helvetica-Bold', color: C.text }]}>
              = Fluxo de Caixa
            </Text>
            <View style={{ flex: 3 }} />
            <Text
              style={{
                width: 64,
                fontSize: 10,
                fontFamily: 'Helvetica-Bold',
                textAlign: 'right',
                color: cashFlowPositive ? C.accentDim : C.red,
              }}
            >
              {fmt(metrics.monthlyCashFlow)}
            </Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>BENCHMARKS — % A.A.</Text>
        <View style={s.card}>
          {[
            { name: 'Cap Rate', value: metrics.capRate, color: C.accent },
            {
              name: 'Cash-on-Cash',
              value: metrics.cashOnCash,
              color: metrics.cashOnCash >= 0 ? C.accentDim : C.red,
            },
            { name: 'CDI (referência)', value: CDI, color: C.textMuted },
            { name: 'FII (referência)', value: FII, color: C.textMuted },
          ].map((b, i) => (
            <View key={i} style={s.benchRow}>
              <Text style={s.benchName}>{b.name}</Text>
              <View
                style={{
                  flex: 1,
                  height: 8,
                  backgroundColor: C.elevated,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: 8,
                    width: `${clampPercent((b.value / maxBench) * 100)}%`,
                    backgroundColor: b.color,
                  }}
                />
              </View>
              <Text
                style={{
                  width: 50,
                  fontSize: 9,
                  fontFamily: 'Helvetica-Bold',
                  textAlign: 'right',
                  color: b.color,
                }}
              >
                {fmtPct(b.value)}
              </Text>
            </View>
          ))}
          <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ fontSize: 7, color: C.textMuted }}>
              CDI e FII são referências de mercado, não garantidas.
            </Text>
          </View>
        </View>

        <Footer page={2} dealName={dealName} />
      </Page>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ PAGE 3 — CASHFLOW + AMORT */}
      <Page size="A4" style={s.page}>
        {cfMonthly.length > 0 && (
          <>
            <Text style={s.sectionTitle}>FLUXO DE CAIXA MENSAL — 24 MESES</Text>
            <View style={s.card}>
              <View style={s.tableHeader}>
                <Text style={[s.thText, { flex: 1 }]}>Mês</Text>
                <Text style={[s.thText, { flex: 2, textAlign: 'right' }]}>Parcela</Text>
                <Text style={[s.thText, { flex: 2, textAlign: 'right' }]}>Juros</Text>
                <Text style={[s.thText, { flex: 2, textAlign: 'right' }]}>Amort.</Text>
                <Text style={[s.thText, { flex: 2, textAlign: 'right' }]}>Fluxo Líq.</Text>
              </View>
              {cfMonthly.map((p, i) => {
                const last = i === cfMonthly.length - 1;
                return (
                  <View key={i} style={last ? s.tableRowLast : s.tableRow}>
                    <Text style={[s.tdLabel, { flex: 1, fontSize: 8 }]}>{p.month}</Text>
                    <Text style={[s.tdValue, { flex: 2, fontSize: 8 }]}>{fmtK(p.installment)}</Text>
                    <Text style={[s.tdValue, { flex: 2, fontSize: 8 }]}>{fmtK(p.interest)}</Text>
                    <Text style={[s.tdValue, { flex: 2, fontSize: 8 }]}>{fmtK(p.amortization)}</Text>
                    <Text
                      style={[
                        p.cashFlow >= 0 ? s.tdValuePositive : s.tdValueNegative,
                        { flex: 2, fontSize: 8 },
                      ]}
                    >
                      {fmtK(p.cashFlow)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {amortYearly.length > 0 && (
          <>
            <Text style={s.sectionTitle}>AMORTIZAÇÃO ANUAL — SALDO DEVEDOR</Text>
            <View style={s.card}>
              <View style={s.tableHeader}>
                <Text style={[s.thText, { flex: 1 }]}>Ano</Text>
                <Text style={[s.thText, { flex: 2, textAlign: 'right' }]}>Saldo Devedor</Text>
                <Text style={[s.thText, { flex: 2, textAlign: 'right' }]}>Juros (ano)</Text>
                <Text style={[s.thText, { flex: 2, textAlign: 'right' }]}>Amort. (ano)</Text>
              </View>
              {amortYearly.map((p, i) => {
                const last = i === amortYearly.length - 1;
                return (
                  <View key={i} style={last ? s.tableRowLast : s.tableRow}>
                    <Text style={[s.tdLabel, { flex: 1, fontSize: 8 }]}>
                      {Math.round(p.month / 12)}
                    </Text>
                    <Text style={[s.tdValue, { flex: 2, fontSize: 8 }]}>
                      {fmtK(p.remainingBalance)}
                    </Text>
                    <Text style={[s.tdValue, { flex: 2, fontSize: 8 }]}>{fmtK(p.interest * 12)}</Text>
                    <Text style={[s.tdValue, { flex: 2, fontSize: 8 }]}>
                      {fmtK(p.amortization * 12)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <Footer page={3} dealName={dealName} />
      </Page>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ PAGE 4 — PROJECTION */}
      <Page size="A4" style={s.page}>
        {projections.length > 0 && (
          <>
            <Text style={s.sectionTitle}>PROJEÇÃO 10 ANOS — VALORIZAÇÃO E EQUITY</Text>
            <View style={s.card}>
              <View style={s.tableHeader}>
                <Text style={[s.thText, { flex: 1 }]}>Ano</Text>
                <Text style={[s.thText, { flex: 2, textAlign: 'right' }]}>Valor Estimado</Text>
                <Text style={[s.thText, { flex: 2, textAlign: 'right' }]}>Equity Acumulado</Text>
                <Text style={[s.thText, { flex: 2, textAlign: 'right' }]}>Valorização</Text>
              </View>
              {projections.map((p, i) => {
                const appreciation =
                  ((p.estimatedValue - inputs.purchasePrice) / inputs.purchasePrice) * 100;
                const last = i === projections.length - 1;
                return (
                  <View key={i} style={last ? s.tableRowLast : s.tableRow}>
                    <Text style={[s.tdLabel, { flex: 1, fontSize: 8 }]}>{p.year}</Text>
                    <Text style={[s.tdValue, { flex: 2, fontSize: 8 }]}>
                      {fmtK(p.estimatedValue)}
                    </Text>
                    <Text style={[s.tdValuePositive, { flex: 2, fontSize: 8 }]}>
                      {fmtK(p.equity)}
                    </Text>
                    <Text style={[s.tdValuePositive, { flex: 2, fontSize: 8 }]}>
                      +{appreciation.toFixed(1)}%
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <Text style={s.sectionTitle}>RESUMO EXECUTIVO</Text>
        <View style={s.card}>
          <TableRows
            rows={[
              ['Cap Rate', fmtPct(metrics.capRate)],
              ['Cash-on-Cash', fmtPct(metrics.cashOnCash)],
              ['NOI Mensal', fmt(noi)],
              ['Fluxo de Caixa Mensal', fmt(metrics.monthlyCashFlow)],
              ['Investimento Total', fmt(metrics.totalInvestment)],
              ['Capital Próprio', fmt(metrics.cashOutlay)],
              ...(metrics.loanAmount > 0
                ? ([['Saldo Financiamento (início)', fmt(metrics.loanAmount)]] as Array<
                    [string, string]
                  >)
                : []),
            ]}
          />
        </View>

        <View style={s.disclaimer}>
          <Text style={[s.disclaimerText, { fontFamily: 'Helvetica-Bold', marginBottom: 4 }]}>
            Aviso Legal
          </Text>
          <Text style={s.disclaimerText}>
            Este relatório foi gerado automaticamente pela plataforma immoyield para fins
            informativos. As projeções de valorização (5% a.a.) são estimativas baseadas em
            tendências históricas e não constituem garantia de retorno. Taxas de CDI e FII são
            referências de mercado e podem variar. Consulte um profissional de investimentos antes
            de tomar decisões financeiras. O immoyield não se responsabiliza por decisões baseadas
            neste relatório.
          </Text>
        </View>

        <Footer page={4} dealName={dealName} />
      </Page>
    </Document>
  );
}
