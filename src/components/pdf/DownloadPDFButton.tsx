'use client';

/**
 * DownloadPDFButton
 *
 * Lazy-loads @react-pdf/renderer only on the client (it's a heavy bundle and
 * uses browser APIs). Renders a <PDFDownloadLink> once mounted.
 *
 * Usage:
 *   <DownloadPDFButton result={result} inputs={inputs} dealName="Apto 204" />
 */

import { useState, useEffect, useSyncExternalStore } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import type { AnalysisResult } from '@/components/deals/ResultsScreen';
import type { DealInput } from '@/lib/validations/deal';

// SSR-safe client detection via useSyncExternalStore
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

interface DownloadPDFButtonProps {
  result: AnalysisResult;
  inputs: DealInput;
  dealName?: string;
  className?: string;
}

export function DownloadPDFButton({
  result,
  inputs,
  dealName = 'Deal',
  className,
}: DownloadPDFButtonProps) {
  const isClient = useIsClient();

  const fileName = `immoyield-${dealName.toLowerCase().replace(/\s+/g, '-')}.pdf`;

  if (!isClient) {
    return (
      <button disabled className={className ?? defaultClass} aria-label="Preparando PDF...">
        <Loader2 size={13} className="animate-spin" />
        Preparando PDF...
      </button>
    );
  }

  // Dynamically import to keep SSR clean
  return (
    <AsyncPDFLink
      result={result}
      inputs={inputs}
      dealName={dealName}
      fileName={fileName}
      className={className}
    />
  );
}

// ─── Inner async component ────────────────────────────────────────────────────

const defaultClass =
  'flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed';

function AsyncPDFLink({
  result,
  inputs,
  dealName,
  fileName,
  className,
}: {
  result: AnalysisResult;
  inputs: DealInput;
  dealName: string;
  fileName: string;
  className?: string;
}) {
  const [PDFDownloadLink, setPDFDownloadLink] = useState<React.ComponentType<{
    document: React.ReactElement;
    fileName: string;
    children: (opts: { loading: boolean }) => React.ReactNode;
    className?: string;
  }> | null>(null);

  const [DealReportPDF, setDealReportPDF] = useState<React.ComponentType<{
    result: AnalysisResult;
    inputs: DealInput;
    dealName?: string;
  }> | null>(null);

  useEffect(() => {
    Promise.all([
      import('@react-pdf/renderer').then((m) => m.PDFDownloadLink),
      import('./DealReportPDF').then((m) => m.DealReportPDF),
    ]).then(([link, doc]) => {
      setPDFDownloadLink(() => link as typeof PDFDownloadLink);
      setDealReportPDF(() => doc as typeof DealReportPDF);
    });
  }, []);

  if (!PDFDownloadLink || !DealReportPDF) {
    return (
      <button disabled className={className ?? defaultClass}>
        <Loader2 size={13} className="animate-spin" />
        Preparando PDF...
      </button>
    );
  }

  const doc = <DealReportPDF result={result} inputs={inputs} dealName={dealName} />;

  return (
    <PDFDownloadLink document={doc} fileName={fileName} className={className ?? defaultClass}>
      {({ loading }) =>
        loading ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            Gerando PDF...
          </>
        ) : (
          <>
            <FileDown size={13} />
            Exportar PDF
          </>
        )
      }
    </PDFDownloadLink>
  );
}
