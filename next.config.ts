import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseOrigin = (() => {
  try {
    return new URL(supabaseUrl).origin;
  } catch {
    return '';
  }
})();

const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? '';
const posthogOrigin = (() => {
  try {
    return new URL(posthogHost).origin;
  } catch {
    return '';
  }
})();

// PostHog also serves static assets from a sibling subdomain (us-assets / eu-assets)
const posthogAssetsOrigin = posthogOrigin.replace('://us.i.', '://us-assets.i.').replace('://eu.i.', '://eu-assets.i.');

const isDev = process.env.NODE_ENV !== 'production';

const connectSrc = [
  "'self'",
  supabaseOrigin,
  supabaseOrigin ? `wss://${supabaseOrigin.replace(/^https?:\/\//, '')}` : '',
  // Sentry — using tunnelRoute below routes errors through /monitoring on our own domain,
  // but we still allow direct ingest as a fallback during local dev.
  isDev ? 'https://*.ingest.sentry.io' : '',
  isDev ? 'https://*.ingest.us.sentry.io' : '',
  // PostHog
  posthogOrigin,
  posthogAssetsOrigin !== posthogOrigin ? posthogAssetsOrigin : '',
].filter(Boolean).join(' ');

const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-inline' for scripts is required by Next.js runtime; 'unsafe-eval' is
  // only allowed in development, where React uses eval() for debug features.
  // Tighten with nonces once all inline scripts are moved out.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['@react-pdf/renderer'],
  turbopack: {},
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: 'immoyield',
  project: 'javascript-nextjs',
  silent: !process.env.CI,
  widenClientFileUpload: true,

  // Route browser Sentry requests through /monitoring on our own domain
  // to bypass ad-blockers and keep our CSP tight (no wildcard ingest needed in prod).
  tunnelRoute: '/monitoring',

  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});