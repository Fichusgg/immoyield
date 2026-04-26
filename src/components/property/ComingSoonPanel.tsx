import { Sparkles } from 'lucide-react';

interface Props {
  title: string;
  description?: React.ReactNode;
  /** Optional preview content rendered behind a faded "Em Breve" overlay. */
  preview?: React.ReactNode;
}

/**
 * Standard "Em Breve" placeholder used by Fotos, Mapa, Projeções, Comparáveis.
 * If `preview` is provided, it is rendered behind a soft mask.
 */
export function ComingSoonPanel({ title, description, preview }: Props) {
  return (
    <div className="relative overflow-hidden border border-dashed border-[#A8C5B2] bg-[#FAFAF8]">
      {preview && (
        <div aria-hidden className="pointer-events-none opacity-30 select-none">
          {preview}
        </div>
      )}
      <div
        className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
        style={preview ? { position: 'absolute', inset: 0 } : undefined}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF3EE] text-[#4A7C59]">
          <Sparkles size={20} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#1C2B20]">{title}</p>
          {description && (
            <p className="max-w-md text-xs text-[#6B7280]">{description}</p>
          )}
        </div>
        <span className="rounded-full bg-[#4A7C59] px-3 py-1 text-[10px] font-semibold tracking-wider text-white uppercase">
          Em Breve
        </span>
      </div>
    </div>
  );
}
