import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseSession } from '@/lib/supabase/middleware-session';

const APEX_HOST = 'immoyield.com';
const APP_HOST = 'app.immoyield.com';
const WWW_HOST = `www.${APEX_HOST}`;

// Marketing routes that live on the apex (immoyield.com).
const APEX_PUBLIC_PREFIXES = ['/legal', '/privacidade', '/termos', '/r'];

function isApexPublicPath(pathname: string) {
  if (pathname === '/') return true;
  return APEX_PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAuthPath(pathname: string) {
  return pathname === '/auth' || pathname.startsWith('/auth/');
}

function copyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

export async function middleware(request: NextRequest) {
  const { response, user } = await getSupabaseSession(request);
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const host = (request.headers.get('host') ?? '').toLowerCase().split(':')[0];
  const isApex = host === APEX_HOST || host === WWW_HOST;
  const isApp = host === APP_HOST;
  const isProdHost = isApex || isApp;

  // Static files (anything with a dot in the last segment) — pass through.
  const lastSegment = pathname.split('/').pop() ?? '';
  if (lastSegment.includes('.')) {
    return response;
  }

  // API routes are not host-redirected; routes enforce their own auth.
  if (pathname.startsWith('/api/')) {
    return response;
  }

  // ── Production host routing ─────────────────────────────────────────────
  if (isProdHost) {
    if (isApex) {
      // Apex serves marketing only. Bounce everything else to the app subdomain.
      if (!isApexPublicPath(pathname)) {
        return NextResponse.redirect(new URL(`https://${APP_HOST}${pathname}${search}`));
      }
      return response;
    }

    if (isApp) {
      // Bare root on app subdomain → land on the dashboard default.
      if (pathname === '/') {
        const target = new URL('/propriedades', request.url);
        const redirect = NextResponse.redirect(target);
        copyResponseCookies(response, redirect);
        return redirect;
      }
      // Public/marketing paths belong on the apex domain.
      if (isApexPublicPath(pathname)) {
        return NextResponse.redirect(new URL(`https://${APEX_HOST}${pathname}${search}`));
      }
      // Fall through to auth gating below.
    }
  }

  // ── Auth gating (app subdomain in prod, plus all dev/local hosts) ───────

  // Public share links — no auth gate.
  if (pathname.startsWith('/r/')) {
    return response;
  }

  // Vercel cron endpoints — no auth gate (also covered by the /api/ early
  // return above, kept defensively in case the matcher changes).
  if (pathname.startsWith('/api/cron/')) {
    return response;
  }

  // Legal / privacidade / termos — public on every host.
  if (
    pathname.startsWith('/legal/') ||
    pathname === '/privacidade' ||
    pathname === '/termos'
  ) {
    return response;
  }

  // Auth route — public, but redirect signed-in users into the app.
  if (isAuthPath(pathname)) {
    if (user && pathname === '/auth') {
      const target = new URL('/propriedades', request.url);
      const redirect = NextResponse.redirect(target);
      copyResponseCookies(response, redirect);
      return redirect;
    }
    return response;
  }

  // Landing root in dev — public.
  if (pathname === '/') {
    return response;
  }

  if (!user && (request.method === 'GET' || request.method === 'HEAD')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth';
    redirectUrl.searchParams.set('next', `${pathname}${search}`);

    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyResponseCookies(response, redirectResponse);
    redirectResponse.headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|monitoring).*)'],
};
