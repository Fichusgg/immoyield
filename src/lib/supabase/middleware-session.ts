import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getCookieDomain } from './cookie-domain';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function getSupabaseSession(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  // Avoid 'no-store': it disables back/forward cache (Lighthouse bf-cache audit).
  // 'private, max-age=0, must-revalidate' still prevents shared/CDN caching and
  // forces revalidation, but lets the browser keep the page in bf-cache.
  // The browser auto-evicts bf-cache entries on cookie/auth changes.
  response.headers.set('Cache-Control', 'private, max-age=0, must-revalidate');

  const domain = getCookieDomain(request.headers.get('host'));

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
    ...(domain ? { cookieOptions: { domain } } : {}),
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, supabase, user };
}
