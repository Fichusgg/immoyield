/**
 * immoyield — Deal Report PDF Template
 * Built with @react-pdf/renderer
 *
 * Structure:
 *   Page 1 — Cover: deal name, key metrics strip, deal summary
 *   Page 2 — Capital breakdown, NOI waterfall, benchmarks table
 *   Page 3 — Monthly cashflow table (first 24m), amortization schedule (yearly)
 *   Page 4 — 10-year projection table + disclaimer footer
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { AnalysisResult } from '@/components/deals/ResultsScreen';
import type { DealInput } from '@/lib/validations/deal';

// ─── Brand colours ────────────────────────────────────────────────────────────
const C = {
  slate900: '#0f172a',
  slate800: '#1e293b',
  slate700: '#334155',
  slate600: '#475569',
  slate400: '#94a3b8',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  slate50: '#f8fafc',
  emerald500: '#10b981',
  emerald400: '#34d399',
  emerald50: '#ecfdf5',
  sky500: '#0ea5e9',
  red500: '#ef4444',
  red50: '#fef2f2',
  amber400: '#fbbf24',
  white: '#ffffff',
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
    backgroundColor: C.white,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },

  // ── Cover ──────────────────────────────────────────────────────────────────
  coverHero: {
    backgroundColor: C.slate900,
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
  },
  coverBadge: {
    backgroundColor: C.emerald500,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  coverBadgeText: {
    color: C.white,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
  },
  coverTitle: {
    color: C.white,
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  coverSubtitle: {
    color: C.slate400,
    fontSize: 10,
  },

  // ── KPI strip ──────────────────────────────────────────────────────────────
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: C.slate50,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: C.slate200,
  },
  kpiCardHighlight: {
    flex: 1,
    backgroundColor: C.emerald500,
    borderRadius: 10,
    padding: 14,
  },
  kpiCardNegative: {
    flex: 1,
    backgroundColor: C.red50,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  kpiLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.slate400,
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  kpiLabelHighlight: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#a7f3d0',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  kpiValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: C.slate900,
  },
  kpiValueHighlight: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },
  kpiValuePositive: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: C.emerald500,
  },
  kpiValueNegative: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: C.red500,
  },
  kpiSub: {
    fontSize: 7,
    color: C.slate400,
    marginTop: 3,
  },
  kpiSubHighlight: {
    fontSize: 7,
    color: '#a7f3d0',
    marginTop: 3,
  },

  // ── Section ────────────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.slate400,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.slate200,
    marginBottom: 20,
    overflow: 'hidden',
  },

  // ── Table ──────────────────────────────────────────────────────────────────
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.slate100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.slate100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: C.slate50,
    alignItems: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: C.slate900,
  },
  thText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 0.8,
  },
  tdLabel: {
    flex: 2,
    fontSize: 9,
    color: C.slate600,
  },
  tdValue: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.slate900,
    textAlign: 'right',
  },
  tdValuePositive: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.emerald500,
    textAlign: 'right',
  },
  tdValueNegative: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.red500,
    textAlign: 'right',
  },

  // ── Waterfall ──────────────────────────────────────────────────────────────
  waterfallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.slate100,
    gap: 8,
  },
  waterfallLabel: {
    flex: 2,
    fontSize: 9,
    color: C.slate600,
  },

  // ── Benchmarks ─────────────────────────────────────────────────────────────
  benchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: C.slate100,
    gap: 10,
  },
  benchName: {
    width: 90,
    fontSize: 9,
    color: C.slate700,
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.slate200,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: C.slate400,
  },
  footerBrand: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.emerald500,
  },

  // ── Disclaimer ─────────────────────────────────────────────────────────────
  disclaimer: {
    backgroundColor: C.slate50,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: C.slate200,
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 7,
    color: C.slate400,
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

const KPI = ({
  label,
  value,
  sub,
  variant = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  variant?: 'default' | 'highlight' | 'positive' | 'negative';
}) => {
  const cardStyle =
    variant === 'highlight' ? s.kpiCardHighlight : variant === 'negative' ? s.kpiCardNegative : s.kpiCard;
  const labelStyle = variant === 'highlight' ? s.kpiLabelHighlight : s.kpiLabel;
  const valueStyle =
    variant === 'highlight'
      ? s.kpiValueHighlight
      : variant === 'positive'
      ? s.kpiValuePositive
      : variant === 'negative'
      ? s.kpiValueNegative
      : s.kpiValue;
  const subStyle = variant === 'highlight' ? s.kpiSubHighlight : s.kpiSub;

  return (
    <View style={cardStyle}>
      <Text style={labelStyle}>{label.toUpperCase()}</Text>
      <Text style={valueStyle}>{value}</Text>
      {sub && <Text style={subStyle}>{sub}</Text>}
    </View>
  );
};

const InlineBar = ({ ratio, color }: { ratio: number; color: string }) => (
  <View
    style={{
      flex: 3,
      height: 8,
      backgroundColor: C.slate100,
      borderRadius: 4,
      overflow: 'hidden',
    }}
  >
    <View
      style={{
        height: 8,
        width: `${Math.min(100, Math.max(0, ratio * 100))}%`,
        backgroundColor: color,
        borderRadius: 4,
      }}
    />
  </View>
);

// ─── Main Document ────────────────────────────────────────────────────────────
export interface DealReportPDFProps {
  result: AnalysisResult;
  inputs: DealInput;
  dealName?: string;
}

export function DealReportPDF({ result, inputs, dealName = 'Análise de Deal' }: DealReportPDFProps) {
  const { metrics, schedule, projections } = result;
  const cashFlowPositive = metrics.monthlyCashFlow >= 0;

  // Derived
  const grossRent = inputs.revenue.monthlyRent;
  const vacancyLoss = grossRent * inputs.revenue.vacancyRate;
  const effRent = grossRent - vacancyLoss;
  const mgmtCost = grossRent * inputs.expenses.managementPercent;
  const maintCost = grossRent * inputs.expenses.maintenancePercent;
  const noi = metrics.monthlyNOI;
  const firstInstallment = schedule[0]?.installment ?? 0;
  const ltv = metrics.loanAmount > 0 ? (metrics.loanAmount / metrics.totalInvestment) * 100 : 0;

  const CDI = 10.5;
  const FII = 8.0;
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
        <View style={s.coverHero}>
          <View style={s.coverBadge}>
            <Text style={s.coverBadgeText}>ANÁLISE DE INVESTIMENTO IMOBILIÁRIO</Text>
          </View>
          <Text style={s.coverTitle}>{dealName}</Text>
          <Text style={s.coverSubtitle}>
            Gerado em {fmtDate()} · Aluguel · {financingLabel}
          </Text>
        </View>

        <Text style={s.sectionTitle}>INDICADORES-CHAVE</Text>
        <View style={s.kpiRow}>
          <KPI
            label="Fluxo de Caixa"
            value={fmt(metrics.monthlyCashFlow)}
            sub="por mês"
            variant={cashFlowPositive ? 'positive' : 'negative'}
          />
          <KPI label="Cap Rate" value={fmtPct(metrics.capRate)} sub="retorno bruto a.a." variant="highlight" />
        </View>
        <View style={s.kpiRow}>
          <KPI
            label="Cash-on-Cash"
            value={fmtPct(metrics.cashOnCash)}
            sub="retorno sobre capital próprio"
            variant={metrics.cashOnCash >= 0 ? 'positive' : 'negative'}
          />
          <KPI label="NOI Mensal" value={fmt(noi)} sub="resultado operacional líquido" />
        </View>
        <View style={[s.kpiRow, { marginBottom: 0 }]}>
          <KPI label="Investimento Total" value={fmt(metrics.totalInvestment)} sub="preço + custos de aquisição" />
          <KPI label="Capital Próprio" value={fmt(metrics.cashOutlay)} sub="entrada efetiva" />
        </View>

        <View style={{ height: 1, backgroundColor: C.slate200, marginVertical: 20 }} />

        <Text style={s.sectionTitle}>RESUMO DO DEAL</Text>
        <View style={s.card}>
          {[
            ['Imóvel', dealName],
            ['Preço de compra', fmt(inputs.purchasePrice)],
            ['ITBI', fmtPct(inputs.acquisitionCosts.itbiPercent * 100)],
            ['Cartório', fmt(inputs.acquisitionCosts.cartorio)],
            ['Reformas', fmt(inputs.acquisitionCosts.reforms)],
            ['Aluguel bruto', fmt(grossRent) + ' /mês'],
            ['Vacância estimada', fmtPct(inputs.revenue.vacancyRate * 100)],
            ['Condomínio', fmt(inputs.expenses.condo) + ' /mês'],
            ['IPTU', fmt(inputs.expenses.iptu) + ' /mês'],
            ['Gestão', fmtPct(inputs.expenses.managementPercent * 100)],
            ['Manutenção', fmtPct(inputs.expenses.maintenancePercent * 100)],
          ].map(([label, value], i) => (
            <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={s.tdLabel}>{label}</Text>
              <Text style={s.tdValue}>{value}</Text>
            </View>
          ))}
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
          {[
            ['Investimento total', fmt(metrics.totalInvestment)],
            ['Capital próprio (entrada)', fmt(metrics.cashOutlay)],
            ...(metrics.loanAmount > 0
              ? [
                  ['Financiamento', fmt(metrics.loanAmount)],
                  ['LTV (Loan-to-Value)', fmtPct(ltv)],
                  ['Sistema de amortização', inputs.financing.system],
                  ['Taxa de juros', fmtPct(inputs.financing.interestRateYear) + ' a.a.'],
                  ['Prazo', `${inputs.financing.termMonths} meses`],
                  ['Parcela inicial (mês 1)', fmt(firstInstallment)],
                ]
              : []),
          ].map(([label, value], i) => (
            <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={s.tdLabel}>{label}</Text>
              <Text style={s.tdValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>CASCATA DE NOI — MENSAL</Text>
        <View style={s.card}>
          {[
            { label: 'Aluguel bruto', value: grossRent, ratio: 1, color: C.sky500 },
            { label: '− Vacância', value: -vacancyLoss, ratio: vacancyLoss / grossRent, color: C.red500 },
            { label: '= Aluguel efetivo', value: effRent, ratio: effRent / grossRent, color: C.slate700 },
            { label: '− Condomínio', value: -inputs.expenses.condo, ratio: inputs.expenses.condo / grossRent, color: C.amber400 },
            { label: '− IPTU', value: -inputs.expenses.iptu, ratio: inputs.expenses.iptu / grossRent, color: C.amber400 },
            { label: '− Gestão', value: -mgmtCost, ratio: mgmtCost / grossRent, color: C.amber400 },
            { label: '− Manutenção', value: -maintCost, ratio: maintCost / grossRent, color: C.amber400 },
            { label: '= NOI', value: noi, ratio: noi / grossRent, color: C.emerald500 },
          ].map((row, i) => (
            <View key={i} style={s.waterfallRow}>
              <Text style={s.waterfallLabel}>{row.label}</Text>
              <InlineBar ratio={row.ratio} color={row.color} />
              <Text style={{ width: 64, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'right', color: row.value >= 0 ? C.slate900 : C.red500 }}>
                {fmt(row.value)}
              </Text>
            </View>
          ))}
          {firstInstallment > 0 && (
            <View style={s.waterfallRow}>
              <Text style={s.waterfallLabel}>− Parcela (mês 1)</Text>
              <InlineBar ratio={firstInstallment / grossRent} color={C.red500} />
              <Text style={{ width: 64, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'right', color: C.red500 }}>
                {fmt(-firstInstallment)}
              </Text>
            </View>
          )}
          <View style={[s.waterfallRow, { backgroundColor: cashFlowPositive ? C.emerald50 : C.red50 }]}>
            <Text style={[s.waterfallLabel, { fontFamily: 'Helvetica-Bold' }]}>= Fluxo de Caixa</Text>
            <View style={{ flex: 3 }} />
            <Text style={{ width: 64, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'right', color: cashFlowPositive ? C.emerald500 : C.red500 }}>
              {fmt(metrics.monthlyCashFlow)}
            </Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>BENCHMARKS — % A.A.</Text>
        <View style={s.card}>
          {[
            { name: 'Cap Rate', value: metrics.capRate, color: C.sky500 },
            { name: 'Cash-on-Cash', value: metrics.cashOnCash, color: metrics.cashOnCash >= 0 ? C.emerald500 : C.red500 },
            { name: 'CDI (referência)', value: CDI, color: C.slate400 },
            { name: 'FII (referência)', value: FII, color: C.slate400 },
          ].map((b, i) => (
            <View key={i} style={s.benchRow}>
              <Text style={s.benchName}>{b.name}</Text>
              <View style={{ flex: 1, height: 10, backgroundColor: C.slate100, borderRadius: 5, overflow: 'hidden' }}>
                <View
                  style={{
                    height: 10,
                    width: `${Math.min(100, Math.max(0, (b.value / maxBench) * 100))}%`,
                    backgroundColor: b.color,
                    borderRadius: 5,
                  }}
                />
              </View>
              <Text style={{ width: 44, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'right', color: b.color }}>
                {fmtPct(b.value)}
              </Text>
            </View>
          ))}
          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ fontSize: 7, color: C.slate400 }}>
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
              {cfMonthly.map((p, i) => (
                <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={[s.tdLabel, { flex: 1, fontSize: 8 }]}>{p.month}</Text>
                  <Text style={[s.tdValue, { flex: 2, fontSize: 8 }]}>{fmtK(p.installment)}</Text>
                  <Text style={[s.tdValue, { flex: 2, fontSize: 8 }]}>{fmtK(p.interest)}</Text>
                  <Text style={[s.tdValue, { flex: 2, fontSize: 8 }]}>{fmtK(p.amortization)}</Text>
                  <Text style={[p.cashFlow >= 0 ? s.tdValuePositive : s.tdValueNegative, { flex: 2, fontSize: 8 }]}>
                    {fmtK(p.cashFlow)}
                  </Text>
                </View>
              ))}
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
              {amortYearly.map((p, i) => (
                <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={[s.tdLabel, { flex: 1, fontSize: 8 }]}>{Math.round(p.month / 12)}</Text>
                  <Text style={[s.tdValue, { flex: 2, fontSize: 8 }]}>{fmtK(p.remainingBalance)}</Text>
                  <Text style={[s.tdValue, { flex: 2, fontSize: 8 }]}>{fmtK(p.interest * 12)}</Text>
                  <Text style={[s.tdValue, { flex: 2, fontSize: 8 }]}>{fmtK(p.amortization * 12)}</Text>
                </View>
              ))}
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
                const appreciation = ((p.estimatedValue - inputs.purchasePrice) / inputs.purchasePrice) * 100;
                return (
                  <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                    <Text style={[s.tdLabel, { flex: 1, fontSize: 8 }]}>{p.year}</Text>
                    <Text style={[s.tdValue, { flex: 2, fontSize: 8 }]}>{fmtK(p.estimatedValue)}</Text>
                    <Text style={[s.tdValuePositive, { flex: 2, fontSize: 8 }]}>{fmtK(p.equity)}</Text>
                    <Text style={[s.tdValuePositive, { flex: 2, fontSize: 8 }]}>+{appreciation.toFixed(1)}%</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <Text style={s.sectionTitle}>RESUMO EXECUTIVO</Text>
        <View style={s.card}>
          {[
            ['Cap Rate', fmtPct(metrics.capRate)],
            ['Cash-on-Cash', fmtPct(metrics.cashOnCash)],
            ['NOI Mensal', fmt(noi)],
            ['Fluxo de Caixa Mensal', fmt(metrics.monthlyCashFlow)],
            ['Investimento Total', fmt(metrics.totalInvestment)],
            ['Capital Próprio', fmt(metrics.cashOutlay)],
            ...(metrics.loanAmount > 0 ? [['Saldo Financiamento (início)', fmt(metrics.loanAmount)]] : []),
          ].map(([label, value], i) => (
            <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={s.tdLabel}>{label}</Text>
              <Text style={s.tdValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={s.disclaimer}>
          <Text style={[s.disclaimerText, { fontFamily: 'Helvetica-Bold', marginBottom: 4 }]}>
            Aviso Legal
          </Text>
          <Text style={s.disclaimerText}>
            Este relatório foi gerado automaticamente pela plataforma immoyield para fins informativos.
            As projeções de valorização (5% a.a.) são estimativas baseadas em tendências históricas e
            não constituem garantia de retorno. Taxas de CDI e FII são referências de mercado e podem variar.
            Consulte um profissional de investimentos antes de tomar decisões financeiras.
            O immoyield não se responsabiliza por decisões baseadas neste relatório.
          </Text>
        </View>

        <Footer page={4} dealName={dealName} />
      </Page>
    </Document>
  );
}
