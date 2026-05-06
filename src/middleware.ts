import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseSession } from '@/lib/supabase/middleware-session';

function copyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

export async function middleware(request: NextRequest) {
  const { response, user } = await getSupabaseSession(request);
  const pathname = request.nextUrl.pathname;

  // Public share links — no auth gate
  if (pathname.startsWith('/r/')) {
    return response;
  }

  // Vercel cron endpoints — no auth gate
  if (pathname.startsWith('/api/cron/')) {
    return response;
  }

  // Legal pages — public
  if (pathname.startsWith('/legal/')) {
    return response;
  }

  // Static files (e.g. images in /public) — no auth gate
  const lastSegment = pathname.split('/').pop() ?? '';
  const isStaticFile = lastSegment.includes('.');
  if (isStaticFile) {
    return response;
  }

  // Auth routes + landing page — public
  const isPublic =
    pathname === '/' || pathname === '/auth' || pathname.startsWith('/auth/callback');
  if (isPublic) {
    return response;
  }

  if (!user && (request.method === 'GET' || request.method === 'HEAD')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth';
    redirectUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);

    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyResponseCookies(response, redirectResponse);
    redirectResponse.headers.set('Cache-Control', 'private, no-store');
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|monitoring).*)'],
};
