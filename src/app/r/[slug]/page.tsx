import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicReportBySlug } from '@/lib/supabase/shares.server';
import { getBenchmarks } from '@/lib/benchmarks';
import PublicReportView from '@/components/share/PublicReportView';
import PublicReportEmptyState from '@/components/share/PublicReportEmptyState';
import type { AnalysisResult } from '@/components/deals/ResultsScreen';
import type { DealInput } from '@/lib/validations/deal';

interface Props {
  params: Promise<{ slug: string }>;
}

function hasAnalysis(report: Awaited<ReturnType<typeof getPublicReportBySlug>>) {
  if (!report) return false;
  const r = report.deal.results_cache as { metrics?: unknown } | null | undefined;
  const i = report.deal.inputs as Record<string, unknown> | null | undefined;
  return Boolean(r?.metrics) && Boolean(i);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const report = await getPublicReportBySlug(slug);
  if (!report) {
    return { title: 'Relatório não encontrado — immoyield' };
  }
  const metrics = report.deal.results_cache?.metrics as Record<string, number> | undefined;
  const capRate = metrics?.capRate?.toFixed(2);
  const description = capRate
    ? `Cap Rate ${capRate}% · Veja a análise completa de investimento para ${report.deal.name} gerada pelo immoyield.`
    : `Veja os dados do imóvel ${report.deal.name} compartilhados via immoyield.`;
  return {
    title: `${report.deal.name} — Análise Imobiliária | immoyield`,
    description,
    openGraph: {
      title: `${report.deal.name} | immoyield`,
      description: capRate
        ? `Cap Rate ${capRate}% · Análise de investimento imobiliário`
        : 'Análise de investimento imobiliário',
      type: 'article',
    },
  };
}

export default async function PublicReportPage({ params }: Props) {
  const { slug } = await params;
  const report = await getPublicReportBySlug(slug);

  if (!report) notFound();

  if (!hasAnalysis(report)) {
    return (
      <PublicReportEmptyState
        dealName={report.deal.name}
        updatedAt={report.deal.updated_at}
      />
    );
  }

  const benchmarks = await getBenchmarks();

  return (
    <PublicReportView
      dealName={report.deal.name}
      propertyType={report.deal.property_type}
      updatedAt={report.deal.updated_at}
      viewCount={report.view_count}
      result={report.deal.results_cache as unknown as AnalysisResult}
      inputs={report.deal.inputs as unknown as DealInput}
      benchmarks={{ cdi: benchmarks.cdi, fii: benchmarks.fii, updatedAt: benchmarks.updatedAt }}
      slug={slug}
    />
  );
}
