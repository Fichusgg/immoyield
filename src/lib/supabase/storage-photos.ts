'use client';

import { createClient } from './client';

export const PROPERTY_IMAGES_BUCKET = 'property-images';
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB
export const ACCEPTED_PHOTO_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
] as const;

export class PhotoUploadError extends Error {
  constructor(
    message: string,
    public readonly file?: string
  ) {
    super(message);
    this.name = 'PhotoUploadError';
  }
}

function newPhotoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Validate then upload a single image to `property-images/{dealId}/{uuid}.{ext}`.
 * Returns the public URL. Throws PhotoUploadError on validation/storage failure.
 */
export async function uploadPropertyPhoto(dealId: string, file: File): Promise<string> {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type as (typeof ACCEPTED_PHOTO_TYPES)[number])) {
    throw new PhotoUploadError(
      'Formato não suportado. Use JPG, PNG, WebP, AVIF ou HEIC.',
      file.name
    );
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new PhotoUploadError(
      `Arquivo maior que ${MAX_PHOTO_BYTES / 1024 / 1024} MB. Comprima a imagem antes de enviar.`,
      file.name
    );
  }

  const supabase = createClient();
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${dealId}/${newPhotoId()}.${ext || 'jpg'}`;

  const { error } = await supabase.storage
    .from(PROPERTY_IMAGES_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) throw new PhotoUploadError(error.message, file.name);

  const {
    data: { publicUrl },
  } = supabase.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(path);
  return publicUrl;
}

/**
 * Best-effort delete from storage given a public URL.
 * Silently ignores foreign URLs (e.g. photos imported from listing scrapers).
 */
export async function deletePropertyPhoto(publicUrl: string): Promise<void> {
  const marker = `/storage/v1/object/public/${PROPERTY_IMAGES_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;

  const path = publicUrl.slice(idx + marker.length);
  if (!path) return;

  const supabase = createClient();
  const { error } = await supabase.storage.from(PROPERTY_IMAGES_BUCKET).remove([path]);
  if (error) throw new PhotoUploadError(error.message);
}

/** True for storage URLs we own and can delete; false for imported third-party URLs. */
export function isOwnedPhoto(publicUrl: string): boolean {
  return publicUrl.includes(`/storage/v1/object/public/${PROPERTY_IMAGES_BUCKET}/`);
}
