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

// PostHog loads its array.js (config) and surveys.js from the assets subdomain.
// Without this in script-src, both are blocked by CSP, which Lighthouse flags
// under errors-in-console / inspector-issues.
const scriptSrcExtras = [
  posthogOrigin,
  posthogAssetsOrigin !== posthogOrigin ? posthogAssetsOrigin : '',
].filter(Boolean).join(' ');

const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-inline' for scripts is required by Next.js runtime; 'unsafe-eval' is
  // only allowed in development, where React uses eval() for debug features.
  // Tighten with nonces once all inline scripts are moved out.
  `script-src 'self' 'unsafe-inline' ${scriptSrcExtras}${isDev ? " 'unsafe-eval'" : ''}`.trim(),
  `script-src-elem 'self' 'unsafe-inline' ${scriptSrcExtras}`.trim(),
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
  productionBrowserSourceMaps: false,
  compress: true,
  allowedDevOrigins: ['192.168.68.63'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // Long-cache hashed Next build assets — these are immutable in prod.
      // CRITICAL: do NOT apply this in development. In dev, Turbopack rebuilds
      // chunk hashes constantly; an `immutable` Cache-Control freezes the
      // browser onto a stale chunk and surfaces as cryptic runtime errors like
      // "Module compiler-runtime.js ... module factory is not available."
      ...(isDev
        ? []
        : [
            {
              source: '/_next/static/:path*',
              headers: [
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
              ],
            },
          ]),
    ];
  },
};

export default isDev
  ? nextConfig
  : withSentryConfig(nextConfig, {
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