import 'server-only';

/**
 * Server-side share functions.
 *
 * - Safe to import from Server Components and Route Handlers only.
 * - Uses the Supabase server client (cookies / next/headers).
 */

import { createClient } from '@/lib/supabase/server';

export interface SharedReport {
  id: string;
  deal_id: string;
  slug: string;
  is_active: boolean;
  view_count: number;
  created_at: string;
}

function generateSlug(dealName: string): string {
  const base = dealName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 32);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error('Não autenticado');
  return { supabase, userId: user.id };
}

async function assertDealOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dealId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('deals')
    .select('id,user_id')
    .eq('id', dealId)
    .single();
  if (error) throw error;
  if (!data || data.user_id !== userId) throw new Error('Acesso negado');
}

export async function createShareLinkServer(
  dealId: string,
  dealName: string
): Promise<SharedReport> {
  const { supabase, userId } = await requireUserId();
  await assertDealOwnership(supabase, dealId, userId);

  const { data: existing, error: existingError } = await supabase
    .from('shared_reports')
    .select('*')
    .eq('deal_id', dealId)
    .eq('is_active', true)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing as SharedReport;

  const slug = generateSlug(dealName);
  const { data, error } = await supabase
    .from('shared_reports')
    .insert({ deal_id: dealId, slug, is_active: true, view_count: 0 })
    .select('*')
    .single();

  if (error) throw error;
  return data as SharedReport;
}

export async function revokeShareLinkServer(dealId: string): Promise<void> {
  const { supabase, userId } = await requireUserId();
  await assertDealOwnership(supabase, dealId, userId);

  const { error } = await supabase
    .from('shared_reports')
    .update({ is_active: false })
    .eq('deal_id', dealId);

  if (error) throw error;
}

export interface PublicReport {
  slug: string;
  is_active: boolean;
  view_count: number;
  created_at: string;
  deal: {
    name: string;
    property_type: string;
    inputs: Record<string, unknown>;
    results_cache: Record<string, unknown>;
    updated_at: string;
  };
}

export async function getPublicReportBySlug(slug: string): Promise<PublicReport | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('shared_reports')
    .select(
      `
      slug,
      is_active,
      view_count,
      created_at,
      deal:deals!shared_reports_deal_id_fkey (
        name,
        property_type,
        inputs,
        results_cache,
        updated_at
      )
    `
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;

  supabase
    .from('shared_reports')
    .update({ view_count: (data.view_count ?? 0) + 1 })
    .eq('slug', slug)
    .then(() => {});

  const deal = Array.isArray(data.deal) ? data.deal[0] : data.deal;
  if (!deal) return null;

  return {
    slug: data.slug,
    is_active: data.is_active,
    view_count: data.view_count,
    created_at: data.created_at,
    deal: deal as PublicReport['deal'],
  };
}
