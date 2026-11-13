import { NextResponse, type NextRequest } from 'next/server';

/*
 * Sets the Content-Security-Policy: what a page may load and where it may send data.
 *
 *   script-src   the app's own scripts, the inline scripts Next.js writes
 *                (allowed by a nonce that is new for every request, so markup
 *                injected into a page cannot run code), and Google Maps for
 *                the hotspot map. `unsafe-eval` in development only, where
 *                React uses it for debugging.
 *   style-src    'unsafe-inline' is needed: the UI kit positions popovers and
 *                the charts size themselves with inline style attributes.
 *   connect-src  'self' covers the API when it is served under /api on this
 *                origin. If NEXT_PUBLIC_API_BASE_URL points at another origin,
 *                add that origin here or every API call will be blocked.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDevelopment = process.env.NODE_ENV === 'development';

  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://maps.googleapis.com${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.ggpht.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.googleapis.com https://*.google.com https://*.gstatic.com",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');

  // Next.js reads the nonce from the request's policy and puts it on the scripts it renders.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not the API, docs and health paths that belong to the
      // backend, and not static files, which carry no markup to protect.
      source: '/((?!api|docs|health|_next/static|_next/image|favicon.ico).*)',
      // A prefetch is not shown to anyone, so it needs no policy of its own.
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
