import 'client-only';

import { createBrowserClient } from '@supabase/ssr';
import { getCookieDomain } from './cookie-domain';

/**
 * Supabase browser client.
 *
 * Client Components may import this module.
 * Server Components / Route Handlers must use `@/lib/supabase/server` instead.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () => {
  const host = typeof window !== 'undefined' ? window.location.host : null;
  const domain = getCookieDomain(host);

  return createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
    domain ? { cookieOptions: { domain } } : undefined
  );
};
