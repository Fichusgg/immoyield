import { ImageResponse } from 'next/og';
import { getPublicReportBySlug } from '@/lib/supabase/shares.server';
import { getBenchmarks } from '@/lib/benchmarks';

export const runtime = 'nodejs';
export const alt = 'Análise de investimento imobiliário · ImmoYield';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const [report, benchmarks] = await Promise.all([
    getPublicReportBySlug(slug),
    getBenchmarks(),
  ]);

  const dealName = report?.deal.name ?? 'Análise de investimento';
  const metrics = (report?.deal.results_cache?.metrics ?? {}) as Record<string, number | undefined>;

  const roiPct = metrics.rentalRoiAnnualizedPct ?? metrics.netYieldAnnualPct ?? metrics.capRate;
  const capRate = metrics.capRate;
  const cashFlow = metrics.monthlyCashFlow;
  const cdi = benchmarks.cdi;

  const roiLabel = roiPct != null && Number.isFinite(roiPct) ? `${roiPct.toFixed(1)}%` : '—';
  const capLabel = capRate != null && Number.isFinite(capRate) ? `${capRate.toFixed(1)}%` : '—';
  const cashFlowLabel =
    cashFlow != null && Number.isFinite(cashFlow)
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
          cashFlow
        )
      : '—';
  const cdiLabel = cdi != null ? `${cdi.toFixed(2)}%` : '—';

  const beatsCdi = roiPct != null && cdi != null && roiPct > cdi;
  const verdict = beatsCdi ? 'Acima do CDI' : 'Abaixo do CDI';
  const verdictColor = beatsCdi ? '#4A7C59' : '#B45309';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#F8F7F4',
          padding: '64px 72px',
          fontFamily: 'system-ui, sans-serif',
          color: '#1C2B20',
        }}
      >
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              backgroundColor: '#4A7C59',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 800,
              fontSize: 22,
            }}
          >
            i
          </div>
          <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
            ImmoYield
          </div>
          <div
            style={{
              display: 'flex',
              marginLeft: 'auto',
              fontSize: 14,
              color: '#6B7480',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Análise de Investimento
          </div>
        </div>

        {/* Deal name */}
        <div
          style={{
            display: 'flex',
            marginTop: 56,
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            maxWidth: 1000,
          }}
        >
          {dealName}
        </div>

        {/* Headline ROI block */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginTop: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontSize: 14,
                color: '#6B7480',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              ROI Anualizado
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 132,
                fontWeight: 800,
                lineHeight: 1,
                color: '#4A7C59',
                marginTop: 8,
                letterSpacing: '-0.03em',
              }}
            >
              {roiLabel}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginBottom: 18,
              marginLeft: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                fontWeight: 700,
                color: verdictColor,
              }}
            >
              {verdict}
            </div>
            <div style={{ display: 'flex', fontSize: 16, color: '#6B7480', marginTop: 4 }}>
              CDI atual · {cdiLabel}
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Bottom KPI strip */}
        <div
          style={{
            display: 'flex',
            borderTop: '1px solid #E2E0DA',
            paddingTop: 24,
            gap: 56,
          }}
        >
          <Kpi label="Cap Rate" value={capLabel} />
          <Kpi label="Fluxo de Caixa" value={`${cashFlowLabel}/mês`} />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', fontSize: 16, color: '#6B7480' }}>
            immoyield.com.br
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          fontSize: 13,
          color: '#6B7480',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 32,
          fontWeight: 800,
          color: '#1C2B20',
          marginTop: 4,
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>
    </div>
  );
}
