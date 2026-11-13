import type { NextConfig } from 'next';

/*
 * Response headers for every page and file. The Content-Security-Policy is not
 * here: it carries a per-request nonce, so it is set in src/proxy.ts.
 */
const securityHeaders = [
  // Never let a response be reinterpreted as another content type.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // The app is never meant to be embedded; this blocks clickjacking.
  // (frame-ancestors in the policy says the same to modern browsers.)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Send only the origin, not the full path, to other sites.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The app uses none of these device features, so no script may ask for them.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  // Do not advertise the framework in a response header.
  poweredByHeader: false,
  turbopack: {
    root: __dirname,
  },
  headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  redirects() {
    // The bare address has no screen of its own; it leads to the default
    // workspace (HOME_PATH in src/navigation/paths.ts; a test keeps them equal).
    return [{ source: '/', destination: '/moh', permanent: false }];
  },
  rewrites() {
    const backend = process.env.BACKEND_URL || 'http://localhost:8080';
    return ['api', 'docs', 'health'].map((prefix) => ({
      source: `/${prefix}/:path*`,
      destination: `${backend}/${prefix}/:path*`,
    }));
  },
};

export default nextConfig;
