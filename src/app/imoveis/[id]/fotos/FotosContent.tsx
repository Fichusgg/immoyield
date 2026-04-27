'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ImagePlus,
  UploadCloud,
  Star,
  ZoomIn,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SavedDeal } from '@/lib/supabase/deals';
import {
  uploadPropertyPhoto,
  deletePropertyPhoto,
  ACCEPTED_PHOTO_TYPES,
  isOwnedPhoto,
  PhotoUploadError,
} from '@/lib/supabase/storage-photos';
import { PageHeader } from '@/components/property/PageHeader';
import { patchDeal } from '@/components/property/save-deal';
import { cn } from '@/lib/utils';

interface Props {
  deal: SavedDeal;
}

const ACCEPT_ATTR = ACCEPTED_PHOTO_TYPES.join(',');

export default function FotosContent({ deal }: Props) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = React.useState<string[]>(deal.photos ?? []);
  const [uploading, setUploading] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [lightboxSrc, setLightboxSrc] = React.useState<string | null>(null);

  const persist = async (next: string[]) => {
    setPhotos(next);
    setBusy(true);
    try {
      await patchDeal(deal.id, { photos: next });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar a galeria');
    } finally {
      setBusy(false);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading((c) => c + list.length);
    const uploaded: string[] = [];
    for (const f of list) {
      try {
        const url = await uploadPropertyPhoto(deal.id, f);
        uploaded.push(url);
      } catch (e) {
        const msg = e instanceof PhotoUploadError ? e.message : 'Erro no upload';
        toast.error(`${f.name}: ${msg}`);
      } finally {
        setUploading((c) => c - 1);
      }
    }
    if (uploaded.length > 0) {
      const next = [...photos, ...uploaded];
      await persist(next);
      toast.success(
        `${uploaded.length} foto${uploaded.length === 1 ? '' : 's'} adicionada${
          uploaded.length === 1 ? '' : 's'
        }`
      );
    }
  };

  const handleSetCover = (url: string) => {
    if (photos[0] === url) return;
    const next = [url, ...photos.filter((p) => p !== url)];
    void persist(next);
    toast.success('Capa atualizada');
  };

  const handleDelete = async (url: string) => {
    if (!confirm('Remover esta foto? Esta ação não pode ser desfeita.')) return;
    setBusy(true);
    try {
      // Best-effort storage cleanup — only for photos we own.
      if (isOwnedPhoto(url)) {
        try {
          await deletePropertyPhoto(url);
        } catch (e) {
          console.warn('[fotos] storage delete failed:', e);
          // Still remove from gallery — orphaned object can be garbage-collected later.
        }
      }
      const next = photos.filter((p) => p !== url);
      await persist(next);
      toast.success('Foto removida');
    } finally {
      setBusy(false);
    }
  };

  const onDrop: React.DragEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(e.dataTransfer.files);
  };

  return (
    <>
      <PageHeader
        title="Fotos"
        breadcrumb={[
          { label: 'Imóveis', href: '/propriedades' },
          { label: deal.title, href: `/imoveis/${deal.id}/analise` },
          { label: 'Fotos' },
        ]}
        helper="A primeira foto é a capa exibida no card e na barra lateral. Arraste para reorganizar quando essa funcionalidade chegar."
        actions={
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || uploading > 0}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#4A7C59] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F] disabled:opacity-60"
          >
            <ImagePlus size={12} />
            Adicionar Fotos
          </button>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((url, i) => {
          const isCover = i === 0;
          return (
            <figure
              key={url}
              className="group relative aspect-square overflow-hidden rounded border border-[#E2E0DA] bg-[#F0EFEB]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />

              {/* Cover star indicator */}
              {isCover && (
                <span
                  aria-label="Foto de capa"
                  title="Foto de capa"
                  className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#4A7C59] text-white shadow-sm"
                >
                  <Star size={12} fill="currentColor" />
                </span>
              )}

              {/* Hover overlay */}
              <div
                className={cn(
                  'absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all',
                  'group-hover:bg-black/40 group-hover:opacity-100 focus-within:bg-black/40 focus-within:opacity-100'
                )}
              >
                <button
                  type="button"
                  aria-label="Ampliar"
                  onClick={() => setLightboxSrc(url)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#1C2B20] shadow transition-transform hover:scale-105"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  type="button"
                  aria-label={isCover ? 'Já é a capa' : 'Definir como capa'}
                  disabled={isCover || busy}
                  onClick={() => handleSetCover(url)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#1C2B20] shadow transition-transform hover:scale-105 disabled:opacity-50"
                >
                  <Star size={15} fill={isCover ? '#4A7C59' : 'transparent'} />
                </button>
                <button
                  type="button"
                  aria-label="Remover"
                  disabled={busy}
                  onClick={() => handleDelete(url)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#DC2626] shadow transition-transform hover:scale-105 hover:bg-[#FEE2E2] disabled:opacity-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </figure>
          );
        })}

        {/* In-flight upload tiles */}
        {Array.from({ length: uploading }).map((_, i) => (
          <div
            key={`uploading-${i}`}
            className="flex aspect-square items-center justify-center rounded border border-dashed border-[#A8C5B2] bg-[#EBF3EE]"
          >
            <Loader2 size={22} className="animate-spin text-[#4A7C59]" />
          </div>
        ))}

        {/* Drop zone tile (always last) */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          disabled={busy}
          className={cn(
            'flex aspect-square flex-col items-center justify-center gap-2 rounded border border-dashed text-center transition-colors',
            dragOver
              ? 'border-[#4A7C59] bg-[#EBF3EE]'
              : 'border-[#A8C5B2] bg-[#FAFAF8] hover:border-[#4A7C59] hover:bg-[#EBF3EE]/50',
            busy && 'cursor-not-allowed opacity-50'
          )}
        >
          <UploadCloud size={24} className="text-[#4A7C59]" />
          <p className="px-3 text-xs font-medium text-[#1C2B20]">
            Arraste fotos aqui
          </p>
          <p className="px-3 text-[10px] text-[#9CA3AF]">
            ou clique para escolher
          </p>
          <p className="px-3 text-[9px] font-mono text-[#9CA3AF]">
            JPG · PNG · WebP · até 10 MB
          </p>
        </button>
      </div>

      {photos.length === 0 && uploading === 0 && (
        <p className="mt-6 text-center text-xs text-[#9CA3AF]">
          Nenhuma foto ainda. Adicione a primeira para definir a capa do imóvel.
        </p>
      )}

      {/* ── Lightbox ──────────────────────────────────────────────────── */}
      {lightboxSrc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visualização ampliada"
          onClick={() => setLightboxSrc(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
