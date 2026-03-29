import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseSession } from '@/lib/supabase/middleware-session';

function copyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

export async function middleware(request: NextRequest) {
  const { response, user } = await getSupabaseSession(request);

  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth';

    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyResponseCookies(response, redirectResponse);
    redirectResponse.headers.set('Cache-Control', 'private, no-store');
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
