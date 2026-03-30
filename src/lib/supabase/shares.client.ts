import 'client-only';

/**
 * Client-side share functions.
 *
 * - Safe to import from Client Components only.
 * - Do not import this module from Server Components / Route Handlers.
 * - Delegates all DB writes to API routes.
 */

export interface SharedReport {
  id: string;
  deal_id: string;
  slug: string;
  is_active: boolean;
  view_count: number;
  created_at: string;
}

function getErrorMessageFromJson(json: unknown) {
  if (!json || typeof json !== 'object') return null;
  if (!('error' in json)) return null;
  const value = (json as Record<string, unknown>).error;
  return typeof value === 'string' ? value : null;
}

async function parseJsonOrThrow(res: Response) {
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const errorMsg = getErrorMessageFromJson(json) ?? `HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return json;
}

export async function createShareLink(dealId: string, dealName: string): Promise<SharedReport> {
  const res = await fetch('/api/shares', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dealId, dealName }),
  });

  const json = (await parseJsonOrThrow(res)) as { share?: SharedReport };
  if (!json.share) throw new Error('Resposta inválida do servidor');
  return json.share;
}

export async function revokeShareLink(dealId: string): Promise<void> {
  const res = await fetch(`/api/shares?dealId=${encodeURIComponent(dealId)}`, { method: 'DELETE' });
  await parseJsonOrThrow(res);
}
