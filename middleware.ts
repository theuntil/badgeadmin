import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function csp(nonce: string) {
  const supabase = (() => {
    try { return new URL(process.env.SUPABASE_URL || '').origin; } catch { return ''; }
  })();
  const dev = process.env.NODE_ENV !== 'production';
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? ` 'unsafe-eval'` : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${supabase}`,
    `media-src 'self' ${supabase}`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
  ].join('; ');
}

export async function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const policy = csp(nonce);

  const reqHeaders = new Headers(request.headers);
  reqHeaders.set('x-nonce', nonce);
  reqHeaders.set('Content-Security-Policy', policy);

  const secure = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production';
  let response = NextResponse.next({ request: { headers: reqHeaders } });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (url && key) {
    const sb = createServerClient(url, key, {
      cookieOptions: { httpOnly: true, secure, sameSite: 'lax', path: '/' },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: reqHeaders } });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, httpOnly: true, secure, sameSite: 'lax', path: '/' }));
        },
      },
    });

    const { data: { user } } = await sb.auth.getUser();
    const isLogin = request.nextUrl.pathname === '/login';
    if (!user && !isLogin) {
      const to = request.nextUrl.clone();
      to.pathname = '/login';
      to.search = '';
      response = NextResponse.redirect(to);
    } else if (user && isLogin && request.method === 'GET' && !request.nextUrl.searchParams.has('e')) {
      const to = request.nextUrl.clone();
      to.pathname = '/';
      to.search = '';
      response = NextResponse.redirect(to);
    }
  }

  response.headers.set('Content-Security-Policy', policy);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|icon.png|logo.png|api/health).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
