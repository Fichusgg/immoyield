import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { getCookieDomain } from './cookie-domain';

/**
 * Supabase server client.
 *
 * Server Components / Route Handlers may import this module.
 * Client Components must use `@/lib/supabase/client` instead.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const domain = getCookieDomain(headerStore.get('host'));

  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — safe to ignore
        }
      },
    },
    ...(domain ? { cookieOptions: { domain } } : {}),
  });
};
